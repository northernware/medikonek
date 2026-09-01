import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteFamily } from "@/app/actions/families";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCalendarDate } from "@/lib/datetime";
import { ageFrom, fullName, RELATIONSHIP_LABELS, SEX_LABELS } from "@/lib/domain";
import { AppointmentList, APPOINTMENT_LIST_INCLUDE } from "@/components/appointment-list";
import { DangerZone } from "@/components/danger-zone";
import { Badge, buttonClass, Card, CardHeader, Detail, EmptyState, PageHeader, Prose } from "@/components/ui";

async function loadFamily(doctorId: string, familyId: string) {
  return prisma.family.findFirst({
    where: { id: familyId, doctorId },
    include: {
      patients: {
        orderBy: [{ dateOfBirth: "asc" }],
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          dateOfBirth: true,
          sex: true,
          relationship: true,
          allergies: true,
          _count: { select: { medicalRecords: true } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps<"/families/[id]">): Promise<Metadata> {
  const doctor = await requireDoctor();
  const { id } = await params;
  const family = await prisma.family.findFirst({
    where: { id, doctorId: doctor.id },
    select: { name: true },
  });
  return { title: family ? `${family.name} family` : "Family" };
}

export default async function FamilyPage({ params }: PageProps<"/families/[id]">) {
  const doctor = await requireDoctor();
  const { id } = await params;

  const family = await loadFamily(doctor.id, id);
  if (!family) notFound();

  const upcoming = await prisma.appointment.findMany({
    where: { doctorId: doctor.id, patient: { familyId: family.id }, scheduledAt: { gte: new Date() } },
    include: APPOINTMENT_LIST_INCLUDE,
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${family.name} family`}
        subtitle={`${family.patients.length} ${family.patients.length === 1 ? "member" : "members"}`}
        actions={
          <>
            <Link href={`/families/${family.id}/patients/new`} className={buttonClass("primary")}>
              Add member
            </Link>
            <Link href={`/families/${family.id}/edit`} className={buttonClass("secondary")}>
              Edit
            </Link>
          </>
        }
      />

      <Card className="p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Address" value={family.address} />
          <Detail label="Contact number" value={family.contactNumber} />
        </dl>
        {family.notes ? (
          <div className="mt-4 border-t border-border pt-4">
            <Prose label="Household notes" text={family.notes} />
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="Members"
          action={
            <Link
              href={`/families/${family.id}/patients/new`}
              className="text-sm font-medium text-accent-ink hover:underline"
            >
              Add member
            </Link>
          }
        />
        {family.patients.length === 0 ? (
          <EmptyState
            title="No members yet"
            description="Add the people in this household so you can book them and keep their records."
            action={
              <Link href={`/families/${family.id}/patients/new`} className={buttonClass("primary")}>
                Add member
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {family.patients.map((patient) => (
              <li key={patient.id} className="transition-colors hover:bg-surface-muted">
                <Link href={`/patients/${patient.id}`} className="flex items-baseline gap-4 px-5 py-4">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="truncate font-medium">{fullName(patient)}</span>
                      {patient.allergies ? <Badge tone="danger">Allergies</Badge> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-ink-muted">
                      {RELATIONSHIP_LABELS[patient.relationship]} · {SEX_LABELS[patient.sex]} ·{" "}
                      {ageFrom(patient.dateOfBirth)} · born {formatCalendarDate(patient.dateOfBirth)}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm text-ink-muted">
                    {patient._count.medicalRecords}{" "}
                    {patient._count.medicalRecords === 1 ? "visit" : "visits"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Upcoming appointments" />
        <AppointmentList
          appointments={upcoming}
          emptyTitle="Nothing booked"
          emptyDescription="No one in this household has an upcoming appointment."
        />
      </Card>

      <DangerZone
        action={deleteFamily}
        fieldName="familyId"
        fieldValue={family.id}
        summary="Delete this family"
        warning={`This permanently removes the ${family.name} family along with all ${family.patients.length} member records, their appointments and their medical records. It cannot be undone.`}
        confirmLabel="Delete family and all records"
      />
    </div>
  );
}
