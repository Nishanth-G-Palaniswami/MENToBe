import { useCallback } from "react";

import { useServices } from "@/features/serviceProvider";
import type { SignUpInput } from "@/features/auth/service";
import { useSessionStore } from "@/lib/stores/sessionStore";
import { ONBOARDING_STORAGE_KEY } from "@/lib/stores/onboardingStore";
import { storage } from "@/lib/storage";
import type { Role } from "@/types/identity";
import type { Session } from "@/types/session";

// Public surface returned by `useAuth`. Mirrors the design contract exactly so
// the hook can be swapped between the in-memory mock and the eventual HTTP
// adapter without screens needing to change.
export interface UseAuthResult {
  session: Session | null;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  setRole: (role: Role) => Promise<void>;
}

// Application-layer wrapper around `AuthService` that owns the client-side
// session state. Screens (Auth, Onboarding) consume only this hook and stay
// agnostic to which `AuthService` implementation is mounted (Req. 8.4).
//
// Wired to:
//   - `auth` from `useServices()` for the actual auth operations.
//   - `useSessionStore` for the in-memory `Session` cache that route gates
//     read synchronously (Req. 1.2, 1.3, 1.4).
//   - `storage.remove(ONBOARDING_STORAGE_KEY)` so sign-out drops the
//     persisted onboarding draft alongside the session (Req. 8.5).
export const useAuth = (): UseAuthResult => {
  const { auth } = useServices();
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const clearSession = useSessionStore((s) => s.clearSession);

  // Req. 1.1 — Google OAuth entry point. The service returns the freshly
  // issued session; we cache it so subsequent route gates and `setRole`
  // see the new identity immediately.
  const signInWithGoogle = useCallback(async (): Promise<void> => {
    const next = await auth.signInWithGoogle();
    setSession(next);
  }, [auth, setSession]);

  // Req. 1.1 — email + password sign-up. Same caching pattern as Google.
  const signUpWithEmail = useCallback(
    async (input: SignUpInput): Promise<void> => {
      const next = await auth.signUpWithEmail(input);
      setSession(next);
    },
    [auth, setSession],
  );

  // Req. 8.5 — sign-out. Order matters: hit the service first so a network
  // failure surfaces before we wipe local state, then clear the in-memory
  // session and remove the persisted onboarding draft.
  //
  // NOTE: this is the minimal sign-out wiring needed by the auth flow. Task
  // 18.1 layers in fuller token clearing (e.g. stored refresh tokens or
  // future cached query keys) on top of this baseline.
  const signOut = useCallback(async (): Promise<void> => {
    await auth.signOut();
    clearSession();
    storage.remove(ONBOARDING_STORAGE_KEY);
  }, [auth, clearSession]);

  // Req. 1.2, 1.3 — role selection. Requires an authenticated session; we
  // throw rather than silently no-op so misuse (calling before sign-in) is
  // caught at the call site instead of producing a half-configured account.
  const setRole = useCallback(
    async (role: Role): Promise<void> => {
      if (session === null) {
        throw new Error(
          "useAuth.setRole() requires an active session. Sign in before selecting a role.",
        );
      }
      await auth.setRole(session.userId, role);
      setSession({ ...session, role });
    },
    [auth, session, setSession],
  );

  return {
    session,
    signInWithGoogle,
    signUpWithEmail,
    signOut,
    setRole,
  };
};
