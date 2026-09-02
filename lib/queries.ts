import "server-only";
import { orm } from "@/src/prisma/db";
import {
  calendarDateToDb,
  dayKey,
  formatDateTime,
  instantFromDb,
  instantToDb,
  startOfClinicDay,
} from "./datetime";
import { fullName, SERVICE_LABELS } from "./domain";
import {
  addDays,
  earliestBookableDay,
  latestBookableDay,
  minuteOfDay,
  occupiesSlot,
} from "./scheduling";
import type { AppointmentListItem } from "@/components/appointment-list";
import type { BusyByDay, FollowUpOptions, PatientOption } from "./form-defaults";

/**
 * The columns and relation branches every appointment list renders. Prisma 8
 * composes includes as callbacks rather than a shareable object literal, so the
 * shape lives in this one function and each page adds its own filters to it.
 */
export function appointmentListQuery() {
  return orm.Appointment
    .select("id", "scheduledAt", "durationMinutes", "service", "reason", "status")
    .include("patient", (p) =>
      p
        .select("id", "firstName", "middleName", "lastName")
        .include("household", (h) => h.select("id", "name")),
    )
    .include("medicalRecord", (r) => r.select("id"));
}

/** One row of {@link appointmentListQuery}, with its instant back in `Date` form. */
export function toAppointmentListItem(
  row: Awaited<ReturnType<ReturnType<typeof appointmentListQuery>["all"]>>[number],
): AppointmentListItem {
  return { ...row, scheduledAt: instantFromDb(row.scheduledAt) };
}

/** Every patient this doctor can book, ready for a grouped <select>. */
export async function patientOptions(doctorId: string): Promise<PatientOption[]> {
  const patients = await orm.Patient
    .select("id", "firstName", "middleName", "lastName")
    .include("household", (h) => h.select("name"))
    .where((p) => p.household.some((h) => h.doctorId.eq(doctorId)))
    .all();

  // The ORM orders by columns of the queried model, so the household name — which
  // lives on the joined row — is sorted here instead. This is one doctor's
  // patients, so the list is small enough that the sort costs nothing.
  return patients
    .map((p) => ({ id: p.id, label: fullName(p), householdName: p.household.name }))
    .sort(
      (a, b) =>
        a.householdName.localeCompare(b.householdName) || a.label.localeCompare(b.label),
    );
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

  const windowStart = instantToDb(startOfClinicDay(earliest));
  const windowEnd = instantToDb(startOfClinicDay(addDays(latest, 1)));

  let bookedQuery = orm.Appointment
    .select("scheduledAt", "durationMinutes", "status")
    .where((a) => a.doctorId.eq(doctorId))
    .where((a) => a.scheduledAt.gte(windowStart))
    .where((a) => a.scheduledAt.lt(windowEnd));

  let previousQuery = orm.Appointment
    .select("id", "patientId", "scheduledAt", "service")
    .where((a) => a.doctorId.eq(doctorId))
    .where((a) => a.scheduledAt.lt(instantToDb(now)))
    .orderBy((a) => a.scheduledAt.desc())
    .limit(300);

  if (excludeAppointmentId) {
    bookedQuery = bookedQuery.where((a) => a.id.neq(excludeAppointmentId));
    previousQuery = previousQuery.where((a) => a.id.neq(excludeAppointmentId));
  }

  const [patients, booked, previous] = await Promise.all([
    patientOptions(doctorId),
    bookedQuery.all(),
    previousQuery.all(),
  ]);

  const busyByDay: BusyByDay = {};
  for (const a of booked) {
    if (!occupiesSlot(a.status)) continue; // a cancelled visit frees its time
    const scheduledAt = instantFromDb(a.scheduledAt);
    const start = minuteOfDay(scheduledAt);
    (busyByDay[dayKey(scheduledAt)] ??= []).push({ start, end: start + a.durationMinutes });
  }

  const followUps: FollowUpOptions = {};
  for (const a of previous) {
    (followUps[a.patientId] ??= []).push({
      id: a.id,
      label: `${formatDateTime(instantFromDb(a.scheduledAt))} — ${SERVICE_LABELS[a.service]}`,
    });
  }

  return { patients, busyByDay, followUps, window: { earliest, latest } };
}

/**
 * Records whose follow-up has been asked for but never booked. The explicit
 * `followUpAppointmentId` link is what makes this exact — inferring it from
 * "is there an appointment near that date" would quietly drop real ones.
 */
export async function followUpsDue(doctorId: string, horizonDays = 14) {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + horizonDays);

  return orm.MedicalRecord
    .select("id", "followUpDate", "visitDate", "chiefComplaint")
    .include("patient", (p) => p.select("id", "firstName", "middleName", "lastName"))
    .where((r) => r.doctorId.eq(doctorId))
    .where((r) => r.followUpAppointmentId.isNull())
    .where((r) => r.followUpDate.isNotNull())
    .where((r) => r.followUpDate.lte(calendarDateToDb(horizon)))
    .orderBy((r) => r.followUpDate.asc())
    .limit(25)
    .all();
}
