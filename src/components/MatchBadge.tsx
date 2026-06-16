// MatchBadge renders the AI-computed match percentage as a rounded pill.
// The color ramp encodes match strength so the user can scan the queue at a
// glance: emerald = great, primary = strong, primary-300 = decent,
// slate = weak. Gesture handling does not live here; this is presentational.

export interface MatchBadgeProps {
  score: number;
  className?: string;
}

function rampClass(score: number): string {
  if (score >= 85) return "bg-emerald-500 text-white";
  if (score >= 70) return "bg-primary text-white";
  if (score >= 50) return "bg-primary-300 text-primary-900";
  return "bg-slate-200 text-slate-700";
}

export function MatchBadge({ score, className }: MatchBadgeProps) {
  const classes = [
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
    rampClass(score),
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-label={"Match score " + score + " percent"}>
      {score}%
    </span>
  );
}
