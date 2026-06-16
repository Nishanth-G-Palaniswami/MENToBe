import type { TimeSlot } from "./availability";
import type { MatchId, MessageId, ThreadId, UserId } from "./identity";

// A single chat message. `deliveredAt` is set by the messaging service when
// the recipient's client acknowledges receipt; it is absent for optimistic
// sends still in flight.
export interface Message {
  id: MessageId;
  threadId: ThreadId;
  senderId: UserId;
  body: string;
  sentAt: string; // ISO 8601 UTC
  deliveredAt?: string;
}

// Conversation between the two users of a Match. Threads are 1:1 with
// matches in the MVP; the `matchId` link is what gates messaging on mutual
// interest (Req. 5.1). `lastMessageAt` powers the 14-day re-engagement
// banner (Req. 5.5).
export interface MessageThread {
  id: ThreadId;
  matchId: MatchId;
  messages: Message[];
  lastMessageAt?: string;
}

// A meeting time proposal exchanged inside a thread. Rendered as a
// SchedulingCard in the chat. `slot` is a UTC range so it can be compared
// against the proposer's busy blocks without timezone math.
export interface ScheduleProposal {
  id: string;
  threadId: ThreadId;
  proposedBy: UserId;
  slot: TimeSlot;
  status: "proposed" | "accepted" | "declined";
}
