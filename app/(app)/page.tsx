import Link from "next/link";
import { setAppointmentStatus } from "@/app/actions/appointments";
import { requireDoctor } from "@/lib/auth";
import { orm } from "@/src/prisma/db";
import { followUpsDue } from "@/lib/queries";
import {
  clinicDayRange,
  formatCalendarDate,
  formatDate,
  formatDayHeading,
  formatTime,
  instantFromDb,
  instantToDb,
  calendarDateFromDb,
} from "@/lib/datetime";
import {
  ACTIVE_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONE,
  fullName,
  SERVICE_LABELS,
} from "@/lib/domain";
import { appointmentListQuery, toAppointmentListItem } from "@/lib/queries";
import { Badge, buttonClass, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui";

export default async function DashboardPage() {
  const doctor = await requireDoctor();
  const now = new Date();
  const today = clinicDayRange(now);

  const [todaysRows, waitingRows, dueFollowUpRows, missedRows, upcomingCount, householdCount, patientCount] =
    await Promise.all([
      appointmentListQuery()
        .where((a) => a.doctorId.eq(doctor.id))
        .where((a) => a.scheduledAt.gte(instantToDb(today.start)))
        .where((a) => a.scheduledAt.lt(instantToDb(today.end)))
        .orderBy((a) => a.scheduledAt.asc())
        .all(),
      // The waiting room: checked in, wherever that appointment sits in time.
      orm.Appointment
        .select("id", "scheduledAt", "service", "reason")
        .include("patient", (p) => p.select("id", "firstName", "middleName", "lastName"))
        .include("medicalRecord", (r) => r.select("id"))
        .where((a) => a.doctorId.eq(doctor.id))
        .where((a) => a.status.eq("CHECKED_IN"))
        .orderBy((a) => a.scheduledAt.asc())
        .all(),
      followUpsDue(doctor.id),
      orm.Appointment
        .select("id", "scheduledAt", "status", "reason")
        .include("patient", (p) => p.select("id", "firstName", "middleName", "lastName"))
        .where((a) => a.doctorId.eq(doctor.id))
        .where((a) => a.status.in(["CANCELLED", "NO_SHOW"]))
        .where((a) => a.scheduledAt.gte(instantToDb(new Date(now.getTime() - 30 * 86_400_000))))
        .where((a) => a.scheduledAt.lt(instantToDb(today.end)))
        .orderBy((a) => a.scheduledAt.desc())
        .limit(8)
        .all(),
      orm.Appointment
        .where((a) => a.doctorId.eq(doctor.id))
        .where((a) => a.scheduledAt.gte(instantToDb(today.end)))
        .where((a) => a.status.in(ACTIVE_STATUSES))
        .aggregate((agg) => ({ n: agg.count() })),
      orm.Household
        .where((h) => h.doctorId.eq(doctor.id))
        .aggregate((agg) => ({ n: agg.count() })),
      orm.Patient
        .where((p) => p.household.some((h) => h.doctorId.eq(doctor.id)))
        .aggregate((agg) => ({ n: agg.count() })),
    ]);

  // Prisma 8 reads temporal columns as text; the UI works in `Date`, so each list
  // is converted once here rather than at every call site below.
  const todays = todaysRows.map(toAppointmentListItem);
  const waiting = waitingRows.map((a) => ({ ...a, scheduledAt: instantFromDb(a.scheduledAt) }));
  const missed = missedRows.map((a) => ({ ...a, scheduledAt: instantFromDb(a.scheduledAt) }));
  const dueFollowUps = dueFollowUpRows.map((r) => ({
    ...r,
    visitDate: instantFromDb(r.visitDate),
    followUpDate: r.followUpDate ? calendarDateFromDb(r.followUpDate) : null,
  }));
  const remaining = todays.filter(
    (a) => ACTIVE_STATUSES.includes(a.status) && a.scheduledAt >= now,
  ).length;

  const firstName = doctor.fullName.replace(/^Dr\.?\s+/i, "").split(/\s+/)[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Good day, ${firstName}`}
        subtitle={formatDayHeading(now)}
        actions={
          <>
            <Link href="/appointments/new" className={buttonClass("primary")}>
              Book appointment
            </Link>
            <Link href="/households" className={buttonClass("secondary")}>
              Add patient
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Today"
          value={todays.length}
          hint={remaining > 0 ? `${remaining} still to come` : "Nothing left today"}
        />
        <Stat
          label="Waiting"
          value={waiting.length}
          hint={waiting.length > 0 ? "Checked in, not seen" : "Nobody checked in"}
        />
        <Stat
          label="Follow-ups due"
          value={dueFollowUps.length}
          hint={dueFollowUps.length > 0 ? "Asked for, not booked" : "All booked"}
        />
        <Stat label="Upcoming" value={upcomingCount.n} hint="Booked after today" />
      </div>

      {waiting.length > 0 ? (
        <Card className="border-accent/40">
          <CardHeader title="Waiting room" subtitle="Checked in and waiting to be seen." />
          <ul className="divide-y divide-border">
            {waiting.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <span className="tabular w-20 shrink-0 text-sm font-medium">
                  {formatTime(a.scheduledAt)}
                  {a.scheduledAt < today.start ? (
                    <span className="block text-xs font-normal text-warn-ink">
                      {formatDate(a.scheduledAt)}
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/patients/${a.patient.id}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {fullName(a.patient)}
                  </Link>
                  <span className="block truncate text-sm text-ink-muted">
                    {SERVICE_LABELS[a.service]} · {a.reason}
                  </span>
                </span>
                {a.medicalRecord ? (
                  <Link href={`/records/${a.medicalRecord.id}`} className={buttonClass("secondary")}>
                    View record
                  </Link>
                ) : (
                  <Link
                    href={`/records/new?patientId=${a.patient.id}&appointmentId=${a.id}`}
                    className={buttonClass("primary")}
                  >
                    Start consultation
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Today's schedule"
          action={
            <Link href="/appointments" className="text-sm font-medium text-accent-ink hover:underline">
              All appointments
            </Link>
          }
        />
        {todays.length === 0 ? (
          <EmptyState title="A clear day" description="No appointments booked for today." />
        ) : (
          <ul className="divide-y divide-border">
            {todays.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-muted"
              >
                <span className="tabular w-20 shrink-0 text-sm font-medium">
                  {formatTime(a.scheduledAt)}
                </span>
                <Link href={`/appointments/${a.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{fullName(a.patient)}</span>
                  <span className="block truncate text-sm text-ink-muted">
                    {a.patient.household.name} · {a.reason}
                  </span>
                </Link>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge tone={APPOINTMENT_STATUS_TONE[a.status]}>
                    {APPOINTMENT_STATUS_LABELS[a.status]}
                  </Badge>
                  {/* One click moves the patient to the next step of the flow. */}
                  {a.status === "PENDING" || a.status === "CONFIRMED" ? (
                    <form action={setAppointmentStatus}>
                      <input type="hidden" name="appointmentId" value={a.id} />
                      <input type="hidden" name="status" value="CHECKED_IN" />
                      <button className={buttonClass("secondary")}>Check in</button>
                    </form>
                  ) : a.status === "CHECKED_IN" && !a.medicalRecord ? (
                    <Link
                      href={`/records/new?patientId=${a.patient.id}&appointmentId=${a.id}`}
                      className={buttonClass("primary")}
                    >
                      Start consultation
                    </Link>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Follow-ups due"
          subtitle="A documented visit asked for one, and it has not been booked."
        />
        {dueFollowUps.length === 0 ? (
          <EmptyState
            title="Nothing outstanding"
            description="Every follow-up a consultation asked for has an appointment against it."
          />
        ) : (
          <ul className="divide-y divide-border">
            {dueFollowUps.map((r) => {
              const overdue = r.followUpDate! < today.start;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <span className="tabular w-32 shrink-0 text-sm">
                    <span className={overdue ? "font-medium text-danger-ink" : "text-ink-muted"}>
                      {formatCalendarDate(r.followUpDate!)}
                    </span>
                    {overdue ? <span className="block text-xs text-danger-ink">Overdue</span> : null}
                  </span>
                  <Link href={`/records/${r.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{fullName(r.patient)}</span>
                    <span className="block truncate text-sm text-ink-muted">
                      From {formatDate(r.visitDate)} · {r.chiefComplaint}
                    </span>
                  </Link>
                  <Link
                    href={`/appointments/new?patientId=${r.patient.id}&service=FOLLOW_UP_CHECKUP&followUpFor=${r.id}`}
                    className={buttonClass("secondary")}
                  >
                    Book follow-up
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {missed.length > 0 ? (
        <Card>
          <CardHeader
            title="Cancellations and no-shows"
            subtitle="Last 30 days — worth a call, or a rebooking."
          />
          <ul className="divide-y divide-border">
            {missed.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="tabular w-32 shrink-0 text-sm text-ink-muted">
                  {formatDate(a.scheduledAt)}
                </span>
                <Link href={`/appointments/${a.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{fullName(a.patient)}</span>
                  <span className="block truncate text-sm text-ink-muted">{a.reason}</span>
                </Link>
                <Badge tone={APPOINTMENT_STATUS_TONE[a.status]}>
                  {APPOINTMENT_STATUS_LABELS[a.status]}
                </Badge>
                <Link href={`/appointments/new?patientId=${a.patient.id}`} className={buttonClass("ghost")}>
                  Rebook
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Households" value={householdCount.n} />
        <Stat label="Patients" value={patientCount.n} />
      </div>
    </div>
  );
}
