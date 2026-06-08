import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const baseField =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm " +
  "shadow-soft outline-none transition-all duration-150 " +
  "placeholder:text-slate-400 " +
  "hover:border-slate-300 " +
  "focus:border-brand focus:ring-2 focus:ring-brand/20 focus:shadow-none " +
  "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed " +
  "dark:border-slate-700 dark:bg-slate-800 dark:placeholder:text-slate-500 " +
  "dark:hover:border-slate-600 dark:disabled:bg-slate-900";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(baseField, className)} {...rest} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea ref={ref} className={cn(baseField, "min-h-[88px] resize-y", className)} {...rest} />
    );
  },
);

export function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}
