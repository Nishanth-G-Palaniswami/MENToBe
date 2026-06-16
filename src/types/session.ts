import type { PlanTier, Role, UserId } from "./identity";

// Authenticated session as held by the client. `role` is null between sign-up
// and role selection (Req. 1.2). `plan` defaults to "free" until the user
// upgrades (Req. 7.5). Timestamps are ISO 8601 UTC strings.
export interface Session {
  userId: UserId;
  email: string;
  role: Role | null;
  plan: PlanTier;
  issuedAt: string;
  expiresAt: string;
}
