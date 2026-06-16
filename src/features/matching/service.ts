import type { UserId } from "../../types/identity";
import type { Profile } from "../../types/profile";
import type {
  CandidateProfile,
  Match,
  MatchScore,
  MatchSignal,
} from "../../types/matching";

// Pagination / filtering options for `fetchQueue`. Both fields are optional so
// the first call can omit them. `limit` is the maximum number of candidate
// profiles to return; `cursor` is an opaque continuation token returned by an
// earlier page so the service can resume ordering without leaking its
// internal index shape into the client.
export interface QueueOpts {
  limit?: number;
  cursor?: string;
}

// Outcome of `recordSignal`. The signal is always persisted (Req. 4.7) — the
// discriminator captures what happened next:
//   "recorded"        — signal stored, no mutual interest yet (or it was a
//                       pass), so no match was created.
//   "match_created"   — mutual interest detected and both users were within
//                       their active-connection caps, so a Match exists.
//   "blocked_by_cap"  — mutual interest detected but at least one user is at
//                       the free-tier cap; the signal is kept and can upgrade
//                       to a match later when a connection is archived.
export type MatchOutcome =
  | { kind: "recorded" }
  | { kind: "match_created"; match: Match }
  | { kind: "blocked_by_cap"; cap: number; current: number };

// Matching domain service. Backed by an in-memory mock for the MVP and an
// HTTP adapter later; screens and hooks depend only on this contract.
export interface MatchingService {
  fetchQueue(
    viewerId: UserId,
    opts?: QueueOpts,
  ): Promise<CandidateProfile[]>;
  recordSignal(signal: MatchSignal): Promise<MatchOutcome>;
  // Pure scoring fn, exposed for testing and previewing without a fetch.
  scoreMatch(viewer: Profile, candidate: Profile): MatchScore;
}
