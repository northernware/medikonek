import type { AppointmentStatus } from "@/app/generated/prisma/enums";
import { CLINIC_TIME_ZONE, dayKey, fromDateTimeLocalValue } from "./datetime";

/**
 * Clinic opening rules. The booking form uses these to offer slots and the
 * server re-checks them on submit — the form's list can always be stale, and
 * server actions are reachable by direct POST.
 */
export const OPEN_HOUR = 8; // 08:00
export const CLOSE_HOUR = 17; // 17:00, the last minute a visit may still run to
export const CLOSED_WEEKDAY = 0; // Sunday
export const SLOT_STEP_MINUTES = 15;
/** A booking must be made at least this many whole days ahead. */
export const MIN_LEAD_DAYS = 1;
/** How far ahead the form will let you book. */
export const MAX_LEAD_DAYS = 180;

export const OPEN_MINUTE = OPEN_HOUR * 60;
export const CLOSE_MINUTE = CLOSE_HOUR * 60;

export const OFFICE_HOURS_TEXT = "Monday to Saturday, 8:00 AM to 5:00 PM";

/** A calendar day key with `days` added — plain UTC arithmetic, no zone risk. */
export function addDays(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d + days));
  return `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, "0")}-${String(at.getUTCDate()).padStart(2, "0")}`;
}

export function weekdayOf(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isClosedDay(key: string) {
  return weekdayOf(key) === CLOSED_WEEKDAY;
}

/** The earliest day a booking may fall on, given the lead-time rule. */
export function earliestBookableDay(now = new Date()) {
  return addDays(dayKey(now), MIN_LEAD_DAYS);
}

export function latestBookableDay(now = new Date()) {
  return addDays(dayKey(now), MAX_LEAD_DAYS);
}

/** Statuses that hold a slot. A cancelled visit frees its time up again. */
export function occupiesSlot(status: AppointmentStatus) {
  return status !== "CANCELLED";
}

export type BusyInterval = { start: number; end: number };

/**
 * Rejects a proposed booking, or returns null if it is allowed. This is the
 * single authority: the form mirrors it, but only this decides.
 */
export function checkBookingRules(
  scheduledAt: Date,
  durationMinutes: number,
  now = new Date(),
): string | null {
  const key = dayKey(scheduledAt);

  if (key < earliestBookableDay(now)) {
    return `Bookings must be made at least ${MIN_LEAD_DAYS === 1 ? "a day" : `${MIN_LEAD_DAYS} days`} in advance — the earliest available date is ${earliestBookableDay(now)}.`;
  }
  if (key > latestBookableDay(now)) {
    return `That is further ahead than the clinic books (${MAX_LEAD_DAYS} days).`;
  }
  if (isClosedDay(key)) {
    return "The clinic is closed on Sundays.";
  }

  const startMinute = minuteOfDay(scheduledAt);
  if (startMinute < OPEN_MINUTE) {
    return `The clinic opens at ${OPEN_HOUR}:00 AM. Choose a later time.`;
  }
  if (startMinute + durationMinutes > CLOSE_MINUTE) {
    return `A ${durationMinutes}-minute visit starting then would run past the ${CLOSE_HOUR - 12}:00 PM closing time.`;
  }
  return null;
}

/** Minutes since midnight, in clinic time. */
export function minuteOfDay(at: Date) {
  const start = fromDateTimeLocalValue(`${dayKey(at)}T00:00`)!;
  return Math.round((at.getTime() - start.getTime()) / 60_000);
}

/** True when [start, start+duration) overlaps anything already booked. */
export function overlaps(startMinute: number, durationMinutes: number, busy: BusyInterval[]) {
  const end = startMinute + durationMinutes;
  return busy.some((b) => startMinute < b.end && end > b.start);
}

export type Slot = { minute: number; value: string; label: string; free: boolean };

/**
 * Every start time on the grid for one day, each marked free or taken. Returns
 * an empty list for a closed or out-of-window day, so the caller needs no
 * special case.
 *
 * The window is passed in rather than derived from `new Date()` so the browser
 * and the server agree: the client's clock and timezone are its own.
 */
export function slotsForDay(
  key: string,
  durationMinutes: number,
  busy: BusyInterval[],
  window: { earliest: string; latest: string },
): Slot[] {
  if (isClosedDay(key)) return [];
  if (key < window.earliest || key > window.latest) return [];

  const slots: Slot[] = [];
  for (let m = OPEN_MINUTE; m + durationMinutes <= CLOSE_MINUTE; m += SLOT_STEP_MINUTES) {
    slots.push({
      minute: m,
      value: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
      label: labelForMinute(m),
      free: !overlaps(m, durationMinutes, busy),
    });
  }
  return slots;
}

/** "9:00 AM" from minutes since midnight, without constructing a Date. */
export function labelForMinute(m: number) {
  const hour24 = Math.floor(m / 60);
  const minute = m % 60;
  const suffix = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** Timezone note for the UI, so "8:00 AM" is never ambiguous. */
export const CLINIC_ZONE_LABEL = CLINIC_TIME_ZONE.replace(/_/g, " ");
