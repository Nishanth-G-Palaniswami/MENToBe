import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useDemo } from "../DemoProvider";
import type {
  MeetingFrequency,
  MenteeProfile,
  MentorProfile,
  TeachingStyle,
} from "../../types/profile";

// -----------------------------------------------------------------------------
// Onboarding form — captures the user's profile fields after role selection.
// Mentee and mentor collect different fields; everything entered here shows up
// on the Profile screen and feeds the match scorer.
// -----------------------------------------------------------------------------

const TEACHING_STYLES: TeachingStyle[] = [
  "structured",
  "socratic",
  "hands_on",
  "advisory",
];
const FREQUENCIES: MeetingFrequency[] = ["weekly", "monthly", "ad_hoc"];

const SEED = "2026-06-01T12:00:00.000Z";

function nowIso(): string {
  try {
    return new Date().toISOString();
  } catch {
    return SEED;
  }
}

// Parse a comma-separated input into a clean string list.
function toList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function label(s: string): string {
  return s.replace(/_/g, "-");
}

export function OnboardingScreen() {
  const { session, completeOnboarding } = useDemo();
  const navigate = useNavigate();
  const role = session?.role ?? "mentee";

  // Shared fields
  const [name, setName] = useState("");
  const [languages, setLanguages] = useState("English");
  const [values, setValues] = useState("growth, curiosity");

  // Mentee fields
  const [subjects, setSubjects] = useState("TypeScript, System Design");
  const [careerInterests, setCareerInterests] = useState(
    "Frontend, Developer Tools",
  );
  const [background, setBackground] = useState("");
  const [otherInterests, setOtherInterests] = useState("");
  const [frequency, setFrequency] = useState<MeetingFrequency>("weekly");
  const [prefStyles, setPrefStyles] = useState<TeachingStyle[]>([
    "hands_on",
    "socratic",
  ]);

  // Mentor fields
  const [areasToTeach, setAreasToTeach] = useState(
    "Frontend, TypeScript, Developer Tools",
  );
  const [years, setYears] = useState("5");
  const [teachingStyle, setTeachingStyle] = useState<TeachingStyle>("hands_on");
  const [industries, setIndustries] = useState("Developer Tools");
  const [supported, setSupported] = useState("self-taught, career-changer");

  const [submitting, setSubmitting] = useState(false);

  function togglePref(style: TeachingStyle) {
    setPrefStyles((cur) =>
      cur.includes(style) ? cur.filter((s) => s !== style) : [...cur, style],
    );
  }

  async function submit() {
    setSubmitting(true);
    const displayName = name.trim() || "You";
    const now = nowIso();

    let profile: MenteeProfile | MentorProfile;
    if (role === "mentor") {
      profile = {
        userId: "you-mentor",
        displayName,
        role: "mentor",
        languages: toList(languages),
        values: toList(values),
        createdAt: now,
        updatedAt: now,
        teachingStyle,
        areasToTeach: toList(areasToTeach),
        yearsExperience: Math.max(0, Number(years) || 0),
        industries: toList(industries),
        availability: [],
        supportedBackgrounds: toList(supported),
        verificationStatus: "approved",
      };
    } else {
      profile = {
        userId: "you-mentee",
        displayName,
        role: "mentee",
        languages: toList(languages),
        values: toList(values),
        createdAt: now,
        updatedAt: now,
        subjects: toList(subjects),
        careerInterests: toList(careerInterests),
        background: background.trim() || "New to mentorship.",
        otherInterests: toList(otherInterests),
        meetingFrequency: frequency,
        preferredTeachingStyles: prefStyles,
      };
    }

    await completeOnboarding(profile);
    navigate("/discover");
  }

  return (
    <div className="mx-auto max-w-md px-5 pb-12 pt-8">
      <h1 className="text-2xl font-semibold text-slate-900">
        Set up your {role} profile
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Tell us about yourself — this powers your matches and shows on your
        profile.
      </p>

      <Card className="mt-6 space-y-5">
        <Field label="Display name">
          <TextInput value={name} onChange={setName} placeholder="Your name" />
        </Field>

        {role === "mentor" ? (
          <>
            <Field
              label="Fields you teach"
              hint="Comma-separated, e.g. Frontend, TypeScript"
            >
              <TextInput value={areasToTeach} onChange={setAreasToTeach} />
            </Field>

            <Field label="Years of experience">
              <input
                type="number"
                min={0}
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </Field>

            <Field label="Teaching style">
              <ChipSelect
                options={TEACHING_STYLES}
                selected={[teachingStyle]}
                onToggle={(s) => setTeachingStyle(s)}
              />
            </Field>

            <Field label="Industries" hint="Comma-separated">
              <TextInput value={industries} onChange={setIndustries} />
            </Field>

            <Field label="Backgrounds you support" hint="Comma-separated">
              <TextInput value={supported} onChange={setSupported} />
            </Field>
          </>
        ) : (
          <>
            <Field
              label="Fields you want to learn"
              hint="Comma-separated, e.g. TypeScript, System Design"
            >
              <TextInput value={subjects} onChange={setSubjects} />
            </Field>

            <Field label="Career interests" hint="Comma-separated">
              <TextInput value={careerInterests} onChange={setCareerInterests} />
            </Field>

            <Field label="Your background">
              <textarea
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                rows={3}
                placeholder="A sentence or two about where you are now."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </Field>

            <Field label="Other interests" hint="Comma-separated (optional)">
              <TextInput value={otherInterests} onChange={setOtherInterests} />
            </Field>

            <Field label="Preferred teaching styles">
              <ChipSelect
                options={TEACHING_STYLES}
                selected={prefStyles}
                onToggle={togglePref}
              />
            </Field>

            <Field label="Meeting frequency">
              <ChipSelect
                options={FREQUENCIES}
                selected={[frequency]}
                onToggle={(f) => setFrequency(f)}
              />
            </Field>
          </>
        )}

        <Field label="Languages" hint="Comma-separated">
          <TextInput value={languages} onChange={setLanguages} />
        </Field>

        <Field label="Values" hint="Comma-separated, e.g. growth, empathy">
          <TextInput value={values} onChange={setValues} />
        </Field>
      </Card>

      <Button
        className="mt-6 w-full"
        size="lg"
        disabled={submitting}
        onClick={submit}
      >
        {submitting ? "Setting up…" : "Continue to Discover"}
      </Button>
    </div>
  );
}

function Field({
  label: l,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{l}</label>
      {hint ? <p className="mb-1 text-xs text-slate-400">{hint}</p> : null}
      <div className={hint ? "" : "mt-1"}>{children}</div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-300"
    />
  );
}

// Generic chip multi/single selector for the fixed enums.
function ChipSelect<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: T[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`rounded-full border px-3 py-1.5 text-sm capitalize transition-colors ${
              on
                ? "border-primary bg-primary text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-primary/50"
            }`}
          >
            {label(opt)}
          </button>
        );
      })}
    </div>
  );
}
