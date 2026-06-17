import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
}

/**
 * Atlantic.vc — outlined-not-filled CTAs. No solid filled buttons.
 * Primary  : transparent + 1px signal-orange border, orange label
 * Secondary: transparent + 1px ice-white border, ice-white label
 * Ghost    : transparent, ice-white label (inline)
 * Danger   : transparent + 1px signal-orange border (orange itself = warning hue)
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className, ...rest },
  ref,
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-buttons font-mono uppercase " +
    "tracking-[0.12em] transition-all duration-150 " +
    "border bg-transparent " +
    "active:scale-[0.98] " +
    "disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100";
  const sizes = {
    sm: "h-8 px-3 text-[10px]",
    md: "h-10 px-6 text-[12px]",
  };
  const variants = {
    primary:
      "border-signal-orange text-signal-orange hover:bg-signal-orange/10",
    secondary:
      "border-ice-white/30 text-ice-white hover:border-ice-white/60 hover:bg-ice-white/5",
    danger:
      "border-signal-orange text-signal-orange hover:bg-signal-orange/15",
    ghost:
      "border-transparent text-ice-white hover:bg-ice-white/5",
  };
  return (
    <button
      ref={ref}
      className={cn(base, sizes[size], variants[variant], className)}
      {...rest}
    />
  );
});
