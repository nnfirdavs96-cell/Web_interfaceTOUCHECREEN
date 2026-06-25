import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Atlantic.vc — inline loading state. Spinner respects prefers-reduced-motion
 * via the global media query in index.css. Default copy is RU per product locale.
 */
export function Loading({
  label = "Загрузка…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2 py-10 " +
          "font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text",
        className,
      )}
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} aria-hidden />
      {label}
    </div>
  );
}
