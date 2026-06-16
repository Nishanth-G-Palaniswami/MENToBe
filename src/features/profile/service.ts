import type { UserId } from "../../types/identity";
import type { Profile, ProfilePatch } from "../../types/profile";

// Verification document payload uploaded by mentors during onboarding
// (Req. 3.3). We model the bytes explicitly rather than passing a
// `File`/`Blob` so the type stays framework-agnostic and trivially
// serializable for the in-memory mock and the eventual S3 adapter.
// `Uint8Array` is the common case (browser `File.arrayBuffer()`); the
// raw `ArrayBuffer` form is accepted for callers that already hold one.
export interface VerificationDocument {
  fileName: string;
  mimeType: string;
  bytes: ArrayBuffer | Uint8Array;
}

// Adapter contract for profile reads, updates, and mentor verification.
export interface ProfileService {
  // Req. 7.1 — profile read for the profile screen and re-score inputs.
  getProfile(userId: UserId): Promise<Profile>;
  // Req. 7.2 — partial profile update; service returns the merged result
  // so callers can refresh caches without an extra round-trip.
  updateProfile(userId: UserId, patch: ProfilePatch): Promise<Profile>;
  // Req. 3.3 — submits a verification document. The mock flips
  // `verificationStatus` to "pending" (Req. 3.4); approval is a manual
  // operator action in a future iteration.
  submitVerification(userId: UserId, doc: VerificationDocument): Promise<void>;
}
