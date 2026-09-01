"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppointmentStatus } from "@/app/generated/prisma/enums";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clinicDayRange, fromDateTimeLocalValue } from "@/lib/datetime";
import { SERVICE_MINUTES } from "@/lib/domain";
import { checkBookingRules, minuteOfDay, occupiesSlot, overlaps } from "@/lib/scheduling";
import { appointmentSchema, toFieldErrors, type FormState } from "@/lib/validation";

async function assertOwnsPatient(doctorId: string, patientId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, household: { doctorId } },
    select: { id: true },
  });
  return patient !== null;
}

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
): Promise<{ error: FormState } | { data: Record<string, unknown> }> {
  const { patientId, date, time, service, previousAppointmentId, ...rest } = data;

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
  const sameDay = await prisma.appointment.findMany({
    where: {
      doctorId,
      scheduledAt: { gte: start, lt: end },
      ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
    },
    select: { id: true, scheduledAt: true, durationMinutes: true, status: true },
  });

  const busy = sameDay
    .filter((a) => occupiesSlot(a.status))
    .map((a) => {
      const startMinute = minuteOfDay(a.scheduledAt);
      return { start: startMinute, end: startMinute + a.durationMinutes };
    });

  if (overlaps(minuteOfDay(scheduledAt), durationMinutes, busy)) {
    const clash = "That slot was taken while you were booking. Pick another time.";
    return { error: { message: clash, fieldErrors: { time: [clash] } } };
  }

  // Only chain to a previous visit that is this doctor's and this patient's.
  let previousId: string | null = null;
  if (previousAppointmentId) {
    const previous = await prisma.appointment.findFirst({
      where: {
        id: previousAppointmentId,
        doctorId,
        patientId,
        ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
      },
      select: { id: true },
    });
    if (!previous) {
      return { error: { message: "That previous appointment is not available to link." } };
    }
    previousId = previous.id;
  }

  return {
    data: { ...rest, patientId, service, durationMinutes, scheduledAt, previousAppointmentId: previousId },
  };
}

export async function createAppointment(_prev: FormState, formData: FormData): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = appointmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const resolved = await resolveBooking(doctor.id, parsed.data);
  if ("error" in resolved) return resolved.error;

  const appointment = await prisma.appointment.create({
    data: { ...resolved.data, doctorId: doctor.id } as never,
    select: { id: true, patientId: true },
  });

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

  const owned = await prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId: doctor.id },
    select: { id: true },
  });
  if (!owned) return { message: "That appointment no longer exists." };

  const resolved = await resolveBooking(doctor.id, parsed.data, appointmentId);
  if ("error" in resolved) return resolved.error;

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: resolved.data as never,
  });

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

  await prisma.appointment.updateMany({
    where: { id: appointmentId, doctorId: doctor.id },
    data: { status: raw as AppointmentStatus },
  });

  revalidatePath("/appointments");
  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath(`/appointments/${appointmentId}`);
}

export async function deleteAppointment(formData: FormData) {
  const doctor = await requireDoctor();
  const appointmentId = String(formData.get("appointmentId") ?? "");
  if (!appointmentId) return;

  await prisma.appointment.deleteMany({ where: { id: appointmentId, doctorId: doctor.id } });

  revalidatePath("/appointments");
  revalidatePath("/calendar");
  revalidatePath("/");
  redirect("/appointments");
}
