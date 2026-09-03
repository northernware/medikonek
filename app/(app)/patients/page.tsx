import type { Metadata } from "next";
import Link from "next/link";
import { requireDoctor } from "@/lib/auth";
import { orm } from "@/src/prisma/db";
import { calendarDateFromDb } from "@/lib/datetime";
import { or } from "@prisma/orm-postgres/orm-client";
import { ageFrom, fullName, RELATIONSHIP_LABELS, SEX_LABELS } from "@/lib/domain";
import { Badge, buttonClass, Card, EmptyState, PageHeader } from "@/components/ui";
import { SearchForm } from "@/components/search-form";

export const metadata: Metadata = { title: "Patients" };

export default async function PatientsPage({ searchParams }: PageProps<"/patients">) {
  const doctor = await requireDoctor();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  let patientQuery = orm.Patient
    .select(
      "id",
      "firstName",
      "middleName",
      "lastName",
      "dateOfBirth",
      "sex",
      "relationship",
      "allergyStatus",
    )
    .include("allergies", (a) => a.select("id", "severity"))
    .include("household", (h) => h.select("id", "name"))
    .where((p) => p.household.some((h) => h.doctorId.eq(doctor.id)))
    .orderBy([(p) => p.lastName.asc(), (p) => p.firstName.asc()]);

  if (query) {
    const like = `%${query}%`;
    patientQuery = patientQuery.where((p) =>
      or(
        p.firstName.ilike(like),
        p.lastName.ilike(like),
        p.household.some((h) => h.name.ilike(like)),
      ),
    );
  }

  const patients = await patientQuery.all();

  const { householdCount } = await orm.Household
    .where((h) => h.doctorId.eq(doctor.id))
    .aggregate((a) => ({ householdCount: a.count() }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} ${patients.length === 1 ? "person" : "people"}${query ? " matching" : " on your list"}`}
        actions={
          householdCount > 0 ? (
            <Link href="/households" className={buttonClass("secondary")}>
              Add via household
            </Link>
          ) : (
            <Link href="/households/new" className={buttonClass("primary")}>
              New household
            </Link>
          )
        }
      />

      <SearchForm action="/patients" placeholder="Search by name or household" defaultValue={query} />

      <Card>
        {patients.length === 0 ? (
          <EmptyState
            title={query ? `No patients match “${query}”` : "No patients yet"}
            description={
              query
                ? "Try a surname, or clear the search."
                : "Patients are added inside a household, so their household history stays together."
            }
            action={
              query ? (
                <Link href="/patients" className={buttonClass("secondary")}>
                  Clear search
                </Link>
              ) : (
                <Link href={householdCount > 0 ? "/households" : "/households/new"} className={buttonClass("primary")}>
                  {householdCount > 0 ? "Choose a household" : "Create the first household"}
                </Link>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {patients.map((patient) => (
              <li key={patient.id} className="transition-colors hover:bg-surface-muted">
                <Link href={`/patients/${patient.id}`} className="flex items-baseline gap-4 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="truncate text-[13px] font-medium">{fullName(patient)}</span>
                      {patient.allergies.length > 0 ? (
                        <Badge tone={patient.allergies.some((a) => a.severity === "SEVERE") ? "danger" : "warn"}>
                          {patient.allergies.length} {patient.allergies.length === 1 ? "allergy" : "allergies"}
                        </Badge>
                      ) : patient.allergyStatus === "UNKNOWN" ? (
                        <Badge tone="neutral">Allergies not asked</Badge>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-muted">
                      {patient.household.name} household · {RELATIONSHIP_LABELS[patient.relationship]}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-xs text-ink-muted">
                    {SEX_LABELS[patient.sex]} · {ageFrom(calendarDateFromDb(patient.dateOfBirth))}
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
