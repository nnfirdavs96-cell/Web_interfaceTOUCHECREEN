import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Atlantic: transparent surface, 1px ice-white hairline, electric-cobalt focus.
const baseField =
  "w-full rounded-inputs border border-ice-white/15 bg-carbon/40 px-3 py-2 text-body-sm " +
  "text-ice-white outline-none transition-all duration-150 " +
  "placeholder:text-fog-text placeholder:font-mono placeholder:text-[12px] " +
  "hover:border-ice-white/30 " +
  "focus:border-electric-cobalt focus:bg-carbon " +
  "disabled:opacity-40 disabled:cursor-not-allowed";

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
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-ice-white/70">
          {label} {required && <span className="text-signal-orange">*</span>}
        </label>
      )}
      {children}
      {hint && <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fog-text">{hint}</div>}
    </div>
  );
}
