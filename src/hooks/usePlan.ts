import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useServices } from "@/features/serviceProvider";
import type { PlanTier, UserId } from "@/types/identity";

// Application-layer wrapper around `PlanService`. Exposes the current tier,
// the derived active-connection cap (Req. 7.5, 4.7), and an `upgrade`
// mutation. `userId` may be `null` while the session is still loading; the
// underlying query is disabled in that case and `tier` falls back to
// `"free"` so call sites always have a usable cap to display.
export const usePlan = (userId: UserId | null) => {
  const { plan: planService } = useServices();
  const queryClient = useQueryClient();

  const query = useQuery<PlanTier>({
    queryKey: ["plan", userId],
    // `enabled` gates this — when the query runs, `userId` is non-null.
    queryFn: () => planService.getPlan(userId!),
    enabled: !!userId,
  });

  // Default to `"free"` while the query is settling so screens can render
  // a sensible cap (3 active connections) without a loading branch.
  const tier: PlanTier = query.data ?? "free";

  // Req. 7.5 — upgrade flow. The service returns the resulting tier and we
  // seed the cache directly so the UI reflects the new plan without a
  // refetch round trip.
  const mutation = useMutation({
    mutationFn: (target: PlanTier) => {
      if (!userId) {
        throw new Error("usePlan.upgrade requires authenticated user");
      }
      return planService.upgrade(userId, target);
    },
    onSuccess: (next: PlanTier) => {
      queryClient.setQueryData(["plan", userId], next);
    },
  });

  return {
    tier,
    activeConnectionLimit: planService.activeConnectionLimit(tier),
    upgrade: (target: PlanTier) => mutation.mutateAsync(target),
    isLoading: query.isLoading,
  };
};
