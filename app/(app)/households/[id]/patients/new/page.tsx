import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPatient } from "@/app/actions/patients";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PatientForm } from "@/components/forms/patient-form";
import { blankPatient } from "@/lib/form-defaults";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Add patient" };

export default async function NewHouseholdMemberPage({ params }: PageProps<"/households/[id]/patients/new">) {
  const doctor = await requireDoctor();
  const { id } = await params;

  const household = await prisma.household.findFirst({
    where: { id, doctorId: doctor.id },
    select: { id: true, name: true },
  });
  if (!household) notFound();

  const households = await prisma.household.findMany({
    where: { doctorId: doctor.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Add patient" subtitle={`Joining the ${household.name} household`} />
      <Card className="p-5 sm:p-6">
        <PatientForm
          action={createPatient}
          defaults={blankPatient(household.id)}
          households={households}
          submitLabel="Add patient"
          cancelHref={`/households/${household.id}`}
        />
      </Card>
    </div>
  );
}
