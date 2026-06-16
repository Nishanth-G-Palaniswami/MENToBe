import type { ReactNode } from "react";

type BadgeTone = "primary" | "accent" | "neutral" | "success";

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  primary: "bg-primary-100 text-primary-700",
  accent: "bg-accent-100 text-accent-700",
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  const classes = [
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
    toneClasses[tone],
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}
