import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
}

/**
 * Calendly-style:
 * - Primary: filled signal-blue, 4px radius, blue-tinted shadow
 * - Secondary: white surface + 1px mist-border, navy text
 * - Ghost: transparent + navy text (inline nav action)
 * - Все радиусы 4px, padding 8px 24px
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className, ...rest },
  ref,
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-buttons font-semibold " +
    "transition-all duration-150 active:scale-[0.98] " +
    "disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-6 text-sm",
  };
  const variants = {
    primary:
      "bg-signal text-white shadow-button hover:bg-signal-dark " +
      "focus-visible:ring-signal/40",
    secondary:
      "border border-mist-border bg-paper text-navy " +
      "hover:border-steel hover:bg-fog " +
      "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 " +
      "dark:hover:border-slate-600 dark:hover:bg-slate-700",
    danger:
      "bg-red-600 text-white shadow-button hover:bg-red-700 " +
      "focus-visible:ring-red-500/40",
    ghost:
      "text-navy hover:bg-fog hover:text-navy-dark " +
      "dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
  };
  return (
    <button
      ref={ref}
      className={cn(base, sizes[size], variants[variant], className)}
      {...rest}
    />
  );
});
