import postgres from "@prisma/orm-postgres/runtime";
import contractJson from "./contract.json";
import type { Contract } from "./contract";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env");
  }

  return postgres<Contract>({
    contractJson,
    url,
    poolOptions: {
      // Retire idle connections before the server does. A pooled endpoint closes
      // idle sockets on its own schedule; without a shorter timeout here the pool
      // keeps handing out connections the far end has already hung up on, which
      // surfaces as an intermittent ConnectionClosed on whichever request happens
      // to draw the dead one. The façade does not expose a max-connections field —
      // pass your own pg.Pool via `pg:` if that needs tuning.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    },
  });
}

// Next.js re-evaluates modules on hot reload; without the global we would open a
// new connection pool on every save. The pool lives for the process lifetime and
// is never closed per-request.
const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createDb> };

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;

// The contract declares one namespace, `public`, so every model is addressed as
// `db.orm.public.<Model>`. Bind it once here and the call sites read `orm.Patient`.
// Inside a transaction the same coordinate applies: `tx.orm.public.<Model>`.
export const orm = db.orm.public;
