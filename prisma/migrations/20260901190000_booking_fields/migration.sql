-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('IN_PERSON', 'TELECONSULTATION', 'HOME_VISIT');

-- CreateEnum
CREATE TYPE "VisitPriority" AS ENUM ('ROUTINE', 'URGENT', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('STAFF', 'WALK_IN', 'PHONE', 'PATIENT_PORTAL');

-- CreateEnum
CREATE TYPE "ReminderPreference" AS ENUM ('NONE', 'SMS', 'EMAIL', 'APP');

-- AlterEnum
-- SCHEDULED splits into PENDING and CONFIRMED. Everything booked under the old
-- enum had been accepted by the clinic, so it maps to CONFIRMED; a plain cast
-- would fail on those rows instead.
BEGIN;
CREATE TYPE "AppointmentStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
ALTER TABLE "public"."Appointment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Appointment" ALTER COLUMN "status" TYPE "AppointmentStatus_new"
  USING (CASE "status"::text WHEN 'SCHEDULED' THEN 'CONFIRMED' ELSE "status"::text END)::"AppointmentStatus_new";
ALTER TYPE "AppointmentStatus" RENAME TO "AppointmentStatus_old";
ALTER TYPE "AppointmentStatus_new" RENAME TO "AppointmentStatus";
DROP TYPE "public"."AppointmentStatus_old";
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "previousAppointmentId" TEXT,
ADD COLUMN     "priority" "VisitPriority" NOT NULL DEFAULT 'ROUTINE',
ADD COLUMN     "reminderPreference" "ReminderPreference" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "room" TEXT,
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'STAFF',
ADD COLUMN     "type" "AppointmentType" NOT NULL DEFAULT 'IN_PERSON',
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Appointment_previousAppointmentId_idx" ON "Appointment"("previousAppointmentId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_previousAppointmentId_fkey" FOREIGN KEY ("previousAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
