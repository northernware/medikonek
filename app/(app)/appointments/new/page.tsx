import type { Metadata } from "next";
import Link from "next/link";
import { createAppointment } from "@/app/actions/appointments";
import { AppointmentStatus } from "@/app/generated/prisma/enums";
import { requireDoctor } from "@/lib/auth";
import { patientOptions } from "@/lib/queries";
import { toDateTimeLocalValue } from "@/lib/datetime";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { buttonClass, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Book appointment" };

/** Next open slot: tomorrow at 09:00 in clinic time. */
function defaultSlot() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return `${toDateTimeLocalValue(tomorrow).slice(0, 10)}T09:00`;
}

export default async function NewAppointmentPage({ searchParams }: PageProps<"/appointments/new">) {
  const doctor = await requireDoctor();
  const { patientId } = await searchParams;
  const patients = await patientOptions(doctor.id);

  if (patients.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Book appointment" />
        <Card>
          <EmptyState
            title="No patients to book yet"
            description="Create a family and add its members first — then you can schedule them."
            action={
              <Link href="/families/new" className={buttonClass("primary")}>
                New family
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const preselected = typeof patientId === "string" && patients.some((p) => p.id === patientId);

  return (
    <div className="space-y-6">
      <PageHeader title="Book appointment" />
      <Card className="p-5 sm:p-6">
        <AppointmentForm
          action={createAppointment}
          patients={patients}
          defaults={{
            patientId: preselected ? (patientId as string) : "",
            scheduledAt: defaultSlot(),
            durationMinutes: 30,
            reason: "",
            status: AppointmentStatus.SCHEDULED,
            notes: "",
          }}
          submitLabel="Book appointment"
          cancelHref="/appointments"
        />
      </Card>
    </div>
  );
}
