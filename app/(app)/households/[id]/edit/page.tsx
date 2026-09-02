import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateHousehold } from "@/app/actions/households";
import { requireDoctor } from "@/lib/auth";
import { orm } from "@/src/prisma/db";
import { HouseholdForm } from "@/components/forms/household-form";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Edit household" };

export default async function EditHouseholdPage({ params }: PageProps<"/households/[id]/edit">) {
  const doctor = await requireDoctor();
  const { id } = await params;

  const household = await orm.Household
    .where((h) => h.id.eq(id))
    .where((h) => h.doctorId.eq(doctor.id))
    .first();
  if (!household) notFound();

  const action = updateHousehold.bind(null, household.id);

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${household.name} household`} />
      <Card className="p-5 sm:p-6">
        <HouseholdForm
          action={action}
          defaults={{
            name: household.name,
            address: household.address ?? "",
            contactNumber: household.contactNumber ?? "",
            notes: household.notes ?? "",
          }}
          submitLabel="Save changes"
          cancelHref={`/households/${household.id}`}
        />
      </Card>
    </div>
  );
}
