import type { Metadata } from "next";
import { createFamily } from "@/app/actions/families";
import { requireDoctor } from "@/lib/auth";
import { FamilyForm } from "@/components/forms/family-form";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "New family" };

export default async function NewFamilyPage() {
  await requireDoctor();

  return (
    <div className="space-y-6">
      <PageHeader title="New family" subtitle="A household to hang patients and history off." />
      <Card className="p-5 sm:p-6">
        <FamilyForm action={createFamily} submitLabel="Create family" cancelHref="/families" />
      </Card>
    </div>
  );
}
