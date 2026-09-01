import type { Metadata } from "next";
import Link from "next/link";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ageFrom, fullName, RELATIONSHIP_LABELS, SEX_LABELS } from "@/lib/domain";
import { Badge, buttonClass, Card, EmptyState, PageHeader } from "@/components/ui";
import { SearchForm } from "@/components/search-form";

export const metadata: Metadata = { title: "Patients" };

export default async function PatientsPage({ searchParams }: PageProps<"/patients">) {
  const doctor = await requireDoctor();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const like = { contains: query, mode: "insensitive" as const };

  const patients = await prisma.patient.findMany({
    where: {
      family: { doctorId: doctor.id },
      ...(query
        ? { OR: [{ firstName: like }, { lastName: like }, { family: { name: like } }] }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      dateOfBirth: true,
      sex: true,
      relationship: true,
      allergies: true,
      family: { select: { id: true, name: true } },
    },
  });

  const familyCount = await prisma.family.count({ where: { doctorId: doctor.id } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} ${patients.length === 1 ? "person" : "people"}${query ? " matching" : " on your list"}`}
        actions={
          familyCount > 0 ? (
            <Link href="/families" className={buttonClass("secondary")}>
              Add via family
            </Link>
          ) : (
            <Link href="/families/new" className={buttonClass("primary")}>
              New family
            </Link>
          )
        }
      />

      <SearchForm action="/patients" placeholder="Search by name or family" defaultValue={query} />

      <Card>
        {patients.length === 0 ? (
          <EmptyState
            title={query ? `No patients match “${query}”` : "No patients yet"}
            description={
              query
                ? "Try a surname, or clear the search."
                : "Patients are added inside a family, so their household history stays together."
            }
            action={
              query ? (
                <Link href="/patients" className={buttonClass("secondary")}>
                  Clear search
                </Link>
              ) : (
                <Link href={familyCount > 0 ? "/families" : "/families/new"} className={buttonClass("primary")}>
                  {familyCount > 0 ? "Choose a family" : "Create the first family"}
                </Link>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {patients.map((patient) => (
              <li key={patient.id} className="transition-colors hover:bg-surface-muted">
                <Link href={`/patients/${patient.id}`} className="flex items-baseline gap-4 px-5 py-4">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="truncate font-medium">{fullName(patient)}</span>
                      {patient.allergies ? <Badge tone="danger">Allergies</Badge> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-ink-muted">
                      {patient.family.name} family · {RELATIONSHIP_LABELS[patient.relationship]}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm text-ink-muted">
                    {SEX_LABELS[patient.sex]} · {ageFrom(patient.dateOfBirth)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
