import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateFamily } from "@/app/actions/families";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FamilyForm } from "@/components/forms/family-form";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Edit family" };

export default async function EditFamilyPage({ params }: PageProps<"/families/[id]/edit">) {
  const doctor = await requireDoctor();
  const { id } = await params;

  const family = await prisma.family.findFirst({ where: { id, doctorId: doctor.id } });
  if (!family) notFound();

  const action = updateFamily.bind(null, family.id);

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${family.name} family`} />
      <Card className="p-5 sm:p-6">
        <FamilyForm
          action={action}
          defaults={{
            name: family.name,
            address: family.address ?? "",
            contactNumber: family.contactNumber ?? "",
            notes: family.notes ?? "",
          }}
          submitLabel="Save changes"
          cancelHref={`/families/${family.id}`}
        />
      </Card>
    </div>
  );
}
