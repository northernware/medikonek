"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fromDateInputValue } from "@/lib/datetime";
import { patientSchema, toFieldErrors, type FormState } from "@/lib/validation";

/** Confirms the family belongs to the signed-in doctor before anything is written. */
async function assertOwnsFamily(doctorId: string, familyId: string) {
  const family = await prisma.family.findFirst({
    where: { id: familyId, doctorId },
    select: { id: true },
  });
  return family !== null;
}

export async function createPatient(_prev: FormState, formData: FormData): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = patientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const { familyId, dateOfBirth, ...rest } = parsed.data;
  if (!(await assertOwnsFamily(doctor.id, familyId))) {
    return { message: "That family is not on your list." };
  }

  const dob = fromDateInputValue(dateOfBirth);
  if (!dob || dob > new Date()) {
    return { message: "Check the date of birth.", fieldErrors: { dateOfBirth: ["Must be in the past"] } };
  }

  const patient = await prisma.patient.create({
    data: { ...rest, familyId, dateOfBirth: dob },
    select: { id: true },
  });

  revalidatePath(`/families/${familyId}`);
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

  const { familyId, dateOfBirth, ...rest } = parsed.data;
  if (!(await assertOwnsFamily(doctor.id, familyId))) {
    return { message: "That family is not on your list." };
  }

  const dob = fromDateInputValue(dateOfBirth);
  if (!dob || dob > new Date()) {
    return { message: "Check the date of birth.", fieldErrors: { dateOfBirth: ["Must be in the past"] } };
  }

  const { count } = await prisma.patient.updateMany({
    where: { id: patientId, family: { doctorId: doctor.id } },
    data: { ...rest, familyId, dateOfBirth: dob },
  });
  if (count === 0) return { message: "That patient no longer exists." };

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/families/${familyId}`);
  redirect(`/patients/${patientId}`);
}

export async function deletePatient(formData: FormData) {
  const doctor = await requireDoctor();
  const patientId = String(formData.get("patientId") ?? "");
  if (!patientId) return;

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, family: { doctorId: doctor.id } },
    select: { familyId: true },
  });
  if (!patient) return;

  await prisma.patient.delete({ where: { id: patientId } });

  revalidatePath("/patients");
  revalidatePath(`/families/${patient.familyId}`);
  redirect(`/families/${patient.familyId}`);
}
