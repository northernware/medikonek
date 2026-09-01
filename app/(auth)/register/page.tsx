import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-card sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Register your practice</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Households, patients and records you create stay visible only to this account.
      </p>

      <RegisterForm />

      <p className="mt-6 text-sm text-ink-muted">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-accent-ink hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
