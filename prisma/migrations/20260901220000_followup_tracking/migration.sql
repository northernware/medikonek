-- Physical examination joins the encounter fields, and a record can now point at
-- the appointment booked to satisfy its follow-up. Both are additive.

-- AlterTable
ALTER TABLE "MedicalRecord" ADD COLUMN     "followUpAppointmentId" TEXT,
ADD COLUMN     "physicalExamination" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MedicalRecord_followUpAppointmentId_key" ON "MedicalRecord"("followUpAppointmentId");

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_followUpAppointmentId_fkey" FOREIGN KEY ("followUpAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
