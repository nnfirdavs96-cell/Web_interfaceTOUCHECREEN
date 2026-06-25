import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Calendar,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/organizations", labelKey: "nav.organizations", icon: Building2 },
  { to: "/departments", labelKey: "nav.departments", icon: Network },
  { to: "/branches", labelKey: "nav.branches", icon: MapPin },
  { to: "/devices", labelKey: "nav.devices", icon: Cpu },
  { to: "/employees", labelKey: "nav.employees", icon: Users },
  { to: "/schedules", labelKey: "nav.schedules", icon: Calendar },
  { to: "/attendance", labelKey: "nav.attendance", icon: ClipboardList },
  { to: "/reports", labelKey: "nav.reports", icon: FileBarChart },
  { to: "/integrations", labelKey: "nav.integrations", icon: Network },
  { to: "/users", labelKey: "nav.users", icon: UserCog },
  { to: "/audit", labelKey: "nav.audit", icon: Shield },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="relative z-10 hidden w-64 shrink-0 flex-col border-r border-ice-white/14 bg-void-black/80 backdrop-blur-xl md:flex">
      {/* Brand mark — Atlantic geometric glyph + wordmark */}
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
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <div className="mb-4 px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
          / index
        </div>
        <ul className="space-y-0.5">
          {nav.map((item, i) => (
            <li
              key={item.to}
              className="opacity-0 animate-slide-right [animation-fill-mode:forwards]"
              style={{ animationDelay: `${i * 30}ms` }}
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
      </nav>

      <div className="border-t border-ice-white/14 p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
        © 2026 — ANT ACCESS
      </div>
    </aside>
  );
}
