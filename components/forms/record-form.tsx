"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { Field, FieldGrid, FormError, Select, SubmitButton, TextArea, TextInput } from "@/components/form";
import { buttonClass } from "@/components/ui";
import { BLANK_PRESCRIPTION, type PrescriptionRow, type RecordDefaults } from "@/lib/form-defaults";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/validation";

const VITALS = [
  { name: "temperatureC", label: "Temp", unit: "°C", step: "0.1", placeholder: "36.8" },
  { name: "heartRate", label: "Pulse", unit: "bpm", step: "1", placeholder: "72" },
  { name: "respiratoryRate", label: "Resp", unit: "/min", step: "1", placeholder: "16" },
  { name: "systolic", label: "Systolic", unit: "mmHg", step: "1", placeholder: "120" },
  { name: "diastolic", label: "Diastolic", unit: "mmHg", step: "1", placeholder: "80" },
  { name: "oxygenSaturation", label: "SpO₂", unit: "%", step: "1", placeholder: "98" },
  { name: "weightKg", label: "Weight", unit: "kg", step: "0.1", placeholder: "62.5" },
  { name: "heightCm", label: "Height", unit: "cm", step: "0.1", placeholder: "165" },
] as const;

export function RecordForm({
  action,
  defaults,
  patientId,
  openAppointments,
  submitLabel,
  cancelHref,
  lockedAppointment,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults: RecordDefaults;
  patientId: string;
  openAppointments: { id: string; label: string }[];
  submitLabel: string;
  cancelHref: string;
  /** Set when documenting a specific booking — the link is fixed, not chosen. */
  lockedAppointment?: { id: string; label: string };
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const [rx, setRx] = useState<PrescriptionRow[]>(defaults.prescriptions);
  const err = state.fieldErrors;
  const rxId = useId();

  function updateRx(index: number, patch: Partial<PrescriptionRow>) {
    setRx((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <form action={formAction} className="space-y-7">
      <FormError message={state.message} />
      <input type="hidden" name="patientId" value={patientId} />

      <section className="space-y-4">
        <FieldGrid>
          <Field label="Visit date and time" htmlFor="visitDate" error={err?.visitDate} required>
            <TextInput
              id="visitDate"
              name="visitDate"
              type="datetime-local"
              defaultValue={defaults.visitDate}
              required
              invalid={Boolean(err?.visitDate)}
            />
          </Field>

          {lockedAppointment ? (
            <Field label="Documenting appointment" htmlFor="appointmentLabel">
              <input type="hidden" name="appointmentId" value={lockedAppointment.id} />
              <TextInput id="appointmentLabel" defaultValue={lockedAppointment.label} disabled />
            </Field>
          ) : openAppointments.length > 0 ? (
            <Field
              label="Link to appointment"
              htmlFor="appointmentId"
              error={err?.appointmentId}
              hint="Linking marks that appointment completed."
            >
              <Select id="appointmentId" name="appointmentId" defaultValue={defaults.appointmentId}>
                <option value="">Walk-in — no appointment</option>
                {openAppointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <input type="hidden" name="appointmentId" value="" />
          )}
        </FieldGrid>

        <Field label="Chief complaint" htmlFor="chiefComplaint" error={err?.chiefComplaint} required>
          <TextInput
            id="chiefComplaint"
            name="chiefComplaint"
            defaultValue={defaults.chiefComplaint}
            required
            placeholder="Cough and fever, 3 days"
            invalid={Boolean(err?.chiefComplaint)}
          />
        </Field>

        <Field
          label="History of present illness"
          htmlFor="historyOfPresentIllness"
          error={err?.historyOfPresentIllness}
        >
          <TextArea
            id="historyOfPresentIllness"
            name="historyOfPresentIllness"
            rows={4}
            defaultValue={defaults.historyOfPresentIllness}
          />
        </Field>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <h2 className="text-sm font-semibold">Vitals</h2>
          <p className="text-sm text-ink-muted">Leave blank anything you did not take.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {VITALS.map((v) => (
            <Field key={v.name} label={`${v.label} (${v.unit})`} htmlFor={v.name} error={err?.[v.name]}>
              <TextInput
                id={v.name}
                name={v.name}
                type="number"
                step={v.step}
                inputMode="decimal"
                placeholder={v.placeholder}
                defaultValue={defaults[v.name]}
                invalid={Boolean(err?.[v.name])}
                className="tabular"
              />
            </Field>
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="text-sm font-semibold">Assessment and plan</h2>
        <Field label="Assessment / diagnosis" htmlFor="assessment" error={err?.assessment}>
          <TextArea id="assessment" name="assessment" rows={3} defaultValue={defaults.assessment} />
        </Field>
        <Field label="Treatment plan" htmlFor="treatmentPlan" error={err?.treatmentPlan}>
          <TextArea id="treatmentPlan" name="treatmentPlan" rows={4} defaultValue={defaults.treatmentPlan} />
        </Field>
        <FieldGrid>
          <Field label="Follow-up date" htmlFor="followUpDate" error={err?.followUpDate}>
            <TextInput
              id="followUpDate"
              name="followUpDate"
              type="date"
              defaultValue={defaults.followUpDate}
              invalid={Boolean(err?.followUpDate)}
            />
          </Field>
        </FieldGrid>
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Prescriptions</h2>
            <p className="text-sm text-ink-muted">
              {rx.length === 0 ? "None yet." : `${rx.length} item${rx.length === 1 ? "" : "s"}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRx((rows) => [...rows, { ...BLANK_PRESCRIPTION }])}
            className={buttonClass("secondary")}
          >
            Add drug
          </button>
        </div>

        {rx.map((row, i) => (
          <fieldset key={`${rxId}-${i}`} className="rounded-xl border border-border bg-surface-muted p-4">
            <legend className="px-1 text-xs font-medium text-ink-faint">Drug {i + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Drug" htmlFor={`${rxId}-drug-${i}`} className="sm:col-span-2">
                <TextInput
                  id={`${rxId}-drug-${i}`}
                  name="rx.drugName"
                  value={row.drugName}
                  onChange={(e) => updateRx(i, { drugName: e.target.value })}
                  placeholder="Amoxicillin 500 mg"
                />
              </Field>
              <Field label="Dosage" htmlFor={`${rxId}-dose-${i}`}>
                <TextInput
                  id={`${rxId}-dose-${i}`}
                  name="rx.dosage"
                  value={row.dosage}
                  onChange={(e) => updateRx(i, { dosage: e.target.value })}
                  placeholder="1 capsule"
                />
              </Field>
              <Field label="Frequency" htmlFor={`${rxId}-freq-${i}`}>
                <TextInput
                  id={`${rxId}-freq-${i}`}
                  name="rx.frequency"
                  value={row.frequency}
                  onChange={(e) => updateRx(i, { frequency: e.target.value })}
                  placeholder="3× daily"
                />
              </Field>
              <Field label="Duration" htmlFor={`${rxId}-dur-${i}`}>
                <TextInput
                  id={`${rxId}-dur-${i}`}
                  name="rx.duration"
                  value={row.duration}
                  onChange={(e) => updateRx(i, { duration: e.target.value })}
                  placeholder="7 days"
                />
              </Field>
              <Field label="Instructions" htmlFor={`${rxId}-inst-${i}`} className="sm:col-span-3">
                <TextInput
                  id={`${rxId}-inst-${i}`}
                  name="rx.instructions"
                  value={row.instructions}
                  onChange={(e) => updateRx(i, { instructions: e.target.value })}
                  placeholder="After meals"
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => setRx((rows) => rows.filter((_, index) => index !== i))}
              className="mt-3 text-sm font-medium text-danger-ink hover:underline"
            >
              Remove
            </button>
          </fieldset>
        ))}
      </section>

      <section className="border-t border-border pt-6">
        <Field label="Additional notes" htmlFor="notes" error={err?.notes}>
          <TextArea id="notes" name="notes" rows={3} defaultValue={defaults.notes} />
        </Field>
      </section>

      <div className="flex gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
