import type {
  MenteeProfile,
  MentorProfile,
  Profile,
} from "../types/profile";
import type { UserId } from "../types/identity";

// -----------------------------------------------------------------------------
// Demo dataset — single source of truth for the clickable demo.
// -----------------------------------------------------------------------------
// Real, fully-typed Profile records (not just queue projections) so detail
// screens, chat headers, and the connections list can all read rich fields
// from one place. Mentees discover mentors and vice-versa.
// -----------------------------------------------------------------------------

const SEED = "2026-06-01T12:00:00.000Z";

export const MENTORS: MentorProfile[] = [
  {
    userId: "mentor-ana",
    displayName: "Ana Ribeiro",
    role: "mentor",
    languages: ["English", "Portuguese"],
    values: ["growth", "empathy"],
    createdAt: SEED,
    updatedAt: SEED,
    teachingStyle: "hands_on",
    areasToTeach: ["Frontend", "TypeScript", "Developer Tools"],
    yearsExperience: 8,
    industries: ["Fintech"],
    availability: [
      {
        dayOfWeekUtc: 2,
        startMinuteUtc: 17 * 60,
        endMinuteUtc: 18 * 60,
        authoredZone: "America/Sao_Paulo",
      },
    ],
    supportedBackgrounds: ["career-changer", "self-taught"],
    verificationStatus: "approved",
  },
  {
    userId: "mentor-ben",
    displayName: "Ben Carter",
    role: "mentor",
    languages: ["English"],
    values: ["curiosity", "rigor"],
    createdAt: SEED,
    updatedAt: SEED,
    teachingStyle: "socratic",
    areasToTeach: ["System Design", "Backend"],
    yearsExperience: 12,
    industries: ["Cloud Infrastructure"],
    availability: [
      {
        dayOfWeekUtc: 4,
        startMinuteUtc: 14 * 60,
        endMinuteUtc: 15 * 60,
        authoredZone: "Europe/London",
      },
    ],
    supportedBackgrounds: ["bootcamp"],
    verificationStatus: "approved",
  },
  {
    userId: "mentor-chen",
    displayName: "Chen Wei",
    role: "mentor",
    languages: ["English", "Mandarin"],
    values: ["growth"],
    createdAt: SEED,
    updatedAt: SEED,
    teachingStyle: "structured",
    areasToTeach: ["Data Engineering"],
    yearsExperience: 5,
    industries: ["Analytics"],
    availability: [],
    supportedBackgrounds: [],
    verificationStatus: "pending",
  },
  {
    userId: "mentor-diya",
    displayName: "Diya Sharma",
    role: "mentor",
    languages: ["English", "Hindi"],
    values: ["growth", "curiosity"],
    createdAt: SEED,
    updatedAt: SEED,
    teachingStyle: "socratic",
    areasToTeach: ["Frontend", "TypeScript", "Career Growth"],
    yearsExperience: 6,
    industries: ["Developer Tools"],
    availability: [
      {
        dayOfWeekUtc: 3,
        startMinuteUtc: 16 * 60,
        endMinuteUtc: 17 * 60,
        authoredZone: "Asia/Kolkata",
      },
    ],
    supportedBackgrounds: ["self-taught", "career-changer"],
    verificationStatus: "approved",
  },
  {
    userId: "mentor-eli",
    displayName: "Eli Goldberg",
    role: "mentor",
    languages: ["English"],
    values: ["rigor", "empathy"],
    createdAt: SEED,
    updatedAt: SEED,
    teachingStyle: "advisory",
    areasToTeach: ["Developer Tools", "Frontend", "System Design"],
    yearsExperience: 10,
    industries: ["Fintech"],
    availability: [
      {
        dayOfWeekUtc: 1,
        startMinuteUtc: 13 * 60,
        endMinuteUtc: 14 * 60,
        authoredZone: "America/New_York",
      },
    ],
    supportedBackgrounds: ["bootcamp", "self-taught"],
    verificationStatus: "approved",
  },
  {
    userId: "mentor-fatima",
    displayName: "Fatima Noor",
    role: "mentor",
    languages: ["English", "Arabic"],
    values: ["growth", "curiosity", "empathy"],
    createdAt: SEED,
    updatedAt: SEED,
    teachingStyle: "hands_on",
    areasToTeach: ["Frontend", "TypeScript", "Developer Tools"],
    yearsExperience: 7,
    industries: ["Edtech"],
    availability: [
      {
        dayOfWeekUtc: 5,
        startMinuteUtc: 15 * 60,
        endMinuteUtc: 16 * 60,
        authoredZone: "Asia/Dubai",
      },
    ],
    supportedBackgrounds: ["career-changer"],
    verificationStatus: "approved",
  },
];

