import type { PlanTier } from "../../types/identity";
import { activeConnectionLimit } from "../plan/service";

// Inputs to the match policy decision. The policy module is intentionally
// pure: it has no access to the user store, the match store, or id/clock
// generators. The caller is responsible for resolving the viewer/candidate
// active-connection counts and tiers before calling in.
export interface DecideOutcomeInput {
  viewerActiveCount: number;
  candidateActiveCount: number;
  viewerTier: PlanTier;
  candidateTier: PlanTier;
  // True iff both sides have signaled interest in each other. False means
  // this is the first signal in the pair (or the most recent signal was a
  // pass), so no match can be created yet.
  mutualInterest: boolean;
}

// Outcome of a policy decision. This is intentionally narrower than the
// `MatchOutcome` exported from `service.ts`: the policy module does not
// have the inputs needed to construct a `Match` record (no `newId`, no
// `canonicalUserPair`, no candidate score). The mock service in task 6.2
// wraps this result and assembles the `Match` itself.
export type PolicyDecision =
  | { kind: "recorded" }
  | { kind: "match_created" }
  | { kind: "blocked_by_cap"; cap: number; current: number };

/**
 * Decide what should happen after an interest/pass signal is persisted.
 *
 * The interest signal is ALWAYS persisted by the caller — including the
 * `recorded` and `blocked_by_cap` branches — so a future archive or
 * upgrade can promote the pair to a match without re-asking the user
 * (Req. 4.7).
 *
 * Branches:
 * - `recorded`        — no mutual interest yet, nothing more to do
 *                       (Req. 4.7: signal still persisted by the caller).
 * - `match_created`   — mutual interest AND both sides are within their
 *                       active-connection caps (Req. 4.5).
 * - `blocked_by_cap`  — mutual interest BUT at least one side is at its
 *                       cap; the signal stays so it can promote later
 *                       (Req. 4.7, Req. 7.5: cap is a function of plan
 *                       tier — `3` for free, `Infinity` for paid tiers).
 */
export function decideOutcome(input: DecideOutcomeInput): PolicyDecision {
  // Req. 4.7: a one-sided signal (or a pass) is just recorded; the caller
  // has already persisted it and there is nothing else to decide.
  if (!input.mutualInterest) {
    return { kind: "recorded" };
  }

  // Req. 7.5: caps come from the plan tier. Paid tiers return Infinity, so
  // the comparisons below are safe to do with plain numeric operators.
  const viewerCap = activeConnectionLimit(input.viewerTier);
  const candidateCap = activeConnectionLimit(input.candidateTier);

  const viewerAtCap = input.viewerActiveCount >= viewerCap;
  const candidateAtCap = input.candidateActiveCount >= candidateCap;

  // Req. 4.7: at least one side is at the cap, so we cannot create the
  // match yet. Surface the tighter cap and the larger current count so the
  // caller can drive a useful upgrade/archive prompt. If both caps are
  // Infinity, neither side can be at-cap and this branch is unreachable.
  if (viewerAtCap || candidateAtCap) {
    return {
      kind: "blocked_by_cap",
      cap: Math.min(viewerCap, candidateCap),
      current: Math.max(input.viewerActiveCount, input.candidateActiveCount),
    };
  }

  // Req. 4.5: mutual interest with room on both sides — the caller
  // assembles the Match record from this signal.
  return { kind: "match_created" };
}
