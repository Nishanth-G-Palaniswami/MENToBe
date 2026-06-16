import type { AvailabilityWindow } from "../types/availability";
import type { IanaTimeZone } from "../types/identity";

// Pure, framework-agnostic time helpers used by availability flows and the
// 14-day re-engagement check on chat threads. We deliberately avoid pulling
// in a date library: the few conversions we need can be expressed cleanly
// with `Intl.DateTimeFormat`, which already knows historical and future DST
// rules for IANA zones.

const MINUTES_PER_DAY = 24 * 60;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * 60_000;

// Anchor used as the calendar reference for weekly window math.
// 2024-01-07 is a Sunday in UTC, so adding `dayOfWeekLocal` days lands on
// the desired weekday without any modular arithmetic on dates. The choice
// of a 2024 date keeps us inside well-known DST tables for every zone.
const REFERENCE_SUNDAY_UTC_MS = Date.UTC(2024, 0, 7);

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface LocalWindowFields {
  dayOfWeekLocal: DayOfWeek;
  startMinuteLocal: number;
  endMinuteLocal: number;
}

interface WallClockFields {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
}

// Reads the wall-clock fields a zone displays for a given UTC instant.
// Using `Intl.DateTimeFormat` with `timeZone: zone` is the only standards-
// based way to do this in pure JS; it consults the host's tz database so
// the result respects the actual DST rule that applied at `utcMs`.
function readZoneFields(utcMs: number, zone: IanaTimeZone): WallClockFields {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(utcMs));
  const lookup: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") lookup[p.type] = p.value;
  }
  // Some Intl implementations emit "24" for midnight under h23. Normalize.
  const hourStr = lookup.hour === "24" ? "00" : lookup.hour;
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(hourStr),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  };
}

// Returns the offset in minutes such that `wallClockMs = utcMs + offset*60s`.
// Trick: build a `Date.UTC` from the zone-displayed wall-clock fields and
// compare it to the original UTC instant. The difference is the offset that
// `zone` had at that instant.
function zoneOffsetMinutes(utcMs: number, zone: IanaTimeZone): number {
  const f = readZoneFields(utcMs, zone);
  const asIfUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  return Math.round((asIfUtc - utcMs) / MS_PER_MINUTE);
}

// Inverse of `readZoneFields`: given wall-clock fields interpreted in `zone`,
// return the corresponding UTC instant. We make an initial guess using the
// offset implied by treating the fields as UTC, then re-check the offset at
// the resulting instant. This second pass corrects DST transition days where
// the offset jumps by 60 minutes between the guess and the true instant.
function zonedFieldsToUtcMs(f: WallClockFields, zone: IanaTimeZone): number {
  const asIfUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  const offset1 = zoneOffsetMinutes(asIfUtc, zone);
  const guess = asIfUtc - offset1 * MS_PER_MINUTE;
  const offset2 = zoneOffsetMinutes(guess, zone);
  return offset1 === offset2 ? guess : asIfUtc - offset2 * MS_PER_MINUTE;
}

function assertDayOfWeek(dow: number): asserts dow is DayOfWeek {
  if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
    throw new RangeError(`dayOfWeek must be an integer 0..6, got ${dow}`);
  }
}

function assertMinuteInRange(name: string, minute: number, max: number): void {
  if (!Number.isInteger(minute) || minute < 0 || minute > max) {
    throw new RangeError(`${name} must be an integer 0..${max}, got ${minute}`);
  }
}

/**
 * Convert a weekly wall-clock availability window in `zone` into a
 * UTC-normalized {@link AvailabilityWindow}. The originating zone is
 * preserved on the window so callers can render the window back in the
 * user's local time across DST transitions.
 *
 * MVP constraint: the local window must NOT wrap past local midnight, i.e.
 * `endMinuteLocal > startMinuteLocal` and both lie within a single local
 * day (end may equal 1440, representing the closing boundary at next-day
 * 00:00). The conversion can still cross UTC midnight in zones whose
 * offset is far enough from 0; we throw `RangeError` in that case as well
 * so the stored window always satisfies the AvailabilityWindow invariant
 * (`endMinuteUtc > startMinuteUtc` within the same UTC weekday).
 */
