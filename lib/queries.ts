import "server-only";
import { prisma } from "./prisma";
import { fullName } from "./domain";
import type { PatientOption } from "./form-defaults";

/** Every patient this doctor can book, ready for a grouped <select>. */
export async function patientOptions(doctorId: string): Promise<PatientOption[]> {
  const patients = await prisma.patient.findMany({
    where: { family: { doctorId } },
    orderBy: [{ family: { name: "asc" } }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      family: { select: { name: true } },
    },
  });

  return patients.map((p) => ({ id: p.id, label: fullName(p), familyName: p.family.name }));
}
