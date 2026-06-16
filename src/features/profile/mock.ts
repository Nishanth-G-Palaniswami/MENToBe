import type { UserId } from "../../types/identity";
import type {
  MenteeProfile,
  MentorProfile,
  Profile,
  ProfilePatch,
} from "../../types/profile";
import type { ProfileService, VerificationDocument } from "./service";

// Stripped-down verification record kept by the mock. The bytes are
// deliberately dropped (Req. 3.3 only requires status flips client-side;
// blob storage is the live adapter's job).
interface VerificationRecord {
  fileName: string;
  mimeType: string;
}

// Deterministic ISO timestamp used to seed `createdAt`/`updatedAt` so test
// snapshots are stable. Real users get a `Date.now()` stamp on update.
const SEED_TIMESTAMP = "2025-01-01T00:00:00.000Z";

/**
 * Builds the four seed profiles called for by task 6.1 (one mentee plus
 * three mentors covering each verification status). Returning a fresh map
 * per factory call keeps test isolation cheap.
 */
function buildSeedProfiles(): Map<UserId, Profile> {
  const seedMentee: MenteeProfile = {
    userId: "seed-mentee-1",
    displayName: "Ada Lovelace",
    role: "mentee",
    languages: ["en"],
    values: ["curiosity", "rigor"],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    subjects: ["Computer Science"],
    careerInterests: ["Software Engineering", "Research"],
    background: "Computer science undergraduate exploring research roles.",
    otherInterests: ["mathematics", "music"],
    meetingFrequency: "weekly",
    preferredTeachingStyles: ["socratic", "structured"],
  };

  const seedMentorApproved: MentorProfile = {
    userId: "seed-mentor-1",
    displayName: "Grace Hopper",
    role: "mentor",
    languages: ["en"],
    values: ["clarity", "mentorship"],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    teachingStyle: "structured",
    areasToTeach: ["Compilers", "Systems Programming"],
    yearsExperience: 30,
    industries: ["Software", "Defense"],
    availability: [],
    supportedBackgrounds: ["career-switcher", "first-generation"],
    verificationStatus: "approved",
  };

  const seedMentorPending: MentorProfile = {
    userId: "seed-mentor-2",
    displayName: "Alan Turing",
    role: "mentor",
    languages: ["en"],
    values: ["curiosity", "precision"],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    teachingStyle: "socratic",
    areasToTeach: ["Theory of Computation", "Cryptography"],
    yearsExperience: 12,
    industries: ["Research"],
    availability: [],
    supportedBackgrounds: ["non-traditional"],
    verificationStatus: "pending",
  };

  const seedMentorUnverified: MentorProfile = {
    userId: "seed-mentor-3",
    displayName: "Margaret Hamilton",
    role: "mentor",
    languages: ["en"],
    values: ["reliability", "discipline"],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    teachingStyle: "hands_on",
    areasToTeach: ["Embedded Systems", "Software Reliability"],
    yearsExperience: 20,
    industries: ["Aerospace"],
    availability: [],
    supportedBackgrounds: ["career-switcher"],
    verificationStatus: "unverified",
  };

  return new Map<UserId, Profile>([
    [seedMentee.userId, seedMentee],
    [seedMentorApproved.userId, seedMentorApproved],
    [seedMentorPending.userId, seedMentorPending],
    [seedMentorUnverified.userId, seedMentorUnverified],
  ]);
}

/**
 * In-memory `ProfileService` for the MVP.
 *
 * Backs profile reads (Req. 7.1) and partial updates (Req. 7.2) over a map
 * seeded with the four canonical demo identities. `submitVerification`
 * (Req. 3.3) flips the mentor's `verificationStatus` to `"pending"` and
 * stashes the document metadata; bytes are dropped for the mock.
 */
export function createMockProfileService(): ProfileService {
  const profiles = buildSeedProfiles();
  const verificationDocs = new Map<UserId, VerificationRecord>();

  return {
    /**
     * Req. 7.1 — profile read. Throws on miss so callers surface a clear
     * error instead of getting `undefined` back.
     */
    async getProfile(userId: UserId): Promise<Profile> {
      const profile = profiles.get(userId);
      if (!profile) {
        throw new Error("Profile not found: " + userId);
      }
      return profile;
    },

    /**
     * Req. 7.2 — partial update. Branches on the existing profile's role
     * to apply the matching `Partial<...>` arm of the `ProfilePatch` union.
     * `role` and `userId` are pinned from the existing record so callers
     * cannot change identity through a patch. `updatedAt` is bumped.
     */
    async updateProfile(
      userId: UserId,
      patch: ProfilePatch,
    ): Promise<Profile> {
      const existing = profiles.get(userId);
      if (!existing) {
        throw new Error("Profile not found: " + userId);
      }
      const now = new Date().toISOString();
      let merged: Profile;
      if (existing.role === "mentor") {
        // Cast here is the documented "small role-typed cast at the merge
        // boundary" — the union member is fixed by `existing.role`.
        const mentorPatch = patch as Partial<MentorProfile>;
        merged = {
          ...existing,
          ...mentorPatch,
          userId: existing.userId,
          role: "mentor",
          updatedAt: now,
        };
      } else {
        const menteePatch = patch as Partial<MenteeProfile>;
        merged = {
          ...existing,
          ...menteePatch,
          userId: existing.userId,
          role: "mentee",
          updatedAt: now,
        };
      }
      profiles.set(userId, merged);
      return merged;
    },

    /**
     * Req. 3.3 — submit a mentor verification document. Refuses non-mentor
     * profiles up front (mentees have no `verificationStatus` field). The
     * status flips to `"pending"` regardless of the previous value so
     * resubmissions reset the queue position.
     */
    async submitVerification(
      userId: UserId,
      doc: VerificationDocument,
    ): Promise<void> {
      const existing = profiles.get(userId);
      if (!existing) {
        throw new Error("Profile not found: " + userId);
      }
      if (existing.role !== "mentor") {
        throw new Error(
          "submitVerification requires a mentor profile: " + userId,
        );
      }
      verificationDocs.set(userId, {
        fileName: doc.fileName,
        mimeType: doc.mimeType,
      });
      const now = new Date().toISOString();
      const updated: MentorProfile = {
        ...existing,
        verificationStatus: "pending",
        updatedAt: now,
      };
      profiles.set(userId, updated);
    },
  };
}
