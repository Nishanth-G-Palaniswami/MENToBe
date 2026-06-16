import { z } from "zod";

// Validation schemas for profile onboarding, availability, and message
// bodies. These mirror the rules in design.md "Validation rules" and feed
// `react-hook-form` resolvers as well as service-layer guards. Keep enum
// values in lockstep with the unions in `src/types/profile.ts` and the
// availability range bounds in `src/types/availability.ts`.

const TeachingStyleEnum = z.enum([
  "structured",
  "socratic",
  "hands_on",
  "advisory",
]);

const MeetingFrequencyEnum = z.enum(["weekly", "monthly", "ad_hoc"]);

// Repeating weekly window normalized to UTC (Sunday = 0). The same-day
// invariant is enforced by `endMinuteUtc > startMinuteUtc`. End is exclusive
// and therefore allowed to reach 1440 (end of UTC day); start is inclusive
// and capped at 1439.
export const AvailabilityWindowSchema = z
  .object({
    dayOfWeekUtc: z.number().int().min(0).max(6),
    startMinuteUtc: z.number().int().min(0).max(1439),
    endMinuteUtc: z.number().int().min(1).max(1440),
    authoredZone: z.string().min(1),
  })
  .refine((w) => w.endMinuteUtc > w.startMinuteUtc, {
    message: "endMinuteUtc must be greater than startMinuteUtc",
    path: ["endMinuteUtc"],
  });

export type AvailabilityWindowInput = z.infer<typeof AvailabilityWindowSchema>;

// Mentee onboarding payload. `subjects`, `careerInterests`, `background`,
// and `languages` are required and non-empty (Req. 2.2). Optional list
// fields default to `[]` so callers can submit partial drafts without
// littering `undefined` checks downstream.
export const MenteeOnboardingSchema = z.object({
  subjects: z.array(z.string().min(1)).min(1),
  careerInterests: z.array(z.string().min(1)).min(1),
  background: z.string().min(1),
  otherInterests: z.array(z.string().min(1)).default([]),
  meetingFrequency: MeetingFrequencyEnum,
  preferredTeachingStyles: z.array(TeachingStyleEnum).default([]),
  languages: z.array(z.string().min(1)).min(1),
  values: z.array(z.string().min(1)).default([]),
});

export type MenteeOnboardingInput = z.infer<typeof MenteeOnboardingSchema>;

// Mentor onboarding payload. `teachingStyle`, `areasToTeach`,
// `yearsExperience >= 0`, and `languages` are required (Req. 3.2). Each
// availability window is validated by `AvailabilityWindowSchema`.
export const MentorOnboardingSchema = z.object({
  teachingStyle: TeachingStyleEnum,
  areasToTeach: z.array(z.string().min(1)).min(1),
  yearsExperience: z.number().int().min(0),
  industries: z.array(z.string().min(1)).default([]),
  availability: z.array(AvailabilityWindowSchema).default([]),
  supportedBackgrounds: z.array(z.string().min(1)).default([]),
  languages: z.array(z.string().min(1)).min(1),
  values: z.array(z.string().min(1)).default([]),
});

export type MentorOnboardingInput = z.infer<typeof MentorOnboardingSchema>;

// Outbound chat message body. Trim before length checks so a string of
// only whitespace is rejected, and cap at 4000 characters to match the
// implementation invariant in design.md.
export const MessageBodySchema = z.string().trim().min(1).max(4000);

export type MessageBodyInput = z.infer<typeof MessageBodySchema>;
