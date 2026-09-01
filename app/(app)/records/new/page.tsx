import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createMedicalRecord } from "@/app/actions/records";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime, toDateTimeLocalValue } from "@/lib/datetime";
import { ageFrom, fullName, SEX_LABELS } from "@/lib/domain";
import { RecordForm } from "@/components/forms/record-form";
import { blankRecord } from "@/lib/form-defaults";
import { AllergyBanner, ALLERGY_SELECT } from "@/components/allergy-banner";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Document visit" };

export default async function NewRecordPage({ searchParams }: PageProps<"/records/new">) {
  const doctor = await requireDoctor();
  const { patientId, appointmentId } = await searchParams;

  if (typeof patientId !== "string") notFound();

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, household: { doctorId: doctor.id } },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      dateOfBirth: true,
      sex: true,
      allergyStatus: true,
      allergies: { select: ALLERGY_SELECT },
      household: { select: { id: true, name: true } },
    },
  });
  if (!patient) notFound();

  const undocumented = await prisma.appointment.findMany({
    where: { patientId: patient.id, doctorId: doctor.id, medicalRecord: { is: null } },
    orderBy: { scheduledAt: "desc" },
    take: 20,
    select: { id: true, scheduledAt: true, reason: true },
  });

  const options = undocumented.map((a) => ({
    id: a.id,
    label: `${formatDateTime(a.scheduledAt)} — ${a.reason}`,
  }));

  const locked =
    typeof appointmentId === "string" ? options.find((o) => o.id === appointmentId) : undefined;

  const defaults = blankRecord(toDateTimeLocalValue(new Date()));
  if (locked) defaults.appointmentId = locked.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document visit"
        subtitle={
          <>
            <Link href={`/patients/${patient.id}`} className="text-accent-ink hover:underline">
              {fullName(patient)}
            </Link>
            {" · "}
            {SEX_LABELS[patient.sex]} · {ageFrom(patient.dateOfBirth)} · {patient.household.name} household
          </>
        }
      />

      <AllergyBanner status={patient.allergyStatus} allergies={patient.allergies} />

      <Card className="p-5 sm:p-6">
        <RecordForm
          action={createMedicalRecord}
          patientId={patient.id}
          defaults={defaults}
          openAppointments={options}
          lockedAppointment={locked}
          submitLabel="Save record"
          cancelHref={`/patients/${patient.id}`}
        />
      </Card>
    </div>
  );
}
