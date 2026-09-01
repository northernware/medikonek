import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteAppointment, setAppointmentStatus } from "@/app/actions/appointments";
import { AppointmentStatus } from "@/app/generated/prisma/enums";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/datetime";
import {
  ageFrom,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONE,
  APPOINTMENT_TYPE_LABELS,
  BOOKING_SOURCE_LABELS,
  fullName,
  REMINDER_LABELS,
  SERVICE_DESCRIPTIONS,
  SERVICE_LABELS,
  VISIT_PRIORITY_LABELS,
  VISIT_PRIORITY_TONE,
} from "@/lib/domain";
import { AllergyBanner, ALLERGY_SELECT } from "@/components/allergy-banner";
import { DangerZone } from "@/components/danger-zone";
import { Badge, buttonClass, Card, CardHeader, Detail, PageHeader, Prose } from "@/components/ui";

export const metadata: Metadata = { title: "Appointment" };

const STATUS_ACTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "CONFIRMED", label: "Confirm" },
  { value: "CHECKED_IN", label: "Check in" },
  { value: "COMPLETED", label: "Mark completed" },
  { value: "NO_SHOW", label: "Mark no-show" },
  { value: "CANCELLED", label: "Cancel" },
  { value: "PENDING", label: "Back to pending" },
];

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
          allergyStatus: true,
          allergies: { select: ALLERGY_SELECT },
          household: { select: { id: true, name: true } },
        },
      },
      medicalRecord: { select: { id: true } },
      previousAppointment: {
        select: { id: true, scheduledAt: true, service: true },
      },
      followUps: {
        orderBy: { scheduledAt: "asc" },
        select: { id: true, scheduledAt: true, service: true },
      },
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
            <Link href={`/households/${patient.household.id}`} className="text-accent-ink hover:underline">
              {patient.household.name} household
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

      <AllergyBanner status={patient.allergyStatus} allergies={patient.allergies} />

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone={APPOINTMENT_STATUS_TONE[appointment.status]}>
            {APPOINTMENT_STATUS_LABELS[appointment.status]}
          </Badge>
          <Badge tone="neutral">{APPOINTMENT_TYPE_LABELS[appointment.type]}</Badge>
          {appointment.priority !== "ROUTINE" ? (
            <Badge tone={VISIT_PRIORITY_TONE[appointment.priority]}>
              {VISIT_PRIORITY_LABELS[appointment.priority]}
            </Badge>
          ) : null}
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
          <Detail label="Room" value={appointment.room} />
          <Detail
            label="Follows on from"
            value={
              appointment.previousAppointment ? (
                <Link
                  href={`/appointments/${appointment.previousAppointment.id}`}
                  className="text-accent-ink hover:underline"
                >
                  {formatDateTime(appointment.previousAppointment.scheduledAt)} —{" "}
                  {SERVICE_LABELS[appointment.previousAppointment.service]}
                </Link>
              ) : null
            }
          />
          <Detail
            label="Later follow-ups"
            value={
              appointment.followUps.length > 0 ? (
                <ul className="space-y-0.5">
                  {appointment.followUps.map((f) => (
                    <li key={f.id}>
                      <Link href={`/appointments/${f.id}`} className="text-accent-ink hover:underline">
                        {formatDateTime(f.scheduledAt)} — {SERVICE_LABELS[f.service]}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null
            }
          />
        </dl>

        {appointment.notes ? (
          <div className="mt-4 border-t border-border pt-4">
            <Prose label="Scheduling notes" text={appointment.notes} />
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          {STATUS_ACTIONS.filter((s) => s.value !== appointment.status).map((status) => (
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

      <Card>
        <CardHeader title="Clinic use" subtitle="Not shown to the patient." />
        <div className="px-5 py-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Booking source" value={BOOKING_SOURCE_LABELS[appointment.source]} />
            <Detail
              label="Reminder"
              value={REMINDER_LABELS[appointment.reminderPreference]}
            />
          </dl>
          {appointment.internalNotes ? (
            <div className="mt-4 border-t border-border pt-4">
              <Prose label="Internal notes" text={appointment.internalNotes} />
            </div>
          ) : null}
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
