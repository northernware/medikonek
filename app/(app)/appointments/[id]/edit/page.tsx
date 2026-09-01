import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateAppointment } from "@/app/actions/appointments";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { patientOptions } from "@/lib/queries";
import { toDateTimeLocalValue } from "@/lib/datetime";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Edit appointment" };

export default async function EditAppointmentPage({ params }: PageProps<"/appointments/[id]/edit">) {
  const doctor = await requireDoctor();
  const { id } = await params;

  const appointment = await prisma.appointment.findFirst({ where: { id, doctorId: doctor.id } });
  if (!appointment) notFound();

  const patients = await patientOptions(doctor.id);
  const action = updateAppointment.bind(null, appointment.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Edit appointment" />
      <Card className="p-5 sm:p-6">
        <AppointmentForm
          action={action}
          patients={patients}
          showStatus
          defaults={{
            patientId: appointment.patientId,
            scheduledAt: toDateTimeLocalValue(appointment.scheduledAt),
            durationMinutes: appointment.durationMinutes,
            service: appointment.service,
            reason: appointment.reason,
            status: appointment.status,
            notes: appointment.notes ?? "",
          }}
          submitLabel="Save changes"
          cancelHref={`/appointments/${appointment.id}`}
        />
      </Card>
    </div>
  );
}
