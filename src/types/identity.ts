// Branded-ish ID aliases. Using `type` aliases keeps them as plain strings at
// runtime while still letting call sites reference them by name. We can swap
// these for true branded types later without breaking imports.
export type UserId = string;
export type MatchId = string;
export type ThreadId = string;
export type MessageId = string;
export type NoteId = string;
export type SessionId = string;

export type Role = "mentee" | "mentor";

export type PlanTier =
  | "free"
  | "mentee_premium"
  | "mentor_pro"
  | "enterprise";

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "approved"
  | "rejected";

// BCP-47 language tag, e.g. "en", "pt-BR".
export type Language = string;

// IANA time zone identifier, e.g. "America/Sao_Paulo".
export type IanaTimeZone = string;
