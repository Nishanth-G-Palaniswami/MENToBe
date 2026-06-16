import type {
  MenteeProfile,
  MentorProfile,
  Profile,
} from "../../types/profile";
import type { MatchScore } from "../../types/matching";

// -----------------------------------------------------------------------------
// scoreMatch
// -----------------------------------------------------------------------------
// Pure scoring function for the AI matching algorithm. Given a viewer Profile
// and a candidate Profile, return an integer 0..100 match score plus the
// per-axis components used to compose it.
//
// The five components are weighted according to the design's matching pillars:
//
//   skills          40%   — strongest signal: does the mentor teach what the
//                            mentee wants to learn?
//   teachingStyle   15%   — does the mentor's style match the mentee's
//                            preferred styles?
//   availability    15%   — does the mentor have any usable availability?
//   languages       15%   — overlap in spoken languages (Jaccard similarity).
//   values          15%   — overlap in personal values (Jaccard similarity).
//
// Final value:
//   value = round(0.40*skills + 0.15*teachingStyle + 0.15*availability
//                 + 0.15*languages + 0.15*values)
//   value is clamped to [0, 100] defensively.
//
// Same-role fallback
// ------------------
// The MVP does not match mentees with other mentees or mentors with other
// mentors, but the queue may temporarily surface same-role profiles (e.g.
// during seed/dev). Rather than returning a single sentinel value we fall
// back per-axis so the score still ranks reasonably:
//   skills        → 0   (no mentor/mentee axis to compare)
//   teachingStyle → 0   (no preferred-styles vs taught-style axis)
//   availability  → 50  (neutral; neither side is offering time)
//   languages     → Jaccard (still meaningful)
//   values        → Jaccard (still meaningful)
// -----------------------------------------------------------------------------

const W_SKILLS = 0.4;
const W_TEACHING_STYLE = 0.15;
const W_AVAILABILITY = 0.15;
const W_LANGUAGES = 0.15;
const W_VALUES = 0.15;

const AVAILABILITY_FULL = 100;
const AVAILABILITY_NO_WINDOWS = 30; // mentor has no windows yet
const AVAILABILITY_SAME_ROLE = 50; // neutral fallback

export function scoreMatch(
  viewer: Profile,
  candidate: Profile,
): MatchScore {
  const sameRole = viewer.role === candidate.role;

  const skills = sameRole ? 0 : computeSkills(viewer, candidate);
  const teachingStyle = sameRole
    ? 0
    : computeTeachingStyle(viewer, candidate);
  const availability = sameRole
    ? AVAILABILITY_SAME_ROLE
    : computeAvailability(viewer, candidate);
  const languages = jaccardScore(viewer.languages, candidate.languages);
  const values = jaccardScore(viewer.values, candidate.values);

  const weighted =
    W_SKILLS * skills +
    W_TEACHING_STYLE * teachingStyle +
    W_AVAILABILITY * availability +
    W_LANGUAGES * languages +
    W_VALUES * values;

  const value = clamp01_100(Math.round(weighted));

  return {
    value,
    components: {
      skills,
      teachingStyle,
      availability,
      languages,
      values,
    },
  };
}

// -----------------------------------------------------------------------------
// Skills
// -----------------------------------------------------------------------------
// Cross-role only. Compare the mentee's `careerInterests` + `subjects`
// (merged) against the mentor's `areasToTeach` + `industries` (merged) using
// Jaccard similarity scaled to 0..100. If the viewer is a mentor and the
// candidate is a mentee the inputs are swapped so the comparison is always
// (menteeWants, mentorTeaches).
function computeSkills(viewer: Profile, candidate: Profile): number {
  const pair = asMenteeMentor(viewer, candidate);
  if (pair === null) return 0;
  const { mentee, mentor } = pair;
  const menteeWants = [...mentee.careerInterests, ...mentee.subjects];
  const mentorTeaches = [...mentor.areasToTeach, ...mentor.industries];
  return jaccardScore(menteeWants, mentorTeaches);
}

// -----------------------------------------------------------------------------
// Teaching style
// -----------------------------------------------------------------------------
// Cross-role only. Score 100 if the mentee's `preferredTeachingStyles`
// includes the mentor's `teachingStyle`, otherwise 0. This is intentionally
// binary — the design treats teaching-style as a hard preference rather than
// a similarity gradient.
function computeTeachingStyle(
  viewer: Profile,
  candidate: Profile,
): number {
  const pair = asMenteeMentor(viewer, candidate);
  if (pair === null) return 0;
  const { mentee, mentor } = pair;
  return mentee.preferredTeachingStyles.includes(mentor.teachingStyle)
    ? 100
    : 0;
}

// -----------------------------------------------------------------------------
// Availability
// -----------------------------------------------------------------------------
// If either side is a mentor with no `AvailabilityWindow` entries yet, return
// 30 — non-zero so the mentee can still discover and message them, but low
// enough to rank below mentors who have set up their calendar. Otherwise
// return 100. (The mentee profile has no `availability` field by design;
// scheduling pulls from the mentor side.)
function computeAvailability(
  viewer: Profile,
  candidate: Profile,
): number {
  if (viewer.role === "mentor" && viewer.availability.length === 0) {
    return AVAILABILITY_NO_WINDOWS;
  }
  if (candidate.role === "mentor" && candidate.availability.length === 0) {
    return AVAILABILITY_NO_WINDOWS;
  }
  return AVAILABILITY_FULL;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

// Jaccard similarity of two string lists, scaled to an integer 0..100.
// Returns 0 when both inputs are empty (union size 0) to avoid NaN.
function jaccardScore(a: readonly string[], b: readonly string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;
  return Math.round((intersection / union) * 100);
}

// Narrow a Profile pair to (mentee, mentor) regardless of which side is the
// viewer. Returns null for same-role pairs (callers should already have
// short-circuited via the same-role fallback before calling helpers that use
// this).
function asMenteeMentor(
  viewer: Profile,
  candidate: Profile,
): { mentee: MenteeProfile; mentor: MentorProfile } | null {
  if (viewer.role === "mentee" && candidate.role === "mentor") {
    return { mentee: viewer, mentor: candidate };
  }
  if (viewer.role === "mentor" && candidate.role === "mentee") {
    return { mentee: candidate, mentor: viewer };
  }
  return null;
}

function clamp01_100(n: number): number {
  return Math.max(0, Math.min(100, n));
}
