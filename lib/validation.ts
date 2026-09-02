import { z } from "zod";
import {
  AllergySeverity,
  AppointmentStatus,
  AppointmentType,
  BloodType,
  BookingSource,
  ClinicalListStatus,
  Relationship,
  ReminderPreference,
  ServiceType,
  Sex,
  VisitPriority,
} from "@/lib/enums";

/** What every server action hands back to `useActionState`. */
export type FormState = {
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const EMPTY_FORM_STATE: FormState = {};

/** A blank text input arrives as "" — store it as absent, not as an empty string. */
function optionalText(max = 500) {
  return z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null);
}

function optionalNumber(opts: { min: number; max: number; int?: boolean; label: string }) {
  return z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .nullable()
    .refine((v) => v === null || Number.isFinite(v), { message: `${opts.label} must be a number` })
    .refine((v) => v === null || !opts.int || Number.isInteger(v), {
      message: `${opts.label} must be a whole number`,
    })
    .refine((v) => v === null || (v >= opts.min && v <= opts.max), {
      message: `${opts.label} should be between ${opts.min} and ${opts.max}`,
    });
}

const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required`).max(max, `Keep ${label.toLowerCase()} under ${max} characters`);

const dateOnly = (label: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a valid date`);

const dateTimeLocal = (label: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, `${label} must be a valid date and time`);

// --- Accounts ---------------------------------------------------------------

export const registerSchema = z
  .object({
    fullName: requiredText("Full name", 120),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
    password: z.string().min(10, "Use at least 10 characters").max(200),
    confirmPassword: z.string(),
    specialty: optionalText(120),
    clinicName: optionalText(160),
    licenseNumber: optionalText(60),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

// --- Households and patients --------------------------------------------------

export const householdSchema = z.object({
  name: requiredText("Household name", 120),
  address: optionalText(300),
  contactNumber: optionalText(40),
  notes: optionalText(2000),
});

export const patientSchema = z.object({
  householdId: requiredText("Household", 40),
  firstName: requiredText("First name", 80),
  middleName: optionalText(80),
  lastName: requiredText("Last name", 80),
  dateOfBirth: dateOnly("Date of birth"),
  sex: z.enum(Sex, { message: "Select a sex" }),
  relationship: z.enum(Relationship, { message: "Select a relationship" }),
  bloodType: z.enum(BloodType).default(BloodType.UNKNOWN),
  allergyStatus: z.enum(ClinicalListStatus).default(ClinicalListStatus.UNKNOWN),
  conditionStatus: z.enum(ClinicalListStatus).default(ClinicalListStatus.UNKNOWN),
  contactNumber: optionalText(40),
  email: optionalText(160).refine((v) => v === null || z.email().safeParse(v).success, {
    message: "Enter a valid email address",
  }),
});

// --- Appointments -----------------------------------------------------------

// Date and time are separate fields: the form offers only the slots the clinic
// actually has open, so a free-text datetime would defeat the point.
export const appointmentSchema = z.object({
  patientId: requiredText("Patient", 40),
  date: dateOnly("Appointment date"),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose an available time slot"),
  service: z.enum(ServiceType, { message: "Choose a service" }),
  reason: requiredText("Reason for visit", 300),

  type: z.enum(AppointmentType).default(AppointmentType.IN_PERSON),
  priority: z.enum(VisitPriority).default(VisitPriority.ROUTINE),
  status: z.enum(AppointmentStatus).default(AppointmentStatus.PENDING),
  source: z.enum(BookingSource).default(BookingSource.STAFF),
  reminderPreference: z.enum(ReminderPreference).default(ReminderPreference.NONE),

  previousAppointmentId: optionalText(40),
  room: optionalText(60),
  notes: optionalText(2000),
  internalNotes: optionalText(2000),
});

// --- Medical records --------------------------------------------------------

export const medicalRecordSchema = z.object({
  patientId: requiredText("Patient", 40),
  appointmentId: optionalText(40),
  visitDate: dateTimeLocal("Visit date"),
  chiefComplaint: requiredText("Chief complaint", 300),
  historyOfPresentIllness: optionalText(4000),
  physicalExamination: optionalText(4000),

  temperatureC: optionalNumber({ min: 25, max: 45, label: "Temperature" }),
  heartRate: optionalNumber({ min: 20, max: 300, int: true, label: "Heart rate" }),
  respiratoryRate: optionalNumber({ min: 4, max: 100, int: true, label: "Respiratory rate" }),
  systolic: optionalNumber({ min: 50, max: 300, int: true, label: "Systolic" }),
  diastolic: optionalNumber({ min: 20, max: 200, int: true, label: "Diastolic" }),
  weightKg: optionalNumber({ min: 0.3, max: 400, label: "Weight" }),
  heightCm: optionalNumber({ min: 20, max: 260, label: "Height" }),
  oxygenSaturation: optionalNumber({ min: 40, max: 100, int: true, label: "Oxygen saturation" }),

  assessment: optionalText(4000),
  treatmentPlan: optionalText(4000),
  followUpDate: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "Follow-up must be a valid date",
    }),
  notes: optionalText(4000),
});

/** One row of a clinical list. `label` is free text — the catalogue only suggests. */
export const clinicalItemSchema = z.object({
  label: requiredText("Entry", 160),
  reaction: optionalText(200),
  severity: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || v in AllergySeverity, { message: "Pick a severity" }),
  notes: optionalText(400),
});

export const prescriptionSchema = z.object({
  drugName: requiredText("Drug name", 160),
  dosage: requiredText("Dosage", 80),
  frequency: requiredText("Frequency", 80),
  duration: optionalText(80),
  instructions: optionalText(400),
});

/** Turn a Zod failure into the shape the form components read. */
export function toFieldErrors(error: z.ZodError): FormState {
  const flat = z.flattenError(error);
  const fieldErrors = flat.fieldErrors as Record<string, string[]>;
  // Prefer a specific complaint over the generic one — a nested list renders its
  // message in a banner, where "check the highlighted fields" highlights nothing.
  const firstField = Object.values(fieldErrors).find((messages) => messages?.length)?.[0];
  return {
    message: flat.formErrors[0] ?? firstField ?? "Please correct the highlighted fields.",
    fieldErrors,
  };
}
