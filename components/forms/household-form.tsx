"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormError, SubmitButton, TextArea, TextInput } from "@/components/form";
import { buttonClass } from "@/components/ui";
import { BLANK_HOUSEHOLD, type HouseholdDefaults } from "@/lib/form-defaults";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/validation";

export function HouseholdForm({
  action,
  defaults = BLANK_HOUSEHOLD,
  submitLabel,
  cancelHref,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults?: HouseholdDefaults;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const err = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-5">
      <FormError message={state.message} />

      <Field
        label="Household name"
        htmlFor="name"
        error={err?.name}
        hint="Usually the surname — how you'd say it aloud in the waiting room."
        required
      >
        <TextInput
          id="name"
          name="name"
          defaultValue={defaults.name}
          required
          placeholder="Dela Cruz"
          invalid={Boolean(err?.name)}
        />
      </Field>

      <Field label="Contact number" htmlFor="contactNumber" error={err?.contactNumber}>
        <TextInput
          id="contactNumber"
          name="contactNumber"
          defaultValue={defaults.contactNumber}
          placeholder="0917 000 0000"
        />
      </Field>

      <Field label="Address" htmlFor="address" error={err?.address}>
        <TextArea id="address" name="address" rows={2} defaultValue={defaults.address} />
      </Field>

      <Field
        label="Notes"
        htmlFor="notes"
        error={err?.notes}
        hint="Context worth carrying across every member’s visits — hereditary conditions, living situation, who to call."
      >
        <TextArea id="notes" name="notes" rows={4} defaultValue={defaults.notes} />
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
