export interface StepperProps {
  current: number; // 0-indexed
  total: number;
  labels?: string[];
}

function segmentClass(index: number, current: number): string {
  if (index < current) return "bg-primary-300";
  if (index === current) return "bg-primary";
  return "bg-slate-200";
}

export function Stepper({ current, total, labels }: StepperProps) {
  if (total <= 0) return null;

  const safeCurrent = Math.max(0, Math.min(current, total - 1));
  const activeLabel = labels?.[safeCurrent];

  return (
    <div
      role="progressbar"
      aria-label="Onboarding progress"
      aria-valuenow={safeCurrent + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={[
              "h-1.5 flex-1 rounded-full transition-colors",
              segmentClass(index, safeCurrent),
            ].join(" ")}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Step {safeCurrent + 1} of {total}
        {activeLabel ? ` · ${activeLabel}` : ""}
      </p>
    </div>
  );
}
