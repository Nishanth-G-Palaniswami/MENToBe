import type { Role, UserId } from "../../types/identity";
import type { Session } from "../../types/session";

// Inputs for the email+password sign-up flow. The design only spells out
// "email", but a real sign-up needs a credential and a display name to seed
// the eventual profile. We keep the shape minimal here; richer onboarding
// fields are captured later in the wizard (Req. 2, Req. 3).
export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

// Adapter contract for authentication. The MVP ships an in-memory mock
// (Task 6.1) and a real HTTP adapter is swapped in later via the service
// provider (Req. 8.4). All session-bearing methods return the freshly
// issued `Session`; `getCurrentSession` is synchronous because it reads
// from the in-memory client cache populated on sign-in.
export interface AuthService {
  // Req. 1.1 — Google sign-in entry point.
  signInWithGoogle(): Promise<Session>;
  // Req. 1.1 — email + password sign-up entry point.
  signUpWithEmail(input: SignUpInput): Promise<Session>;
  // Req. 8.5 — sign-out clears server-side session state. The hook layer
  // is responsible for clearing client tokens and the session store.
  signOut(): Promise<void>;
  // Synchronous read of the cached session, used by route gates.
  getCurrentSession(): Session | null;
  // Req. 1.2, 1.3 — assigns the chosen role after sign-up.
  setRole(userId: UserId, role: Role): Promise<void>;
}
