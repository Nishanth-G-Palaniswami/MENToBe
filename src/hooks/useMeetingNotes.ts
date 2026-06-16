import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useServices } from "@/features/serviceProvider";
import { newId } from "@/lib/id";
import type { MatchId, NoteId, SessionId } from "@/types/identity";
import type { MeetingNote, NoteSections } from "@/types/notes";

// Public surface returned by `useMeetingNotes`. Mirrors the design contract
// (`design.md` → "useMeetingNotes") and adds two pieces of UI state the
// MeetingNotes screens need: `isLoading` (initial query rehydration) and
// `showManualFallback` (Req. 6.5 — surface the manual editor when AI
// generation fails).
export interface UseMeetingNotesResult {
  notes: MeetingNote[];
  isLoading: boolean;
  showManualFallback: boolean;
  generateFor: (
    sessionId: SessionId,
    transcript?: string,
  ) => Promise<MeetingNote>;
  saveManual: (
    noteId: NoteId,
    sections: NoteSections,
  ) => Promise<MeetingNote>;
}

// Background-retry delay for failed AI generation (Req. 6.5). Single-shot,
// fixed-interval policy: 30s after a failure we re-ask the service once. If
// that retry succeeds we replace the failed placeholder in the cache; if it
// fails too, the placeholder stays and the manual-fallback flag remains
// raised so the user can author the note themselves. The simplicity is
// deliberate — exponential backoff and retry queues are out of scope for
// the MVP and would obscure the failure UX more than they help.
const RETRY_DELAY_MS = 30_000;

// Build a fresh, fully-populated empty `NoteSections` value. Centralized so
// the `failed` placeholder always carries all four keys (Req. 6.2) and so we
// hand out a new array per call — no shared mutable state between
// placeholders.
const emptySections = (): NoteSections => ({
  discussionSummary: "",
  actionItems: [],
  nextMeetingGoals: [],
  sharedResources: [],
});

