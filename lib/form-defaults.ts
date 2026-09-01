/**
 * Shapes and blank values the forms are seeded with. These live outside the
 * `"use client"` form modules because server components build the defaults —
 * a function exported from a client module cannot be called on the server.
 */

export type FamilyDefaults = {
  name: string;
  address: string;
  contactNumber: string;
  notes: string;
};

export const BLANK_FAMILY: FamilyDefaults = {
  name: "",
  address: "",
  contactNumber: "",
  notes: "",
};

export type PatientDefaults = {
  familyId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  relationship: string;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  contactNumber: string;
  email: string;
};

export function blankPatient(familyId: string): PatientDefaults {
  return {
    familyId,
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "",
    relationship: "CHILD",
    bloodType: "UNKNOWN",
    allergies: "",
    chronicConditions: "",
    contactNumber: "",
    email: "",
  };
}

export type AppointmentDefaults = {
  patientId: string;
  scheduledAt: string;
  durationMinutes: number;
  service: string;
  reason: string;
  status: string;
  notes: string;
};

export type PatientOption = { id: string; label: string; familyName: string };

export type PrescriptionRow = {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

export const BLANK_PRESCRIPTION: PrescriptionRow = {
  drugName: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

export type RecordDefaults = {
  visitDate: string;
  appointmentId: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  temperatureC: string;
  heartRate: string;
  respiratoryRate: string;
  systolic: string;
  diastolic: string;
  weightKg: string;
  heightCm: string;
  oxygenSaturation: string;
  assessment: string;
  treatmentPlan: string;
  followUpDate: string;
  notes: string;
  prescriptions: PrescriptionRow[];
};

export function blankRecord(visitDate: string): RecordDefaults {
  return {
    visitDate,
    appointmentId: "",
    chiefComplaint: "",
    historyOfPresentIllness: "",
    temperatureC: "",
    heartRate: "",
    respiratoryRate: "",
    systolic: "",
    diastolic: "",
    weightKg: "",
    heightCm: "",
    oxygenSaturation: "",
    assessment: "",
    treatmentPlan: "",
    followUpDate: "",
    notes: "",
    prescriptions: [],
  };
}
