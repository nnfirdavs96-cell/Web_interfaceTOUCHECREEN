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
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
          <Fingerprint className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-none">{t("app.title")}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
            v0.7 · dev
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                    isActive
                      ? "bg-brand/10 font-medium text-brand dark:bg-brand/20"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {t(item.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
