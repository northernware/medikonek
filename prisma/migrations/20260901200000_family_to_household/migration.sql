-- Rename Family to Household.
--
-- Written by hand as a rename rather than generated: Prisma sees a dropped
-- model and a new one, and would drop every household and cascade the delete
-- to their patients, appointments and records. RENAME keeps the rows and the
-- foreign keys intact.

ALTER TABLE "public"."Family" RENAME TO "Household";
ALTER TABLE "public"."Patient" RENAME COLUMN "familyId" TO "householdId";

-- Constraints and indexes carry the old name until renamed too, and Prisma
-- compares them by name.
ALTER TABLE "public"."Household" RENAME CONSTRAINT "Family_pkey" TO "Household_pkey";
ALTER TABLE "public"."Household" RENAME CONSTRAINT "Family_doctorId_fkey" TO "Household_doctorId_fkey";
ALTER TABLE "public"."Patient" RENAME CONSTRAINT "Patient_familyId_fkey" TO "Patient_householdId_fkey";

ALTER INDEX "public"."Family_doctorId_idx" RENAME TO "Household_doctorId_idx";
ALTER INDEX "public"."Family_doctorId_name_key" RENAME TO "Household_doctorId_name_key";
ALTER INDEX "public"."Patient_familyId_idx" RENAME TO "Patient_householdId_idx";
