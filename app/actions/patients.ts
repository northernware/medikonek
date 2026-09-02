"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AllergySeverity } from "@/lib/enums";
import { requireDoctor } from "@/lib/auth";
import { db, orm } from "@/src/prisma/db";
import { calendarDateToDb, instantToDb } from "@/lib/datetime";
import { newId } from "@/lib/ids";
import { fromDateInputValue } from "@/lib/datetime";
import { clinicalItemSchema, patientSchema, toFieldErrors, type FormState } from "@/lib/validation";

/** Confirms the household belongs to the signed-in doctor before anything is written. */
async function assertOwnsHousehold(doctorId: string, householdId: string) {
  const household = await orm.Household
    .select("id")
    .where((h) => h.id.eq(householdId))
    .where((h) => h.doctorId.eq(doctorId))
    .first();
  return household !== null;
}

type ClinicalRow = {
  label: string;
  reaction: string | null;
  severity: AllergySeverity | null;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
};

type ClinicalLists = {
  allergies: ClinicalRow[];
  conditions: ClinicalRow[];
  medications: ClinicalRow[];
  alerts: ClinicalRow[];
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
  label: string,
): { rows: ClinicalRow[]; error?: FormState } {
  const labels = formData.getAll(`${prefix}.label`).map(String);
  const reactions = formData.getAll(`${prefix}.reaction`).map(String);
  const severities = formData.getAll(`${prefix}.severity`).map(String);
  const dosages = formData.getAll(`${prefix}.dosage`).map(String);
  const frequencies = formData.getAll(`${prefix}.frequency`).map(String);
  const notes = formData.getAll(`${prefix}.notes`).map(String);

  const rows: ClinicalRow[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < labels.length; i++) {
    if (!labels[i].trim()) continue;

    const parsed = clinicalItemSchema.safeParse({
      label: labels[i],
      reaction: reactions[i] ?? "",
      severity: severities[i] ?? "",
      dosage: dosages[i] ?? "",
      frequency: frequencies[i] ?? "",
      notes: notes[i] ?? "",
    });
    if (!parsed.success) {
      const flat = toFieldErrors(parsed.error);
      return { rows: [], error: { message: `${label}: ${flat.message}` } };
    }

    const key = parsed.data.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      label: parsed.data.label,
      reaction: parsed.data.reaction,
      severity: parsed.data.severity as AllergySeverity | null,
      dosage: parsed.data.dosage,
      frequency: parsed.data.frequency,
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

/**
 * Empties every clinical list for a patient.
 *
 * The ORM's `.delete()` removes a single row — it is built for a unique
 * predicate — so deleting by `patientId`, which matches many, has to go through
 * the SQL-builder lane. Using the ORM here silently left every row but one
 * behind, and the next insert then collided with the (patientId, label) unique
 * index.
 */
async function clearClinicalLists(
  tx: { sql: typeof db.sql; execute: (plan: never) => Promise<unknown> },
  patientId: string,
) {
  const tables = [
    tx.sql.public.PatientAllergy,
    tx.sql.public.PatientCondition,
    tx.sql.public.PatientMedication,
    tx.sql.public.PatientAlert,
  ];
  for (const table of tables) {
    const plan = table.delete().where((f, fns) => fns.eq(f.patientId, patientId)).build();
    await tx.execute(plan as never);
  }
}

/**
 * Writes every clinical list for a patient. Prisma 8 has no nested create, so the
 * rows go in one at a time; callers run this inside the same transaction as the
 * patient write so a list is never half-applied.
 */
async function writeClinicalLists(t: typeof orm, patientId: string, lists: ClinicalLists) {
  const now = instantToDb(new Date());
  for (const a of lists.allergies) {
    await t.PatientAllergy.create({
      id: newId(),
      patientId,
      label: a.label,
      reaction: a.reaction,
      severity: a.severity,
      notes: a.notes,
      createdAt: now,
    });
  }
  for (const c of lists.conditions) {
    await t.PatientCondition.create({
      id: newId(),
      patientId,
      label: c.label,
      notes: c.notes,
      createdAt: now,
    });
  }
  for (const m of lists.medications) {
    await t.PatientMedication.create({
      id: newId(),
      patientId,
      label: m.label,
      dosage: m.dosage,
      frequency: m.frequency,
      notes: m.notes,
      createdAt: now,
    });
  }
  for (const a of lists.alerts) {
    await t.PatientAlert.create({
      id: newId(),
      patientId,
      label: a.label,
      notes: a.notes,
      createdAt: now,
    });
  }
}

/**
 * The columns the form owns: the ORM's create input minus the keys the action
 * supplies itself, and minus the relation slots — the same object is spread into
 * both a create and an update, and update takes columns only.
 */
type PatientScalars = Omit<
  Parameters<typeof orm.Patient.create>[0],
  | "id"
  | "householdId"
  | "createdAt"
  | "updatedAt"
  | "household"
  | "appointments"
  | "medicalRecords"
  | "allergies"
  | "conditions"
  | "medications"
  | "alerts"
  | "primaryContactFor"
>;

type ParsedPatient =
  | { ok: false; error: FormState }
  | {
      ok: true;
      householdId: string;
      scalars: PatientScalars;
      lists: ClinicalLists;
    };

function parsePatientForm(formData: FormData): ParsedPatient {
  const parsed = patientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: toFieldErrors(parsed.error) };

  const allergies = readClinicalList(formData, "allergy", "Allergy");
  if (allergies.error) return { ok: false, error: allergies.error };
  const conditions = readClinicalList(formData, "condition", "Condition");
  if (conditions.error) return { ok: false, error: conditions.error };
  const medications = readClinicalList(formData, "medication", "Medication");
  if (medications.error) return { ok: false, error: medications.error };
  const alerts = readClinicalList(formData, "alert", "Medical alert");
  if (alerts.error) return { ok: false, error: alerts.error };

  const dob = fromDateInputValue(parsed.data.dateOfBirth);
  if (!dob || dob > new Date()) {
    return {
      ok: false,
      error: { message: "Check the date of birth.", fieldErrors: { dateOfBirth: ["Must be in the past"] } },
    };
  }

  const {
    householdId,
    dateOfBirth: _dob,
    allergyStatus,
    conditionStatus,
    medicationStatus,
    ...rest
  } = parsed.data;

  return {
    ok: true,
    householdId,
    scalars: {
      ...rest,
      dateOfBirth: calendarDateToDb(dob),
      allergyStatus: reconcileStatus(allergyStatus, allergies.rows.length),
      conditionStatus: reconcileStatus(conditionStatus, conditions.rows.length),
      medicationStatus: reconcileStatus(medicationStatus, medications.rows.length),
    },
    lists: {
      allergies: allergies.rows,
      conditions: conditions.rows,
      medications: medications.rows,
      alerts: alerts.rows,
    },
  };
}

export async function createPatient(_prev: FormState, formData: FormData): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = parsePatientForm(formData);
  if (!parsed.ok) return parsed.error;

  if (!(await assertOwnsHousehold(doctor.id, parsed.householdId))) {
    return { message: "That household is not on your list." };
  }

  // The patient and its clinical lists are written together: a half-created
  // patient with no allergies would read as "none known" rather than "not asked".
  const patient = await db.transaction(async (tx) => {
    const now = instantToDb(new Date());
    const created = await tx.orm.public.Patient.select("id").create({
      ...parsed.scalars,
      id: newId(),
      householdId: parsed.householdId,
      createdAt: now,
      updatedAt: now,
    });
    await writeClinicalLists(tx.orm.public, created.id, parsed.lists);
    return created;
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

  const owned = await orm.Patient
    .select("id")
    .where((p) => p.id.eq(patientId))
    .where((p) => p.household.some((h) => h.doctorId.eq(doctor.id)))
    .first();
  if (!owned) return { message: "That patient no longer exists." };

  // The lists are edited as a whole, so they are replaced wholesale — the same
  // way prescriptions are handled on a record.
  await db.transaction(async (tx) => {
    const t = tx.orm.public;
    await t.Patient.where((p) => p.id.eq(patientId)).update({
      ...parsed.scalars,
      householdId: parsed.householdId,
      updatedAt: instantToDb(new Date()),
    });
    await clearClinicalLists(tx, patientId);
    await writeClinicalLists(t, patientId, parsed.lists);
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

  const patient = await orm.Patient
    .select("householdId")
    .where((p) => p.id.eq(patientId))
    .where((p) => p.household.some((h) => h.doctorId.eq(doctor.id)))
    .first();
  if (!patient) return;

  await orm.Patient.where((p) => p.id.eq(patientId)).delete();

  revalidatePath("/patients");
  revalidatePath(`/households/${patient.householdId}`);
  redirect(`/households/${patient.householdId}`);
}