export const MENTEES: MenteeProfile[] = [
  {
    userId: "mentee-sam",
    displayName: "Sam Okafor",
    role: "mentee",
    languages: ["English"],
    values: ["growth", "curiosity"],
    createdAt: SEED,
    updatedAt: SEED,
    subjects: ["TypeScript", "Frontend"],
    careerInterests: ["Developer Tools", "Frontend"],
    background: "Bootcamp grad six months into job-hunting.",
    otherInterests: ["photography"],
    meetingFrequency: "weekly",
    preferredTeachingStyles: ["hands_on", "socratic"],
  },
  {
    userId: "mentee-lina",
    displayName: "Lina Park",
    role: "mentee",
    languages: ["English", "Korean"],
    values: ["rigor", "growth"],
    createdAt: SEED,
    updatedAt: SEED,
    subjects: ["System Design", "Backend"],
    careerInterests: ["Cloud Infrastructure"],
    background: "Backend dev wanting to grow into architecture.",
    otherInterests: ["running"],
    meetingFrequency: "monthly",
    preferredTeachingStyles: ["socratic", "advisory"],
  },
  {
    userId: "mentee-omar",
    displayName: "Omar Haddad",
    role: "mentee",
    languages: ["English", "Arabic"],
    values: ["curiosity"],
    createdAt: SEED,
    updatedAt: SEED,
    subjects: ["Data Engineering"],
    careerInterests: ["Analytics", "Data Engineering"],
    background: "Analyst transitioning into data engineering.",
    otherInterests: ["chess"],
    meetingFrequency: "weekly",
    preferredTeachingStyles: ["structured"],
  },
  {
    userId: "mentee-priya",
    displayName: "Priya Nair",
    role: "mentee",
    languages: ["English", "Hindi"],
    values: ["growth", "empathy"],
    createdAt: SEED,
    updatedAt: SEED,
    subjects: ["Frontend", "TypeScript"],
    careerInterests: ["Developer Tools", "Career Growth"],
    background: "Self-taught dev building a portfolio.",
    otherInterests: ["sketching"],
    meetingFrequency: "weekly",
    preferredTeachingStyles: ["hands_on", "socratic"],
  },
];

// The signed-in user's own profile, one per role. The matching mock scores
// candidates against this when you discover.
export const MENTEE_VIEWER: MenteeProfile = {
  userId: "you-mentee",
  displayName: "You",
  role: "mentee",
  languages: ["English"],
  values: ["growth", "curiosity"],
  createdAt: SEED,
  updatedAt: SEED,
  subjects: ["TypeScript", "System Design"],
  careerInterests: ["Frontend", "Developer Tools"],
  background: "Self-taught dev two years into my first role.",
  otherInterests: ["climbing"],
  meetingFrequency: "weekly",
  preferredTeachingStyles: ["hands_on", "socratic"],
};

export const MENTOR_VIEWER: MentorProfile = {
  userId: "you-mentor",
  displayName: "You",
  role: "mentor",
  languages: ["English"],
  values: ["growth", "empathy"],
  createdAt: SEED,
  updatedAt: SEED,
  teachingStyle: "hands_on",
  areasToTeach: ["Frontend", "TypeScript", "Developer Tools"],
  yearsExperience: 9,
  industries: ["Developer Tools"],
  availability: [
    {
      dayOfWeekUtc: 2,
      startMinuteUtc: 16 * 60,
      endMinuteUtc: 17 * 60,
      authoredZone: "America/New_York",
    },
  ],
  supportedBackgrounds: ["self-taught", "career-changer"],
  verificationStatus: "approved",
};

// Lookup of every profile by id (both viewers + all candidates), for chat
// headers, the connections list, and detail screens.
const ALL: Profile[] = [
  MENTEE_VIEWER,
  MENTOR_VIEWER,
  ...MENTORS,
  ...MENTEES,
];

const BY_ID = new Map<UserId, Profile>(ALL.map((p) => [p.userId, p]));

export function profileById(userId: UserId): Profile | undefined {
  return BY_ID.get(userId);
}

export function nameFor(userId: UserId): string {
  return BY_ID.get(userId)?.displayName ?? userId;
}

// One-line headline for cards and chat headers, derived per role.
export function headlineFor(profile: Profile): string {
  if (profile.role === "mentor") {
    return `${profile.yearsExperience}+ yrs · teaches ${profile.areasToTeach
      .slice(0, 3)
      .join(", ")}`;
  }
  return `Mentee · exploring ${profile.careerInterests.slice(0, 3).join(", ")}`;
}
