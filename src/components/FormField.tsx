import type { ReactNode } from "react";

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  required,
}: FormFieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-slate-700"
      >
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {hint && !error ? (
        <p id={hintId} className="text-slate-500 text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-red-600 text-sm"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
