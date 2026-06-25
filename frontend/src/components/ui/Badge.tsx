import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "success" | "neutral" | "accent" | "warning" | "danger";

/**
 * Atlantic.vc — square micro-pill. Mono uppercase tracking, hairline border,
 * tone-tinted fill at low opacity. Matches the inline status pills used across
 * the device grid, attendance and reports pages.
 */
const tones: Record<BadgeTone, string> = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  neutral: "border-ice-white/20 bg-slate/40 text-fog-text",
  accent: "border-electric-cobalt/40 bg-electric-cobalt/10 text-electric-cobalt",
  warning: "border-signal-orange/40 bg-signal-orange/10 text-signal-orange",
  danger: "border-signal-orange/50 bg-signal-orange/15 text-signal-orange",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 " +
          "font-mono text-[10px] uppercase tracking-[0.12em]",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
