import { create } from "zustand";

import type { Session } from "@/types/session";

// In-memory session store. We deliberately do NOT use the persist middleware
// here: tokens and the authenticated user must not be written to disk so that
// closing the tab or signing out leaves no residual auth state on the device.
//
// Sign-out (Req. 8.5) is therefore a two-step operation handled by the caller:
//   1. Call `clearSession()` to drop the in-memory session.
//   2. Call the typed `storage.remove(...)` helper from `src/lib/storage.ts`
//      for any persisted client keys (e.g. the onboarding draft).
//
// The actual sign-out wiring lives in `useAuth` (task 18.1); this store only
// exposes the primitives.
interface SessionState {
  session: Session | null;
  setSession: (session: Session) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}));
