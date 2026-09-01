import type {
  AppointmentStatus,
  BloodType,
  Relationship,
  ServiceType,
  Sex,
} from "@/app/generated/prisma/enums";

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  HEAD: "Head of family",
  SPOUSE: "Spouse",
  CHILD: "Child",
  PARENT: "Parent",
  SIBLING: "Sibling",
  GRANDPARENT: "Grandparent",
  OTHER: "Other",
};

export const SEX_LABELS: Record<Sex, string> = {
  MALE: "Male",
  FEMALE: "Female",
};

export const BLOOD_TYPE_LABELS: Record<BloodType, string> = {
  A_POS: "A+",
  A_NEG: "A−",
  B_POS: "B+",
  B_NEG: "B−",
  AB_POS: "AB+",
  AB_NEG: "AB−",
  O_POS: "O+",
  O_NEG: "O−",
  UNKNOWN: "Unknown",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

/** Badge palette keyed by appointment status. */
export const APPOINTMENT_STATUS_TONE: Record<AppointmentStatus, "accent" | "ok" | "neutral" | "warn"> = {
  SCHEDULED: "accent",
  COMPLETED: "ok",
  CANCELLED: "neutral",
  NO_SHOW: "warn",
};

/**
 * The bookable services, in the order they are offered. `minutes` is the slot
 * length the booking form starts from — the doctor can still override it.
 */
export const SERVICES: {
  value: ServiceType;
  label: string;
  description: string;
  minutes: number;
}[] = [
  {
    value: "GENERAL_CONSULTATION",
    label: "General Consultation",
    description: "Assessment of common symptoms and health concerns.",
    minutes: 30,
  },
  {
    value: "FAMILY_CHECKUP",
    label: "Family Checkup",
    description: "Consultation for multiple members of the same family.",
    minutes: 60,
  },
  {
    value: "FOLLOW_UP_CHECKUP",
    label: "Follow-up Checkup",
    description: "Review of recovery, treatment, or previous findings.",
    minutes: 20,
  },
  {
    value: "ROUTINE_PHYSICAL_EXAM",
    label: "Routine Physical Examination",
    description: "General evaluation of overall health.",
    minutes: 45,
  },
  {
    value: "PEDIATRIC_CONSULTATION",
    label: "Pediatric Consultation",
    description: "Checkup for infants and children.",
    minutes: 30,
  },
  {
    value: "SENIOR_CITIZEN_CONSULTATION",
    label: "Senior Citizen Consultation",
    description: "Care for age-related health concerns.",
    minutes: 45,
  },
  {
    value: "PRENATAL_POSTNATAL_CONSULTATION",
    label: "Prenatal and Postnatal Consultation",
    description: "Basic care before and after childbirth.",
    minutes: 45,
  },
  {
    value: "CHRONIC_DISEASE_MANAGEMENT",
    label: "Chronic Disease Management",
    description: "Monitoring of diabetes, hypertension, asthma, and similar conditions.",
    minutes: 30,
  },
  {
    value: "PRESCRIPTION_RENEWAL",
    label: "Prescription Renewal",
    description: "Review and renewal of regular medicines.",
    minutes: 15,
  },
  {
    value: "LABORATORY_RESULT_REVIEW",
    label: "Laboratory Result Review",
    description: "Interpretation of blood tests and other results.",
    minutes: 20,
  },
  {
    value: "MEDICAL_CERTIFICATE_REQUEST",
    label: "Medical Certificate Request",
    description: "Evaluation for school, work, or fitness clearance.",
    minutes: 20,
  },
  {
    value: "VACCINATION_CONSULTATION",
    label: "Vaccination Consultation",
    description: "Vaccine assessment and scheduling.",
    minutes: 20,
  },
  {
    value: "MINOR_INJURY_WOUND_CARE",
    label: "Minor Injury or Wound Care",
    description: "Treatment of cuts, burns, sprains, and minor injuries.",
    minutes: 30,
  },
  {
    value: "TELECONSULTATION",
    label: "Teleconsultation",
    description: "Consultation through video or voice call.",
    minutes: 20,
  },
  {
    value: "REFERRAL_CONSULTATION",
    label: "Referral Consultation",
    description: "Assessment and referral to an appropriate specialist.",
    minutes: 20,
  },
];

export const SERVICE_LABELS = Object.fromEntries(
  SERVICES.map((s) => [s.value, s.label]),
) as Record<ServiceType, string>;

export const SERVICE_DESCRIPTIONS = Object.fromEntries(
  SERVICES.map((s) => [s.value, s.description]),
) as Record<ServiceType, string>;

export const SERVICE_MINUTES = Object.fromEntries(
  SERVICES.map((s) => [s.value, s.minutes]),
) as Record<ServiceType, number>;

/** A compact form for tight spots — calendar cells, list rows. */
export const SERVICE_SHORT_LABELS: Record<ServiceType, string> = {
  GENERAL_CONSULTATION: "General",
  FAMILY_CHECKUP: "Family",
  FOLLOW_UP_CHECKUP: "Follow-up",
  ROUTINE_PHYSICAL_EXAM: "Physical exam",
  PEDIATRIC_CONSULTATION: "Pediatric",
  SENIOR_CITIZEN_CONSULTATION: "Senior",
  PRENATAL_POSTNATAL_CONSULTATION: "Pre/postnatal",
  CHRONIC_DISEASE_MANAGEMENT: "Chronic care",
  PRESCRIPTION_RENEWAL: "Rx renewal",
  LABORATORY_RESULT_REVIEW: "Lab review",
  MEDICAL_CERTIFICATE_REQUEST: "Med cert",
  VACCINATION_CONSULTATION: "Vaccination",
  MINOR_INJURY_WOUND_CARE: "Wound care",
  TELECONSULTATION: "Teleconsult",
  REFERRAL_CONSULTATION: "Referral",
};

export function fullName(p: { firstName: string; middleName?: string | null; lastName: string }) {
  const middleInitial = p.middleName?.trim() ? `${p.middleName.trim()[0]}. ` : "";
  return `${p.firstName} ${middleInitial}${p.lastName}`;
}

/** Whole years, then months for infants — how a chart actually reads. */
export function ageFrom(dateOfBirth: Date, on: Date = new Date()): string {
  let years = on.getFullYear() - dateOfBirth.getFullYear();
  let months = on.getMonth() - dateOfBirth.getMonth();
  if (on.getDate() < dateOfBirth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "—";
  if (years === 0) return months === 1 ? "1 month" : `${months} months`;
  if (years < 3) return `${years}y ${months}m`;
  return `${years} years`;
}

export function bloodPressure(systolic: number | null, diastolic: number | null) {
  if (systolic == null && diastolic == null) return null;
  return `${systolic ?? "—"}/${diastolic ?? "—"}`;
}

export function bmi(weightKg: number | null, heightCm: number | null) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return (weightKg / (m * m)).toFixed(1);
}
