"use client";

import { useActionState } from "react";
import { registerDoctor } from "@/app/actions/auth";
import { Field, FieldGrid, FormError, SubmitButton, TextInput } from "@/components/form";
import { EMPTY_FORM_STATE } from "@/lib/validation";

export function RegisterForm() {
  const [state, action] = useActionState(registerDoctor, EMPTY_FORM_STATE);
  const err = state.fieldErrors;

  return (
    <form action={action} className="mt-6 space-y-4">
      <FormError message={state.message} />

      <Field label="Full name" htmlFor="fullName" error={err?.fullName} required>
        <TextInput
          id="fullName"
          name="fullName"
          required
          placeholder="Dr. Ana Reyes"
          invalid={Boolean(err?.fullName)}
        />
      </Field>

      <Field label="Email" htmlFor="email" error={err?.email} required>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          invalid={Boolean(err?.email)}
        />
      </Field>

      <FieldGrid>
        <Field label="Specialty" htmlFor="specialty" error={err?.specialty}>
          <TextInput id="specialty" name="specialty" placeholder="Family Medicine" />
        </Field>
        <Field label="PRC licence no." htmlFor="licenseNumber" error={err?.licenseNumber}>
          <TextInput id="licenseNumber" name="licenseNumber" />
        </Field>
      </FieldGrid>

      <Field label="Clinic" htmlFor="clinicName" error={err?.clinicName}>
        <TextInput id="clinicName" name="clinicName" placeholder="Northern Family Clinic" />
      </Field>

      <FieldGrid>
        <Field
          label="Password"
          htmlFor="password"
          error={err?.password}
          hint="At least 10 characters"
          required
        >
          <TextInput
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            invalid={Boolean(err?.password)}
          />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={err?.confirmPassword} required>
          <TextInput
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            invalid={Boolean(err?.confirmPassword)}
          />
        </Field>
      </FieldGrid>

      <SubmitButton pendingLabel="Creating account…" className="w-full">
        Create account
      </SubmitButton>
    </form>
  );
}
