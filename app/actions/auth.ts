"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { orm } from "@/src/prisma/db";
import { instantToDb } from "@/lib/datetime";
import { newId } from "@/lib/ids";
import { createSession, destroySession } from "@/lib/session";
import { loginSchema, registerSchema, toFieldErrors, type FormState } from "@/lib/validation";

// Compared against when no account matches, so a wrong email and a wrong
// password take the same amount of time to reject.
const DECOY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO3jGZ5VZ0rJ8vJ8gXqU9O0F5nJ0lK7Zu";

export async function registerDoctor(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const { email, password, confirmPassword: _ignored, ...profile } = parsed.data;

  const taken = await orm.Doctor.select("id").where((d) => d.email.eq(email)).first();
  if (taken) {
    return {
      message: "That email already has an account.",
      fieldErrors: { email: ["Already registered — sign in instead"] },
    };
  }

  const now = instantToDb(new Date());
  const doctor = await orm.Doctor.select("id").create({
    ...profile,
    id: newId(),
    email,
    passwordHash: await bcrypt.hash(password, 12),
    createdAt: now,
    updatedAt: now,
  });

  await createSession(doctor.id);
  redirect("/");
}

export async function loginDoctor(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const doctor = await orm.Doctor
    .select("id", "passwordHash")
    .where((d) => d.email.eq(parsed.data.email))
    .first();

  const matches = await bcrypt.compare(parsed.data.password, doctor?.passwordHash ?? DECOY_HASH);
  if (!doctor || !matches) {
    // Deliberately vague: never confirm which half was wrong.
    return { message: "Email or password is incorrect." };
  }

  await createSession(doctor.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
