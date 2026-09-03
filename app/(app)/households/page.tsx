import type { Metadata } from "next";
import Link from "next/link";
import { requireDoctor } from "@/lib/auth";
import { orm } from "@/src/prisma/db";
import { or } from "@prisma/orm-postgres/orm-client";
import { buttonClass, Card, EmptyState, PageHeader } from "@/components/ui";
import { SearchForm } from "@/components/search-form";

export const metadata: Metadata = { title: "Households" };

export default async function HouseholdsPage({ searchParams }: PageProps<"/households">) {
  const doctor = await requireDoctor();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  let householdQuery = orm.Household
    .select("id", "name", "address", "contactNumber")
    .include("patients", (p) => p.count())
    .where((h) => h.doctorId.eq(doctor.id))
    .orderBy((h) => h.name.asc());

  if (query) {
    const like = `%${query}%`;
    householdQuery = householdQuery.where((h) =>
      or(
        h.name.ilike(like),
        h.patients.some((p) => p.lastName.ilike(like)),
        h.patients.some((p) => p.firstName.ilike(like)),
      ),
    );
  }

  const households = await householdQuery.all();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Households"
        subtitle="Every patient belongs to one. Each keeps their own record — the grouping links relatives, shared contact details and hereditary risk."
        actions={
          <Link href="/households/new" className={buttonClass("primary")}>
            New household
          </Link>
        }
      />

      <SearchForm action="/households" placeholder="Search households or surnames" defaultValue={query} />

      <Card>
        {households.length === 0 ? (
          <EmptyState
            title={query ? `No households match “${query}”` : "No households yet"}
            description={
              query
                ? "Try a shorter search, or clear it to see everyone."
                : "Create a household first, then add its members as patients."
            }
            action={
              query ? (
                <Link href="/households" className={buttonClass("secondary")}>
                  Clear search
                </Link>
              ) : (
                <Link href="/households/new" className={buttonClass("primary")}>
                  New household
                </Link>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {households.map((household) => (
              <li key={household.id} className="transition-colors hover:bg-surface-muted">
                <Link href={`/households/${household.id}`} className="flex items-baseline gap-4 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{household.name}</span>
                    <span className="block truncate text-xs text-ink-muted">
                      {household.address || household.contactNumber || "No address on file"}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-xs text-ink-muted">
                    {household.patients}{" "}
                    {household.patients === 1 ? "member" : "members"}
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
