import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteMedicalRecord } from "@/app/actions/records";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCalendarDate, formatDateTime } from "@/lib/datetime";
import { ageFrom, bloodPressure, bmi, fullName, SEX_LABELS } from "@/lib/domain";
import { AllergyBanner, ALLERGY_SELECT } from "@/components/allergy-banner";
import { DangerZone } from "@/components/danger-zone";
import { buttonClass, Card, CardHeader, Detail, PageHeader, Prose } from "@/components/ui";

export const metadata: Metadata = { title: "Medical record" };

export default async function RecordPage({ params }: PageProps<"/records/[id]">) {
  const doctor = await requireDoctor();
  const { id } = await params;

  const record = await prisma.medicalRecord.findFirst({
    where: { id, doctorId: doctor.id },
    include: {
      patient: {
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
      },
      appointment: { select: { id: true, scheduledAt: true, reason: true } },
      prescriptions: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!record) notFound();

  const { patient } = record;
  const vitals = [
    { label: "Temp", value: record.temperatureC, unit: "°C" },
    { label: "Pulse", value: record.heartRate, unit: "bpm" },
    { label: "Resp", value: record.respiratoryRate, unit: "/min" },
    { label: "BP", value: bloodPressure(record.systolic, record.diastolic), unit: "mmHg" },
    { label: "SpO₂", value: record.oxygenSaturation, unit: "%" },
    { label: "Weight", value: record.weightKg, unit: "kg" },
    { label: "Height", value: record.heightCm, unit: "cm" },
    { label: "BMI", value: bmi(record.weightKg, record.heightCm), unit: "" },
  ].filter((v) => v.value != null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={record.chiefComplaint}
        subtitle={
          <>
            <Link href={`/patients/${patient.id}`} className="text-accent-ink hover:underline">
              {fullName(patient)}
            </Link>
            {" · "}
            {SEX_LABELS[patient.sex]} · {ageFrom(patient.dateOfBirth, record.visitDate)} at visit ·{" "}
            {formatDateTime(record.visitDate)}
          </>
        }
        actions={
          <Link href={`/records/${record.id}/edit`} className={buttonClass("secondary")}>
            Edit record
          </Link>
        }
      />

      <AllergyBanner status={patient.allergyStatus} allergies={patient.allergies} />

      {vitals.length > 0 ? (
        <Card>
          <CardHeader title="Vitals" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 py-4 sm:grid-cols-4">
            {vitals.map((v) => (
              <Detail
                key={v.label}
                label={v.label}
                value={
                  <span className="tabular text-base font-medium">
                    {v.value}
                    {v.unit ? <span className="ml-1 text-xs text-ink-faint">{v.unit}</span> : null}
                  </span>
                }
              />
            ))}
          </dl>
        </Card>
      ) : null}

      <Card className="space-y-5 p-5">
        <Prose label="History of present illness" text={record.historyOfPresentIllness} />
        <Prose label="Assessment" text={record.assessment} />
        <Prose label="Treatment plan" text={record.treatmentPlan} />
        <Prose label="Notes" text={record.notes} />
        {record.followUpDate ? (
          <Detail label="Follow-up" value={formatCalendarDate(record.followUpDate)} />
        ) : null}
        {record.appointment ? (
          <Detail
            label="From appointment"
            value={
              <Link
                href={`/appointments/${record.appointment.id}`}
                className="text-accent-ink hover:underline"
              >
                {formatDateTime(record.appointment.scheduledAt)} — {record.appointment.reason}
              </Link>
            }
          />
        ) : (
          <Detail label="From appointment" value="Walk-in" />
        )}
      </Card>

      {record.prescriptions.length > 0 ? (
        <Card>
          <CardHeader title="Prescriptions" subtitle={`${record.prescriptions.length} item(s)`} />
          <ul className="divide-y divide-border">
            {record.prescriptions.map((rx) => (
              <li key={rx.id} className="px-5 py-4">
                <p className="font-medium">{rx.drugName}</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(" · ")}
                </p>
                {rx.instructions ? (
                  <p className="mt-1 text-sm text-ink-faint">{rx.instructions}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <DangerZone
        action={deleteMedicalRecord}
        fieldName="recordId"
        fieldValue={record.id}
        summary="Delete this record"
        warning="Permanently removes this encounter and its prescriptions from the patient's history. Correcting the record is almost always better than deleting it."
        confirmLabel="Delete record"
      />
    </div>
  );
}
