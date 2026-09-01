import type { AllergySeverity, ClinicalListStatus } from "@/app/generated/prisma/enums";
import { ALLERGY_SEVERITY_LABELS, ALLERGY_SEVERITY_TONE, sortAllergies } from "@/lib/clinical";
import { Badge } from "./ui";

export type AllergyEntry = {
  id: string;
  label: string;
  reaction: string | null;
  severity: AllergySeverity | null;
  notes: string | null;
};

/** The `select` every query feeding this banner needs. */
export const ALLERGY_SELECT = {
  id: true,
  label: true,
  reaction: true,
  severity: true,
  notes: true,
} as const;

/**
 * Allergies at the top of a chart, in one of three states — and all three say
 * something. An empty list is not "safe": a patient nobody has asked reads as
 * unrecorded, in amber, rather than silently as none.
 */
export function AllergyBanner({
  status,
  allergies,
}: {
  status: ClinicalListStatus;
  allergies: AllergyEntry[];
}) {
  if (status === "NONE_KNOWN" && allergies.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface px-5 py-3 text-sm text-ink-muted">
        <span className="font-medium text-ink">No known allergies</span> — asked and recorded.
      </p>
    );
  }

  if (allergies.length === 0) {
    return (
      <p className="rounded-xl border border-warn/40 bg-warn-soft px-5 py-3 text-sm text-warn-ink">
        <span className="font-medium">Allergies not recorded.</span> Nobody has taken an allergy
        history for this patient yet.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-danger/30 bg-danger-soft px-5 py-4">
      <p className="text-xs font-semibold tracking-wide text-danger-ink uppercase">Allergies</p>
      <ul className="mt-2 space-y-1.5">
        {sortAllergies(allergies).map((a) => (
          <li key={a.id} className="text-sm text-danger-ink">
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-medium">{a.label}</span>
              {a.severity ? (
                <Badge tone={ALLERGY_SEVERITY_TONE[a.severity]}>
                  {ALLERGY_SEVERITY_LABELS[a.severity]}
                </Badge>
              ) : null}
              {a.reaction ? <span className="opacity-90">{a.reaction}</span> : null}
            </span>
            {a.notes ? <span className="mt-0.5 block text-xs opacity-75">{a.notes}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
