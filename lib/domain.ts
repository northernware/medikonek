import type {
  AppointmentStatus,
  BloodType,
  Relationship,
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
