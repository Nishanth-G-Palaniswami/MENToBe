import type { PlanTier, UserId } from "../../types/identity";
import type { Profile } from "../../types/profile";
import type {
  CandidateProfile,
  Match,
  MatchScore,
  MatchSignal,
} from "../../types/matching";
import { canonicalUserPair, newId } from "../../lib/id";
import { decideOutcome } from "./matchPolicy";
import { orderQueue } from "./orderQueue";
import { scoreMatch } from "./scoreMatch";
import type {
  MatchingService,
  MatchOutcome,
  QueueOpts,
} from "./service";

// -----------------------------------------------------------------------------
// In-memory MatchingService mock (Task 6.2)
// -----------------------------------------------------------------------------
// Backs the Discover queue and swipe outcomes without a server. State lives in
// closures created by `createMatchingMock` so each instance (app, test) is
// isolated. Wiring into `Services` happens in the service-provider assembly.
//
// Responsibilities (Req. 4.1, 4.3, 4.4, 4.5, 4.7):
//   - fetchQueue   → score every candidate against the viewer, order via
//                    `orderQueue`, hide candidates the viewer already swiped.
//   - recordSignal → always persist the signal, then resolve an outcome via
//                    `decideOutcome`; assemble the `Match` on `match_created`.
//   - scoreMatch   → re-export of the pure scorer for previews/tests.
// -----------------------------------------------------------------------------

const SEED_NOW = "2026-06-01T12:00:00.000Z";

// Deterministic seed viewer. `fetchQueue` is called with a `viewerId`; when
// that id is not a known profile (e.g. the auth mock's seed user before its
// profile is registered) we fall back to this mentee so the queue still
// scores and renders during development.
const SEED_VIEWER: Profile = {
  userId: "seed-viewer",
  displayName: "You",
  role: "mentee",
  languages: ["en"],
  values: ["growth", "curiosity"],
  createdAt: SEED_NOW,
  updatedAt: SEED_NOW,
  subjects: ["typescript", "system design"],
  careerInterests: ["frontend", "developer tools"],
  background: "Self-taught dev two years into my first role.",
  otherInterests: ["climbing"],
  meetingFrequency: "weekly",
  preferredTeachingStyles: ["hands_on", "socratic"],
};

