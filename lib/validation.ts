import { z } from "zod";
import { AppointmentStatus, BloodType, Relationship, Sex } from "@/app/generated/prisma/enums";

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

// --- Families and patients --------------------------------------------------

export const familySchema = z.object({
  name: requiredText("Family name", 120),
  address: optionalText(300),
  contactNumber: optionalText(40),
  notes: optionalText(2000),
});

export const patientSchema = z.object({
  familyId: requiredText("Family", 40),
  firstName: requiredText("First name", 80),
  middleName: optionalText(80),
  lastName: requiredText("Last name", 80),
  dateOfBirth: dateOnly("Date of birth"),
  sex: z.enum(Sex, { message: "Select a sex" }),
  relationship: z.enum(Relationship, { message: "Select a relationship" }),
  bloodType: z.enum(BloodType).default(BloodType.UNKNOWN),
  allergies: optionalText(600),
  chronicConditions: optionalText(600),
  contactNumber: optionalText(40),
  email: optionalText(160).refine((v) => v === null || z.email().safeParse(v).success, {
    message: "Enter a valid email address",
  }),
});

// --- Appointments -----------------------------------------------------------

export const appointmentSchema = z.object({
  patientId: requiredText("Patient", 40),
  scheduledAt: dateTimeLocal("Appointment time"),
  durationMinutes: z.coerce
    .number<number>()
    .int("Duration must be a whole number of minutes")
    .min(5, "Give the visit at least 5 minutes")
    .max(480, "That is longer than a clinic day"),
  reason: requiredText("Reason for visit", 300),
  status: z.enum(AppointmentStatus).default(AppointmentStatus.SCHEDULED),
  notes: optionalText(2000),
});

// --- Medical records --------------------------------------------------------

export const medicalRecordSchema = z.object({
  patientId: requiredText("Patient", 40),
  appointmentId: optionalText(40),
  visitDate: dateTimeLocal("Visit date"),
  chiefComplaint: requiredText("Chief complaint", 300),
  historyOfPresentIllness: optionalText(4000),

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
  return {
    message: flat.formErrors[0] ?? "Please correct the highlighted fields.",
    fieldErrors: flat.fieldErrors as Record<string, string[]>,
  };
}
