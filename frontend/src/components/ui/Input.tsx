import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const baseField =
  "w-full rounded-inputs border border-mist-border bg-paper px-3 py-2 text-body-sm " +
  "outline-none transition-all duration-150 " +
  "placeholder:text-steel " +
  "hover:border-steel " +
  "focus:border-signal focus:ring-2 focus:ring-signal/20 " +
  "disabled:bg-fog disabled:text-steel disabled:cursor-not-allowed " +
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
        <label className="mb-1.5 block text-caption font-medium text-navy dark:text-slate-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && <div className="mt-1 text-micro text-slate2 dark:text-slate-400">{hint}</div>}
    </div>
  );
}
