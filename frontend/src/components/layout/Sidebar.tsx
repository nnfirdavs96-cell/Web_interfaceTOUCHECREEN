import { NavLink } from "react-router-dom";
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
  { to: "/", label: "Дашборд", icon: LayoutDashboard, end: true },
  { to: "/organizations", label: "Организации", icon: Building2 },
  { to: "/departments", label: "Отделы", icon: Network },
  { to: "/branches", label: "Филиалы", icon: MapPin },
  { to: "/devices", label: "Устройства", icon: Cpu },
  { to: "/employees", label: "Сотрудники", icon: Users },
  { to: "/schedules", label: "Расписания", icon: Calendar },
  { to: "/attendance", label: "Приход/уход", icon: ClipboardList },
  { to: "/reports", label: "Отчёты", icon: FileBarChart },
  { to: "/integrations", label: "Интеграции", icon: Network },
  { to: "/users", label: "Пользователи", icon: UserCog },
  { to: "/audit", label: "Логи действий", icon: Shield },
  { to: "/settings", label: "Настройки", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
          <Fingerprint className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-none">Hikvision Access</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
            v0.1 · dev
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
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
