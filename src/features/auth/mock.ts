import type { Role, UserId } from "../../types/identity";
import type { Session } from "../../types/session";
import { newId } from "../../lib/id";
import type { AuthService, SignUpInput } from "./service";

// Internal user record. The task's contract calls for `{ email, role, plan }`
// per user; `displayName` is added because `signUpWithEmail` accepts one and
// we want the mock to round-trip it for any future profile bootstrapping
// (the live adapter will hand it off to the profile service).
interface MockAuthUser {
  email: string;
  role: Role | null;
  plan: "free";
  displayName: string;
}

// Deterministic seed used by `signInWithGoogle`. Exported so the profile
// mock and any test harness can keep IDs aligned without reaching into the
// closure.
export const SEED_MENTEE_USER_ID: UserId = "seed-mentee-1";
export const SEED_MENTEE_EMAIL = "ada@example.com";

// 24h session lifetime, matched to the Session contract in `types/session.ts`.
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * In-memory `AuthService` for the MVP.
 *
 * Backs the auth flow (Req. 1.1) with a fake Google sign-in that resolves
 * to a deterministic seed user, an email sign-up that mints a fresh user
 * (Req. 1.2 — role is left null so the role-select screen can assign it),
 * and a sign-out that clears the cached session (Req. 8.5). `setRole`
 * (Req. 1.3) refreshes the cached session in place so route gates see the
 * new role on the next render without a re-sign-in.
 */
export function createMockAuthService(): AuthService {
  const users = new Map<UserId, MockAuthUser>();
  let currentSession: Session | null = null;

  // Seed the deterministic Google user up front so its presence is
  // independent of which method ran first.
  users.set(SEED_MENTEE_USER_ID, {
    email: SEED_MENTEE_EMAIL,
    role: "mentee",
    plan: "free",
    displayName: "Ada Lovelace",
  });

  function buildSession(userId: UserId, user: MockAuthUser): Session {
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_MS);
    return {
      userId,
      email: user.email,
      role: user.role,
      plan: user.plan,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  return {
    /**
     * Req. 1.1 — fake Google sign-in. Always resolves to the deterministic
     * seed mentee so screens and tests can rely on a stable identity.
     */
    async signInWithGoogle(): Promise<Session> {
      const user = users.get(SEED_MENTEE_USER_ID);
      if (!user) {
        // Defensive: the constructor seeds this user, so this branch only
        // fires if someone mutates the store from the outside. Throw rather
        // than silently re-seed so the bug is loud.
        throw new Error("Seed Google user missing from mock auth store");
      }
      const session = buildSession(SEED_MENTEE_USER_ID, user);
      currentSession = session;
      return session;
    },

    /**
     * Req. 1.1, 1.2 — email sign-up. Mints a fresh user with `role: null`
     * (the role-select screen assigns it next) and the default free plan.
     * The password is intentionally not persisted: this is a client mock,
     * not a credential store.
     */
    async signUpWithEmail(input: SignUpInput): Promise<Session> {
      const userId = newId();
      const user: MockAuthUser = {
        email: input.email,
        role: null,
        plan: "free",
        displayName: input.displayName,
      };
      users.set(userId, user);
      const session = buildSession(userId, user);
      currentSession = session;
      return session;
    },

    /**
     * Req. 8.5 — sign-out clears the cached session. The hook layer
     * (task 18.1) is responsible for clearing persisted client storage.
     */
    async signOut(): Promise<void> {
      currentSession = null;
    },

    /** Synchronous read of the cached session. Used by route gates. */
    getCurrentSession(): Session | null {
      return currentSession;
    },

    /**
     * Req. 1.3 — assigns the role chosen on the role-select screen. If the
     * cached session belongs to the same user, refresh it so subsequent
     * `getCurrentSession()` reads see the new role without a sign-in.
     */
    async setRole(userId: UserId, role: Role): Promise<void> {
      const user = users.get(userId);
      if (!user) {
        throw new Error("User not found: " + userId);
      }
      user.role = role;
      if (currentSession && currentSession.userId === userId) {
        currentSession = { ...currentSession, role };
      }
    },
  };
}
