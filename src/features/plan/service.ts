import type { PlanTier, UserId } from "../../types/identity";

// Pure helper: number of simultaneous active connections allowed for a tier.
// Free tier is capped at 3 (Req. 7.5, Req. 4.7). Paid tiers — including
// enterprise, which the requirement implies as unlimited — return
// `Number.POSITIVE_INFINITY` so call sites can do a single numeric
// comparison without special-casing tiers. Exported as a top-level
// function so consumers (matchPolicy in task 5.3, hooks in task 9.2)
// can import it without taking a `PlanService` dependency.
export function activeConnectionLimit(tier: PlanTier): number {
  switch (tier) {
    case "free":
      return 3;
    case "mentee_premium":
    case "mentor_pro":
    case "enterprise":
      return Number.POSITIVE_INFINITY;
  }
}

// Adapter contract for plan reads and upgrades. The cap helper is also
// exposed on the service so call sites that already hold a service handle
// can read it without a separate import.
export interface PlanService {
  // Req. 7.5 — read the current tier for a user.
  getPlan(userId: UserId): Promise<PlanTier>;
  // Req. 7.5 — upgrade flow. Returns the resulting tier so callers can
  // confirm the transition without re-reading the plan.
  upgrade(userId: UserId, target: PlanTier): Promise<PlanTier>;
  // Req. 4.7, 7.5 — connection cap by tier. Mirrors the standalone helper.
  activeConnectionLimit(tier: PlanTier): number;
}
