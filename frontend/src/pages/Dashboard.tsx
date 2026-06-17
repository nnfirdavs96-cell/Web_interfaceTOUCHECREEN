import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Clock, Cpu, UserX, Users, Wifi } from "lucide-react";
import { useMemo } from "react";
import { dashboardApi } from "@/api/dashboard";
import { useCountUp } from "@/lib/hooks";

const KPI_DEFS = [
  {
    key: "total_employees",
    label: "Сотрудников",
    icon: Users,
    iconBg: "bg-signal/10 text-signal",
  },
  {
    key: "online_devices",
    label: "Устройств онлайн",
    icon: Wifi,
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  {
    key: "total_devices",
    label: "Устройств всего",
    icon: Cpu,
    iconBg: "bg-fog text-navy",
  },
  {
    key: "came_today",
    label: "Пришли сегодня",
    icon: ClipboardCheck,
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  {
    key: "late_today",
    label: "Опоздали",
    icon: Clock,
    iconBg: "bg-orange-100 text-orange-600",
  },
  {
    key: "absent_today",
    label: "Не пришли",
    icon: UserX,
    iconBg: "bg-red-100 text-red-600",
  },
] as const;

function KpiCard({
  def,
  value,
  index,
}: {
  def: (typeof KPI_DEFS)[number];
  value: number;
  index: number;
}) {
  const animated = useCountUp(value, 900);
  return (
    <div
      style={{ animationDelay: `${index * 60}ms` }}
      className="group rounded-cards border border-mist-border bg-paper p-6 shadow-soft opacity-0 animate-slide-up [animation-fill-mode:forwards] transition-shadow duration-200 hover:shadow-card dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-caption font-medium text-slate2 dark:text-slate-400">{def.label}</div>
          <div className="mt-3 text-heading-sm font-bold tracking-tight tabular-nums text-navy dark:text-white">
            {animated.toLocaleString("ru-RU")}
          </div>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-cards transition-transform duration-200 group-hover:scale-105 ${def.iconBg}`}
        >
          <def.icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashboardApi.get() });

  const weeklyMax = useMemo(
    () => Math.max(1, ...(data?.weekly.map((w) => w.came) ?? [1])),
    [data?.weekly],
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="animate-slide-down">
        <h1 className="text-heading tracking-tight">Дашборд</h1>
        <p className="mt-2 text-body-sm text-slate2 dark:text-slate-400">
          Сводная статистика системы
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-6">
        {KPI_DEFS.map((k, i) => (
          <KpiCard
            key={k.key}
            def={k}
            value={data?.kpis[k.key] ?? 0}
            index={i}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div
          className="rounded-cards border border-mist-border bg-paper p-6 shadow-soft opacity-0 animate-slide-up [animation-fill-mode:forwards] dark:border-slate-800 dark:bg-slate-900 lg:col-span-2"
          style={{ animationDelay: "400ms" }}
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-subheading font-bold tracking-tight">
              Посещаемость за неделю
            </h2>
            <div className="flex gap-4 text-micro text-slate2">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-signal" /> Пришли
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber" /> Опоздания
              </span>
            </div>
          </div>
          {(!data || data.weekly.length === 0) && (
            <div className="flex h-56 items-center justify-center rounded-cards border border-dashed border-mist-border bg-mist text-body-sm text-steel dark:border-slate-800 dark:bg-slate-800/30">
              Нет данных — запустите пересчёт табеля в разделе «Приход/уход»
            </div>
          )}
          {data && data.weekly.length > 0 && (
            <div className="flex h-56 items-end justify-around gap-3">
              {data.weekly.map((w, i) => (
                <div key={w.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end justify-center gap-1.5">
                    <div
                      className="w-4 origin-bottom rounded-t-sm bg-signal transition-all duration-200 hover:bg-signal-dark animate-bar-grow"
                      style={{
                        height: `${(w.came / weeklyMax) * 100}%`,
                        animationDelay: `${500 + i * 60}ms`,
                      }}
                      title={`Пришли: ${w.came}`}
                    />
                    <div
                      className="w-4 origin-bottom rounded-t-sm bg-amber transition-all duration-200 hover:opacity-80 animate-bar-grow"
                      style={{
                        height: `${(w.late / weeklyMax) * 100}%`,
                        animationDelay: `${500 + i * 60 + 30}ms`,
                      }}
                      title={`Опоздали: ${w.late}`}
                    />
                  </div>
                  <div className="text-micro font-medium text-slate2">
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

        <div
          className="rounded-cards border border-mist-border bg-paper p-6 shadow-soft opacity-0 animate-slide-up [animation-fill-mode:forwards] dark:border-slate-800 dark:bg-slate-900"
          style={{ animationDelay: "500ms" }}
        >
          <h2 className="mb-6 text-subheading font-bold tracking-tight">Последние события</h2>
          {(!data || data.recent_events.length === 0) && (
            <div className="flex h-56 items-center justify-center rounded-cards border border-dashed border-mist-border bg-mist text-body-sm text-steel dark:border-slate-800 dark:bg-slate-800/30">
              Пока пусто
            </div>
          )}
          {data && data.recent_events.length > 0 && (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {data.recent_events.map((e, i) => (
                <li
                  key={e.id}
                  style={{ animationDelay: `${600 + i * 50}ms` }}
                  className="flex items-center justify-between rounded-inputs border border-mist-border bg-paper px-4 py-3 text-body-sm opacity-0 animate-slide-right [animation-fill-mode:forwards] transition-all duration-150 hover:border-steel hover:bg-fog dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/70"
                >
                  <div>
                    <div className="font-semibold text-navy dark:text-white">
                      {e.event_type === "entry"
                        ? "Вход"
                        : e.event_type === "exit"
                          ? "Выход"
                          : e.event_type}
                    </div>
                    <div className="text-micro text-slate2">
                      ID {e.employee_id?.slice(0, 8) ?? "—"}
                    </div>
                  </div>
                  <div className="font-mono text-micro text-slate2">
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
