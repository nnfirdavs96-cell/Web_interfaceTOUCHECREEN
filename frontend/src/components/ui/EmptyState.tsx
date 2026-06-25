import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Atlantic.vc — dashed-border placeholder for empty collections.
 * Mono uppercase micro-copy, optional icon and CTA.
 */
export function EmptyState({
  icon,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-cards border border-dashed border-ice-white/14 bg-carbon " +
          "px-6 py-16 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex justify-center text-ice-white/30" aria-hidden>
          {icon}
        </div>
      )}
      <div>{children}</div>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
