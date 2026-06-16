import type { TimeSlot } from "../../types/availability";
import type { MatchId, ThreadId, UserId } from "../../types/identity";
import type {
  Message,
  MessageThread,
  ScheduleProposal,
} from "../../types/messaging";

// Returned by `subscribe`; calling it tears down the subscription. Kept as a
// `type` alias (not an `interface`) since it is a function shape, not a
// nominal contract.
export type Unsubscribe = () => void;

// Messaging domain service. `subscribe` is the live-update channel used by
// `useMessageThread`; the mock implementation backs it with an in-memory
// pub/sub, the real adapter will back it with a websocket / SSE connection.
export interface MessagingService {
  loadThread(matchId: MatchId): Promise<MessageThread>;
  sendMessage(
    threadId: ThreadId,
    senderId: UserId,
    body: string,
  ): Promise<Message>;
  subscribe(
    threadId: ThreadId,
    onChange: (t: MessageThread) => void,
  ): Unsubscribe;
  proposeMeeting(
    threadId: ThreadId,
    slot: TimeSlot,
  ): Promise<ScheduleProposal>;
}
