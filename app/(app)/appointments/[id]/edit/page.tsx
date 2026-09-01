import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateAppointment } from "@/app/actions/appointments";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingFormData } from "@/lib/queries";
import { dayKey, toDateTimeLocalValue } from "@/lib/datetime";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Edit appointment" };

export default async function EditAppointmentPage({ params }: PageProps<"/appointments/[id]/edit">) {
  const doctor = await requireDoctor();
  const { id } = await params;

  const appointment = await prisma.appointment.findFirst({ where: { id, doctorId: doctor.id } });
  if (!appointment) notFound();

  // Excluding this booking is what lets its own slot read as free.
  const { patients, busyByDay, followUps, window } = await bookingFormData(doctor.id, appointment.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Edit appointment" />
      <Card className="p-5 sm:p-6">
        <AppointmentForm
          action={updateAppointment.bind(null, appointment.id)}
          patients={patients}
          busyByDay={busyByDay}
          followUps={followUps}
          window={window}
          staffFields
          defaults={{
            patientId: appointment.patientId,
            date: dayKey(appointment.scheduledAt),
            time: toDateTimeLocalValue(appointment.scheduledAt).slice(11, 16),
            service: appointment.service,
            reason: appointment.reason,
            type: appointment.type,
            priority: appointment.priority,
            status: appointment.status,
            source: appointment.source,
            reminderPreference: appointment.reminderPreference,
            previousAppointmentId: appointment.previousAppointmentId ?? "",
            room: appointment.room ?? "",
            notes: appointment.notes ?? "",
            internalNotes: appointment.internalNotes ?? "",
          }}
          submitLabel="Save changes"
          cancelHref={`/appointments/${appointment.id}`}
        />
      </Card>
    </div>
  );
}
