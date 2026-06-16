import type { MatchId, NoteId, SessionId } from "./identity";

// The four required sections of an AI-generated meeting note (Req. 6.2).
// All four keys are always present; empty arrays/strings represent
// "nothing captured" rather than a missing section.
export interface NoteSections {
  discussionSummary: string;
  actionItems: string[];
  nextMeetingGoals: string[];
  sharedResources: string[];
}

// Lifecycle of a MeetingNote.
//   "ready"  — generated successfully by the NotesService.
//   "manual" — user filled in the sections via ManualNoteEntry.
//   "failed" — generation failed; the UI should surface the manual fallback
//              while a background retry is in flight (Req. 6.5).
export type NoteStatus = "ready" | "manual" | "failed";

// One persisted meeting note. `sessionDate` and `durationMinutes` are
// captured at meeting time so the notes list can render a chronological
// timeline (Req. 6.3) without re-querying the session log.
export interface MeetingNote {
  id: NoteId;
  matchId: MatchId;
  sessionId: SessionId;
  sessionDate: string; // ISO 8601 UTC
  durationMinutes: number;
  sections: NoteSections;
  status: NoteStatus;
}

// Input to `NotesService.generateNotes`. Either `transcript` (AI path) or
// `manualSummary` (fallback path) is expected; the service picks the
// appropriate strategy based on which is provided.
export interface NoteGenerationRequest {
  matchId: MatchId;
  sessionId: SessionId;
  transcript?: string;
  manualSummary?: string;
}
