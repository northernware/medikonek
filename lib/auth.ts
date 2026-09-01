import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { readSession } from "./session";

export type CurrentDoctor = {
  id: string;
  email: string;
  fullName: string;
  specialty: string | null;
  clinicName: string | null;
  licenseNumber: string | null;
};

/// Cached per request, so a layout and its pages share one lookup.
export const getCurrentDoctor = cache(async (): Promise<CurrentDoctor | null> => {
  const session = await readSession();
  if (!session) return null;
  return prisma.doctor.findUnique({
    where: { id: session.doctorId },
    select: {
      id: true,
      email: true,
      fullName: true,
      specialty: true,
      clinicName: true,
      licenseNumber: true,
    },
  });
});

/// The gate every page, query and server action goes through. Server Actions are
/// reachable by direct POST, so checking in a layout alone is not enough.
export async function requireDoctor(): Promise<CurrentDoctor> {
  const doctor = await getCurrentDoctor();
  if (!doctor) redirect("/login");
  return doctor;
}
