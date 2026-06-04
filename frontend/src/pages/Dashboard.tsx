import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Clock, Cpu, UserX, Users, Wifi } from "lucide-react";
import { useMemo } from "react";
import { dashboardApi } from "@/api/dashboard";

const KPI_DEFS = [
  { key: "total_employees", label: "Сотрудников", icon: Users, accent: "bg-brand/10 text-brand" },
  { key: "online_devices", label: "Устройств онлайн", icon: Wifi, accent: "bg-emerald-100 text-emerald-700" },
  { key: "total_devices", label: "Устройств всего", icon: Cpu, accent: "bg-sky-100 text-sky-700" },
  { key: "came_today", label: "Пришли сегодня", icon: ClipboardCheck, accent: "bg-emerald-100 text-emerald-700" },
  { key: "late_today", label: "Опоздали", icon: Clock, accent: "bg-orange-100 text-orange-700" },
  { key: "absent_today", label: "Не пришли", icon: UserX, accent: "bg-red-100 text-red-700" },
] as const;

export default function DashboardPage() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashboardApi.get() });

  const weeklyMax = useMemo(
    () => Math.max(1, ...(data?.weekly.map((w) => w.came) ?? [1])),
    [data?.weekly],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Дашборд</h1>
        <p className="text-sm text-slate-500">Сводная статистика системы</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {KPI_DEFS.map((k) => (
          <div
            key={k.key}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">{k.label}</div>
                <div className="mt-1 text-2xl font-semibold">{data?.kpis[k.key] ?? "—"}</div>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${k.accent}`}>
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Посещаемость за неделю</h2>
          {(!data || data.weekly.length === 0) && (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              Нет данных — запустите пересчёт табеля в разделе «Приход/уход»
            </div>
          )}
          {data && data.weekly.length > 0 && (
            <div className="flex h-48 items-end justify-around gap-3">
              {data.weekly.map((w) => (
                <div key={w.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end justify-center gap-1">
                    <div
                      className="w-3 rounded-t bg-brand transition-all"
                      style={{ height: `${(w.came / weeklyMax) * 100}%` }}
                      title={`Пришли: ${w.came}`}
                    />
                    <div
                      className="w-3 rounded-t bg-orange-400 transition-all"
                      style={{ height: `${(w.late / weeklyMax) * 100}%` }}
                      title={`Опоздали: ${w.late}`}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(w.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Пришли
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-orange-400" /> Опоздания
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold">Последние события</h2>
          {(!data || data.recent_events.length === 0) && (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              Пока пусто
            </div>
          )}
          {data && data.recent_events.length > 0 && (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {data.recent_events.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">
                      {e.event_type === "entry" ? "Вход" : e.event_type === "exit" ? "Выход" : e.event_type}
                    </div>
                    <div className="text-xs text-slate-500">
                      ID {e.employee_id?.slice(0, 8) ?? "—"}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
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
