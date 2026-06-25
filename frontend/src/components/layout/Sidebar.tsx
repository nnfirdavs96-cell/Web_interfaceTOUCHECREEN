import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Calendar,
  ChevronDown,
  ClipboardList,
  Cpu,
  FileBarChart,
  LayoutDashboard,
  MapPin,
  Network,
  Settings,
  Shield,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

type LucideIcon = typeof LayoutDashboard;

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
}

interface NavSection {
  id: string;
  heading: string;        // Mono uppercase label
  items: NavItem[];
}

/**
 * Sidebar nav grouped into editorial sections.
 * The first group has no heading (dashboard sits at the top alone).
 * Section state persists in localStorage under `ant-sidebar-<id>`.
 */
const SECTIONS: NavSection[] = [
  {
    id: "overview",
    heading: "/ обзор",
    items: [
      { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
    ],
  },
  {
    id: "structure",
    heading: "/ структура",
    items: [
      { to: "/organizations", labelKey: "nav.organizations", icon: Building2 },
      { to: "/departments", labelKey: "nav.departments", icon: Network },
      { to: "/branches", labelKey: "nav.branches", icon: MapPin },
    ],
  },
  {
    id: "access",
    heading: "/ доступ",
    items: [
      { to: "/devices", labelKey: "nav.devices", icon: Cpu },
      { to: "/employees", labelKey: "nav.employees", icon: Users },
      { to: "/schedules", labelKey: "nav.schedules", icon: Calendar },
    ],
  },
  {
    id: "activity",
    heading: "/ активность",
    items: [
      { to: "/attendance", labelKey: "nav.attendance", icon: ClipboardList },
      { to: "/reports", labelKey: "nav.reports", icon: FileBarChart },
      { to: "/integrations", labelKey: "nav.integrations", icon: Network },
    ],
  },
  {
    id: "admin",
    heading: "/ администрирование",
    items: [
      { to: "/users", labelKey: "nav.users", icon: UserCog },
      { to: "/audit", labelKey: "nav.audit", icon: Shield },
      { to: "/settings", labelKey: "nav.settings", icon: Settings },
    ],
  },
];

function loadCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem("ant-sidebar-sections") ?? "{}");
  } catch {
    return {};
  }
}

export function Sidebar({ open, onClose }: Props) {
  const { t } = useTranslation();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(loadCollapsed);

  // Auto-expand the section containing the active route
  useEffect(() => {
    const active = SECTIONS.find((s) =>
      s.items.some((i) => i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)),
    );
    if (active && collapsed[active.id]) {
      setCollapsed((prev) => ({ ...prev, [active.id]: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem("ant-sidebar-sections", JSON.stringify(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  const toggle = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-full w-64 shrink-0 flex-col border-r border-ice-white/14 bg-void-black/95 backdrop-blur-xl transition-transform duration-300 ease-out",
        "md:relative md:z-10 md:translate-x-0 md:bg-void-black/80",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      {/* Brand mark */}
      <div className="flex h-[72px] items-center gap-3 border-b border-ice-white/14 px-5">
        <div className="relative flex h-9 w-9 items-center justify-center border border-ice-white/40">
          <div className="absolute h-2 w-2 bg-electric-cobalt shadow-[0_0_10px_rgba(31,88,242,0.9)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-body-sm tracking-[-0.01em] text-ice-white">
            {t("app.title")}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
            v0.7 — dev
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-inputs p-1.5 text-ice-white/60 transition-colors hover:bg-ice-white/5 hover:text-ice-white md:hidden"
          aria-label="Закрыть меню"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {SECTIONS.map((section, sIdx) => {
          const isCollapsed = collapsed[section.id] ?? false;
          return (
            <div key={section.id} className={cn(sIdx > 0 && "mt-5")}>
              <button
                onClick={() => toggle(section.id)}
                className="group flex w-full items-center justify-between px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text transition-colors hover:text-electric-cobalt"
                aria-expanded={!isCollapsed}
              >
                <span>{section.heading}</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    isCollapsed && "-rotate-90",
                  )}
                  strokeWidth={2}
                />
              </button>

              {!isCollapsed && (
                <ul className="mt-1 space-y-0.5 animate-fade-in">
                  {section.items.map((item, i) => (
                    <li
                      key={item.to}
                      className="opacity-0 animate-slide-right [animation-fill-mode:forwards]"
                      style={{ animationDelay: `${i * 25}ms` }}
                    >
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          cn(
                            "group relative flex items-center gap-3 rounded-inputs px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-all duration-150",
                            isActive
                              ? "bg-gradient-to-r from-electric-cobalt/15 via-electric-cobalt/5 to-transparent text-ice-white"
                              : "text-ice-white/60 hover:bg-slate/40 hover:text-ice-white",
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-electric-cobalt shadow-[0_0_8px_rgba(31,88,242,0.9)] animate-fade-in" />
                            )}
                            <item.icon
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 transition-colors",
                                isActive ? "text-electric-cobalt" : "text-ice-white/40 group-hover:text-ice-white/70",
                              )}
                              strokeWidth={1.5}
                            />
                            {t(item.labelKey)}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-ice-white/14 p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
        © 2026 — ANT ACCESS
      </div>
    </aside>
  );
}
