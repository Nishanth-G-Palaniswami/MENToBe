import type { IanaTimeZone } from "./identity";

// A repeating weekly availability window, authored in the user's local zone
// and stored normalized to UTC. Sunday = 0. The originating IANA zone is
// preserved (`authoredZone`) so we can render the window back in the
// user's local time and survive DST transitions without comparing
// wall-clock times across users.
export interface AvailabilityWindow {
  dayOfWeekUtc: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startMinuteUtc: number; // 0..1439
  endMinuteUtc: number; // exclusive, > startMinuteUtc within the same UTC day
  authoredZone: IanaTimeZone;
}

// Concrete UTC time range used for busy blocks, scheduling proposals, and
// candidate slot rendering. Both ends are ISO 8601 UTC strings.
export interface TimeRange {
  startUtc: string; // ISO 8601 UTC
  endUtc: string; // ISO 8601 UTC
}

// Busy interval imported from a connected calendar. The `source` discriminator
// leaves room for additional providers later (Outlook, iCloud) without
// breaking existing consumers.
export interface BusyBlock extends TimeRange {
  source: "google_calendar";
}

// Free slot offered up for scheduling. Structurally identical to `TimeRange`
// today; kept as its own interface so call sites read clearly and we can
// attach scheduling metadata (e.g., suggestedBy) later without churn.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TimeSlot extends TimeRange {}
