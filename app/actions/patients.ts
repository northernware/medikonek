"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AllergySeverity, Prisma } from "@/app/generated/prisma/client";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fromDateInputValue } from "@/lib/datetime";
import { clinicalItemSchema, patientSchema, toFieldErrors, type FormState } from "@/lib/validation";

/** Confirms the household belongs to the signed-in doctor before anything is written. */
async function assertOwnsHousehold(doctorId: string, householdId: string) {
  const household = await prisma.household.findFirst({
    where: { id: householdId, doctorId },
    select: { id: true },
  });
  return household !== null;
}

type ClinicalRow = {
  label: string;
  reaction: string | null;
  severity: AllergySeverity | null;
  notes: string | null;
};

/**
 * Allergy and condition rows arrive as parallel repeated fields, the same shape
 * the prescription list uses. Blank labels are rows the picker never filled in.
 * Duplicates are dropped rather than rejected — the table's unique constraint
 * would otherwise fail the whole save over a harmless double-click.
 */
function readClinicalList(
  formData: FormData,
  prefix: string,
  withDetail: boolean,
): { rows: ClinicalRow[]; error?: FormState } {
  const labels = formData.getAll(`${prefix}.label`).map(String);
  const reactions = formData.getAll(`${prefix}.reaction`).map(String);
  const severities = formData.getAll(`${prefix}.severity`).map(String);
  const notes = formData.getAll(`${prefix}.notes`).map(String);

  const rows: ClinicalRow[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < labels.length; i++) {
    if (!labels[i].trim()) continue;

    const parsed = clinicalItemSchema.safeParse({
      label: labels[i],
      reaction: withDetail ? (reactions[i] ?? "") : "",
      severity: withDetail ? (severities[i] ?? "") : "",
      notes: notes[i] ?? "",
    });
    if (!parsed.success) {
      const flat = toFieldErrors(parsed.error);
      return { rows: [], error: { message: `${prefix === "allergy" ? "Allergy" : "Condition"}: ${flat.message}` } };
    }

    const key = parsed.data.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      label: parsed.data.label,
      reaction: parsed.data.reaction,
      severity: parsed.data.severity as AllergySeverity | null,
      notes: parsed.data.notes,
    });
  }

  return { rows };
}

/** A list with entries is RECORDED whatever the chips said; an empty one keeps its answer. */
function reconcileStatus(declared: string, count: number) {
  if (count > 0) return "RECORDED" as const;
  return declared === "NONE_KNOWN" ? ("NONE_KNOWN" as const) : ("UNKNOWN" as const);
}

type ParsedPatient =
  | { ok: false; error: FormState }
  | {
      ok: true;
      householdId: string;
      scalars: Omit<Prisma.PatientUncheckedCreateInput, "id" | "householdId">;
      allergies: ClinicalRow[];
      conditions: ClinicalRow[];
    };

function parsePatientForm(formData: FormData): ParsedPatient {
  const parsed = patientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: toFieldErrors(parsed.error) };

  const allergies = readClinicalList(formData, "allergy", true);
  if (allergies.error) return { ok: false, error: allergies.error };
  const conditions = readClinicalList(formData, "condition", false);
  if (conditions.error) return { ok: false, error: conditions.error };

  const dob = fromDateInputValue(parsed.data.dateOfBirth);
  if (!dob || dob > new Date()) {
    return {
      ok: false,
      error: { message: "Check the date of birth.", fieldErrors: { dateOfBirth: ["Must be in the past"] } },
    };
  }

  const { householdId, dateOfBirth: _dob, allergyStatus, conditionStatus, ...rest } = parsed.data;

  return {
    ok: true,
    householdId,
    scalars: {
      ...rest,
      dateOfBirth: dob,
      allergyStatus: reconcileStatus(allergyStatus, allergies.rows.length),
      conditionStatus: reconcileStatus(conditionStatus, conditions.rows.length),
    },
    allergies: allergies.rows,
    conditions: conditions.rows,
  };
}

export async function createPatient(_prev: FormState, formData: FormData): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = parsePatientForm(formData);
  if (!parsed.ok) return parsed.error;

  if (!(await assertOwnsHousehold(doctor.id, parsed.householdId))) {
    return { message: "That household is not on your list." };
  }

  const patient = await prisma.patient.create({
    data: {
      ...parsed.scalars,
      householdId: parsed.householdId,
      allergies: { create: parsed.allergies },
      conditions: { create: parsed.conditions.map(({ label, notes }) => ({ label, notes })) },
    },
    select: { id: true },
  });

  revalidatePath(`/households/${parsed.householdId}`);
  revalidatePath("/patients");
  redirect(`/patients/${patient.id}`);
}

export async function updatePatient(
  patientId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = parsePatientForm(formData);
  if (!parsed.ok) return parsed.error;

  if (!(await assertOwnsHousehold(doctor.id, parsed.householdId))) {
    return { message: "That household is not on your list." };
  }

  const owned = await prisma.patient.findFirst({
    where: { id: patientId, household: { doctorId: doctor.id } },
    select: { id: true },
  });
  if (!owned) return { message: "That patient no longer exists." };

  // The lists are edited as a whole, so they are replaced wholesale — the same
  // way prescriptions are handled on a record.
  await prisma.$transaction(async (tx) => {
    await tx.patient.update({
      where: { id: patientId },
      data: { ...parsed.scalars, householdId: parsed.householdId },
    });
    await tx.patientAllergy.deleteMany({ where: { patientId } });
    await tx.patientCondition.deleteMany({ where: { patientId } });
    if (parsed.allergies.length > 0) {
      await tx.patientAllergy.createMany({
        data: parsed.allergies.map((a) => ({ ...a, patientId })),
      });
    }
    if (parsed.conditions.length > 0) {
      await tx.patientCondition.createMany({
        data: parsed.conditions.map((c) => ({ label: c.label, notes: c.notes, patientId })),
      });
    }
  });

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/households/${parsed.householdId}`);
  redirect(`/patients/${patientId}`);
}

export async function deletePatient(formData: FormData) {
  const doctor = await requireDoctor();
  const patientId = String(formData.get("patientId") ?? "");
  if (!patientId) return;

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, household: { doctorId: doctor.id } },
    select: { householdId: true },
  });
  if (!patient) return;

  await prisma.patient.delete({ where: { id: patientId } });

  revalidatePath("/patients");
  revalidatePath(`/households/${patient.householdId}`);
  redirect(`/households/${patient.householdId}`);
}
