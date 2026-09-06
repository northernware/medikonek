import "server-only";
import { db } from "@/src/prisma/db";

/**
 * Human-readable patient identity: `MK-2026-000123`.
 *
 * Allocation bumps a per-year counter row and takes the new value. Callers pass
 * their own transaction so the number is claimed in the same unit of work as
 * the patient row: two concurrent registrations cannot be handed the same
 * number, and a registration that rolls back releases nothing — the number is
 * simply never used again. Numbers are not reused after a patient is deleted
 * either, for the same reason.
 *
 * This is a label, never a key. Nothing joins on it.
 */
export const PATIENT_NUMBER_PREFIX = "MK";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function formatPatientNumber(year: number, sequence: number) {
  return `${PATIENT_NUMBER_PREFIX}-${year}-${String(sequence).padStart(6, "0")}`;
}

/**
 * Claims the next number for the current year.
 *
 * `UPDATE ... RETURNING` is a single statement, so the read and the increment
 * cannot be interleaved by another transaction — the row lock Postgres takes
 * for the update is what serialises concurrent callers. The insert that seeds
 * a new year races only on the first registration of January, and
 * `ON CONFLICT DO NOTHING` settles that.
 */
export async function allocatePatientNumber(tx: Tx, now: Date = new Date()): Promise<string> {
  const year = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric" }).format(now),
  );

  // Seed the year on its first use. Two registrations racing in January both
  // try this; ON CONFLICT settles it without either failing.
  const seed = db.raw.sql`
    INSERT INTO "PatientNumberCounter" ("year", "lastUsed")
    VALUES (${year}, 0)
    ON CONFLICT ("year") DO NOTHING
  `.affectedCount().build();
  await tx.execute(seed as never);

  // The increment is one statement, so no other transaction can interleave a
  // read between our read and our write. The row lock it takes is held until
  // this transaction commits, which is what lets the read below be certain the
  // value it sees is the one we just claimed.
  const bump = db.raw.sql`
    UPDATE "PatientNumberCounter"
    SET "lastUsed" = "lastUsed" + 1
    WHERE "year" = ${year}
  `.affectedCount().build();
  await tx.execute(bump as never);

  const counter = await tx.orm.public.PatientNumberCounter
    .select("lastUsed")
    .where((c) => c.year.eq(year))
    .first();
  if (!counter) throw new Error("Could not allocate a patient number");

  return formatPatientNumber(year, counter.lastUsed);
}
