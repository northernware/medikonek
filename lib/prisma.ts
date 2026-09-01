import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

// The datasource URL lives in prisma7.config.ts for the CLI; the runtime client
// gets it through a driver adapter, which Prisma 7 requires.
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env");
  }

  const adapter = new PrismaPg({
    connectionString,
    // Retire idle connections before the server does. A pooled endpoint (and
    // the local `prisma dev` server) closes idle sockets on its own schedule;
    // without a shorter timeout here the pool keeps handing out connections the
    // far end has already hung up on, which surfaces as an intermittent
    // `ConnectionClosed` on whichever request happens to draw the dead one.
    idleTimeoutMillis: 10_000,
    max: 10,
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({ adapter });
}

// Next.js re-evaluates modules on hot reload; without the global we would open a
// new connection pool on every save.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
