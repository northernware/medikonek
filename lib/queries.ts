import "server-only";
import { prisma } from "./prisma";
import { dayKey, formatDateTime, startOfClinicDay } from "./datetime";
import { fullName, SERVICE_LABELS } from "./domain";
import {
  addDays,
  earliestBookableDay,
  latestBookableDay,
  minuteOfDay,
  occupiesSlot,
} from "./scheduling";
import type { BusyByDay, FollowUpOptions, PatientOption } from "./form-defaults";

/** Every patient this doctor can book, ready for a grouped <select>. */
export async function patientOptions(doctorId: string): Promise<PatientOption[]> {
  const patients = await prisma.patient.findMany({
    where: { family: { doctorId } },
    orderBy: [{ family: { name: "asc" } }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      family: { select: { name: true } },
    },
  });

  return patients.map((p) => ({ id: p.id, label: fullName(p), familyName: p.family.name }));
}

/**
 * Everything the booking form needs to offer slots without a round-trip: who can
 * be booked, which minutes of each day are already taken, and which earlier
 * visits a follow-up could point at.
 *
 * The whole bookable window is sent at once rather than fetched per date. For a
 * single doctor that is a few hundred rows, and it makes changing the date or
 * the service instant instead of a loading state.
 */
export async function bookingFormData(doctorId: string, excludeAppointmentId?: string) {
  const now = new Date();
  const earliest = earliestBookableDay(now);
  const latest = latestBookableDay(now);

  const notThisOne = excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {};

  const [patients, booked, previous] = await Promise.all([
    patientOptions(doctorId),
    prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: { gte: startOfClinicDay(earliest), lt: startOfClinicDay(addDays(latest, 1)) },
        ...notThisOne,
      },
      select: { scheduledAt: true, durationMinutes: true, status: true },
    }),
    prisma.appointment.findMany({
      where: { doctorId, scheduledAt: { lt: now }, ...notThisOne },
      orderBy: { scheduledAt: "desc" },
      take: 300,
      select: { id: true, patientId: true, scheduledAt: true, service: true },
    }),
  ]);

  const busyByDay: BusyByDay = {};
  for (const a of booked) {
    if (!occupiesSlot(a.status)) continue; // a cancelled visit frees its time
    const start = minuteOfDay(a.scheduledAt);
    (busyByDay[dayKey(a.scheduledAt)] ??= []).push({ start, end: start + a.durationMinutes });
  }

  const followUps: FollowUpOptions = {};
  for (const a of previous) {
    (followUps[a.patientId] ??= []).push({
      id: a.id,
      label: `${formatDateTime(a.scheduledAt)} — ${SERVICE_LABELS[a.service]}`,
    });
  }

  return { patients, busyByDay, followUps, window: { earliest, latest } };
}
