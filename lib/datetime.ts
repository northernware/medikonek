/**
 * All appointment times are rendered in the clinic's timezone rather than the
 * viewer's, so a server-rendered schedule and a doctor's wall clock agree — and
 * so server and client markup never disagree during hydration.
 */
export const CLINIC_TIME_ZONE = process.env.NEXT_PUBLIC_CLINIC_TIMEZONE || "Asia/Manila";

const LOCALE = "en-PH";

function parts(at: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map = Object.fromEntries(dtf.formatToParts(at).map((p) => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function zoneOffsetMs(at: Date, timeZone: string) {
  const p = parts(at, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - at.getTime();
}

// --- Instants (appointments, visit timestamps) ------------------------------

/** `<input type="datetime-local">` value for an instant, in clinic time. */
export function toDateTimeLocalValue(at: Date) {
  const p = parts(at, CLINIC_TIME_ZONE);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Read a `datetime-local` value as clinic wall time and return the instant. */
export function fromDateTimeLocalValue(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  return new Date(naive - zoneOffsetMs(new Date(naive), CLINIC_TIME_ZONE));
}

export function formatDateTime(at: Date) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: CLINIC_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(at);
}

export function formatTime(at: Date) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: CLINIC_TIME_ZONE,
    timeStyle: "short",
  }).format(at);
}

export function formatDate(at: Date) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: CLINIC_TIME_ZONE,
    dateStyle: "medium",
  }).format(at);
}

/** "Wednesday, 2 September 2026" — for day headings. */
export function formatDayHeading(at: Date) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: CLINIC_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(at);
}

/** Midnight-to-midnight bounds of a clinic day containing `at`. */
export function clinicDayRange(at: Date) {
  const p = parts(at, CLINIC_TIME_ZONE);
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = fromDateTimeLocalValue(`${p.year}-${pad(p.month)}-${pad(p.day)}T00:00`)!;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

// --- Calendar dates (date of birth, follow-up) ------------------------------
// Stored as Postgres `date`, which Prisma hands back as UTC midnight. Formatting
// those in a local zone would shift them a day, so they stay in UTC throughout.

/** `<input type="date">` value for a stored calendar date. */
export function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function fromDateInputValue(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatCalendarDate(d: Date) {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", dateStyle: "medium" }).format(d);
}
