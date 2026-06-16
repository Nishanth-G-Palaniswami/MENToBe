import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createMatchingMock } from "../features/matching/mock";
import { createMessagingMock } from "../features/messaging/mock";
import { createNotesMock, type NotesMock } from "../features/notes/mock";
import { activeConnectionLimit } from "../features/plan/service";
import { newId } from "../lib/id";
import type { MatchingService, MatchOutcome } from "../features/matching/service";
import type { MessagingService } from "../features/messaging/service";
import type {
  MatchId,
  NoteId,
  PlanTier,
  Role,
  SessionId,
  UserId,
} from "../types/identity";
import type { CandidateProfile, Match } from "../types/matching";
import type { MeetingNote, NoteSections } from "../types/notes";
import type { Profile } from "../types/profile";
import { MENTEES, MENTORS } from "./data";

// -----------------------------------------------------------------------------
// DemoProvider — app-wide state + mock services for the clickable demo.
// -----------------------------------------------------------------------------
// Flow: signIn → setRole → completeOnboarding(profile) → app. The onboarding
// step is where the user's real profile fields are captured; everything (match
// scoring, the Profile screen) reads from that profile afterward.
// -----------------------------------------------------------------------------

interface DemoSession {
  email: string;
  role: Role | null;
  tier: PlanTier;
}

interface DemoContextValue {
  session: DemoSession | null;
  viewerId: UserId;
  viewer: Profile | null;
  onboarded: boolean;
  matches: Match[];
  cap: number;
  matching: MatchingService;
  messaging: MessagingService;

  signIn: (email: string) => void;
  signInWithGoogle: () => void;
  signOut: () => void;
  setRole: (role: Role) => void;
  completeOnboarding: (profile: Profile) => Promise<void>;
  upgrade: () => void;

  loadQueue: () => Promise<CandidateProfile[]>;
  connect: (candidate: CandidateProfile) => Promise<MatchOutcome>;
  pass: (candidate: CandidateProfile) => Promise<void>;

  notesFor: (matchId: MatchId) => MeetingNote[];
  generateNote: (
    matchId: MatchId,
    sessionId: SessionId,
    transcript?: string,
  ) => Promise<MeetingNote>;
  saveManualNote: (
    matchId: MatchId,
    noteId: NoteId,
    sections: NoteSections,
  ) => Promise<MeetingNote>;
}

const DemoContext = createContext<DemoContextValue | null>(null);

