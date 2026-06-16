import type { MatchId, Role, UserId } from "./identity";

// Numeric outcome of the match algorithm. `value` is the integer 0..100 shown
// on the SwipeCard badge; `components` exposes the per-axis sub-scores so the
// UI (and tests) can explain the score later. Each component is also an
// integer 0..100 in the design's weighting scheme.
export interface MatchScore {
  value: number;
  components: {
    skills: number;
    teachingStyle: number;
    availability: number;
    languages: number;
    values: number;
  };
}

// Projection of a Profile prepared for the Discover queue. The matching
// service computes `matchScore` once per (viewer, candidate) pair and the
// queue is ordered by `matchScore.value`. `verified` is true only for
// mentors whose `verificationStatus` is "approved".
export interface CandidateProfile {
  userId: UserId;
  role: Role;
  displayName: string;
  matchScore: MatchScore;
  summary: string;
  tags: string[];
  verified: boolean;
}

// One swipe outcome. `kind: "interest"` is a right swipe; `kind: "pass"` is a
// left swipe. Signals are always persisted so a deferred mutual interest can
// upgrade to a Match later when free-tier caps allow (Req. 4.7).
export interface MatchSignal {
  fromUserId: UserId;
  toUserId: UserId;
  kind: "interest" | "pass";
  createdAt: string; // ISO 8601 UTC
}

// A confirmed mutual interest. `userIds` is canonically sorted
// lexicographically so the pair has a single representation regardless of who
// swiped first; this is enforced by `canonicalUserPair` in `src/lib/id.ts`.
export interface Match {
  id: MatchId;
  userIds: [UserId, UserId];
  matchScore: number; // 0..100
  createdAt: string;
  archivedAt?: string;
}
