import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPatient } from "@/app/actions/patients";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PatientForm } from "@/components/forms/patient-form";
import { blankPatient } from "@/lib/form-defaults";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Add patient" };

export default async function NewFamilyMemberPage({ params }: PageProps<"/families/[id]/patients/new">) {
  const doctor = await requireDoctor();
  const { id } = await params;

  const family = await prisma.family.findFirst({
    where: { id, doctorId: doctor.id },
    select: { id: true, name: true },
  });
  if (!family) notFound();

  const families = await prisma.family.findMany({
    where: { doctorId: doctor.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Add patient" subtitle={`Joining the ${family.name} family`} />
      <Card className="p-5 sm:p-6">
        <PatientForm
          action={createPatient}
          defaults={blankPatient(family.id)}
          families={families}
          submitLabel="Add patient"
          cancelHref={`/families/${family.id}`}
        />
      </Card>
    </div>
  );
}