// Seed mentors used to populate the Discover queue.
const SEED_CANDIDATES: Profile[] = [
  {
    userId: "mentor-ana",
    displayName: "Ana Ribeiro",
    role: "mentor",
    languages: ["en", "pt-BR"],
    values: ["growth", "empathy"],
    createdAt: SEED_NOW,
    updatedAt: SEED_NOW,
    teachingStyle: "hands_on",
    areasToTeach: ["frontend", "typescript", "developer tools"],
    yearsExperience: 8,
    industries: ["fintech"],
    availability: [
      {
        dayOfWeekUtc: 2,
        startMinuteUtc: 17 * 60,
        endMinuteUtc: 18 * 60,
        authoredZone: "America/Sao_Paulo",
      },
    ],
    supportedBackgrounds: ["career-changer", "self-taught"],
    verificationStatus: "approved",
  },
  {
    userId: "mentor-ben",
    displayName: "Ben Carter",
    role: "mentor",
    languages: ["en"],
    values: ["curiosity", "rigor"],
    createdAt: SEED_NOW,
    updatedAt: SEED_NOW,
    teachingStyle: "socratic",
    areasToTeach: ["system design", "backend"],
    yearsExperience: 12,
    industries: ["cloud infrastructure"],
    availability: [
      {
        dayOfWeekUtc: 4,
        startMinuteUtc: 14 * 60,
        endMinuteUtc: 15 * 60,
        authoredZone: "Europe/London",
      },
    ],
    supportedBackgrounds: ["bootcamp"],
    verificationStatus: "approved",
  },
  {
    userId: "mentor-chen",
    displayName: "Chen Wei",
    role: "mentor",
    languages: ["en", "zh"],
    values: ["growth"],
    createdAt: SEED_NOW,
    updatedAt: SEED_NOW,
    teachingStyle: "structured",
    areasToTeach: ["data engineering"],
    yearsExperience: 5,
    industries: ["analytics"],
    availability: [],
    supportedBackgrounds: [],
    verificationStatus: "pending",
  },
  {
    userId: "mentor-diya",
    displayName: "Diya Sharma",
    role: "mentor",
    languages: ["en", "hi"],
    values: ["growth", "curiosity"],
    createdAt: SEED_NOW,
    updatedAt: SEED_NOW,
    teachingStyle: "socratic",
    areasToTeach: ["frontend", "typescript", "career growth"],
    yearsExperience: 6,
    industries: ["developer tools"],
    availability: [
      {
        dayOfWeekUtc: 3,
        startMinuteUtc: 16 * 60,
        endMinuteUtc: 17 * 60,
        authoredZone: "Asia/Kolkata",
      },
    ],
    supportedBackgrounds: ["self-taught", "career-changer"],
    verificationStatus: "approved",
  },
  {
    userId: "mentor-eli",
    displayName: "Eli Goldberg",
    role: "mentor",
    languages: ["en"],
    values: ["rigor", "empathy"],
    createdAt: SEED_NOW,
    updatedAt: SEED_NOW,
    teachingStyle: "advisory",
    areasToTeach: ["developer tools", "frontend", "system design"],
    yearsExperience: 10,
    industries: ["fintech"],
    availability: [
      {
        dayOfWeekUtc: 1,
        startMinuteUtc: 13 * 60,
        endMinuteUtc: 14 * 60,
        authoredZone: "America/New_York",
      },
    ],
    supportedBackgrounds: ["bootcamp", "self-taught"],
    verificationStatus: "approved",
  },
  {
    userId: "mentor-fatima",
    displayName: "Fatima Noor",
    role: "mentor",
    languages: ["en", "ar"],
    values: ["growth", "curiosity", "empathy"],
    createdAt: SEED_NOW,
    updatedAt: SEED_NOW,
    teachingStyle: "hands_on",
    areasToTeach: ["frontend", "typescript", "developer tools"],
    yearsExperience: 7,
    industries: ["edtech"],
    availability: [
      {
        dayOfWeekUtc: 5,
        startMinuteUtc: 15 * 60,
        endMinuteUtc: 16 * 60,
        authoredZone: "Asia/Dubai",
      },
    ],
    supportedBackgrounds: ["career-changer"],
    verificationStatus: "approved",
  },
];

// Default tiers used when resolving connection caps. The plan mock owns the
// authoritative view; the matching mock only needs a tier per user to feed
// `decideOutcome`, so it keeps a small overridable map and assumes `free` for
// anyone unknown.
const DEFAULT_TIERS: Record<UserId, PlanTier> = {
  "seed-viewer": "free",
};

export interface MatchingMockOptions {
  // Override or extend the seed candidate pool.
  candidates?: Profile[];
  // Profiles available for viewer lookup (defaults to the seed viewer plus the
  // candidate pool so both sides of a pair can be scored).
  profiles?: Profile[];
  // Per-user plan tiers, used to resolve active-connection caps.
  tiers?: Record<UserId, PlanTier>;
}

