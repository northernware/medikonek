import type { Metadata } from "next";
import Link from "next/link";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buttonClass, Card, EmptyState, PageHeader } from "@/components/ui";
import { SearchForm } from "@/components/search-form";

export const metadata: Metadata = { title: "Families" };

export default async function FamiliesPage({ searchParams }: PageProps<"/families">) {
  const doctor = await requireDoctor();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const families = await prisma.family.findMany({
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
        title="Families"
        subtitle="Every patient belongs to a household. Start here."
        actions={
          <Link href="/families/new" className={buttonClass("primary")}>
            New family
          </Link>
        }
      />

      <SearchForm action="/families" placeholder="Search families or surnames" defaultValue={query} />

      <Card>
        {families.length === 0 ? (
          <EmptyState
            title={query ? `No families match “${query}”` : "No families yet"}
            description={
              query
                ? "Try a shorter search, or clear it to see everyone."
                : "Create a household first, then add its members as patients."
            }
            action={
              query ? (
                <Link href="/families" className={buttonClass("secondary")}>
                  Clear search
                </Link>
              ) : (
                <Link href="/families/new" className={buttonClass("primary")}>
                  New family
                </Link>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {families.map((family) => (
              <li key={family.id} className="transition-colors hover:bg-surface-muted">
                <Link href={`/families/${family.id}`} className="flex items-baseline gap-4 px-5 py-4">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{family.name}</span>
                    <span className="block truncate text-sm text-ink-muted">
                      {family.address || family.contactNumber || "No address on file"}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm text-ink-muted">
                    {family._count.patients}{" "}
                    {family._count.patients === 1 ? "member" : "members"}
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
