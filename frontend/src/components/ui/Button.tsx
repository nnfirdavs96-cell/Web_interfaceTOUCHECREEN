import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className, ...rest },
  ref,
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium " +
    "transition-all duration-150 active:scale-[0.98] " +
    "disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
  };
  const variants = {
    primary:
      "bg-brand text-white shadow-soft hover:bg-brand-dark hover:shadow-card " +
      "focus-visible:ring-brand/40",
    secondary:
      "border border-slate-200 bg-white text-slate-700 shadow-soft " +
      "hover:border-slate-300 hover:bg-slate-50 hover:shadow-card " +
      "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 " +
      "dark:hover:border-slate-600 dark:hover:bg-slate-700",
    danger:
      "bg-red-600 text-white shadow-soft hover:bg-red-700 hover:shadow-card " +
      "focus-visible:ring-red-500/40",
    ghost:
      "text-slate-600 hover:bg-slate-100 hover:text-slate-900 " +
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
