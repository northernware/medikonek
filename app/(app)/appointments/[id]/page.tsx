import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteAppointment, setAppointmentStatus } from "@/app/actions/appointments";
import { AppointmentStatus } from "@/app/generated/prisma/enums";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/datetime";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONE,
  ageFrom,
  fullName,
  SERVICE_DESCRIPTIONS,
  SERVICE_LABELS,
} from "@/lib/domain";
import { DangerZone } from "@/components/danger-zone";
import { Badge, buttonClass, Card, Detail, PageHeader, Prose } from "@/components/ui";

export const metadata: Metadata = { title: "Appointment" };

const QUICK_STATUSES = [
  { value: AppointmentStatus.COMPLETED, label: "Mark completed" },
  { value: AppointmentStatus.NO_SHOW, label: "Mark no-show" },
  { value: AppointmentStatus.CANCELLED, label: "Cancel" },
  { value: AppointmentStatus.SCHEDULED, label: "Reopen" },
] as const;

export default async function AppointmentPage({ params }: PageProps<"/appointments/[id]">) {
  const doctor = await requireDoctor();
  const { id } = await params;

  const appointment = await prisma.appointment.findFirst({
    where: { id, doctorId: doctor.id },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          dateOfBirth: true,
          allergies: true,
          family: { select: { id: true, name: true } },
        },
      },
      medicalRecord: { select: { id: true } },
    },
  });
  if (!appointment) notFound();

  const { patient } = appointment;

  return (
    <div className="space-y-6">
      <PageHeader
        title={fullName(patient)}
        subtitle={
          <>
            {formatDateTime(appointment.scheduledAt)} · {appointment.durationMinutes} min ·{" "}
            <Link href={`/families/${patient.family.id}`} className="text-accent-ink hover:underline">
              {patient.family.name} family
            </Link>
          </>
        }
        actions={
          appointment.medicalRecord ? (
            <Link href={`/records/${appointment.medicalRecord.id}`} className={buttonClass("primary")}>
              View record
            </Link>
          ) : (
            <Link
              href={`/records/new?patientId=${patient.id}&appointmentId=${appointment.id}`}
              className={buttonClass("primary")}
            >
              Document visit
            </Link>
          )
        }
      />

      {patient.allergies ? (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-5 py-4">
          <p className="text-xs font-semibold tracking-wide text-danger-ink uppercase">Allergies</p>
          <p className="mt-1 text-sm whitespace-pre-wrap text-danger-ink">{patient.allergies}</p>
        </div>
      ) : null}

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Badge tone={APPOINTMENT_STATUS_TONE[appointment.status]}>
            {APPOINTMENT_STATUS_LABELS[appointment.status]}
          </Badge>
          {appointment.medicalRecord ? <Badge tone="neutral">Documented</Badge> : null}
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail
            label="Service"
            value={
              <>
                {SERVICE_LABELS[appointment.service]}
                <span className="mt-0.5 block text-xs text-ink-faint">
                  {SERVICE_DESCRIPTIONS[appointment.service]}
                </span>
              </>
            }
          />
          <Detail
            label="Patient"
            value={
              <Link href={`/patients/${patient.id}`} className="text-accent-ink hover:underline">
                {fullName(patient)}, {ageFrom(patient.dateOfBirth)}
              </Link>
            }
          />
          <Detail label="Reason for visit" value={appointment.reason} />
        </dl>

        {appointment.notes ? (
          <div className="mt-4 border-t border-border pt-4">
            <Prose label="Scheduling notes" text={appointment.notes} />
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          {QUICK_STATUSES.filter((s) => s.value !== appointment.status).map((status) => (
            <form key={status.value} action={setAppointmentStatus}>
              <input type="hidden" name="appointmentId" value={appointment.id} />
              <input type="hidden" name="status" value={status.value} />
              <button className={buttonClass("secondary")}>{status.label}</button>
            </form>
          ))}
          <Link href={`/appointments/${appointment.id}/edit`} className={buttonClass("ghost")}>
            Reschedule
          </Link>
        </div>
      </Card>

      <DangerZone
        action={deleteAppointment}
        fieldName="appointmentId"
        fieldValue={appointment.id}
        summary="Delete this appointment"
        warning="Removes the booking entirely. If the visit happened, cancelling or marking it a no-show keeps a more honest history than deleting it."
        confirmLabel="Delete appointment"
      />
    </div>
  );
}
