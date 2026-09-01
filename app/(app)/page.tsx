import Link from "next/link";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clinicDayRange, formatDayHeading, formatDate } from "@/lib/datetime";
import { ACTIVE_STATUSES, fullName } from "@/lib/domain";
import { AppointmentList, APPOINTMENT_LIST_INCLUDE } from "@/components/appointment-list";
import { buttonClass, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui";

export default async function DashboardPage() {
  const doctor = await requireDoctor();
  const now = new Date();
  const today = clinicDayRange(now);

  const [todaysAppointments, upcomingCount, householdCount, patientCount, recentRecords] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { doctorId: doctor.id, scheduledAt: { gte: today.start, lt: today.end } },
        include: APPOINTMENT_LIST_INCLUDE,
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.appointment.count({
        where: {
          doctorId: doctor.id,
          scheduledAt: { gte: today.end },
          status: { in: ACTIVE_STATUSES },
        },
      }),
      prisma.household.count({ where: { doctorId: doctor.id } }),
      prisma.patient.count({ where: { household: { doctorId: doctor.id } } }),
      prisma.medicalRecord.findMany({
        where: { doctorId: doctor.id },
        orderBy: { visitDate: "desc" },
        take: 5,
        select: {
          id: true,
          visitDate: true,
          chiefComplaint: true,
          patient: { select: { firstName: true, middleName: true, lastName: true } },
        },
      }),
    ]);

  const remaining = todaysAppointments.filter(
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
            <Link href="/households/new" className={buttonClass("secondary")}>
              New household
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Today"
          value={todaysAppointments.length}
          hint={remaining > 0 ? `${remaining} still to come` : "Nothing left today"}
        />
        <Stat label="Upcoming" value={upcomingCount} hint="Booked after today" />
        <Stat label="Households" value={householdCount} />
        <Stat label="Patients" value={patientCount} />
      </div>

      <Card>
        <CardHeader
          title="Today's schedule"
          action={
            <Link href="/appointments" className="text-sm font-medium text-accent-ink hover:underline">
              All appointments
            </Link>
          }
        />
        <AppointmentList
          appointments={todaysAppointments}
          showDayHeadings={false}
          emptyTitle="A clear day"
          emptyDescription="No appointments booked for today."
        />
      </Card>

      <Card>
        <CardHeader title="Recently documented" />
        {recentRecords.length === 0 ? (
          <EmptyState
            title="No records yet"
            description="Records appear here once you document a visit from a patient's chart."
          />
        ) : (
          <ul className="divide-y divide-border">
            {recentRecords.map((record) => (
              <li key={record.id} className="transition-colors hover:bg-surface-muted">
                <Link href={`/records/${record.id}`} className="flex items-baseline gap-4 px-5 py-3.5">
                  <span className="tabular w-28 shrink-0 text-sm text-ink-muted">
                    {formatDate(record.visitDate)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{fullName(record.patient)}</span>
                    <span className="block truncate text-sm text-ink-muted">{record.chiefComplaint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
