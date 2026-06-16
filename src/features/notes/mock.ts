import type {
  MeetingNote,
  NoteGenerationRequest,
  NoteSections,
} from "../../types/notes";
import { newId } from "../../lib/id";
import type { NotesService } from "./service";

// -----------------------------------------------------------------------------
// In-memory NotesService mock (Task 6.2)
// -----------------------------------------------------------------------------
// `generateNotes` returns a `MeetingNote` with all four `NoteSections` keys
// populated (Req. 6.2). It supports two paths off the same entry point:
//   - manual:  the request carries `manualSummary`  → status "manual"
//   - AI:      the request carries `transcript`     → status "ready"
//
// A configurable failure mode drives the manual-fallback UX (Req. 6.5): when
// `failGeneration` is on, the AI path throws so `useMeetingNotes` can flip the
// note to `status: "failed"` and surface the manual editor. The manual path is
// never failed — a user-authored summary always succeeds.
// -----------------------------------------------------------------------------

const ISO_NOW = "2026-06-01T12:00:00.000Z";

export interface NotesMockOptions {
  // When true, the AI generation path rejects so callers can exercise the
  // manual fallback. Toggleable at runtime via the returned `setFailGeneration`.
  failGeneration?: boolean;
  // Default duration stamped on generated notes when the request omits one.
  defaultDurationMinutes?: number;
}

// The mock exposes a couple of test affordances beyond the bare interface so
// callers can flip the failure mode without reconstructing the service.
export interface NotesMock extends NotesService {
  setFailGeneration(fail: boolean): void;
}

export function createNotesMock(
  options: NotesMockOptions = {},
): NotesMock {
  let failGeneration = options.failGeneration ?? false;
  const duration = options.defaultDurationMinutes ?? 45;

  return {
    async generateNotes(
      input: NoteGenerationRequest,
    ): Promise<MeetingNote> {
      const now = nowIso();
      const base = {
        id: newId(),
        matchId: input.matchId,
        sessionId: input.sessionId,
        sessionDate: now,
        durationMinutes: duration,
      };

      // Manual fallback path: user provided the summary themselves. Always
      // succeeds regardless of `failGeneration` (Req. 6.5).
      if (typeof input.manualSummary === "string") {
        return {
          ...base,
          sections: manualSections(input.manualSummary),
          status: "manual",
        };
      }

      // AI path. Honor the configured failure mode so the UI can drive the
      // failed → manual-fallback flow.
      if (failGeneration) {
        throw new Error("Note generation failed (mock failure mode).");
      }

      return {
        ...base,
        sections: aiSections(input),
        status: "ready",
      };
    },

    setFailGeneration(fail: boolean): void {
      failGeneration = fail;
    },
  };
}

// Deterministic AI-style sections. All four keys are populated so consumers can
// rely on the shape without null checks (Req. 6.2).
function aiSections(input: NoteGenerationRequest): NoteSections {
  const transcriptHint = input.transcript
    ? " Drawn from the session transcript."
    : "";
  return {
    discussionSummary:
      "Reviewed progress since the last session and aligned on near-term goals." +
      transcriptHint,
    actionItems: [
      "Mentee to ship the portfolio project draft",
      "Mentor to share two reference architectures",
    ],
    nextMeetingGoals: [
      "Walk through the portfolio draft together",
      "Define interview-prep milestones",
    ],
    sharedResources: [
      "System Design Primer",
      "Frontend performance checklist",
    ],
  };
}

// Manual sections seeded from the user's free-text summary. Only the summary is
// known; the list sections start empty (the editor fills them in).
function manualSections(summary: string): NoteSections {
  return {
    discussionSummary: summary,
    actionItems: [],
    nextMeetingGoals: [],
    sharedResources: [],
  };
}

function nowIso(): string {
  try {
    return new Date().toISOString();
  } catch {
    return ISO_NOW;
  }
}

export const notesMock: NotesMock = createNotesMock();
