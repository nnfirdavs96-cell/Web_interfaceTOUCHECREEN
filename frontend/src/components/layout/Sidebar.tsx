import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Calendar,
  ClipboardList,
  Cpu,
  FileBarChart,
  Fingerprint,
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
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft">
          <Fingerprint className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-none tracking-tight">
            {t("app.title")}
          </div>
          <div className="mt-1.5 text-[10px] font-medium uppercase tracking-widest text-slate-400">
            v0.7 · dev
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                    isActive
                      ? "bg-brand/10 font-medium text-brand shadow-soft dark:bg-brand/15"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1.5 h-[calc(100%-12px)] w-0.5 rounded-r bg-brand" />
                    )}
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive
                          ? "text-brand"
                          : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300",
                      )}
                    />
                    {t(item.labelKey)}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-200 p-4 text-[11px] text-slate-400 dark:border-slate-800">
        © 2026 Hikvision Access
      </div>
    </aside>
  );
}
