"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppointmentStatus } from "@/lib/enums";
import { requireDoctor } from "@/lib/auth";
import { orm } from "@/src/prisma/db";
import {
  clinicDayRange,
  fromDateTimeLocalValue,
  instantFromDb,
  instantToDb,
} from "@/lib/datetime";
import { newId } from "@/lib/ids";
import { SERVICE_MINUTES } from "@/lib/domain";
import { checkBookingRules, minuteOfDay, occupiesSlot, overlaps } from "@/lib/scheduling";
import { appointmentSchema, toFieldErrors, type FormState } from "@/lib/validation";

async function assertOwnsPatient(doctorId: string, patientId: string) {
  const patient = await orm.Patient
    .select("id")
    .where((p) => p.id.eq(patientId))
    .where((p) => p.household.some((h) => h.doctorId.eq(doctorId)))
    .first();
  return patient !== null;
}

/** The appointment columns a booking form decides — relations and audit keys excluded. */
type AppointmentScalars = Omit<
  Parameters<typeof orm.Appointment.create>[0],
  | "id"
  | "doctorId"
  | "createdAt"
  | "updatedAt"
  | "doctor"
  | "patient"
  | "previousAppointment"
  | "followUps"
  | "medicalRecord"
  | "followUpForRecord"
>;

/**
 * Turns validated form fields into a row, refusing anything the clinic's rules
 * or an existing booking would not allow. The form mirrors these rules to keep
 * the UI honest, but this is what actually decides — a stale slot list or a
 * direct POST both land here.
 */
async function resolveBooking(
  doctorId: string,
  data: ReturnType<typeof appointmentSchema.parse>,
  ignoreAppointmentId?: string,
): Promise<{ error: FormState } | { data: AppointmentScalars }> {
  const { patientId, date, time, service, previousAppointmentId, type, ...rest } = data;

  if (!(await assertOwnsPatient(doctorId, patientId))) {
    return { error: { message: "That patient is not on your list." } };
  }

  const scheduledAt = fromDateTimeLocalValue(`${date}T${time}`);
  if (!scheduledAt) {
    return { error: { message: "Check the date and time.", fieldErrors: { time: ["Invalid time"] } } };
  }

  // Duration follows the service rather than being asked for.
  const durationMinutes = SERVICE_MINUTES[service];

  const ruleBreak = checkBookingRules(scheduledAt, durationMinutes);
  if (ruleBreak) {
    return {
      error: {
        message: ruleBreak,
        fieldErrors: { date: [ruleBreak] },
      },
    };
  }

  // Overlap is checked against the whole clinic day, not just nearby rows.
  const { start, end } = clinicDayRange(scheduledAt);
  let sameDayQuery = orm.Appointment
    .select("id", "scheduledAt", "durationMinutes", "status")
    .where((a) => a.doctorId.eq(doctorId))
    .where((a) => a.scheduledAt.gte(instantToDb(start)))
    .where((a) => a.scheduledAt.lt(instantToDb(end)));
  if (ignoreAppointmentId) {
    sameDayQuery = sameDayQuery.where((a) => a.id.neq(ignoreAppointmentId));
  }
  const sameDay = await sameDayQuery.all();

  const busy = sameDay
    .filter((a) => occupiesSlot(a.status))
    .map((a) => {
      const startMinute = minuteOfDay(instantFromDb(a.scheduledAt));
      return { start: startMinute, end: startMinute + a.durationMinutes };
    });

  if (overlaps(minuteOfDay(scheduledAt), durationMinutes, busy)) {
    const clash = "That slot was taken while you were booking. Pick another time.";
    return { error: { message: clash, fieldErrors: { time: [clash] } } };
  }

  // Only chain to a previous visit that is this doctor's and this patient's.
  let previousId: string | null = null;
  if (previousAppointmentId) {
    let previousQuery = orm.Appointment
      .select("id")
      .where((a) => a.id.eq(previousAppointmentId))
      .where((a) => a.doctorId.eq(doctorId))
      .where((a) => a.patientId.eq(patientId));
    if (ignoreAppointmentId) {
      previousQuery = previousQuery.where((a) => a.id.neq(ignoreAppointmentId));
    }
    const previous = await previousQuery.first();
    if (!previous) {
      return { error: { message: "That previous appointment is not available to link." } };
    }
    previousId = previous.id;
  }

  return {
    data: {
      ...rest,
      patientId,
      service,
      durationMinutes,
      visitType: type,
      scheduledAt: instantToDb(scheduledAt),
      previousAppointmentId: previousId,
    },
  };
}

export async function createAppointment(_prev: FormState, formData: FormData): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = appointmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const resolved = await resolveBooking(doctor.id, parsed.data);
  if ("error" in resolved) return resolved.error;

  const now = instantToDb(new Date());
  const appointment = await orm.Appointment.select("id", "patientId").create({
    ...resolved.data,
    id: newId(),
    doctorId: doctor.id,
    createdAt: now,
    updatedAt: now,
  });

  // Booked to satisfy an earlier visit's follow-up: link it so the record stops
  // showing as due. Scoped to this doctor and patient, and only onto a record
  // that has not already been satisfied.
  const followUpFor = String(formData.get("followUpFor") ?? "");
  if (followUpFor) {
    await orm.MedicalRecord
      .where((r) => r.id.eq(followUpFor))
      .where((r) => r.doctorId.eq(doctor.id))
      .where((r) => r.patientId.eq(appointment.patientId))
      .where((r) => r.followUpAppointmentId.isNull())
      .update({ followUpAppointmentId: appointment.id, updatedAt: instantToDb(new Date()) });
    revalidatePath(`/records/${followUpFor}`);
  }

  revalidatePath("/appointments");
  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath(`/patients/${appointment.patientId}`);
  redirect(`/appointments/${appointment.id}`);
}

export async function updateAppointment(
  appointmentId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = appointmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const owned = await orm.Appointment
    .select("id")
    .where((a) => a.id.eq(appointmentId))
    .where((a) => a.doctorId.eq(doctor.id))
    .first();
  if (!owned) return { message: "That appointment no longer exists." };

  const resolved = await resolveBooking(doctor.id, parsed.data, appointmentId);
  if ("error" in resolved) return resolved.error;

  await orm.Appointment
    .where((a) => a.id.eq(appointmentId))
    .update({ ...resolved.data, updatedAt: instantToDb(new Date()) });

  revalidatePath("/appointments");
  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath(`/appointments/${appointmentId}`);
  revalidatePath(`/patients/${parsed.data.patientId}`);
  redirect(`/appointments/${appointmentId}`);
}

/** Quick status change from the detail page — no full form round-trip. */
export async function setAppointmentStatus(formData: FormData) {
  const doctor = await requireDoctor();
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const raw = String(formData.get("status") ?? "");

  if (!appointmentId || !(raw in AppointmentStatus)) return;

  await orm.Appointment
    .where((a) => a.id.eq(appointmentId))
    .where((a) => a.doctorId.eq(doctor.id))
    .update({ status: raw as AppointmentStatus, updatedAt: instantToDb(new Date()) });

  revalidatePath("/appointments");
  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath(`/appointments/${appointmentId}`);
}

export async function deleteAppointment(formData: FormData) {
  const doctor = await requireDoctor();
  const appointmentId = String(formData.get("appointmentId") ?? "");
  if (!appointmentId) return;

  await orm.Appointment
    .where((a) => a.id.eq(appointmentId))
    .where((a) => a.doctorId.eq(doctor.id))
    .delete();

  revalidatePath("/appointments");
  revalidatePath("/calendar");
  revalidatePath("/");
  redirect("/appointments");
}
