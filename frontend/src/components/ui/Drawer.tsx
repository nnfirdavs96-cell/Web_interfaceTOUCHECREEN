import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg";
}

export function Drawer({ open, onClose, title, children, footer, width = "md" }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const widths = { sm: "w-[380px]", md: "w-[460px]", lg: "w-[620px]" };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-void-black/70 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full flex-col border-l border-ice-white/14 bg-carbon transition-transform duration-300 ease-out",
          widths[width],
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-ice-white/14 px-6">
          <h2 className="text-heading-sm tracking-tight text-ice-white">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-inputs p-1.5 text-ice-white/60 transition-colors hover:bg-ice-white/5 hover:text-ice-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-ice-white/14 bg-slate/30 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
