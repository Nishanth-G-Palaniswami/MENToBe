import type { BusyBlock, TimeRange } from "../../types/availability";
import type { UserId } from "../../types/identity";
import type { CalendarService } from "./service";

// -----------------------------------------------------------------------------
// In-memory CalendarService mock (Task 6.2)
// -----------------------------------------------------------------------------
// Returns a static set of `BusyBlock`s (Req. 7.4) so the SchedulingCard can dim
// conflicting slots without a real Google Calendar connection. Sync enable /
// disable is tracked per user purely so the availability screen's toggle has
// observable state; `fetchBusyBlocks` only returns blocks while sync is on.
// -----------------------------------------------------------------------------

// Fixed busy intervals (UTC). Chosen to overlap one of the seed mentor
// availability windows so the conflict-dimming path is exercisable in dev.
const STATIC_BUSY: BusyBlock[] = [
  {
    startUtc: "2026-06-16T14:00:00.000Z",
    endUtc: "2026-06-16T15:00:00.000Z",
    source: "google_calendar",
  },
  {
    startUtc: "2026-06-16T17:30:00.000Z",
    endUtc: "2026-06-16T18:30:00.000Z",
    source: "google_calendar",
  },
  {
    startUtc: "2026-06-18T09:00:00.000Z",
    endUtc: "2026-06-18T10:30:00.000Z",
    source: "google_calendar",
  },
];

export function createCalendarMock(): CalendarService {
  // Users with Google sync enabled. Defaults off; the availability screen's
  // toggle flips this and `fetchBusyBlocks` respects it.
  const synced = new Set<UserId>();

  return {
    async enableGoogleSync(userId: UserId): Promise<void> {
      synced.add(userId);
    },

    async disableSync(userId: UserId): Promise<void> {
      synced.delete(userId);
    },

    async fetchBusyBlocks(
      userId: UserId,
      range: TimeRange,
    ): Promise<BusyBlock[]> {
      // No connected calendar → no busy data.
      if (!synced.has(userId)) return [];

      const rangeStart = Date.parse(range.startUtc);
      const rangeEnd = Date.parse(range.endUtc);
      // If the range is unparseable, fall back to returning all blocks rather
      // than silently dropping data.
      if (Number.isNaN(rangeStart) || Number.isNaN(rangeEnd)) {
        return STATIC_BUSY.map((b) => ({ ...b }));
      }

      return STATIC_BUSY.filter((block) => {
        const blockStart = Date.parse(block.startUtc);
        const blockEnd = Date.parse(block.endUtc);
        // Keep blocks that overlap the requested range (half-open intervals).
        return blockStart < rangeEnd && blockEnd > rangeStart;
      }).map((b) => ({ ...b }));
    },
  };
}

export const calendarMock: CalendarService = createCalendarMock();
