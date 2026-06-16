import type { ReactNode } from "react";
import { X } from "lucide-react";

export interface TagProps {
  children: ReactNode;
  onRemove?: () => void;
}

export function Tag({ children, onRemove }: TagProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
      {onRemove ? (
        <button
          type="button"
          aria-label="Remove tag"
          onClick={onRemove}
          className="rounded-full p-0.5 text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}
