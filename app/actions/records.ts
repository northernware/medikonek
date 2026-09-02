"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppointmentStatus } from "@/lib/enums";
import { requireDoctor } from "@/lib/auth";
import { db, orm } from "@/src/prisma/db";
import { calendarDateToDb, instantToDb } from "@/lib/datetime";
import { newId } from "@/lib/ids";
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

/**
 * Replaces a record's prescription rows. Prisma 8 has no nested or bulk create,
 * so they go in one at a time inside the caller's transaction.
 */
async function writePrescriptions(
  t: typeof orm,
  medicalRecordId: string,
  rows: PrescriptionInput[],
) {
  const now = instantToDb(new Date());
  for (const r of rows) {
    await t.Prescription.create({ ...r, id: newId(), medicalRecordId, createdAt: now });
  }
}

export async function createMedicalRecord(_prev: FormState, formData: FormData): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = medicalRecordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const { patientId, appointmentId, visitDate, followUpDate, ...rest } = parsed.data;

  const patient = await orm.Patient
    .select("id")
    .where((p) => p.id.eq(patientId))
    .where((p) => p.household.some((h) => h.doctorId.eq(doctor.id)))
    .first();
  if (!patient) return { message: "That patient is not on your list." };

  const visitedAt = fromDateTimeLocalValue(visitDate);
  if (!visitedAt) return { message: "Check the visit date.", fieldErrors: { visitDate: ["Invalid date"] } };

  // Only link an appointment that is this doctor's, this patient's, and not
  // already documented.
  let linkedAppointmentId: string | null = null;
  if (appointmentId) {
    const appointment = await orm.Appointment
      .select("id")
      .where((a) => a.id.eq(appointmentId))
      .where((a) => a.doctorId.eq(doctor.id))
      .where((a) => a.patientId.eq(patientId))
      .where((a) => a.medicalRecord.none((r) => r.id.isNotNull()))
      .first();
    if (!appointment) {
      return { message: "That appointment is unavailable or already has a record." };
    }
    linkedAppointmentId = appointment.id;
  }

  const { rows, error } = readPrescriptions(formData);
  if (error) return error;

  const record = await db.transaction(async (tx) => {
    const t = tx.orm.public;
    const now = instantToDb(new Date());
    const followUp = followUpDate ? fromDateInputValue(followUpDate) : null;
    const created = await t.MedicalRecord.select("id").create({
      ...rest,
      id: newId(),
      patientId,
      doctorId: doctor.id,
      appointmentId: linkedAppointmentId,
      visitDate: instantToDb(visitedAt),
      followUpDate: followUp ? calendarDateToDb(followUp) : null,
      createdAt: now,
      updatedAt: now,
    });
    await writePrescriptions(t, created.id, rows);

    // Documenting a visit is what marks it done.
    if (linkedAppointmentId) {
      await t.Appointment
        .where((a) => a.id.eq(linkedAppointmentId))
        .update({ status: AppointmentStatus.COMPLETED, updatedAt: now });
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

  const existing = await orm.MedicalRecord
    .select("id", "patientId")
    .where((r) => r.id.eq(recordId))
    .where((r) => r.doctorId.eq(doctor.id))
    .first();
  if (!existing) return { message: "That record no longer exists." };

  const { patientId: _patientId, appointmentId: _appointmentId, visitDate, followUpDate, ...rest } = parsed.data;

  const visitedAt = fromDateTimeLocalValue(visitDate);
  if (!visitedAt) return { message: "Check the visit date.", fieldErrors: { visitDate: ["Invalid date"] } };

  const { rows, error } = readPrescriptions(formData);
  if (error) return error;

  await db.transaction(async (tx) => {
    const t = tx.orm.public;
    const followUp = followUpDate ? fromDateInputValue(followUpDate) : null;
    await t.MedicalRecord.where((r) => r.id.eq(recordId)).update({
      ...rest,
      visitDate: instantToDb(visitedAt),
      followUpDate: followUp ? calendarDateToDb(followUp) : null,
      updatedAt: instantToDb(new Date()),
    });
    // The prescription list is edited as a whole, so replace it wholesale.
    // `.delete()` on the ORM removes one row; prescriptions are matched by a
    // non-unique key, so this has to go through the SQL-builder lane or all but
    // one would survive the edit.
    const clear = tx.sql.public.Prescription
      .delete()
      .where((f, fns) => fns.eq(f.medicalRecordId, recordId))
      .build();
    await tx.execute(clear as never);
    await writePrescriptions(t, recordId, rows);
  });

  revalidatePath(`/patients/${existing.patientId}`);
  revalidatePath(`/records/${recordId}`);
  redirect(`/records/${recordId}`);
}

export async function deleteMedicalRecord(formData: FormData) {
  const doctor = await requireDoctor();
  const recordId = String(formData.get("recordId") ?? "");
  if (!recordId) return;

  const record = await orm.MedicalRecord
    .select("patientId")
    .where((r) => r.id.eq(recordId))
    .where((r) => r.doctorId.eq(doctor.id))
    .first();
  if (!record) return;

  await orm.MedicalRecord.where((r) => r.id.eq(recordId)).delete();

  revalidatePath(`/patients/${record.patientId}`);
  redirect(`/patients/${record.patientId}`);
}
