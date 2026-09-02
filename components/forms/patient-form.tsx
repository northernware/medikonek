"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FieldGrid, FormError, Select, SubmitButton, TextInput } from "@/components/form";
import { buttonClass } from "@/components/ui";
import { BLOOD_TYPE_LABELS, RELATIONSHIP_LABELS, SEX_LABELS } from "@/lib/domain";
import { ALERT_GROUPS, ALLERGY_GROUPS, CONDITION_GROUPS, MEDICATION_GROUPS } from "@/lib/clinical";
import { ClinicalPicker } from "@/components/clinical-picker";
import type { PatientDefaults } from "@/lib/form-defaults";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/validation";

export function PatientForm({
  action,
  defaults,
  households,
  submitLabel,
  cancelHref,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults: PatientDefaults;
  households: { id: string; name: string }[];
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const err = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.message} />

      <section className="space-y-4">
        <FieldGrid>
          <Field label="Household" htmlFor="householdId" error={err?.householdId} required>
            <Select id="householdId" name="householdId" defaultValue={defaults.householdId} required>
              {households.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Relationship" htmlFor="relationship" error={err?.relationship} required>
            <Select id="relationship" name="relationship" defaultValue={defaults.relationship} required>
              {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </FieldGrid>

        <FieldGrid className="sm:grid-cols-3">
          <Field label="First name" htmlFor="firstName" error={err?.firstName} required>
            <TextInput
              id="firstName"
              name="firstName"
              defaultValue={defaults.firstName}
              required
              invalid={Boolean(err?.firstName)}
            />
          </Field>
          <Field label="Middle name" htmlFor="middleName" error={err?.middleName}>
            <TextInput id="middleName" name="middleName" defaultValue={defaults.middleName} />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={err?.lastName} required>
            <TextInput
              id="lastName"
              name="lastName"
              defaultValue={defaults.lastName}
              required
              invalid={Boolean(err?.lastName)}
            />
          </Field>
        </FieldGrid>

        <FieldGrid className="sm:grid-cols-3">
          <Field label="Date of birth" htmlFor="dateOfBirth" error={err?.dateOfBirth} required>
            <TextInput
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              defaultValue={defaults.dateOfBirth}
              required
              invalid={Boolean(err?.dateOfBirth)}
            />
          </Field>
          <Field label="Sex" htmlFor="sex" error={err?.sex} required>
            <Select id="sex" name="sex" defaultValue={defaults.sex} required invalid={Boolean(err?.sex)}>
              <option value="" disabled>
                Select…
              </option>
              {Object.entries(SEX_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Blood type" htmlFor="bloodType" error={err?.bloodType}>
            <Select id="bloodType" name="bloodType" defaultValue={defaults.bloodType}>
              {Object.entries(BLOOD_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </FieldGrid>
      </section>

      <section className="space-y-5 border-t border-border pt-5">
        <div>
          <h2 className="text-sm font-semibold">Standing clinical notes</h2>
          <p className="text-sm text-ink-muted">
            Allergies show at the top of this patient&rsquo;s chart on every visit.
          </p>
        </div>

        <ClinicalPicker
          legend="Allergies"
          fieldName="allergy"
          statusName="allergyStatus"
          groups={ALLERGY_GROUPS}
          placeholder="Search or select allergies…"
          noneLabel="No known allergies"
          defaultStatus={defaults.allergyStatus as "RECORDED" | "NONE_KNOWN" | "UNKNOWN"}
          defaultItems={defaults.allergies}
          detailFields={["reaction", "severity", "notes"]}
          error={err?.allergyStatus}
        />

        <ClinicalPicker
          legend="Chronic conditions"
          fieldName="condition"
          statusName="conditionStatus"
          groups={CONDITION_GROUPS}
          placeholder="Search or select conditions…"
          noneLabel="No known chronic conditions"
          defaultStatus={defaults.conditionStatus as "RECORDED" | "NONE_KNOWN" | "UNKNOWN"}
          defaultItems={defaults.conditions}
          detailFields={["notes"]}
          error={err?.conditionStatus}
        />

        <ClinicalPicker
          legend="Current medications"
          fieldName="medication"
          statusName="medicationStatus"
          groups={MEDICATION_GROUPS}
          placeholder="Search or select medicines…"
          noneLabel="No current medications"
          defaultStatus={defaults.medicationStatus as "RECORDED" | "NONE_KNOWN" | "UNKNOWN"}
          defaultItems={defaults.medications}
          detailFields={["dosage", "frequency", "notes"]}
          error={err?.medicationStatus}
        />

        <ClinicalPicker
          legend="Medical alerts"
          fieldName="alert"
          groups={ALERT_GROUPS}
          placeholder="Search or add an alert…"
          noneLabel="No alerts"
          defaultStatus={defaults.alerts.length > 0 ? "RECORDED" : "UNKNOWN"}
          defaultItems={defaults.alerts}
          detailFields={["notes"]}
        />

        <FieldGrid>
          <Field label="Contact number" htmlFor="contactNumber" error={err?.contactNumber}>
            <TextInput id="contactNumber" name="contactNumber" defaultValue={defaults.contactNumber} />
          </Field>
          <Field label="Email" htmlFor="email" error={err?.email}>
            <TextInput
              id="email"
              name="email"
              type="email"
              defaultValue={defaults.email}
              invalid={Boolean(err?.email)}
            />
          </Field>
        </FieldGrid>
      </section>

      <section className="space-y-4 border-t border-border pt-5">
        <div>
          <h2 className="text-sm font-semibold">Emergency contact</h2>
          <p className="text-sm text-ink-muted">
            Who to ring about this patient. Often someone outside the practice.
          </p>
        </div>
        <FieldGrid className="sm:grid-cols-3">
          <Field label="Name" htmlFor="emergencyContactName" error={err?.emergencyContactName}>
            <TextInput
              id="emergencyContactName"
              name="emergencyContactName"
              defaultValue={defaults.emergencyContactName}
              placeholder="Marilou Dela Cruz"
            />
          </Field>
          <Field
            label="Relationship"
            htmlFor="emergencyContactRelationship"
            error={err?.emergencyContactRelationship}
          >
            <TextInput
              id="emergencyContactRelationship"
              name="emergencyContactRelationship"
              defaultValue={defaults.emergencyContactRelationship}
              placeholder="Spouse"
            />
          </Field>
          <Field
            label="Contact number"
            htmlFor="emergencyContactNumber"
            error={err?.emergencyContactNumber}
          >
            <TextInput
              id="emergencyContactNumber"
              name="emergencyContactNumber"
              defaultValue={defaults.emergencyContactNumber}
              placeholder="0917 000 0000"
            />
          </Field>
        </FieldGrid>
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
