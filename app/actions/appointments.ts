"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppointmentStatus } from "@/app/generated/prisma/enums";
import { requireDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fromDateTimeLocalValue } from "@/lib/datetime";
import { appointmentSchema, toFieldErrors, type FormState } from "@/lib/validation";

async function assertOwnsPatient(doctorId: string, patientId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, family: { doctorId } },
    select: { id: true },
  });
  return patient !== null;
}

export async function createAppointment(_prev: FormState, formData: FormData): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = appointmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const { patientId, scheduledAt, ...rest } = parsed.data;
  if (!(await assertOwnsPatient(doctor.id, patientId))) {
    return { message: "That patient is not on your list." };
  }

  const at = fromDateTimeLocalValue(scheduledAt);
  if (!at) return { message: "Check the appointment time.", fieldErrors: { scheduledAt: ["Invalid time"] } };

  const appointment = await prisma.appointment.create({
    data: { ...rest, patientId, doctorId: doctor.id, scheduledAt: at },
    select: { id: true },
  });

  revalidatePath("/appointments");
  revalidatePath("/");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/appointments/${appointment.id}`);
}

export async function updateAppointment(
  appointmentId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const doctor = await requireDoctor();
  const parsed = appointmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const { patientId, scheduledAt, ...rest } = parsed.data;
  if (!(await assertOwnsPatient(doctor.id, patientId))) {
    return { message: "That patient is not on your list." };
  }

  const at = fromDateTimeLocalValue(scheduledAt);
  if (!at) return { message: "Check the appointment time.", fieldErrors: { scheduledAt: ["Invalid time"] } };

  const { count } = await prisma.appointment.updateMany({
    where: { id: appointmentId, doctorId: doctor.id },
    data: { ...rest, patientId, scheduledAt: at },
  });
  if (count === 0) return { message: "That appointment no longer exists." };

  revalidatePath("/appointments");
  revalidatePath("/");
  revalidatePath(`/appointments/${appointmentId}`);
  revalidatePath(`/patients/${patientId}`);
  redirect(`/appointments/${appointmentId}`);
}

/** Quick status change from a list row — no full form round-trip. */
export async function setAppointmentStatus(formData: FormData) {
  const doctor = await requireDoctor();
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const raw = String(formData.get("status") ?? "");

  if (!appointmentId || !(raw in AppointmentStatus)) return;

  await prisma.appointment.updateMany({
    where: { id: appointmentId, doctorId: doctor.id },
    data: { status: raw as AppointmentStatus },
  });

  revalidatePath("/appointments");
  revalidatePath("/");
  revalidatePath(`/appointments/${appointmentId}`);
}

export async function deleteAppointment(formData: FormData) {
  const doctor = await requireDoctor();
  const appointmentId = String(formData.get("appointmentId") ?? "");
  if (!appointmentId) return;

  await prisma.appointment.deleteMany({ where: { id: appointmentId, doctorId: doctor.id } });

  revalidatePath("/appointments");
  revalidatePath("/");
  redirect("/appointments");
}
