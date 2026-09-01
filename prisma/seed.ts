import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import {
  AppointmentStatus,
  BloodType,
  Relationship,
  Sex,
} from "../app/generated/prisma/enums";

const DEMO_EMAIL = "doctor@medikonek.test";
const DEMO_PASSWORD = "medikonek-demo";

/** Days from today at a given clinic-ish hour, so the seed always looks current. */
function at(dayOffset: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function born(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

async function main() {
  // Re-runnable: wipe the demo doctor and everything cascading from them.
  await prisma.doctor.deleteMany({ where: { email: DEMO_EMAIL } });

  const doctor = await prisma.doctor.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      fullName: "Dr. Ana Reyes",
      specialty: "Family Medicine",
      clinicName: "Northern Family Clinic",
      licenseNumber: "PRC-0114532",
    },
  });

  const delaCruz = await prisma.family.create({
    data: {
      doctorId: doctor.id,
      name: "Dela Cruz",
      address: "24 Mabini St., Barangay San Roque, Tuguegarao",
      contactNumber: "0917 442 1180",
      notes:
        "Hypertension on the father's side. Household of five, grandmother lives with them. Prefers Saturday morning slots.",
      patients: {
        create: [
          {
            firstName: "Ramon",
            middleName: "Santos",
            lastName: "Dela Cruz",
            dateOfBirth: born(1979, 4, 12),
            sex: Sex.MALE,
            relationship: Relationship.HEAD,
            bloodType: BloodType.O_POS,
            chronicConditions: "Hypertension, diagnosed 2021. On amlodipine 5 mg.",
            contactNumber: "0917 442 1180",
          },
          {
            firstName: "Marilou",
            middleName: "Bautista",
            lastName: "Dela Cruz",
            dateOfBirth: born(1983, 9, 3),
            sex: Sex.FEMALE,
            relationship: Relationship.SPOUSE,
            bloodType: BloodType.A_POS,
            allergies: "Penicillin — urticaria and facial swelling, 2015.",
          },
          {
            firstName: "Joaquin",
            lastName: "Dela Cruz",
            dateOfBirth: born(2014, 1, 27),
            sex: Sex.MALE,
            relationship: Relationship.CHILD,
            bloodType: BloodType.O_POS,
            chronicConditions: "Mild intermittent asthma. Salbutamol inhaler as needed.",
          },
          {
            firstName: "Sofia",
            lastName: "Dela Cruz",
            dateOfBirth: born(2021, 11, 8),
            sex: Sex.FEMALE,
            relationship: Relationship.CHILD,
            bloodType: BloodType.UNKNOWN,
          },
          {
            firstName: "Corazon",
            lastName: "Dela Cruz",
            dateOfBirth: born(1952, 6, 19),
            sex: Sex.FEMALE,
            relationship: Relationship.GRANDPARENT,
            bloodType: BloodType.B_POS,
            chronicConditions: "Type 2 diabetes, osteoarthritis of both knees.",
            allergies: "Sulfa drugs — rash.",
          },
        ],
      },
    },
    include: { patients: true },
  });

  const villanueva = await prisma.family.create({
    data: {
      doctorId: doctor.id,
      name: "Villanueva",
      address: "Blk 7 Lot 12, Carig Sur, Tuguegarao",
      contactNumber: "0918 220 7741",
      notes: "New to the practice, transferred from a clinic in Manila.",
      patients: {
        create: [
          {
            firstName: "Elena",
            middleName: "Cruz",
            lastName: "Villanueva",
            dateOfBirth: born(1990, 2, 14),
            sex: Sex.FEMALE,
            relationship: Relationship.HEAD,
            bloodType: BloodType.AB_NEG,
            contactNumber: "0918 220 7741",
          },
          {
            firstName: "Miguel",
            lastName: "Villanueva",
            dateOfBirth: born(2019, 7, 30),
            sex: Sex.MALE,
            relationship: Relationship.CHILD,
            bloodType: BloodType.O_NEG,
          },
        ],
      },
    },
    include: { patients: true },
  });

  const byName = (family: { patients: { id: string; firstName: string }[] }, first: string) =>
    family.patients.find((p) => p.firstName === first)!.id;

  const ramon = byName(delaCruz, "Ramon");
  const joaquin = byName(delaCruz, "Joaquin");
  const corazon = byName(delaCruz, "Corazon");
  const sofia = byName(delaCruz, "Sofia");
  const elena = byName(villanueva, "Elena");
  const miguel = byName(villanueva, "Miguel");

  // Today's clinic.
  await prisma.appointment.createMany({
    data: [
      {
        patientId: ramon,
        doctorId: doctor.id,
        scheduledAt: at(0, 9, 0),
        durationMinutes: 20,
        reason: "BP check and refill",
        status: AppointmentStatus.SCHEDULED,
      },
      {
        patientId: sofia,
        doctorId: doctor.id,
        scheduledAt: at(0, 9, 30),
        durationMinutes: 30,
        reason: "Well-child visit, 4 years",
        status: AppointmentStatus.SCHEDULED,
      },
      {
        patientId: miguel,
        doctorId: doctor.id,
        scheduledAt: at(0, 10, 30),
        durationMinutes: 30,
        reason: "Rash on both forearms",
        status: AppointmentStatus.SCHEDULED,
      },
      {
        patientId: corazon,
        doctorId: doctor.id,
        scheduledAt: at(2, 8, 30),
        durationMinutes: 30,
        reason: "Diabetes follow-up, HbA1c review",
        status: AppointmentStatus.SCHEDULED,
      },
      {
        patientId: elena,
        doctorId: doctor.id,
        scheduledAt: at(5, 14, 0),
        durationMinutes: 45,
        reason: "New patient consultation",
        status: AppointmentStatus.SCHEDULED,
      },
      {
        patientId: joaquin,
        doctorId: doctor.id,
        scheduledAt: at(-3, 11, 0),
        durationMinutes: 30,
        reason: "Cough and wheezing",
        status: AppointmentStatus.COMPLETED,
      },
    ],
  });

  const asthmaVisit = await prisma.appointment.findFirst({
    where: { patientId: joaquin, status: AppointmentStatus.COMPLETED },
    select: { id: true },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: joaquin,
      doctorId: doctor.id,
      appointmentId: asthmaVisit?.id ?? null,
      visitDate: at(-3, 11, 5),
      chiefComplaint: "Cough and wheezing for 4 days",
      historyOfPresentIllness:
        "Dry cough starting after a school field trip, worse at night. Two rescue inhaler uses per day. No fever. Younger sister had a cold the week before.",
      temperatureC: 37.1,
      heartRate: 96,
      respiratoryRate: 24,
      oxygenSaturation: 96,
      weightKg: 34.2,
      heightCm: 138,
      assessment: "Mild intermittent asthma with viral-triggered exacerbation.",
      treatmentPlan:
        "Salbutamol MDI with spacer, 2 puffs every 4–6 hours as needed. Short course of oral prednisolone. Review in one week, sooner if work of breathing increases.",
      followUpDate: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 4)),
      prescriptions: {
        create: [
          {
            drugName: "Salbutamol MDI 100 mcg",
            dosage: "2 puffs",
            frequency: "Every 4–6 hours as needed",
            duration: "2 weeks",
            instructions: "Use with spacer. Rinse mouth after.",
          },
          {
            drugName: "Prednisolone 15 mg/5 mL",
            dosage: "10 mL",
            frequency: "Once daily",
            duration: "3 days",
            instructions: "After breakfast.",
          },
        ],
      },
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: ramon,
      doctorId: doctor.id,
      visitDate: at(-40, 9, 15),
      chiefComplaint: "Routine hypertension follow-up",
      temperatureC: 36.6,
      heartRate: 78,
      systolic: 146,
      diastolic: 92,
      weightKg: 84.5,
      heightCm: 171,
      assessment: "Hypertension, above target on current dose.",
      treatmentPlan:
        "Increase amlodipine to 10 mg daily. Reduce added salt; discussed home BP logging twice weekly. Recheck in six weeks.",
      prescriptions: {
        create: [
          {
            drugName: "Amlodipine 10 mg",
            dosage: "1 tablet",
            frequency: "Once daily",
            duration: "60 days",
            instructions: "Morning, with or without food.",
          },
        ],
      },
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: corazon,
      doctorId: doctor.id,
      visitDate: at(-92, 10, 0),
      chiefComplaint: "Knee pain, both sides, worse on stairs",
      historyOfPresentIllness:
        "Gradual over two years. Morning stiffness under 20 minutes. No swelling or redness. Paracetamol gives partial relief.",
      temperatureC: 36.4,
      heartRate: 84,
      systolic: 138,
      diastolic: 84,
      weightKg: 71.0,
      heightCm: 152,
      assessment: "Bilateral knee osteoarthritis. Diabetes reasonably controlled on metformin.",
      treatmentPlan:
        "Quadriceps strengthening handout given. Paracetamol as needed; avoid NSAIDs given renal function. Continue metformin, repeat HbA1c before next visit.",
      prescriptions: {
        create: [
          {
            drugName: "Metformin 500 mg",
            dosage: "1 tablet",
            frequency: "Twice daily",
            duration: "90 days",
            instructions: "With meals.",
          },
        ],
      },
    },
  });

  console.log(`Seeded demo practice.\n  email:    ${DEMO_EMAIL}\n  password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
