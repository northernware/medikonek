"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ServiceType } from "@/app/generated/prisma/enums";
import { Field, FieldGrid, FormError, Select, SubmitButton, TextArea, TextInput } from "@/components/form";
import { buttonClass } from "@/components/ui";
import { APPOINTMENT_STATUS_LABELS, SERVICES, SERVICE_DESCRIPTIONS, SERVICE_MINUTES } from "@/lib/domain";
import type { AppointmentDefaults, PatientOption } from "@/lib/form-defaults";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/validation";

export function AppointmentForm({
  action,
  defaults,
  patients,
  submitLabel,
  cancelHref,
  showStatus = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults: AppointmentDefaults;
  patients: PatientOption[];
  submitLabel: string;
  cancelHref: string;
  showStatus?: boolean;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const err = state.fieldErrors;

  // Picking a service sets a sensible slot length, but stops doing so the moment
  // the doctor sets a duration themselves.
  const [service, setService] = useState(defaults.service);
  const [duration, setDuration] = useState(String(defaults.durationMinutes));
  const [durationEdited, setDurationEdited] = useState(false);

  function chooseService(value: string) {
    setService(value);
    if (!durationEdited) {
      const minutes = SERVICE_MINUTES[value as ServiceType];
      if (minutes) setDuration(String(minutes));
    }
  }

  // Group the picker by household so siblings sit together.
  const byFamily = patients.reduce<Record<string, PatientOption[]>>((acc, p) => {
    (acc[p.familyName] ??= []).push(p);
    return acc;
  }, {});

  return (
    <form action={formAction} className="space-y-5">
      <FormError message={state.message} />

      <Field label="Patient" htmlFor="patientId" error={err?.patientId} required>
        <Select id="patientId" name="patientId" defaultValue={defaults.patientId} required>
          <option value="" disabled>
            Select a patient…
          </option>
          {Object.entries(byFamily).map(([family, members]) => (
            <optgroup key={family} label={family}>
              {members.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>

      <Field
        label="Service"
        htmlFor="service"
        error={err?.service}
        hint={SERVICE_DESCRIPTIONS[service as ServiceType]}
        required
      >
        <Select
          id="service"
          name="service"
          value={service}
          onChange={(e) => chooseService(e.target.value)}
          required
          invalid={Boolean(err?.service)}
        >
          <option value="" disabled>
            Choose a service…
          </option>
          {SERVICES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>

      <FieldGrid>
        <Field label="Date and time" htmlFor="scheduledAt" error={err?.scheduledAt} required>
          <TextInput
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            defaultValue={defaults.scheduledAt}
            required
            invalid={Boolean(err?.scheduledAt)}
          />
        </Field>
        <Field
          label="Duration"
          htmlFor="durationMinutes"
          error={err?.durationMinutes}
          hint={durationEdited ? undefined : "Set from the service — change it to override."}
          required
        >
          <Select
            id="durationMinutes"
            name="durationMinutes"
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              setDurationEdited(true);
            }}
          >
            {[15, 20, 30, 45, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Select>
        </Field>
      </FieldGrid>

      <Field
        label="Reason for visit"
        htmlFor="reason"
        error={err?.reason}
        hint="The specifics — what the service field cannot say on its own."
        required
      >
        <TextInput
          id="reason"
          name="reason"
          defaultValue={defaults.reason}
          required
          placeholder="BP above target since last refill"
          invalid={Boolean(err?.reason)}
        />
      </Field>

      {showStatus ? (
        <Field label="Status" htmlFor="status" error={err?.status}>
          <Select id="status" name="status" defaultValue={defaults.status}>
            {Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="status" value={defaults.status} />
      )}

      <Field label="Scheduling notes" htmlFor="notes" error={err?.notes}>
        <TextArea id="notes" name="notes" rows={3} defaultValue={defaults.notes} />
      </Field>

      <div className="flex gap-2 pt-1">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
