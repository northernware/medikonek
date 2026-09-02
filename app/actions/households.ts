"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDoctor } from "@/lib/auth";
import { orm } from "@/src/prisma/db";
import { instantToDb } from "@/lib/datetime";
import { newId } from "@/lib/ids";
import { householdSchema, toFieldErrors, type FormState } from "@/lib/validation";

/**
 * Resolves the chosen primary contact, or `undefined` when the id names someone
 * who is not in this household. Checking membership here is what stops a guessed
 * id pointing at another household's patient — or another doctor's.
 */
async function resolvePrimaryContact(householdId: string, doctorId: string, contactId: string | null) {
  if (!contactId) return null;
  const member = await orm.Patient
    .select("id")
    .where((p) => p.id.eq(contactId))
    .where((p) => p.householdId.eq(householdId))
    .where((p) => p.household.some((h) => h.doctorId.eq(doctorId)))
    .first();
  return member?.id ?? undefined;
}

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
  // A brand-new household has no members yet, so it cannot have a contact.
  const { primaryContactId: _unused, ...withoutContact } = parsed.data;

  const household = await orm.Household.select("id").create({
    ...withoutContact,
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

  const { primaryContactId, ...rest } = parsed.data;
  const primaryContact = await resolvePrimaryContact(householdId, doctor.id, primaryContactId);
  if (primaryContact === undefined) {
    return {
      message: "That person is not a member of this household.",
      fieldErrors: { primaryContactId: ["Pick someone in this household"] },
    };
  }

  // Scoping the update by doctorId is what stops one doctor editing another's
  // records by guessing an id.
  const updated = await orm.Household
    .where((h) => h.id.eq(householdId))
    .where((h) => h.doctorId.eq(doctor.id))
    .update({ ...rest, primaryContactId: primaryContact, updatedAt: instantToDb(new Date()) });
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
