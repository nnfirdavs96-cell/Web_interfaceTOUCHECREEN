import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Adds the ice-white border hover affordance (non-clickable cards). */
  hoverable?: boolean;
  /** Premium cobalt halo + lift on hover (see .glow-card in index.css). */
  glow?: boolean;
}

/**
 * Atlantic.vc — stepped carbon surface card. Depth comes from the surface +
 * hairline border, never shadow. When `onClick` is supplied the card becomes
 * keyboard/pointer interactive (cursor-pointer + hover border).
 */
export const Card = forwardRef<HTMLDivElement, Props>(function Card(
  { hoverable, glow, className, onClick, ...rest },
  ref,
) {
  const interactive = Boolean(onClick);
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        "rounded-cards border border-ice-white/14 bg-carbon p-6",
        glow && "glow-card",
        !glow && (hoverable || interactive) && "transition-colors hover:border-ice-white/30",
        interactive && "cursor-pointer",
        className,
      )}
      {...rest}
    />
  );
});
