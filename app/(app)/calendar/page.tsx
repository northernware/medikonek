import type { Metadata } from "next";
import Link from "next/link";
import { AppointmentStatus } from "@/app/generated/prisma/enums";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clinicMonthRange,
  dayKey,
  formatDayKeyHeading,
  formatMonthHeading,
  formatTime,
  monthGrid,
  parseMonthKey,
  shiftMonth,
  WEEKDAY_LABELS,
} from "@/lib/datetime";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONE,
  fullName,
  SERVICE_LABELS,
  SERVICE_SHORT_LABELS,
} from "@/lib/domain";
import { Badge, buttonClass, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Calendar" };

/** Cancelled bookings still occupy history but should not read as booked time. */
const OCCUPIES_SLOT: Record<AppointmentStatus, boolean> = {
  SCHEDULED: true,
  COMPLETED: true,
  NO_SHOW: true,
  CANCELLED: false,
};

const DOT_TONE: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-accent",
  COMPLETED: "bg-ok",
  NO_SHOW: "bg-warn",
  CANCELLED: "bg-border-strong",
};

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const doctor = await requireDoctor();
  const { month, day } = await searchParams;

  const now = new Date();
  const { year, month: monthNumber } = parseMonthKey(month, now);
  const range = clinicMonthRange(year, monthNumber);

  const appointments = await prisma.appointment.findMany({
    where: { doctorId: doctor.id, scheduledAt: { gte: range.start, lt: range.end } },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      scheduledAt: true,
      durationMinutes: true,
      service: true,
      reason: true,
      status: true,
      patient: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          family: { select: { name: true } },
        },
      },
    },
  });

  // One pass into day buckets — the grid then reads each cell in O(1).
  const byDay = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const key = dayKey(appointment.scheduledAt);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(appointment);
    else byDay.set(key, [appointment]);
  }

  const weeks = monthGrid(year, monthNumber);
  const todayKey = dayKey(now);
  const monthPrefix = `${year}-${String(monthNumber).padStart(2, "0")}`;

  // Default the day panel to today when today is in view, else the first day
  // that actually has something booked.
  const requestedDay = typeof day === "string" && byDay.has(day) ? day : undefined;
  const selectedDay =
    requestedDay ??
    (todayKey.startsWith(monthPrefix) ? todayKey : undefined) ??
    [...byDay.keys()].sort()[0];

  const selected = selectedDay ? (byDay.get(selectedDay) ?? []) : [];
  const bookedDays = [...byDay.entries()].filter(([, list]) =>
    list.some((a) => OCCUPIES_SLOT[a.status]),
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        subtitle={`${appointments.length} booked across ${bookedDays} ${bookedDays === 1 ? "day" : "days"} this month`}
        actions={
          <Link href="/appointments/new" className={buttonClass("primary")}>
            Book appointment
          </Link>
        }
      />

      <Card>
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          <Link
            href={`/calendar?month=${shiftMonth(year, monthNumber, -1)}`}
            aria-label="Previous month"
            className={buttonClass("ghost", "px-2.5")}
          >
            ‹
          </Link>
          <div className="flex items-baseline gap-3">
            <h2 className="text-sm font-semibold">{formatMonthHeading(year, monthNumber)}</h2>
            {!todayKey.startsWith(monthPrefix) ? (
              <Link href="/calendar" className="text-xs font-medium text-accent-ink hover:underline">
                Today
              </Link>
            ) : null}
          </div>
          <Link
            href={`/calendar?month=${shiftMonth(year, monthNumber, 1)}`}
            aria-label="Next month"
            className={buttonClass("ghost", "px-2.5")}
          >
            ›
          </Link>
        </div>

        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="px-2 py-2 text-center text-xs font-semibold tracking-wide text-ink-faint uppercase"
            >
              <span className="sm:hidden">{label[0]}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {weeks.flat().map((cell) => {
            const items = byDay.get(cell.key) ?? [];
            const isToday = cell.key === todayKey;
            const isSelected = cell.key === selectedDay;

            return (
              <Link
                key={cell.key}
                href={`/calendar?month=${monthPrefix}&day=${cell.key}`}
                aria-current={isSelected ? "date" : undefined}
                className={[
                  "min-h-20 border-r border-b border-border p-1.5 text-left transition-colors sm:min-h-28 sm:p-2",
                  "[&:nth-child(7n)]:border-r-0 hover:bg-surface-muted",
                  cell.inMonth ? "" : "bg-surface-muted/40 text-ink-faint",
                  isSelected ? "ring-2 ring-accent ring-inset" : "",
                ].join(" ")}
              >
                <span
                  className={[
                    "tabular inline-grid size-6 place-items-center rounded-full text-xs font-medium",
                    isToday ? "bg-accent text-on-accent" : cell.inMonth ? "text-ink" : "",
                  ].join(" ")}
                >
                  {cell.day}
                </span>

                {items.length > 0 ? (
                  <>
                    {/* Phones get density dots; there is no room for times. */}
                    <span className="mt-1 flex flex-wrap gap-1 sm:hidden">
                      {items.slice(0, 4).map((a) => (
                        <span key={a.id} className={`size-1.5 rounded-full ${DOT_TONE[a.status]}`} />
                      ))}
                    </span>

                    <span className="mt-1 hidden flex-col gap-0.5 sm:flex">
                      {items.slice(0, 3).map((a) => (
                        <span key={a.id} className="flex items-center gap-1 truncate text-[11px]">
                          <span className={`size-1.5 shrink-0 rounded-full ${DOT_TONE[a.status]}`} />
                          <span className="tabular shrink-0 font-medium">
                            {formatTime(a.scheduledAt)}
                          </span>
                          <span className="truncate text-ink-muted">{a.patient.lastName}</span>
                        </span>
                      ))}
                      {items.length > 3 ? (
                        <span className="text-[11px] text-ink-faint">+{items.length - 3} more</span>
                      ) : null}
                    </span>
                  </>
                ) : null}
              </Link>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={selectedDay ? formatDayKeyHeading(selectedDay) : "No bookings this month"}
          subtitle={
            selected.length > 0
              ? `${selected.length} ${selected.length === 1 ? "appointment" : "appointments"}`
              : undefined
          }
        />
        {selected.length === 0 ? (
          <EmptyState
            title="Nothing booked"
            description={
              selectedDay
                ? "Pick another day in the grid above, or book this one."
                : "No appointments fall in this month."
            }
            action={
              <Link href="/appointments/new" className={buttonClass("primary")}>
                Book appointment
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {selected.map((a) => (
              <li key={a.id} className="transition-colors hover:bg-surface-muted">
                <Link href={`/appointments/${a.id}`} className="flex items-baseline gap-4 px-5 py-3.5">
                  <span className="tabular w-20 shrink-0 text-sm font-medium">
                    {formatTime(a.scheduledAt)}
                    <span className="mt-0.5 block text-xs font-normal text-ink-faint">
                      {a.durationMinutes} min
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {fullName(a.patient)}
                      <span className="ml-2 text-xs font-normal text-ink-faint">
                        <span className="sm:hidden">{SERVICE_SHORT_LABELS[a.service]}</span>
                        <span className="hidden sm:inline">{SERVICE_LABELS[a.service]}</span>
                      </span>
                    </span>
                    <span className="block truncate text-sm text-ink-muted">
                      {a.patient.family.name} · {a.reason}
                    </span>
                  </span>
                  <Badge tone={APPOINTMENT_STATUS_TONE[a.status]}>
                    {APPOINTMENT_STATUS_LABELS[a.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
