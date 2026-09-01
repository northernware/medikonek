"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppointmentStatus } from "@/app/generated/prisma/enums";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fromDateInputValue, fromDateTimeLocalValue } from "@/lib/datetime";
import {
  medicalRecordSchema,
  prescriptionSchema,
  toFieldErrors,
  type FormState,
} from "@/lib/validation";

export type PrescriptionInput = {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string | null;
  instructions: string | null;
};

/**
 * Prescription rows arrive as parallel repeated fields. Rows with no drug name
 * are blank templates the doctor never filled in, so they are dropped.
 */
function readPrescriptions(formData: FormData): { rows: PrescriptionInput[]; error?: FormState } {
  const names = formData.getAll("rx.drugName").map(String);
  const rows: PrescriptionInput[] = [];

  for (let i = 0; i < names.length; i++) {
    const row = {
      drugName: names[i],
      dosage: String(formData.getAll("rx.dosage")[i] ?? ""),
      frequency: String(formData.getAll("rx.frequency")[i] ?? ""),
      duration: String(formData.getAll("rx.duration")[i] ?? ""),
      instructions: String(formData.getAll("rx.instructions")[i] ?? ""),
    };
    if (!row.drugName.trim()) continue;

    const parsed = prescriptionSchema.safeParse(row);
    if (!parsed.success) {
      const flat = toFieldErrors(parsed.error);
      return {
        rows: [],
        error: { message: `Prescription ${i + 1}: ${flat.message}`, fieldErrors: flat.fieldErrors },
      };
    }
    rows.push(parsed.data);
  }

  return { rows };
}

export async function createMedicalRecord(_prev: FormState, formData: FormData): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = medicalRecordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const { patientId, appointmentId, visitDate, followUpDate, ...rest } = parsed.data;

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, household: { doctorId: doctor.id } },
    select: { id: true },
  });
  if (!patient) return { message: "That patient is not on your list." };

  const visitedAt = fromDateTimeLocalValue(visitDate);
  if (!visitedAt) return { message: "Check the visit date.", fieldErrors: { visitDate: ["Invalid date"] } };

  // Only link an appointment that is this doctor's, this patient's, and not
  // already documented.
  let linkedAppointmentId: string | null = null;
  if (appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, doctorId: doctor.id, patientId, medicalRecord: { is: null } },
      select: { id: true },
    });
    if (!appointment) {
      return { message: "That appointment is unavailable or already has a record." };
    }
    linkedAppointmentId = appointment.id;
  }

  const { rows, error } = readPrescriptions(formData);
  if (error) return error;

  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.medicalRecord.create({
      data: {
        ...rest,
        patientId,
        doctorId: doctor.id,
        appointmentId: linkedAppointmentId,
        visitDate: visitedAt,
        followUpDate: followUpDate ? fromDateInputValue(followUpDate) : null,
        prescriptions: { create: rows },
      },
      select: { id: true },
    });

    // Documenting a visit is what marks it done.
    if (linkedAppointmentId) {
      await tx.appointment.update({
        where: { id: linkedAppointmentId },
        data: { status: AppointmentStatus.COMPLETED },
      });
    }

    return created;
  });

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/appointments");
  revalidatePath("/");
  redirect(`/records/${record.id}`);
}

export async function updateMedicalRecord(
  recordId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = medicalRecordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const existing = await prisma.medicalRecord.findFirst({
    where: { id: recordId, doctorId: doctor.id },
    select: { id: true, patientId: true },
  });
  if (!existing) return { message: "That record no longer exists." };

  const { patientId: _patientId, appointmentId: _appointmentId, visitDate, followUpDate, ...rest } = parsed.data;

  const visitedAt = fromDateTimeLocalValue(visitDate);
  if (!visitedAt) return { message: "Check the visit date.", fieldErrors: { visitDate: ["Invalid date"] } };

  const { rows, error } = readPrescriptions(formData);
  if (error) return error;

  await prisma.$transaction(async (tx) => {
    await tx.medicalRecord.update({
      where: { id: recordId },
      data: {
        ...rest,
        visitDate: visitedAt,
        followUpDate: followUpDate ? fromDateInputValue(followUpDate) : null,
      },
    });
    // The prescription list is edited as a whole, so replace it wholesale.
    await tx.prescription.deleteMany({ where: { medicalRecordId: recordId } });
    if (rows.length > 0) {
      await tx.prescription.createMany({
        data: rows.map((r) => ({ ...r, medicalRecordId: recordId })),
      });
    }
  });

  revalidatePath(`/patients/${existing.patientId}`);
  revalidatePath(`/records/${recordId}`);
  redirect(`/records/${recordId}`);
}

export async function deleteMedicalRecord(formData: FormData) {
  const doctor = await requireDoctor();
  const recordId = String(formData.get("recordId") ?? "");
  if (!recordId) return;

  const record = await prisma.medicalRecord.findFirst({
    where: { id: recordId, doctorId: doctor.id },
    select: { patientId: true },
  });
  if (!record) return;

  await prisma.medicalRecord.delete({ where: { id: recordId } });

  revalidatePath(`/patients/${record.patientId}`);
  redirect(`/patients/${record.patientId}`);
}
