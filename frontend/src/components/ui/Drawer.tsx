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
          "fixed inset-0 z-40 bg-navy/30 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full flex-col border-l border-mist-border bg-paper shadow-elevated transition-transform duration-300 ease-out dark:border-slate-800 dark:bg-slate-900",
          widths[width],
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-mist-border px-6 dark:border-slate-800">
          <h2 className="text-body font-bold tracking-tight text-navy dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-inputs p-1.5 text-slate2 transition-colors hover:bg-fog hover:text-navy dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-mist-border bg-mist px-6 py-4 dark:border-slate-800 dark:bg-slate-800/30">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
