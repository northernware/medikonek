"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { householdSchema, toFieldErrors, type FormState } from "@/lib/validation";

export async function createHousehold(_prev: FormState, formData: FormData): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = householdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const existing = await prisma.household.findUnique({
    where: { doctorId_name: { doctorId: doctor.id, name: parsed.data.name } },
    select: { id: true },
  });
  if (existing) {
    return {
      message: "You already have a household with that name.",
      fieldErrors: { name: ["Already in use — try adding a distinguishing detail"] },
    };
  }

  const household = await prisma.household.create({
    data: { ...parsed.data, doctorId: doctor.id },
    select: { id: true },
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
  const { count } = await prisma.household.updateMany({
    where: { id: householdId, doctorId: doctor.id },
    data: parsed.data,
  });
  if (count === 0) return { message: "That household no longer exists." };

  revalidatePath("/households");
  revalidatePath(`/households/${householdId}`);
  redirect(`/households/${householdId}`);
}

export async function deleteHousehold(formData: FormData) {
  const doctor = await requireDoctor();
  const householdId = String(formData.get("householdId") ?? "");
  if (!householdId) return;

  await prisma.household.deleteMany({ where: { id: householdId, doctorId: doctor.id } });

  revalidatePath("/households");
  redirect("/households");
}
