import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useServices } from "@/features/serviceProvider";
import type { UserId } from "@/types/identity";
import type { Profile, ProfilePatch } from "@/types/profile";

// Stable query key factory. Exported so optimistic updates and cache
// invalidations elsewhere (e.g. after sign-in or a profile-driven re-score)
// can read/write the same slot without duplicating the tuple shape.
export const PROFILE_QUERY_KEY = (userId: UserId) =>
  ["profile", userId] as const;

// Public surface returned by `useProfile`. Wraps `ProfileService.getProfile`
// behind TanStack Query and exposes a mutation that:
//   - persists a partial patch via `ProfileService.updateProfile` (Req. 7.2),
//   - replaces the cached profile with the merged result so consumers
//     re-render without a follow-up fetch,
//   - invalidates the candidate-queue cache so the matching service
//     re-scores against the updated profile (Req. 7.2 → re-score).
export const useProfile = (userId: UserId) => {
  const { profile: profileService } = useServices();
  const queryClient = useQueryClient();

  // Req. 7.1 — profile read. `enabled: !!userId` guards against the brief
  // moment between mount and an authenticated session being available.
  const query = useQuery({
    queryKey: PROFILE_QUERY_KEY(userId),
    queryFn: () => profileService.getProfile(userId),
    enabled: !!userId,
  });

  // Req. 7.2 — partial profile update. The service returns the merged
  // profile so we can seed the cache directly instead of refetching.
  const mutation = useMutation({
    mutationFn: (patch: ProfilePatch) =>
      profileService.updateProfile(userId, patch),
    onSuccess: (merged: Profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY(userId), merged);
      // Re-score the swipe queue against the new profile. Keyed broadly
      // so any `["match-queue", ...]` variant (per-viewer keys, filters)
      // is invalidated.
      queryClient.invalidateQueries({ queryKey: ["match-queue"] });
    },
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    update: (patch: ProfilePatch) => mutation.mutateAsync(patch),
    isUpdating: mutation.isPending,
  };
};
