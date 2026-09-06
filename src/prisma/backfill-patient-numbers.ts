import "dotenv/config";
import { db } from "./db";
import { instantToDb } from "../../lib/datetime";

/**
 * Gives a patient number to every row that predates the column.
 *
 * Numbers are assigned oldest-registered first so they read in the order the
 * practice actually took people on. Re-running is safe: rows that already have
 * a number are skipped, and none is ever reissued.
 */
async function main() {
  const missing = await db.orm.public.Patient
    .select("id", "createdAt")
    .where((p) => p.patientNumber.isNull())
    .orderBy((p) => p.createdAt.asc())
    .all();

  if (missing.length === 0) {
    console.log("Every patient already has a number.");
    await db.close();
    return;
  }

  for (const patient of missing) {
    const year = Number(patient.createdAt.slice(0, 4));
    await db.transaction(async (tx) => {
      await tx.execute(
        db.raw.sql`INSERT INTO "PatientNumberCounter" ("year","lastUsed") VALUES (${year},0) ON CONFLICT ("year") DO NOTHING`
          .affectedCount().build() as never,
      );
      await tx.execute(
        db.raw.sql`UPDATE "PatientNumberCounter" SET "lastUsed"="lastUsed"+1 WHERE "year"=${year}`
          .affectedCount().build() as never,
      );
      const counter = await tx.orm.public.PatientNumberCounter
        .select("lastUsed").where((c) => c.year.eq(year)).first();
      const number = `MK-${year}-${String(counter!.lastUsed).padStart(6, "0")}`;
      await tx.orm.public.Patient
        .where((p) => p.id.eq(patient.id))
        .update({ patientNumber: number, updatedAt: instantToDb(new Date()) });
    });
  }

  console.log(`Numbered ${missing.length} patient(s).`);
  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
