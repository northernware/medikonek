-- Allergies and chronic conditions become lists of rows instead of free text,
-- so each allergy can carry its own reaction and severity.
--
-- Order matters: the new tables and columns are created, the existing prose is
-- copied into them, and only then are the old columns dropped. The generated
-- diff drops first, which would throw the data away.

-- CreateEnum
CREATE TYPE "ClinicalListStatus" AS ENUM ('RECORDED', 'NONE_KNOWN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- CreateTable
CREATE TABLE "PatientAllergy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" "AllergySeverity",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientAllergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientCondition" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientAllergy_patientId_idx" ON "PatientAllergy"("patientId");
CREATE UNIQUE INDEX "PatientAllergy_patientId_label_key" ON "PatientAllergy"("patientId", "label");
CREATE INDEX "PatientCondition_patientId_idx" ON "PatientCondition"("patientId");
CREATE UNIQUE INDEX "PatientCondition_patientId_label_key" ON "PatientCondition"("patientId", "label");

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientCondition" ADD CONSTRAINT "PatientCondition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: default UNKNOWN, so a patient nobody has asked never reads as
-- "no allergies" by omission.
ALTER TABLE "Patient"
  ADD COLUMN "allergyStatus" "ClinicalListStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "conditionStatus" "ClinicalListStatus" NOT NULL DEFAULT 'UNKNOWN';

-- Carry the existing free text over. Each old value was one prose sentence, so
-- it becomes one item; a doctor editing the patient can split it into separate
-- tags. Nothing is discarded.
INSERT INTO "PatientAllergy" ("id", "patientId", "label")
SELECT gen_random_uuid()::text, "id", btrim("allergies")
FROM "Patient"
WHERE "allergies" IS NOT NULL AND btrim("allergies") <> '';

INSERT INTO "PatientCondition" ("id", "patientId", "label")
SELECT gen_random_uuid()::text, "id", btrim("chronicConditions")
FROM "Patient"
WHERE "chronicConditions" IS NOT NULL AND btrim("chronicConditions") <> '';

UPDATE "Patient" SET "allergyStatus" = 'RECORDED'
WHERE "allergies" IS NOT NULL AND btrim("allergies") <> '';

UPDATE "Patient" SET "conditionStatus" = 'RECORDED'
WHERE "chronicConditions" IS NOT NULL AND btrim("chronicConditions") <> '';

-- Only now is it safe to drop them.
ALTER TABLE "Patient" DROP COLUMN "allergies", DROP COLUMN "chronicConditions";
