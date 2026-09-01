"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { familySchema, toFieldErrors, type FormState } from "@/lib/validation";

export async function createFamily(_prev: FormState, formData: FormData): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = familySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const existing = await prisma.family.findUnique({
    where: { doctorId_name: { doctorId: doctor.id, name: parsed.data.name } },
    select: { id: true },
  });
  if (existing) {
    return {
      message: "You already have a family with that name.",
      fieldErrors: { name: ["Already in use — try adding a distinguishing detail"] },
    };
  }

  const family = await prisma.family.create({
    data: { ...parsed.data, doctorId: doctor.id },
    select: { id: true },
  });

  revalidatePath("/families");
  redirect(`/families/${family.id}`);
}

export async function updateFamily(
  familyId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = familySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  // Scoping the update by doctorId is what stops one doctor editing another's
  // records by guessing an id.
  const { count } = await prisma.family.updateMany({
    where: { id: familyId, doctorId: doctor.id },
    data: parsed.data,
  });
  if (count === 0) return { message: "That family no longer exists." };

  revalidatePath("/families");
  revalidatePath(`/families/${familyId}`);
  redirect(`/families/${familyId}`);
}

export async function deleteFamily(formData: FormData) {
  const doctor = await requireDoctor();
  const familyId = String(formData.get("familyId") ?? "");
  if (!familyId) return;

  await prisma.family.deleteMany({ where: { id: familyId, doctorId: doctor.id } });

  revalidatePath("/families");
  redirect("/families");
}