// Application-layer hook that owns the client-side meeting-notes timeline for
// a single match (Req. 6.1, 6.2, 6.3, 6.4, 6.5).
//
// Wiring:
//   - `services.notes.generateNotes` for both the AI path and the background
//     retry. The current `NotesService` interface only exposes `generateNotes`;
//     there is no list-fetch endpoint yet, so the TanStack Query cache itself
//     is the source of truth for `notes`. The `queryFn` rehydrates from
//     whatever was previously written via `setQueryData`. When the live HTTP
//     adapter lands, swap the `queryFn` for `services.notes.list(matchId)`
//     and the rest of the hook keeps working.
//   - `useQueryClient` for cache reads/writes from the imperative callbacks.
//
// `matchId` is nullable so screens can mount this hook before a match is
// selected (e.g. routing in transit). When null, the query is disabled and
// `notes` is an empty array. The mutation callbacks throw if called with a
// null match, since there is no sensible match to attribute work to.
export const useMeetingNotes = (
  matchId: MatchId | null,
): UseMeetingNotesResult => {
  const services = useServices();
  const queryClient = useQueryClient();
  const [showManualFallback, setShowManualFallback] = useState(false);

  // Outstanding background-retry timers. Tracked in a ref so the unmount
  // cleanup can cancel them — otherwise a slow retry could fire after the
  // consumer has navigated away and write into a cache nobody is reading.
  const retryTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const timers = retryTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  // The cache is the source of truth for the MVP. The `queryFn` is a
  // rehydration shim — it just returns whatever was previously written via
  // `setQueryData`, defaulting to an empty list. The live adapter replaces
  // this with a real list call.
  const query = useQuery<MeetingNote[]>({
    queryKey: ["notes", matchId],
    queryFn: () =>
      Promise.resolve(
        queryClient.getQueryData<MeetingNote[]>(["notes", matchId]) ?? [],
      ),
    enabled: matchId !== null,
  });

  const notes = query.data ?? [];

  // Convenience writer that funnels every cache update through the same key
  // and preserves an empty array when the cache has nothing yet.
  const updateCache = useCallback(
    (updater: (current: MeetingNote[]) => MeetingNote[]): void => {
      queryClient.setQueryData<MeetingNote[]>(
        ["notes", matchId],
        (current) => updater(current ?? []),
      );
    },
    [queryClient, matchId],
  );

  // Req. 6.1, 6.2, 6.5 — request AI generation for a session. On success the
  // returned note is appended to the timeline and the manual-fallback flag
  // is lowered. On failure we stamp a `failed` placeholder so the timeline
  // still surfaces the session (Req. 6.3), raise the manual-fallback flag,
  // and schedule a single 30s background retry that swaps the placeholder
  // for the real note if it succeeds.
  const generateFor = useCallback(
    async (
      sessionId: SessionId,
      transcript?: string,
    ): Promise<MeetingNote> => {
      if (matchId === null) {
        throw new Error(
          "useMeetingNotes.generateFor() requires a matchId. " +
            "Mount the hook with a non-null match before requesting notes.",
        );
      }

      try {
        const note = await services.notes.generateNotes({
          matchId,
          sessionId,
          transcript,
        });
        updateCache((current) => [...current, note]);
        setShowManualFallback(false);
        return note;
      } catch {
        // Build a placeholder with all four `sections` keys present (Req. 6.2)
        // so downstream renderers don't have to special-case the `failed`
        // status with null checks.
        const placeholder: MeetingNote = {
          id: newId(),
          matchId,
          sessionId,
          sessionDate: nowIso(),
          durationMinutes: 0,
          sections: emptySections(),
          status: "failed",
        };
        updateCache((current) => [...current, placeholder]);
        setShowManualFallback(true);

        // Schedule the background retry. Closure captures `matchId` and the
        // placeholder id, so a successful retry replaces the placeholder
        // in-place and chronological order is preserved.
        const timer = setTimeout(() => {
          retryTimersRef.current.delete(timer);
          void services.notes
            .generateNotes({ matchId, sessionId, transcript })
            .then((retried) => {
              updateCache((current) =>
                current.map((n) => (n.id === placeholder.id ? retried : n)),
              );
            })
            .catch(() => {
              // Swallow retry errors. The `failed` placeholder stays in the
              // timeline and `showManualFallback` remains raised so the user
              // can author the note via `saveManual`.
            });
        }, RETRY_DELAY_MS);
        retryTimersRef.current.add(timer);

        return placeholder;
      }
    },
    [matchId, services, updateCache],
  );

  // Req. 6.5 — manual fallback save. Looks up the existing note by id,
  // replaces its sections with the user-authored content, and flips the
  // status to `manual`. Throws when the note isn't in the cache so callers
  // notice stale ids instead of silently appending orphan rows.
  const saveManual = useCallback(
    async (
      noteId: NoteId,
      sections: NoteSections,
    ): Promise<MeetingNote> => {
      if (matchId === null) {
        throw new Error(
          "useMeetingNotes.saveManual() requires a matchId. " +
            "Mount the hook with a non-null match before saving notes.",
        );
      }

      const current =
        queryClient.getQueryData<MeetingNote[]>(["notes", matchId]) ?? [];
      const existing = current.find((n) => n.id === noteId);
      if (!existing) {
        throw new Error(
          `useMeetingNotes.saveManual(): note ${noteId} not found for match ${matchId}.`,
        );
      }

      const updated: MeetingNote = {
        ...existing,
        sections,
        status: "manual",
      };
      updateCache((all) => all.map((n) => (n.id === noteId ? updated : n)));
      // The user has now produced canonical content for this session, so the
      // failure-driven manual-fallback affordance can come down.
      setShowManualFallback(false);
      return updated;
    },
    [matchId, queryClient, updateCache],
  );

  return {
    notes,
    isLoading: query.isLoading,
    showManualFallback,
    generateFor,
    saveManual,
  };
};

// Defensive ISO-now used for placeholder note timestamps. Mirrors the same
// pattern used in the notes mock so tests that stub `Date` behave
// consistently across the layers.
function nowIso(): string {
  try {
    return new Date().toISOString();
  } catch {
    return "2026-06-01T12:00:00.000Z";
  }
}
