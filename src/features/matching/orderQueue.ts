import type { CandidateProfile } from "../../types/matching";

// -----------------------------------------------------------------------------
// orderQueue
// -----------------------------------------------------------------------------
// Sort a list of scored candidate profiles for the Discover queue.
//
// Ordering rules:
//   1. Primary key: `matchScore.value` descending — the highest match
//      percentages surface first.
//   2. Tiebreak: `userId` ascending. We use the `<` / `>` operators directly
//      (per spec) rather than `localeCompare` so the ordering is purely
//      lexicographic on the underlying string. This keeps the result stable
//      and locale-independent across machines.
//
// The function is non-mutating: it copies `scored` before sorting and
// returns the new array. Callers can keep the original list intact (the
// queue is server-cached in TanStack Query and should not be mutated in
// place).
// -----------------------------------------------------------------------------
export function orderQueue(
  scored: CandidateProfile[],
): CandidateProfile[] {
  return [...scored].sort((a, b) => {
    if (a.matchScore.value !== b.matchScore.value) {
      return b.matchScore.value - a.matchScore.value;
    }
    if (a.userId < b.userId) return -1;
    if (a.userId > b.userId) return 1;
    return 0;
  });
}
