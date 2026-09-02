"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDoctor } from "@/lib/auth";
import { orm } from "@/src/prisma/db";
import { instantToDb } from "@/lib/datetime";
import { newId } from "@/lib/ids";
import { householdSchema, toFieldErrors, type FormState } from "@/lib/validation";

export async function createHousehold(_prev: FormState, formData: FormData): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = householdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const existing = await orm.Household
    .select("id")
    .where((h) => h.doctorId.eq(doctor.id))
    .where((h) => h.name.eq(parsed.data.name))
    .first();
  if (existing) {
    return {
      message: "You already have a household with that name.",
      fieldErrors: { name: ["Already in use — try adding a distinguishing detail"] },
    };
  }

  const now = instantToDb(new Date());
  const household = await orm.Household.select("id").create({
    ...parsed.data,
    id: newId(),
    doctorId: doctor.id,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/households");
  redirect(`/households/${household.id}`);
}

export async function updateHousehold(
  householdId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = householdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  // Scoping the update by doctorId is what stops one doctor editing another's
  // records by guessing an id.
  const updated = await orm.Household
    .where((h) => h.id.eq(householdId))
    .where((h) => h.doctorId.eq(doctor.id))
    .update({ ...parsed.data, updatedAt: instantToDb(new Date()) });
  if (!updated) return { message: "That household no longer exists." };

  revalidatePath("/households");
  revalidatePath(`/households/${householdId}`);
  redirect(`/households/${householdId}`);
}

export async function deleteHousehold(formData: FormData) {
  const doctor = await requireDoctor();
  const householdId = String(formData.get("householdId") ?? "");
  if (!householdId) return;

  await orm.Household
    .where((h) => h.id.eq(householdId))
    .where((h) => h.doctorId.eq(doctor.id))
    .delete();

  revalidatePath("/households");
  redirect("/households");
}
