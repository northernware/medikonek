import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePatient } from "@/app/actions/patients";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCalendarDate, formatDate } from "@/lib/datetime";
import {
  ageFrom,
  bloodPressure,
  BLOOD_TYPE_LABELS,
  fullName,
  RELATIONSHIP_LABELS,
  SEX_LABELS,
} from "@/lib/domain";
import { AppointmentList, APPOINTMENT_LIST_INCLUDE } from "@/components/appointment-list";
import { AllergyBanner, ALLERGY_SELECT } from "@/components/allergy-banner";
import { DangerZone } from "@/components/danger-zone";
import { Badge, buttonClass, Card, CardHeader, Detail, EmptyState, PageHeader } from "@/components/ui";

export async function generateMetadata({ params }: PageProps<"/patients/[id]">): Promise<Metadata> {
  const doctor = await requireDoctor();
  const { id } = await params;
  const patient = await prisma.patient.findFirst({
    where: { id, household: { doctorId: doctor.id } },
    select: { firstName: true, middleName: true, lastName: true },
  });
  return { title: patient ? fullName(patient) : "Patient" };
}

export default async function PatientPage({ params }: PageProps<"/patients/[id]">) {
  const doctor = await requireDoctor();
  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { id, household: { doctorId: doctor.id } },
    include: {
      household: { select: { id: true, name: true, contactNumber: true } },
      allergies: { select: ALLERGY_SELECT },
      conditions: { orderBy: { label: "asc" }, select: { id: true, label: true, notes: true } },
      medicalRecords: {
        orderBy: { visitDate: "desc" },
        select: {
          id: true,
          visitDate: true,
          chiefComplaint: true,
          assessment: true,
          systolic: true,
          diastolic: true,
          temperatureC: true,
          weightKg: true,
          _count: { select: { prescriptions: true } },
        },
      },
    },
  });
  if (!patient) notFound();

  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id, doctorId: doctor.id },
    include: APPOINTMENT_LIST_INCLUDE,
    orderBy: { scheduledAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={fullName(patient)}
        subtitle={
          <>
            <Link href={`/households/${patient.household.id}`} className="text-accent-ink hover:underline">
              {patient.household.name} household
            </Link>
            {" · "}
            {RELATIONSHIP_LABELS[patient.relationship]} · {SEX_LABELS[patient.sex]} ·{" "}
            {ageFrom(patient.dateOfBirth)}
          </>
        }
        actions={
          <>
            <Link href={`/records/new?patientId=${patient.id}`} className={buttonClass("primary")}>
              Document visit
            </Link>
            <Link href={`/appointments/new?patientId=${patient.id}`} className={buttonClass("secondary")}>
              Book
            </Link>
            <Link href={`/patients/${patient.id}/edit`} className={buttonClass("secondary")}>
              Edit
            </Link>
          </>
        }
      />

      <AllergyBanner status={patient.allergyStatus} allergies={patient.allergies} />

      <Card className="p-5">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Detail label="Date of birth" value={formatCalendarDate(patient.dateOfBirth)} />
          <Detail label="Blood type" value={BLOOD_TYPE_LABELS[patient.bloodType]} />
          <Detail label="Contact" value={patient.contactNumber ?? patient.household.contactNumber} />
          <Detail label="Email" value={patient.email} />
          <Detail label="Visits recorded" value={patient.medicalRecords.length} />
          <Detail
            label="Chronic conditions"
            value={
              patient.conditions.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {patient.conditions.map((c) => (
                    <Badge key={c.id} tone="accent">
                      {c.label}
                    </Badge>
                  ))}
                </span>
              ) : patient.conditionStatus === "NONE_KNOWN" ? (
                "None known"
              ) : (
                <span className="text-warn-ink">Not asked</span>
              )
            }
          />
        </dl>
        {patient.conditions.some((c) => c.notes) ? (
          <dl className="mt-4 space-y-2 border-t border-border pt-4">
            {patient.conditions
              .filter((c) => c.notes)
              .map((c) => (
                <div key={c.id}>
                  <dt className="text-xs font-medium text-ink-faint">{c.label}</dt>
                  <dd className="text-sm text-pretty">{c.notes}</dd>
                </div>
              ))}
          </dl>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="Visit history"
          subtitle={
            patient.medicalRecords.length > 0
              ? `Most recent first · ${patient.medicalRecords.length} in total`
              : undefined
          }
          action={
            <Link
              href={`/records/new?patientId=${patient.id}`}
              className="text-sm font-medium text-accent-ink hover:underline"
            >
              Document visit
            </Link>
          }
        />
        {patient.medicalRecords.length === 0 ? (
          <EmptyState
            title="No visits recorded"
            description="Document a consultation and it will build this patient's history."
            action={
              <Link href={`/records/new?patientId=${patient.id}`} className={buttonClass("primary")}>
                Document visit
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {patient.medicalRecords.map((record) => {
              const bp = bloodPressure(record.systolic, record.diastolic);
              const vitals = [
                bp ? `BP ${bp}` : null,
                record.temperatureC != null ? `${record.temperatureC}°C` : null,
                record.weightKg != null ? `${record.weightKg} kg` : null,
              ].filter(Boolean);

              return (
                <li key={record.id} className="transition-colors hover:bg-surface-muted">
                  <Link href={`/records/${record.id}`} className="block px-5 py-4">
                    <div className="flex items-baseline gap-4">
                      <span className="tabular w-28 shrink-0 text-sm text-ink-muted">
                        {formatDate(record.visitDate)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{record.chiefComplaint}</span>
                        {record.assessment ? (
                          <span className="mt-0.5 block truncate text-sm text-ink-muted">
                            {record.assessment}
                          </span>
                        ) : null}
                      </span>
                      {record._count.prescriptions > 0 ? (
                        <Badge tone="accent">
                          {record._count.prescriptions} Rx
                        </Badge>
                      ) : null}
                    </div>
                    {vitals.length > 0 ? (
                      <p className="tabular mt-1.5 pl-32 text-xs text-ink-faint">{vitals.join(" · ")}</p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Appointments"
          action={
            <Link
              href={`/appointments/new?patientId=${patient.id}`}
              className="text-sm font-medium text-accent-ink hover:underline"
            >
              Book
            </Link>
          }
        />
        <AppointmentList
          appointments={appointments}
          emptyTitle="No appointments"
          emptyDescription="Nothing booked for this patient, past or future."
        />
      </Card>

      <DangerZone
        action={deletePatient}
        fieldName="patientId"
        fieldValue={patient.id}
        summary="Delete this patient"
        warning={`This permanently removes ${fullName(patient)} along with ${patient.medicalRecords.length} medical record(s) and every appointment. It cannot be undone.`}
        confirmLabel="Delete patient and all records"
      />
    </div>
  );
}
