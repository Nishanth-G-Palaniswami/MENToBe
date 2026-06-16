import type {
  BusyBlock,
  TimeRange,
} from "../../types/availability";
import type { UserId } from "../../types/identity";

// Calendar domain service. Today the only provider is Google Calendar
// (Req. 7.4); the `BusyBlock.source` discriminator leaves room for Outlook /
// iCloud later without changing this interface.
export interface CalendarService {
  enableGoogleSync(userId: UserId): Promise<void>;
  disableSync(userId: UserId): Promise<void>;
  fetchBusyBlocks(
    userId: UserId,
    range: TimeRange,
  ): Promise<BusyBlock[]>;
}
