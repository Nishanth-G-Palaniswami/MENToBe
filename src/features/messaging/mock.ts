import type { TimeSlot } from "../../types/availability";
import type { MatchId, ThreadId, UserId } from "../../types/identity";
import type {
  Message,
  MessageThread,
  ScheduleProposal,
} from "../../types/messaging";
import { newId } from "../../lib/id";
import type { MessagingService, Unsubscribe } from "./service";

// -----------------------------------------------------------------------------
// In-memory MessagingService mock (Task 6.2)
// -----------------------------------------------------------------------------
// Threads are 1:1 with matches (Req. 5.1), so the store is keyed by `matchId`
// and `loadThread` lazily creates an empty thread the first time a match is
// opened. `subscribe` is backed by a per-thread listener set; `sendMessage`
// and `proposeMeeting` append to the thread and notify every subscriber so
// `useMessageThread` re-renders live (the real adapter swaps this for a
// websocket/SSE stream).
// -----------------------------------------------------------------------------

const ISO_NOW = "2026-06-01T12:00:00.000Z";

type Listener = (thread: MessageThread) => void;

export function createMessagingMock(): MessagingService {
  // Thread state keyed by matchId, plus a reverse map so threadId-addressed
  // calls (sendMessage/subscribe/proposeMeeting) can find their thread.
  const threadsByMatch = new Map<MatchId, MessageThread>();
  const threadIdToMatch = new Map<ThreadId, MatchId>();
  const listeners = new Map<ThreadId, Set<Listener>>();

  function ensureThread(matchId: MatchId): MessageThread {
    const existing = threadsByMatch.get(matchId);
    if (existing) return existing;

    const thread: MessageThread = {
      id: newId(),
      matchId,
      messages: [],
    };
    threadsByMatch.set(matchId, thread);
    threadIdToMatch.set(thread.id, matchId);
    return thread;
  }

  function threadById(threadId: ThreadId): MessageThread {
    const matchId = threadIdToMatch.get(threadId);
    const thread = matchId ? threadsByMatch.get(matchId) : undefined;
    if (!thread) {
      throw new Error(`Unknown threadId: ${threadId}`);
    }
    return thread;
  }

  // Hand subscribers a fresh snapshot so they never mutate internal state.
  function snapshot(thread: MessageThread): MessageThread {
    return {
      ...thread,
      messages: thread.messages.map((m) => ({ ...m })),
    };
  }

  function emit(threadId: ThreadId): void {
    const set = listeners.get(threadId);
    if (!set || set.size === 0) return;
    const thread = threadById(threadId);
    for (const listener of set) {
      listener(snapshot(thread));
    }
  }

  return {
    async loadThread(matchId: MatchId): Promise<MessageThread> {
      return snapshot(ensureThread(matchId));
    },

    async sendMessage(
      threadId: ThreadId,
      senderId: UserId,
      body: string,
    ): Promise<Message> {
      const thread = threadById(threadId);
      const now = nowIso();
      const message: Message = {
        id: newId(),
        threadId,
        senderId,
        body,
        sentAt: now,
        deliveredAt: now, // mock delivers instantly
      };
      thread.messages.push(message);
      thread.lastMessageAt = now;
      emit(threadId);
      return { ...message };
    },

    subscribe(
      threadId: ThreadId,
      onChange: (t: MessageThread) => void,
    ): Unsubscribe {
      let set = listeners.get(threadId);
      if (!set) {
        set = new Set<Listener>();
        listeners.set(threadId, set);
      }
      set.add(onChange);
      return () => {
        const current = listeners.get(threadId);
        if (!current) return;
        current.delete(onChange);
        if (current.size === 0) listeners.delete(threadId);
      };
    },

    async proposeMeeting(
      threadId: ThreadId,
      slot: TimeSlot,
    ): Promise<ScheduleProposal> {
      const thread = threadById(threadId);
      // The proposer is the most recent sender if any, else a placeholder; the
      // chat hook passes the real user id when wiring this in task 14.3.
      const proposedBy: UserId =
        thread.messages.length > 0
          ? thread.messages[thread.messages.length - 1].senderId
          : "unknown";

      const proposal: ScheduleProposal = {
        id: newId(),
        threadId,
        proposedBy,
        slot,
        status: "proposed",
      };
      emit(threadId);
      return proposal;
    },
  };
}

// Runtime timestamp. Falls back to a fixed seed when a clock is unavailable
// (e.g. certain test runners), keeping the mock deterministic there.
function nowIso(): string {
  try {
    return new Date().toISOString();
  } catch {
    return ISO_NOW;
  }
}

export const messagingMock: MessagingService = createMessagingMock();
