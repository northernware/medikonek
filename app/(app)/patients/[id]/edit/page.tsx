import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updatePatient } from "@/app/actions/patients";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDateInputValue } from "@/lib/datetime";
import { fullName } from "@/lib/domain";
import { PatientForm } from "@/components/forms/patient-form";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Edit patient" };

export default async function EditPatientPage({ params }: PageProps<"/patients/[id]/edit">) {
  const doctor = await requireDoctor();
  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { id, household: { doctorId: doctor.id } },
    include: {
      allergies: { orderBy: { createdAt: "asc" } },
      conditions: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!patient) notFound();

  const households = await prisma.household.findMany({
    where: { doctorId: doctor.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const action = updatePatient.bind(null, patient.id);

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${fullName(patient)}`} />
      <Card className="p-5 sm:p-6">
        <PatientForm
          action={action}
          households={households}
          defaults={{
            householdId: patient.householdId,
            firstName: patient.firstName,
            middleName: patient.middleName ?? "",
            lastName: patient.lastName,
            dateOfBirth: toDateInputValue(patient.dateOfBirth),
            sex: patient.sex,
            relationship: patient.relationship,
            bloodType: patient.bloodType,
            allergyStatus: patient.allergyStatus,
            allergies: patient.allergies.map((a) => ({
              label: a.label,
              reaction: a.reaction ?? "",
              severity: a.severity ?? "",
              notes: a.notes ?? "",
            })),
            conditionStatus: patient.conditionStatus,
            conditions: patient.conditions.map((c) => ({
              label: c.label,
              reaction: "",
              severity: "",
              notes: c.notes ?? "",
            })),
            contactNumber: patient.contactNumber ?? "",
            email: patient.email ?? "",
          }}
          submitLabel="Save changes"
          cancelHref={`/patients/${patient.id}`}
        />
      </Card>
    </div>
  );
}