export function createMatchingMock(
  options: MatchingMockOptions = {},
): MatchingService {
  const candidates = options.candidates ?? SEED_CANDIDATES;

  // Profile lookup table covering both viewers and candidates.
  const profiles = new Map<UserId, Profile>();
  for (const p of options.profiles ?? [SEED_VIEWER, ...candidates]) {
    profiles.set(p.userId, p);
  }

  // Every swipe ever recorded, in arrival order (Req. 4.7 — signals persist).
  const signals: MatchSignal[] = [];
  // Confirmed matches keyed by the canonical "a|b" pair so a pair maps to a
  // single record regardless of swipe direction.
  const matches = new Map<string, Match>();

  function pairKey(a: UserId, b: UserId): string {
    const [x, y] = canonicalUserPair(a, b);
    return `${x}|${y}`;
  }

  // Read tiers live from the caller-provided object so a runtime upgrade
  // (e.g. the demo's "Upgrade" button mutating the passed map) is observed
  // without rebuilding the service.
  function tierFor(userId: UserId): PlanTier {
    return options.tiers?.[userId] ?? DEFAULT_TIERS[userId] ?? "free";
  }

  // Count of unarchived matches a user currently holds — the input the policy
  // needs to compare against the connection cap.
  function activeCount(userId: UserId): number {
    let n = 0;
    for (const match of matches.values()) {
      if (match.archivedAt) continue;
      if (match.userIds[0] === userId || match.userIds[1] === userId) n += 1;
    }
    return n;
  }

  // True iff `to` has previously signaled interest back toward `from`.
  function hasInterestFrom(from: UserId, to: UserId): boolean {
    return signals.some(
      (s) =>
        s.kind === "interest" &&
        s.fromUserId === from &&
        s.toUserId === to,
    );
  }

  function viewerProfile(viewerId: UserId): Profile {
    return profiles.get(viewerId) ?? SEED_VIEWER;
  }

  function toCandidateProfile(
    viewer: Profile,
    candidate: Profile,
  ): CandidateProfile {
    const score = scoreMatch(viewer, candidate);
    return {
      userId: candidate.userId,
      role: candidate.role,
      displayName: candidate.displayName,
      matchScore: score,
      summary: summarize(candidate),
      tags: tagsFor(candidate),
      verified:
        candidate.role === "mentor" &&
        candidate.verificationStatus === "approved",
    };
  }

  return {
    async fetchQueue(
      viewerId: UserId,
      opts?: QueueOpts,
    ): Promise<CandidateProfile[]> {
      const viewer = viewerProfile(viewerId);

      const scored = candidates
        // Don't surface yourself, and hide anyone you've already swiped on.
        .filter((c) => c.userId !== viewerId)
        .filter(
          (c) =>
            !signals.some(
              (s) => s.fromUserId === viewerId && s.toUserId === c.userId,
            ),
        )
        .map((c) => toCandidateProfile(viewer, c));

      const ordered = orderQueue(scored);
      const limit = opts?.limit;
      return typeof limit === "number" ? ordered.slice(0, limit) : ordered;
    },

    async recordSignal(signal: MatchSignal): Promise<MatchOutcome> {
      // Req. 4.7: persist first, unconditionally.
      signals.push(signal);

      const mutualInterest =
        signal.kind === "interest" &&
        hasInterestFrom(signal.toUserId, signal.fromUserId);

      const decision = decideOutcome({
        viewerActiveCount: activeCount(signal.fromUserId),
        candidateActiveCount: activeCount(signal.toUserId),
        viewerTier: tierFor(signal.fromUserId),
        candidateTier: tierFor(signal.toUserId),
        mutualInterest,
      });

      if (decision.kind === "recorded") {
        return { kind: "recorded" };
      }
      if (decision.kind === "blocked_by_cap") {
        return {
          kind: "blocked_by_cap",
          cap: decision.cap,
          current: decision.current,
        };
      }

      // match_created — assemble (or reuse) the Match record. The policy module
      // intentionally can't build this; the mock owns id + canonical pairing.
      const key = pairKey(signal.fromUserId, signal.toUserId);
      const existing = matches.get(key);
      if (existing && !existing.archivedAt) {
        return { kind: "match_created", match: existing };
      }

      const fromProfile = profiles.get(signal.fromUserId);
      const toProfile = profiles.get(signal.toUserId);
      const matchScore: number =
        fromProfile && toProfile
          ? scoreMatch(fromProfile, toProfile).value
          : 0;

      const match: Match = {
        id: newId(),
        userIds: canonicalUserPair(signal.fromUserId, signal.toUserId),
        matchScore,
        createdAt: signal.createdAt,
      };
      matches.set(key, match);
      return { kind: "match_created", match };
    },

    scoreMatch(viewer: Profile, candidate: Profile): MatchScore {
      return scoreMatch(viewer, candidate);
    },
  };
}

// A one-line summary for the SwipeCard, derived per role.
function summarize(profile: Profile): string {
  if (profile.role === "mentor") {
    const focus = profile.areasToTeach.slice(0, 3).join(", ");
    return `${profile.yearsExperience}+ yrs · teaches ${focus}`;
  }
  const wants = profile.careerInterests.slice(0, 3).join(", ");
  return `Mentee · exploring ${wants}`;
}

// Tag chips for the SwipeCard: the skills/areas plus spoken languages.
function tagsFor(profile: Profile): string[] {
  if (profile.role === "mentor") {
    return [...profile.areasToTeach.slice(0, 4), ...profile.languages];
  }
  return [...profile.careerInterests.slice(0, 4), ...profile.languages];
}

// Default singleton for app wiring; tests should prefer `createMatchingMock`
// to keep state isolated per case.
export const matchingMock: MatchingService = createMatchingMock();
