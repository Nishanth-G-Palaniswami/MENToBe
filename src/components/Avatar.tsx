type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last =
    parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  const initials = (first + last).toUpperCase();
  return initials.length > 0 ? initials : "?";
}

export function Avatar({ name, src, size = "md" }: AvatarProps) {
  const baseClasses =
    "inline-flex items-center justify-center rounded-full overflow-hidden font-semibold select-none";
  const dimensions = sizeClasses[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={[baseClasses, dimensions, "object-cover"].join(" ")}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={[baseClasses, dimensions, "bg-primary-100 text-primary-700"].join(
        " ",
      )}
    >
      {getInitials(name)}
    </span>
  );
}
