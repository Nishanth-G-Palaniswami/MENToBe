import type { PlanTier, UserId } from "../../types/identity";
import type { PlanService } from "./service";
import { activeConnectionLimit } from "./service";

/**
 * In-memory `PlanService` for the MVP.
 *
 * Tracks each user's tier in a map; users not in the map default to
 * `"free"` (Req. 7.5 — every account starts on the free tier with the
 * 3-connection cap). Upgrades simply overwrite the entry and return the
 * new value for caller confirmation. `activeConnectionLimit` delegates to
 * the standalone helper exported from `service.ts` so the cap stays in
 * one place — the helper is also imported directly by `matchPolicy`
 * (task 5.3).
 */
export function createMockPlanService(): PlanService {
  const plans = new Map<UserId, PlanTier>();

  return {
    /** Req. 7.5 — read the current tier; default to free for unknown users. */
    async getPlan(userId: UserId): Promise<PlanTier> {
      return plans.get(userId) ?? "free";
    },

    /** Req. 7.5 — upgrade flow. Returns the resulting tier. */
    async upgrade(userId: UserId, target: PlanTier): Promise<PlanTier> {
      plans.set(userId, target);
      return target;
    },

    /** Req. 4.7, 7.5 — connection cap. Delegates to the shared helper. */
    activeConnectionLimit(tier: PlanTier): number {
      return activeConnectionLimit(tier);
    },
  };
}
