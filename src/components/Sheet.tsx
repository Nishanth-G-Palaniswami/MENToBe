import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Sheet({ open, onClose, children, title }: SheetProps) {
  // Lock body scroll while the sheet is open. Focus trapping is intentionally
  // out of scope for the MVP primitive — screens that need it can layer it on.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const containerClasses = [
    "fixed inset-0 z-50",
    open ? "pointer-events-auto" : "pointer-events-none",
  ].join(" ");

  const overlayClasses = [
    "absolute inset-0 bg-slate-900/50 transition-opacity duration-200",
    open ? "opacity-100" : "opacity-0",
  ].join(" ");

  const panelClasses = [
    "absolute inset-x-0 bottom-0 rounded-t-2xl bg-white shadow-lg p-4",
    "transform transition-transform duration-200 ease-out",
    open ? "translate-y-0" : "translate-y-full",
  ].join(" ");

  return (
    <div aria-hidden={!open} className={containerClasses}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className={overlayClasses}
      />
      <div role="dialog" aria-modal="true" aria-label={title} className={panelClasses}>
        <div className="flex items-center justify-between mb-3">
          {title ? (
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
