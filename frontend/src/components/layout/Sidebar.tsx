import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type LucideIcon = typeof LayoutDashboard;

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
}

interface NavSection {
  id: string;
  heading: string;
  items: NavItem[];
}

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
      { to: "/cameras", labelKey: "nav.cameras", icon: Video },
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

function loadSectionState(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem("ant-sidebar-sections") ?? "{}");
  } catch {
    return {};
  }
}

function loadPinned(): boolean {
  try {
    return localStorage.getItem("ant-sidebar-pinned") !== "false";
  } catch {
    return true;
  }
}

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [sectionState, setSectionState] = useState<Record<string, boolean>>(loadSectionState);
  const [pinned, setPinned] = useState(loadPinned);

  useEffect(() => {
    const active = SECTIONS.find((s) =>
      s.items.some((i) => i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)),
    );
    if (active && sectionState[active.id]) {
      setSectionState((prev) => ({ ...prev, [active.id]: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem("ant-sidebar-sections", JSON.stringify(sectionState));
    } catch { /* ignore */ }
  }, [sectionState]);

  useEffect(() => {
    try {
      localStorage.setItem("ant-sidebar-pinned", String(pinned));
    } catch { /* ignore */ }
  }, [pinned]);

  const toggleSection = (id: string) => setSectionState((p) => ({ ...p, [id]: !p[id] }));

  return (
    <aside
      className={cn(
        "relative z-10 hidden shrink-0 flex-col border-r border-ice-white/14 bg-void-black/80 backdrop-blur-xl transition-all duration-300 ease-out md:flex",
        pinned ? "w-64" : "w-16",
      )}
    >
      {/* Brand mark */}
      <div className={cn(
        "flex h-[72px] items-center border-b border-ice-white/14 transition-all duration-300",
        pinned ? "gap-3 px-5" : "justify-center px-2",
      )}>
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center border border-ice-white/40">
          <div className="absolute h-2 w-2 bg-electric-cobalt shadow-[0_0_10px_rgba(31,88,242,0.9)]" />
        </div>
        {pinned && (
          <div className="min-w-0 flex-1 animate-fade-in">
            <div className="truncate text-body-sm tracking-[-0.01em] text-ice-white">
              {t("app.title")}
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
              v0.7 — dev
            </div>
          </div>
        )}
      </div>

      <nav className={cn(
        "flex-1 overflow-y-auto py-4 transition-all duration-300",
        pinned ? "px-3" : "px-1.5",
      )}>
        {SECTIONS.map((section, sIdx) => {
          const isCollapsed = sectionState[section.id] ?? false;
          return (
            <div key={section.id} className={cn(sIdx > 0 && "mt-5")}>
              {pinned ? (
                <button
                  onClick={() => toggleSection(section.id)}
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
              ) : (
                sIdx > 0 && <div className="mx-2 border-t border-ice-white/10" />
              )}

              {(pinned ? !isCollapsed : true) && (
                <ul className={cn("mt-1 space-y-0.5", pinned && "animate-fade-in")}>
                  {section.items.map((item, i) => (
                    <li
                      key={item.to}
                      className={cn(pinned && "opacity-0 animate-slide-right [animation-fill-mode:forwards]")}
                      style={pinned ? { animationDelay: `${i * 25}ms` } : undefined}
                    >
                      <NavLink
                        to={item.to}
                        end={item.end}
                        title={!pinned ? t(item.labelKey) : undefined}
                        className={({ isActive }) =>
                          cn(
                            "group relative flex items-center rounded-inputs transition-all duration-150",
                            pinned
                              ? "gap-3 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em]"
                              : "justify-center px-0 py-2.5",
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
                            {pinned && t(item.labelKey)}
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

      {/* Collapse / expand toggle */}
      <div className="border-t border-ice-white/14">
        <button
          onClick={() => setPinned((v) => !v)}
          className={cn(
            "flex w-full items-center gap-2 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text transition-colors hover:text-electric-cobalt",
            pinned ? "px-5" : "justify-center px-2",
          )}
          aria-label={pinned ? "Свернуть меню" : "Развернуть меню"}
        >
          {pinned ? (
            <>
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>свернуть</span>
            </>
          ) : (
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </aside>
  );
}