function nowIso(): string {
  try {
    return new Date().toISOString();
  } catch {
    return "2026-06-01T12:00:00.000Z";
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [viewer, setViewer] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [notesByMatch, setNotesByMatch] = useState<
    Record<MatchId, MeetingNote[]>
  >({});

  // Tier map handed to the matching mock; mutating it is observed live so the
  // upgrade flow lifts the cap without rebuilding the service.
  const tiers = useRef<Record<UserId, PlanTier>>({});
  const messaging = useRef<MessagingService>(createMessagingMock());
  const matchingRef = useRef<MatchingService | null>(null);
  const notesService = useRef<NotesMock>(createNotesMock());

  const viewerId = viewer?.userId ?? "anon";
  const onboarded = viewer !== null;
  const cap = activeConnectionLimit(session?.tier ?? "free");

  const signIn = useCallback((email: string) => {
    setSession({ email, role: null, tier: "free" });
    setViewer(null);
    setMatches([]);
    setNotesByMatch({});
  }, []);

  const signInWithGoogle = useCallback(() => {
    setSession({ email: "demo.user@gmail.com", role: null, tier: "free" });
    setViewer(null);
    setMatches([]);
    setNotesByMatch({});
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    setViewer(null);
    setMatches([]);
    setNotesByMatch({});
    matchingRef.current = null;
    tiers.current = {};
    messaging.current = createMessagingMock();
    notesService.current = createNotesMock();
  }, []);

  const setRole = useCallback((role: Role) => {
    setSession((s) => (s ? { ...s, role } : s));
    setViewer(null);
    setNotesByMatch({});
  }, []);

  // Capture the user's onboarding answers as their profile, then build the
  // matching service against the opposite-role candidate pool and seed each
  // candidate's interest so a "connect" produces a mutual match in the demo.
  const completeOnboarding = useCallback(async (profile: Profile) => {
    const candidates = profile.role === "mentee" ? MENTORS : MENTEES;
    tiers.current = { [profile.userId]: "free" };
    const matching = createMatchingMock({
      candidates,
      profiles: [profile, ...candidates],
      tiers: tiers.current,
    });
    matchingRef.current = matching;

    const queue = await matching.fetchQueue(profile.userId);
    for (const c of queue) {
      await matching.recordSignal({
        fromUserId: c.userId,
        toUserId: profile.userId,
        kind: "interest",
        createdAt: nowIso(),
      });
    }

    setViewer(profile);
    setMatches([]);
  }, []);

  const upgrade = useCallback(() => {
    setSession((s) => (s ? { ...s, tier: "mentee_premium" } : s));
    if (viewer) tiers.current[viewer.userId] = "mentee_premium";
  }, [viewer]);

  const loadQueue = useCallback(async (): Promise<CandidateProfile[]> => {
    const matching = matchingRef.current;
    if (!matching || !viewer) return [];
    return matching.fetchQueue(viewer.userId);
  }, [viewer]);

  const connect = useCallback(
    async (candidate: CandidateProfile): Promise<MatchOutcome> => {
      const matching = matchingRef.current;
      if (!matching || !viewer) return { kind: "recorded" };
      const outcome = await matching.recordSignal({
        fromUserId: viewer.userId,
        toUserId: candidate.userId,
        kind: "interest",
        createdAt: nowIso(),
      });
      if (outcome.kind === "match_created") {
        const created = outcome.match;
        setMatches((m) =>
          m.some((x) => x.id === created.id) ? m : [...m, created],
        );
        // Seed a couple of "ready" notes per new match so the meeting-notes
        // timeline has content to show without forcing the user to generate
        // first. This keeps the demo flow exercising Req. 6.1–6.4 immediately.
        setNotesByMatch((prev) =>
          prev[created.id] ? prev : { ...prev, [created.id]: seedNotes(created.id) },
        );
      }
      return outcome;
    },
    [viewer],
  );

  const pass = useCallback(
    async (candidate: CandidateProfile): Promise<void> => {
      const matching = matchingRef.current;
      if (!matching || !viewer) return;
      await matching.recordSignal({
        fromUserId: viewer.userId,
        toUserId: candidate.userId,
        kind: "pass",
        createdAt: nowIso(),
      });
    },
    [viewer],
  );

  // Returns the notes for a match, sorted newest-first by sessionDate.
  // Returns [] when the match has no notes yet (or doesn't exist).
  const notesFor = useCallback(
    (matchId: MatchId): MeetingNote[] => {
      const list = notesByMatch[matchId];
      if (!list) return [];
      // Sort defensively so callers don't have to assume insertion order
      // matches chronological order (Req. 6.3).
      return [...list].sort((a, b) =>
        a.sessionDate < b.sessionDate ? 1 : a.sessionDate > b.sessionDate ? -1 : 0,
      );
    },
    [notesByMatch],
  );

  // Wraps `notes.generateNotes` and persists the result into `notesByMatch`.
  // On any failure we still append a placeholder note with `status: "failed"`
  // so the timeline reflects the session and the UI can offer the manual
  // fallback (Req. 6.5). This method never throws.
  const generateNote = useCallback(
    async (
      matchId: MatchId,
      sessionId: SessionId,
      transcript?: string,
    ): Promise<MeetingNote> => {
      const svc = notesService.current;
      try {
        const note = await svc.generateNotes({
          matchId,
          sessionId,
          transcript,
        });
        setNotesByMatch((prev) => ({
          ...prev,
          [matchId]: [...(prev[matchId] ?? []), note],
        }));
        return note;
      } catch {
        const placeholder: MeetingNote = {
          id: newId(),
          matchId,
          sessionId,
          sessionDate: nowIso(),
          durationMinutes: 0,
          sections: emptyNoteSections(),
          status: "failed",
        };
        setNotesByMatch((prev) => ({
          ...prev,
          [matchId]: [...(prev[matchId] ?? []), placeholder],
        }));
        return placeholder;
      }
    },
    [],
  );

  // Replaces a note's sections with user-authored content and flips status to
  // "manual" (Req. 6.5). Throws when the note isn't in the match's list so
  // callers notice stale ids instead of silently appending an orphan row.
  const saveManualNote = useCallback(
    async (
      matchId: MatchId,
      noteId: NoteId,
      sections: NoteSections,
    ): Promise<MeetingNote> => {
      const list = notesByMatch[matchId] ?? [];
      const existing = list.find((n) => n.id === noteId);
      if (!existing) {
        throw new Error(
          `saveManualNote(): note ${noteId} not found for match ${matchId}.`,
        );
      }
      const updated: MeetingNote = {
        ...existing,
        sections,
        status: "manual",
      };
      setNotesByMatch((prev) => ({
        ...prev,
        [matchId]: (prev[matchId] ?? []).map((n) =>
          n.id === noteId ? updated : n,
        ),
      }));
      return updated;
    },
    [notesByMatch],
  );

  const value: DemoContextValue = {
    session,
    viewerId,
    viewer,
    onboarded,
    matches,
    cap,
    matching: matchingRef.current as MatchingService,
    messaging: messaging.current,
    signIn,
    signInWithGoogle,
    signOut,
    setRole,
    completeOnboarding,
    upgrade,
    loadQueue,
    connect,
    pass,
    notesFor,
    generateNote,
    saveManualNote,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (ctx === null) {
    throw new Error("useDemo() must be used inside <DemoProvider>");
  }
  return ctx;
}

// An empty-but-complete set of note sections — every key present, nothing
// captured. Used as the body of a "failed" placeholder note (Req. 6.2).
function emptyNoteSections(): NoteSections {
  return {
    discussionSummary: "",
    actionItems: [],
    nextMeetingGoals: [],
    sharedResources: [],
  };
}

// Seed one "ready" meeting note for a freshly-created match so the notes
// timeline has content to show immediately in the demo.
function seedNotes(matchId: MatchId): MeetingNote[] {
  const sessionId: SessionId = newId();
  return [
    {
      id: newId(),
      matchId,
      sessionId,
      sessionDate: nowIso(),
      durationMinutes: 45,
      status: "ready",
      sections: {
        discussionSummary:
          "Kickoff call — aligned on goals and a cadence for the next month.",
        actionItems: [
          "Mentee to share a portfolio draft",
          "Mentor to send two reference resources",
        ],
        nextMeetingGoals: [
          "Review the portfolio draft together",
          "Set interview-prep milestones",
        ],
        sharedResources: ["System Design Primer", "Frontend performance checklist"],
      },
    },
  ];
}
