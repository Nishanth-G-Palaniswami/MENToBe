import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Role } from "@/types/identity";
import type { MenteeProfile, MentorProfile } from "@/types/profile";

// The onboarding wizard collects fields incrementally across multiple steps
// and must survive a page reload (Req. 2.4). We therefore persist the draft
// to `localStorage` under a single, stable key.
export const ONBOARDING_STORAGE_KEY = "mentormatch.onboarding.draft";

// A draft is a partial of either role-specific profile. The `role` field on
// each profile is a literal, so `role` is optional inside `Partial<...>` and
// the empty object `{}` is a valid initial draft for either branch.
export type OnboardingDraft =
  | Partial<MenteeProfile>
  | Partial<MentorProfile>;

interface OnboardingState {
  role: Role | null;
  draft: OnboardingDraft;
  currentStep: number;
  setRole: (role: Role) => void;
  setDraft: (patch: OnboardingDraft) => void;
  setCurrentStep: (step: number) => void;
  reset: () => void;
}

const initialState: Pick<OnboardingState, "role" | "draft" | "currentStep"> = {
  role: null,
  draft: {},
  currentStep: 0,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      setRole: (role) => set({ role }),
      // Spread-merge the patch over the existing draft. Both arms of the
      // union accept arbitrary partial fields, so the result is asserted
      // back to `OnboardingDraft` to keep the union exposed to consumers.
      setDraft: (patch) =>
        set((state) => ({
          draft: { ...state.draft, ...patch } as OnboardingDraft,
        })),
      setCurrentStep: (step) => set({ currentStep: step }),
      // `reset()` clears in-memory state AND removes the persisted entry, so
      // sign-out (Req. 8.5) leaves no draft on disk.
      reset: () => {
        set({ ...initialState });
        void useOnboardingStore.persist.clearStorage();
      },
    }),
    {
      name: ONBOARDING_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Persist only the draft fields; action functions are reconstructed on
      // each load from the store factory.
      partialize: (state) => ({
        role: state.role,
        draft: state.draft,
        currentStep: state.currentStep,
      }),
      version: 1,
    },
  ),
);
