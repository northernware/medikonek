import Link from "next/link";
import type { AppointmentStatus, ServiceType } from "@/app/generated/prisma/enums";
import { formatDayHeading, formatTime } from "@/lib/datetime";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONE,
  fullName,
  SERVICE_LABELS,
} from "@/lib/domain";
import { Badge, EmptyState } from "@/components/ui";

export type AppointmentListItem = {
  id: string;
  scheduledAt: Date;
  durationMinutes: number;
  service: ServiceType;
  reason: string;
  status: AppointmentStatus;
  patient: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    family: { id: string; name: string };
  };
  medicalRecord: { id: string } | null;
};

/** Prisma hands back a flat ordered list; the UI reads better cut into days. */
function groupByDay(items: AppointmentListItem[]) {
  const groups: { heading: string; items: AppointmentListItem[] }[] = [];
  for (const item of items) {
    const heading = formatDayHeading(item.scheduledAt);
    const last = groups.at(-1);
    if (last?.heading === heading) last.items.push(item);
    else groups.push({ heading, items: [item] });
  }
  return groups;
}

export function AppointmentList({
  appointments,
  emptyTitle = "Nothing scheduled",
  emptyDescription,
  showDayHeadings = true,
}: {
  appointments: AppointmentListItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  showDayHeadings?: boolean;
}) {
  if (appointments.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  if (!showDayHeadings) {
    return <ul className="divide-y divide-border">{appointments.map(renderRow)}</ul>;
  }

  return (
    <div>
      {groupByDay(appointments).map((group) => (
        <section key={group.heading}>
          <h3 className="border-b border-border bg-surface-muted px-5 py-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
            {group.heading}
          </h3>
          <ul className="divide-y divide-border">{group.items.map(renderRow)}</ul>
        </section>
      ))}
    </div>
  );
}

function renderRow(appointment: AppointmentListItem) {
  return <AppointmentRow key={appointment.id} appointment={appointment} />;
}

function AppointmentRow({ appointment }: { appointment: AppointmentListItem }) {
  const { patient } = appointment;
  return (
    <li className="transition-colors hover:bg-surface-muted">
      <Link href={`/appointments/${appointment.id}`} className="flex items-baseline gap-4 px-5 py-3.5">
        <span className="tabular w-20 shrink-0 text-sm font-medium">
          {formatTime(appointment.scheduledAt)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {fullName(patient)}
            <span className="ml-2 text-xs font-normal text-ink-faint">
              {SERVICE_LABELS[appointment.service]}
            </span>
          </span>
          <span className="block truncate text-sm text-ink-muted">
            {patient.family.name} · {appointment.reason}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {appointment.medicalRecord ? <Badge tone="neutral">Documented</Badge> : null}
          <Badge tone={APPOINTMENT_STATUS_TONE[appointment.status]}>
            {APPOINTMENT_STATUS_LABELS[appointment.status]}
          </Badge>
        </span>
      </Link>
    </li>
  );
}

/** The `include` every query feeding this list needs. Scalars come along by default. */
export const APPOINTMENT_LIST_INCLUDE = {
  patient: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      family: { select: { id: true, name: true } },
    },
  },
  medicalRecord: { select: { id: true } },
} as const;
