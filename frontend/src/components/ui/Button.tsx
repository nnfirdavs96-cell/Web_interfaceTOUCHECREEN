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
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm" };
  const variants = {
    primary: "bg-brand text-white hover:bg-brand-dark",
    secondary:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost:
      "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  };
  return <button ref={ref} className={cn(base, sizes[size], variants[variant], className)} {...rest} />;
});
