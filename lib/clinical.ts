import type { AllergySeverity, ClinicalListStatus } from "@/lib/enums";

/**
 * Suggestion catalogues for the allergy and condition pickers.
 *
 * These are a shortcut, not a constraint — the picker accepts anything typed,
 * so a doctor is never stuck because a condition is missing from the list. The
 * grouping exists to make browsing quicker than scrolling one flat list.
 */
export type SuggestionGroup = { group: string; items: string[] };

export const ALLERGY_GROUPS: SuggestionGroup[] = [
  {
    group: "Medication",
    items: ["Penicillin", "Aspirin", "Ibuprofen/NSAIDs", "Sulfa drugs"],
  },
  {
    group: "Food",
    items: ["Peanuts", "Tree nuts", "Shellfish", "Eggs", "Milk", "Soy", "Wheat"],
  },
  {
    group: "Environmental and contact",
    items: ["Latex", "Insect stings", "Dust", "Pollen"],
  },
];

export const CONDITION_GROUPS: SuggestionGroup[] = [
  {
    group: "Common conditions",
    items: ["Hypertension", "Diabetes", "Asthma", "High cholesterol"],
  },
  { group: "Cardiovascular", items: ["Heart disease"] },
  { group: "Respiratory", items: ["COPD", "Tuberculosis"] },
  { group: "Endocrine", items: ["Thyroid disorder"] },
  { group: "Neurological", items: ["Epilepsy", "Mental health condition"] },
  {
    group: "Other",
    items: ["Chronic kidney disease", "Chronic liver disease", "Arthritis", "Cancer"],
  },
];

export const CLINICAL_STATUS_LABELS: Record<ClinicalListStatus, string> = {
  RECORDED: "Recorded",
  NONE_KNOWN: "None known",
  UNKNOWN: "Not asked",
};

export const ALLERGY_SEVERITY_LABELS: Record<AllergySeverity, string> = {
  MILD: "Mild",
  MODERATE: "Moderate",
  SEVERE: "Severe",
};

export const ALLERGY_SEVERITY_TONE: Record<AllergySeverity, "neutral" | "warn" | "danger"> = {
  MILD: "neutral",
  MODERATE: "warn",
  SEVERE: "danger",
};

/** Severity order for sorting a chart's allergy list worst-first. */
export const SEVERITY_RANK: Record<AllergySeverity, number> = {
  SEVERE: 0,
  MODERATE: 1,
  MILD: 2,
};

export function sortAllergies<T extends { severity: AllergySeverity | null; label: string }>(
  allergies: T[],
): T[] {
  return [...allergies].sort((a, b) => {
    const rank = (s: AllergySeverity | null) => (s ? SEVERITY_RANK[s] : 3);
    return rank(a.severity) - rank(b.severity) || a.label.localeCompare(b.label);
  });
}
