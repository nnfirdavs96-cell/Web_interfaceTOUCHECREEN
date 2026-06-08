import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Clock, Cpu, UserX, Users, Wifi } from "lucide-react";
import { useMemo } from "react";
import { dashboardApi } from "@/api/dashboard";

const KPI_DEFS = [
  {
    key: "total_employees",
    label: "Сотрудников",
    icon: Users,
    iconBg: "bg-brand/10 text-brand",
    accent: "from-brand-500/10 to-brand-500/0",
  },
  {
    key: "online_devices",
    label: "Устройств онлайн",
    icon: Wifi,
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    accent: "from-emerald-500/10 to-emerald-500/0",
  },
  {
    key: "total_devices",
    label: "Устройств всего",
    icon: Cpu,
    iconBg: "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400",
    accent: "from-sky-500/10 to-sky-500/0",
  },
  {
    key: "came_today",
    label: "Пришли сегодня",
    icon: ClipboardCheck,
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    accent: "from-emerald-500/10 to-emerald-500/0",
  },
  {
    key: "late_today",
    label: "Опоздали",
    icon: Clock,
    iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
    accent: "from-orange-500/10 to-orange-500/0",
  },
  {
    key: "absent_today",
    label: "Не пришли",
    icon: UserX,
    iconBg: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400",
    accent: "from-red-500/10 to-red-500/0",
  },
] as const;

export default function DashboardPage() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashboardApi.get() });

  const weeklyMax = useMemo(
    () => Math.max(1, ...(data?.weekly.map((w) => w.came) ?? [1])),
    [data?.weekly],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>
        <p className="mt-1 text-sm text-slate-500">Сводная статистика системы</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {KPI_DEFS.map((k) => (
          <div
            key={k.key}
            className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900`}
          >
            <div
              className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${k.accent}`}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500">{k.label}</div>
                <div className="mt-2 text-3xl font-bold tracking-tight">
                  {data?.kpis[k.key] ?? "—"}
                </div>
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-soft ${k.iconBg}`}
              >
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Посещаемость за неделю</h2>
            <div className="flex gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Пришли
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-orange-400" /> Опоздания
              </span>
            </div>
          </div>
          {(!data || data.weekly.length === 0) && (
            <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-800/30">
              Нет данных — запустите пересчёт табеля в разделе «Приход/уход»
            </div>
          )}
          {data && data.weekly.length > 0 && (
            <div className="flex h-56 items-end justify-around gap-3">
              {data.weekly.map((w) => (
                <div key={w.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end justify-center gap-1">
                    <div
                      className="w-3.5 rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition-all hover:from-brand-700"
                      style={{ height: `${(w.came / weeklyMax) * 100}%` }}
                      title={`Пришли: ${w.came}`}
                    />
                    <div
                      className="w-3.5 rounded-t-md bg-gradient-to-t from-orange-500 to-orange-300 transition-all hover:from-orange-600"
                      style={{ height: `${(w.late / weeklyMax) * 100}%` }}
                      title={`Опоздали: ${w.late}`}
                    />
                  </div>
                  <div className="text-[10px] font-medium text-slate-500">
                    {new Date(w.date).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold">Последние события</h2>
          {(!data || data.recent_events.length === 0) && (
            <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-800/30">
              Пока пусто
            </div>
          )}
          {data && data.recent_events.length > 0 && (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {data.recent_events.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm transition-colors hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/70"
                >
                  <div>
                    <div className="font-medium">
                      {e.event_type === "entry"
                        ? "🟢 Вход"
                        : e.event_type === "exit"
                          ? "🔵 Выход"
                          : e.event_type}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      ID {e.employee_id?.slice(0, 8) ?? "—"}
                    </div>
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">
                    {new Date(e.event_time).toLocaleTimeString("ru-RU")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
