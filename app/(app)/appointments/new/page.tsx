import type { Metadata } from "next";
import Link from "next/link";
import { createAppointment } from "@/app/actions/appointments";
import {
  AppointmentStatus,
  AppointmentType,
  BookingSource,
  ReminderPreference,
  ServiceType,
  VisitPriority,
} from "@/lib/enums";
import { requireDoctor } from "@/lib/auth";
import { bookingFormData } from "@/lib/queries";
import { isClosedDay } from "@/lib/scheduling";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { buttonClass, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Book appointment" };

/** The requested day, if it is one the clinic could actually take. */
function usableDate(requested: unknown, window: { earliest: string; latest: string }) {
  if (typeof requested !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(requested)) return "";
  if (requested < window.earliest || requested > window.latest) return "";
  return isClosedDay(requested) ? "" : requested;
}

export default async function NewAppointmentPage({ searchParams }: PageProps<"/appointments/new">) {
  const doctor = await requireDoctor();
  const { patientId, date, service, followUpFor } = await searchParams;
  const { patients, busyByDay, followUps, window } = await bookingFormData(doctor.id);

  if (patients.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Book appointment" />
        <Card>
          <EmptyState
            title="No patients to book yet"
            description="Create a household and add its members first — then you can schedule them."
            action={
              <Link href="/households/new" className={buttonClass("primary")}>
                New household
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
          busyByDay={busyByDay}
          followUps={followUps}
          window={window}
          staffFields
          defaults={{
            patientId: preselected ? (patientId as string) : "",
            date: usableDate(date, window),
            time: "",
            service:
              typeof service === "string" && service in ServiceType
                ? (service as ServiceType)
                : ServiceType.GENERAL_CONSULTATION,
            reason: "",
            type: AppointmentType.IN_PERSON,
            priority: VisitPriority.ROUTINE,
            // Staff booking on the patient's behalf, so it is already agreed.
            status: AppointmentStatus.CONFIRMED,
            source: BookingSource.STAFF,
            reminderPreference: ReminderPreference.NONE,
            previousAppointmentId: "",
            room: "",
            notes: "",
            internalNotes: "",
          }}
          submitLabel="Book appointment"
          cancelHref="/appointments"
          followUpForRecordId={typeof followUpFor === "string" ? followUpFor : undefined}
        />
      </Card>
    </div>
  );
}