export function localWindowToUtc(
  dayOfWeekLocal: number,
  startMinuteLocal: number,
  endMinuteLocal: number,
  zone: IanaTimeZone,
): AvailabilityWindow {
  assertDayOfWeek(dayOfWeekLocal);
  assertMinuteInRange("startMinuteLocal", startMinuteLocal, MINUTES_PER_DAY - 1);
  assertMinuteInRange("endMinuteLocal", endMinuteLocal, MINUTES_PER_DAY);
  if (endMinuteLocal <= startMinuteLocal) {
    throw new RangeError(
      `endMinuteLocal (${endMinuteLocal}) must be greater than startMinuteLocal (${startMinuteLocal}) within the same local day`,
    );
  }

  // Anchor a representative calendar date for the requested local weekday.
  // Calendar arithmetic on Date.UTC is unaffected by DST, so the resulting
  // (year, month, day) is deterministic regardless of host locale.
  const anchor = new Date(REFERENCE_SUNDAY_UTC_MS);
  anchor.setUTCDate(anchor.getUTCDate() + dayOfWeekLocal);
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth() + 1;
  const day = anchor.getUTCDate();

  const startUtcMs = zonedFieldsToUtcMs(
    {
      year,
      month,
      day,
      hour: Math.floor(startMinuteLocal / 60),
      minute: startMinuteLocal % 60,
      second: 0,
    },
    zone,
  );
  // Date.UTC normalizes hour=24 to next-day 00:00, so end-of-day (1440) is
  // handled without a special case — `zonedFieldsToUtcMs` still produces the
  // correct instant for "local day X at 24:00".
  const endUtcMs = zonedFieldsToUtcMs(
    {
      year,
      month,
      day,
      hour: Math.floor(endMinuteLocal / 60),
      minute: endMinuteLocal % 60,
      second: 0,
    },
    zone,
  );

  const startUtc = new Date(startUtcMs);
  const endUtc = new Date(endUtcMs);
  const startDow = startUtc.getUTCDay() as DayOfWeek;
  const endDow = endUtc.getUTCDay() as DayOfWeek;
  const startMinuteUtc = startUtc.getUTCHours() * 60 + startUtc.getUTCMinutes();
  let endMinuteUtc = endUtc.getUTCHours() * 60 + endUtc.getUTCMinutes();

  // Edge case: a window ending exactly at next UTC day's 00:00 is still
  // representable as a single-day window by recording end as minute 1440 of
  // the start day. Detect this only when end is strictly after start by
  // exactly the difference within one day to rule out >24h spans.
  const isExactMidnightRollover =
    endMinuteUtc === 0 &&
    endDow === (((startDow + 1) % 7) as DayOfWeek) &&
    endUtcMs - startUtcMs <= MS_PER_DAY;
  if (isExactMidnightRollover) {
    endMinuteUtc = MINUTES_PER_DAY;
  } else if (endDow !== startDow || endMinuteUtc <= startMinuteUtc) {
    throw new RangeError(
      `Window crosses UTC midnight after timezone conversion (zone=${zone}); ` +
        `not representable as a single-day AvailabilityWindow.`,
    );
  }

  return {
    dayOfWeekUtc: startDow,
    startMinuteUtc,
    endMinuteUtc,
    authoredZone: zone,
  };
}

/**
 * Inverse of {@link localWindowToUtc}: render a UTC-normalized window back
 * into wall-clock fields for `zone`. We compute the start and end UTC
 * instants from the window's fields, then read each instant's zone-local
 * fields independently so a DST transition between start and end is
 * reflected correctly.
 *
 * Assumes the input window does not wrap UTC midnight, which holds for any
 * window produced by `localWindowToUtc`. Windows constructed by other means
 * that straddle local midnight will produce `endMinuteLocal < startMinuteLocal`
 * and the caller is responsible for handling that.
 */
export function utcWindowToLocal(
  window: AvailabilityWindow,
  zone: IanaTimeZone,
): LocalWindowFields {
  const anchor = new Date(REFERENCE_SUNDAY_UTC_MS);
  anchor.setUTCDate(anchor.getUTCDate() + window.dayOfWeekUtc);
  const baseUtcMs = anchor.getTime();
  const startUtcMs = baseUtcMs + window.startMinuteUtc * MS_PER_MINUTE;
  const endUtcMs = baseUtcMs + window.endMinuteUtc * MS_PER_MINUTE;

  const startLocal = readZoneFields(startUtcMs, zone);
  const endLocal = readZoneFields(endUtcMs, zone);

  // Day-of-week from a (year, month, day) tuple is plain calendar math; we
  // route through Date.UTC to avoid host-locale weekday surprises.
  const dayOfWeekLocal = new Date(
    Date.UTC(startLocal.year, startLocal.month - 1, startLocal.day),
  ).getUTCDay() as DayOfWeek;

  const startMinuteLocal = startLocal.hour * 60 + startLocal.minute;
  let endMinuteLocal = endLocal.hour * 60 + endLocal.minute;

  // Symmetric to the rollover handling in localWindowToUtc: if end maps to
  // the next local day at exactly midnight, prefer the equivalent
  // closing-boundary representation on the start day.
  if (
    endMinuteLocal === 0 &&
    endLocal.day !== startLocal.day &&
    endUtcMs - startUtcMs <= MS_PER_DAY
  ) {
    endMinuteLocal = MINUTES_PER_DAY;
  }

  return { dayOfWeekLocal, startMinuteLocal, endMinuteLocal };
}

/**
 * Returns true when a thread has been silent for at least `days` whole days
 * relative to `now`. Used by the chat re-engagement banner (14-day check).
 *
 * - If `lastAt` is undefined, the thread has no messages yet — that is not
 *   "silent" in the re-engagement sense, so we return false.
 * - If `lastAt` cannot be parsed as a date, we return false rather than
 *   surfacing a banner triggered by malformed data.
 */
export function isWindowSilent(
  lastAt: string | undefined,
  days: number,
  now: Date = new Date(),
): boolean {
  if (lastAt === undefined) return false;
  const lastMs = Date.parse(lastAt);
  if (Number.isNaN(lastMs)) return false;
  const elapsedMs = now.getTime() - lastMs;
  return elapsedMs >= days * MS_PER_DAY;
}
