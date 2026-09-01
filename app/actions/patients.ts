"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fromDateInputValue } from "@/lib/datetime";
import { patientSchema, toFieldErrors, type FormState } from "@/lib/validation";

/** Confirms the household belongs to the signed-in doctor before anything is written. */
async function assertOwnsHousehold(doctorId: string, householdId: string) {
  const household = await prisma.household.findFirst({
    where: { id: householdId, doctorId },
    select: { id: true },
  });
  return household !== null;
}

export async function createPatient(_prev: FormState, formData: FormData): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = patientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const { householdId, dateOfBirth, ...rest } = parsed.data;
  if (!(await assertOwnsHousehold(doctor.id, householdId))) {
    return { message: "That household is not on your list." };
  }

  const dob = fromDateInputValue(dateOfBirth);
  if (!dob || dob > new Date()) {
    return { message: "Check the date of birth.", fieldErrors: { dateOfBirth: ["Must be in the past"] } };
  }

  const patient = await prisma.patient.create({
    data: { ...rest, householdId, dateOfBirth: dob },
    select: { id: true },
  });

  revalidatePath(`/households/${householdId}`);
  revalidatePath("/patients");
  redirect(`/patients/${patient.id}`);
}

export async function updatePatient(
  patientId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = patientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const { householdId, dateOfBirth, ...rest } = parsed.data;
  if (!(await assertOwnsHousehold(doctor.id, householdId))) {
    return { message: "That household is not on your list." };
  }

  const dob = fromDateInputValue(dateOfBirth);
  if (!dob || dob > new Date()) {
    return { message: "Check the date of birth.", fieldErrors: { dateOfBirth: ["Must be in the past"] } };
  }

  const { count } = await prisma.patient.updateMany({
    where: { id: patientId, household: { doctorId: doctor.id } },
    data: { ...rest, householdId, dateOfBirth: dob },
  });
  if (count === 0) return { message: "That patient no longer exists." };

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/households/${householdId}`);
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
