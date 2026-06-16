import { useNavigate } from "react-router-dom";

import { Avatar } from "../../components/Avatar";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Tag } from "../../components/Tag";
import { useDemo } from "../DemoProvider";
import type { MenteeProfile, MentorProfile } from "../../types/profile";

// The signed-in user's profile (everything captured at onboarding), plan tier,
// and account actions.
export function ProfileScreen() {
  const { viewer, session, matches, cap, upgrade, signOut } = useDemo();
  const navigate = useNavigate();

  if (!viewer || !session) return null;

  const premium = session.tier !== "free";

  function out() {
    signOut();
    navigate("/auth");
  }

  return (
    <div className="mx-auto max-w-md px-5 pb-24 pt-6">
      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={viewer.displayName} size="lg" />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {viewer.displayName}
            </h1>
            <p className="text-sm text-slate-500">{session.email}</p>
            <Badge className="mt-1" tone="neutral">
              {viewer.role === "mentor" ? "Mentor" : "Mentee"}
            </Badge>
          </div>
        </div>

        {viewer.role === "mentor"
          ? <MentorFields p={viewer as MentorProfile} />
          : <MenteeFields p={viewer as MenteeProfile} />}

        <TagSection label="Languages" items={viewer.languages} />
        <TagSection label="Values" items={viewer.values} />
      </Card>

      {/* Plan */}
      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              {premium ? "Premium plan" : "Free plan"}
            </h2>
            <p className="text-sm text-slate-500">
              {premium
                ? "Unlimited connections"
                : `${matches.length} / ${cap} connections used`}
            </p>
          </div>
          {premium ? (
            <Badge tone="success">Active</Badge>
          ) : (
            <Button size="sm" onClick={upgrade}>
              Upgrade
            </Button>
          )}
        </div>
      </Card>

      <Button variant="ghost" className="mt-6 w-full" onClick={out}>
        Sign out
      </Button>
    </div>
  );
}

function MentorFields({ p }: { p: MentorProfile }) {
  return (
    <>
      <p className="mt-4 text-sm text-slate-600">
        {p.yearsExperience}+ years of experience ·{" "}
        {p.teachingStyle.replace(/_/g, "-")} teaching style
      </p>
      <TagSection label="Teaches" items={p.areasToTeach} />
      <TagSection label="Industries" items={p.industries} />
      <TagSection label="Supports backgrounds" items={p.supportedBackgrounds} />
    </>
  );
}

function MenteeFields({ p }: { p: MenteeProfile }) {
  return (
    <>
      {p.background ? (
        <p className="mt-4 text-sm text-slate-600">{p.background}</p>
      ) : null}
      <InfoRow label="Meeting frequency" value={p.meetingFrequency} />
      <TagSection label="Learning" items={p.subjects} />
      <TagSection label="Career interests" items={p.careerInterests} />
      <TagSection label="Other interests" items={p.otherInterests} />
      <TagSection
        label="Preferred styles"
        items={p.preferredTeachingStyles.map((s) => s.replace(/_/g, "-"))}
      />
    </>
  );
}

function TagSection({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </h3>
      <p className="mt-0.5 text-sm capitalize text-slate-700">
        {value.replace(/_/g, "-")}
      </p>
    </div>
  );
}
