import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { MessageBodySchema } from "@/features/profile/schemas";
import { useServices } from "@/features/serviceProvider";
import { newId } from "@/lib/id";
import { useSessionStore } from "@/lib/stores/sessionStore";
import { isWindowSilent } from "@/lib/time";
import type { TimeSlot } from "@/types/availability";
import type { MatchId } from "@/types/identity";
import type {
  Message,
  MessageThread,
  ScheduleProposal,
} from "@/types/messaging";

// Public surface of `useMessageThread`. Mirrors the design contract so chat
// screens (Task 14) can swap from the in-memory mock to the HTTP adapter
// without touching call sites.
export interface UseMessageThreadResult {
  thread: MessageThread | undefined;
  isLoading: boolean;
  error: Error | null;
  send: (body: string) => Promise<void>;
  proposeMeeting: (slot: TimeSlot) => Promise<ScheduleProposal>;
  isSilent: boolean;
}

// 14-day idle threshold for the chat re-engagement banner (Req. 5.5).
const RE_ENGAGEMENT_DAYS = 14;

// Application-layer hook owning the live message thread cache. Wires:
//   - `MessagingService.loadThread` through TanStack Query so screens get
//     loading / error states without bespoke wiring (Req. 5.2).
//   - `MessagingService.subscribe` into the query cache, so pushed updates
//     replace the cached thread and re-render every consumer (Req. 5.2, 5.3).
//   - `MessageBodySchema` on outbound sends so empty / oversized bodies are
//     rejected at the hook boundary (Req. 5.3).
//   - `proposeMeeting` for scheduling cards inside the thread (Req. 5.4).
//   - `isWindowSilent(lastMessageAt, 14)` for the re-engagement banner
//     (Req. 5.5).
//
// `matchId` may be `null` (no thread selected), in which case the underlying
// query is disabled and `send` / `proposeMeeting` throw on call.
export const useMessageThread = (
  matchId: MatchId | null,
): UseMessageThreadResult => {
  const { messaging } = useServices();
  const queryClient = useQueryClient();
  const senderId = useSessionStore((s) => s.session?.userId);

  const {
    data: thread,
    isLoading,
    error,
  } = useQuery<MessageThread, Error>({
    queryKey: ["thread", matchId],
    // `enabled` gates this — when the query runs, `matchId` is non-null.
    queryFn: () => messaging.loadThread(matchId!),
    enabled: matchId !== null,
  });

  // Subscribe to live thread updates as soon as the initial load resolves.
  // The subscription writes the canonical thread snapshot into the query
  // cache so every consumer re-renders without a refetch round trip. Keyed
  // on `[matchId, thread?.id]` so swapping matches tears down the previous
  // subscription before opening a new one.
  useEffect(() => {
    if (matchId === null) return;
    const threadId = thread?.id;
    if (threadId === undefined) return;
    const unsubscribe = messaging.subscribe(threadId, (updated) => {
      queryClient.setQueryData<MessageThread>(["thread", matchId], updated);
    });
    return unsubscribe;
  }, [matchId, thread?.id, messaging, queryClient]);

  const send = useCallback(
    async (body: string): Promise<void> => {
      if (matchId === null) {
        throw new Error("useMessageThread.send: no matchId selected");
      }
      if (thread === undefined) {
        throw new Error("useMessageThread.send: thread is not loaded yet");
      }
      if (senderId === undefined) {
        throw new Error(
          "useMessageThread.send: no authenticated session — sign in first",
        );
      }

      // Throws on whitespace-only or oversized input (Req. 5.3). The error is
      // propagated unchanged so the composer can surface field-level
      // validation messages from the underlying ZodError.
      const parsed = MessageBodySchema.parse(body);

      const threadId = thread.id;
      const optimisticId = `optimistic-${newId()}`;
      const optimistic: Message = {
        id: optimisticId,
        threadId,
        senderId,
        body: parsed,
        sentAt: new Date().toISOString(),
      };

      // Optimistic append so the composer feels instant. The subscription
      // (or the explicit reconciliation below) replaces this placeholder
      // with the canonical message once the service ack lands.
      queryClient.setQueryData<MessageThread>(["thread", matchId], (prev) => {
        if (prev === undefined) return prev;
        return {
          ...prev,
          messages: [...prev.messages, optimistic],
          lastMessageAt: optimistic.sentAt,
        };
      });

      try {
        const sent = await messaging.sendMessage(threadId, senderId, parsed);
        // The live subscription usually delivers the canonical thread before
        // `sendMessage` resolves, in which case the optimistic placeholder
        // is already gone. If it hasn't fired yet, swap the placeholder for
        // the real message so the UI reflects the send without waiting.
        queryClient.setQueryData<MessageThread>(["thread", matchId], (prev) => {
          if (prev === undefined) return prev;
          const hasOptimistic = prev.messages.some(
            (m) => m.id === optimisticId,
          );
          if (!hasOptimistic) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === optimisticId ? sent : m,
            ),
            lastMessageAt: sent.sentAt,
          };
        });
      } catch (err) {
        // Drop the optimistic placeholder by refetching the canonical thread.
        // `await` so any caller awaiting `send` sees a settled cache before
        // the error surfaces.
        await queryClient.invalidateQueries({ queryKey: ["thread", matchId] });
        throw err;
      }
    },
    [matchId, thread, senderId, messaging, queryClient],
  );

  const proposeMeeting = useCallback(
    async (slot: TimeSlot): Promise<ScheduleProposal> => {
      if (thread === undefined) {
        throw new Error(
          "useMessageThread.proposeMeeting: thread is not loaded yet",
        );
      }
      return messaging.proposeMeeting(thread.id, slot);
    },
    [thread, messaging],
  );

  // Req. 5.5 — re-engagement banner trigger. `isWindowSilent` returns false
  // for empty threads (no `lastMessageAt`), so a brand-new match never
  // surfaces the banner.
  const isSilent = isWindowSilent(thread?.lastMessageAt, RE_ENGAGEMENT_DAYS);

  return {
    thread,
    isLoading,
    error,
    send,
    proposeMeeting,
    isSilent,
  };
};
