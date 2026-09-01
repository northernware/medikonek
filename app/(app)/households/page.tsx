import type { Metadata } from "next";
import Link from "next/link";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buttonClass, Card, EmptyState, PageHeader } from "@/components/ui";
import { SearchForm } from "@/components/search-form";

export const metadata: Metadata = { title: "Households" };

export default async function HouseholdsPage({ searchParams }: PageProps<"/households">) {
  const doctor = await requireDoctor();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const households = await prisma.household.findMany({
    where: {
      doctorId: doctor.id,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { patients: { some: { lastName: { contains: query, mode: "insensitive" as const } } } },
              { patients: { some: { firstName: { contains: query, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      address: true,
      contactNumber: true,
      _count: { select: { patients: true } },
    },
  });

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
                <Link href={`/households/${household.id}`} className="flex items-baseline gap-4 px-5 py-4">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{household.name}</span>
                    <span className="block truncate text-sm text-ink-muted">
                      {household.address || household.contactNumber || "No address on file"}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm text-ink-muted">
                    {household._count.patients}{" "}
                    {household._count.patients === 1 ? "member" : "members"}
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
