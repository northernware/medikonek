import type { Metadata } from "next";
import Link from "next/link";
import { requireDoctor } from "@/lib/auth";
import { appointmentListQuery, toAppointmentListItem } from "@/lib/queries";
import { instantToDb } from "@/lib/datetime";
import { AppointmentList } from "@/components/appointment-list";
import { buttonClass, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Appointments" };

const VIEWS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "all", label: "All" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

export default async function AppointmentsPage({ searchParams }: PageProps<"/appointments">) {
  const doctor = await requireDoctor();
  const { view } = await searchParams;
  const active: ViewKey = VIEWS.some((v) => v.key === view) ? (view as ViewKey) : "upcoming";

  const now = instantToDb(new Date());

  let query = appointmentListQuery()
    .where((a) => a.doctorId.eq(doctor.id))
    .orderBy((a) => (active === "past" ? a.scheduledAt.desc() : a.scheduledAt.asc()))
    .limit(200);

  if (active === "upcoming") query = query.where((a) => a.scheduledAt.gte(now));
  else if (active === "past") query = query.where((a) => a.scheduledAt.lt(now));

  const appointments = (await query.all()).map(toAppointmentListItem);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Grouped by day, in clinic time."
        actions={
          <Link href="/appointments/new" className={buttonClass("primary")}>
            Book appointment
          </Link>
        }
      />

      <nav aria-label="Filter appointments" className="flex gap-1 border-b border-border">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/appointments?view=${v.key}`}
            aria-current={v.key === active ? "page" : undefined}
            className={[
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              v.key === active
                ? "border-accent text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      <Card>
        <AppointmentList
          appointments={appointments}
          emptyTitle={active === "past" ? "No past appointments" : "Nothing booked"}
          emptyDescription={
            active === "past"
              ? "Completed and cancelled visits will collect here."
              : "Book a visit and it will show up on this list and on your dashboard."
          }
        />
      </Card>
    </div>
  );
}
