import type {
  Language,
  Role,
  UserId,
  VerificationStatus,
} from "./identity";
import type { AvailabilityWindow } from "./availability";

// Fields shared by both mentee and mentor profiles. Concrete role-specific
// profiles narrow `role` to a literal so `Profile` is a discriminated union.
export interface BaseProfile {
  userId: UserId;
  displayName: string;
  avatarUrl?: string;
  role: Role;
  languages: Language[];
  values: string[];
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
}

export type MeetingFrequency = "weekly" | "monthly" | "ad_hoc";

export type TeachingStyle =
  | "structured"
  | "socratic"
  | "hands_on"
  | "advisory";

export interface MenteeProfile extends BaseProfile {
  role: "mentee";
  subjects: string[]; // required, non-empty (validated at the schema layer)
  careerInterests: string[]; // required, non-empty
  background: string; // required, non-empty
  otherInterests: string[];
  meetingFrequency: MeetingFrequency;
  preferredTeachingStyles: TeachingStyle[];
}

export interface MentorProfile extends BaseProfile {
  role: "mentor";
  teachingStyle: TeachingStyle; // required
  areasToTeach: string[]; // required, non-empty
  yearsExperience: number; // required, >= 0
  industries: string[];
  availability: AvailabilityWindow[];
  supportedBackgrounds: string[];
  verificationStatus: VerificationStatus;
}

// Discriminated union on `role`. Narrow with `profile.role === "mentor"`.
export type Profile = MenteeProfile | MentorProfile;

// Patch shape for partial profile updates. Either branch may be supplied;
// callers pick the branch by role and the service layer applies the patch.
export type ProfilePatch = Partial<MenteeProfile> | Partial<MentorProfile>;
