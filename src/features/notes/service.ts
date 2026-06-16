import type {
  MeetingNote,
  NoteGenerationRequest,
} from "../../types/notes";

// Notes domain service. `generateNotes` is the single entry point for both
// the AI-generated path (request carries `transcript`) and the manual
// fallback path (request carries `manualSummary`). The service decides which
// strategy to apply based on which field is present (Req. 6.5).
export interface NotesService {
  generateNotes(input: NoteGenerationRequest): Promise<MeetingNote>;
}
