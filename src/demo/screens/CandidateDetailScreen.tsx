import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Avatar } from "../../components/Avatar";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { MatchBadge } from "../../components/MatchBadge";
import { Tag } from "../../components/Tag";
import { useDemo } from "../DemoProvider";
import { profileById } from "../data";
import type { MentorProfile, MenteeProfile } from "../../types/profile";

// Full-profile detail for a candidate in the Discover queue. Read-only; the
// Connect action here mirrors Discover.
export function CandidateDetailScreen() {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const { viewer, connect, matching } = useDemo();

  const profile = profileById(userId);
  if (!profile || !viewer) {
    return (
      <div className="mx-auto max-w-md px-5 py-10">
        <p className="text-sm text-slate-500">Profile not found.</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  const score = matching.scoreMatch(viewer, profile).value;

  async function onConnect() {
    if (!profile) return;
    await connect({
      userId: profile.userId,
      role: profile.role,
      displayName: profile.displayName,
      matchScore: matching.scoreMatch(viewer!, profile),
      summary: "",
      tags: [],
      verified:
        profile.role === "mentor" &&
        profile.verificationStatus === "approved",
    });
    navigate("/matches");
  }

  return (
    <div className="mx-auto max-w-md px-5 pb-24 pt-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={profile.displayName} size="lg" />
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-slate-900">
              {profile.displayName}
            </h1>
            <p className="text-sm capitalize text-slate-500">{profile.role}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <MatchBadge score={score} />
            {profile.role === "mentor" &&
            profile.verificationStatus === "approved" ? (
              <Badge tone="success">Verified</Badge>
            ) : null}
          </div>
        </div>

        {profile.role === "mentor"
          ? renderMentor(profile)
          : renderMentee(profile)}

        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Languages
          </h3>
          <div className="mt-1 flex flex-wrap gap-2">
            {profile.languages.map((l) => (
              <Tag key={l}>{l}</Tag>
            ))}
          </div>
        </div>

        {profile.values.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Values
            </h3>
            <div className="mt-1 flex flex-wrap gap-2">
              {profile.values.map((v) => (
                <Tag key={v}>{v}</Tag>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      <Button className="mt-6 w-full" size="lg" onClick={onConnect}>
        ♥ Connect with {profile.displayName.split(" ")[0]}
      </Button>
    </div>
  );
}

function Section({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </h3>
      <div className="mt-1 flex flex-wrap gap-2">
        {items.map((i) => (
          <Tag key={i}>{i}</Tag>
        ))}
      </div>
    </div>
  );
}

function renderMentor(p: MentorProfile) {
  return (
    <>
      <p className="mt-4 text-sm text-slate-600">
        {p.yearsExperience}+ years of experience · {p.teachingStyle.replace("_", "-")} teaching style
      </p>
      <Section label="Teaches" items={p.areasToTeach} />
      <Section label="Industries" items={p.industries} />
      <Section label="Supports backgrounds" items={p.supportedBackgrounds} />
    </>
  );
}

function renderMentee(p: MenteeProfile) {
  return (
    <>
      <p className="mt-4 text-sm text-slate-600">{p.background}</p>
      <Section label="Subjects" items={p.subjects} />
      <Section label="Career interests" items={p.careerInterests} />
      <Section
        label="Preferred styles"
        items={p.preferredTeachingStyles.map((s) => s.replace("_", "-"))}
      />
    </>
  );
}
