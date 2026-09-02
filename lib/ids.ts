import { randomUUID } from "node:crypto";

/**
 * A primary key for a new row.
 *
 * Prisma 7 generated `cuid()` values in the client; Prisma 8 leaves the id to the
 * application, so this is now the one place that decides the format. The columns
 * are `text` and never parsed, so rows written before the upgrade keep their cuid
 * keys and new rows get a UUID — both are opaque identifiers and they coexist.
 */
export function newId(): string {
  return randomUUID();
}
