import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Clock, Cpu, UserX, Users, Wifi } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { dashboardApi } from "@/api/dashboard";
import { useCountUp } from "@/lib/hooks";

const KPI_DEFS = [
  {
    key: "total_employees",
    label: "Сотрудников",
    icon: Users,
    iconBg: "bg-brand/10 text-brand",
    accent: "from-brand-500/15 to-brand-500/0",
  },
  {
    key: "online_devices",
    label: "Устройств онлайн",
    icon: Wifi,
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    accent: "from-emerald-500/15 to-emerald-500/0",
  },
  {
    key: "total_devices",
    label: "Устройств всего",
    icon: Cpu,
    iconBg: "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400",
    accent: "from-sky-500/15 to-sky-500/0",
  },
  {
    key: "came_today",
    label: "Пришли сегодня",
    icon: ClipboardCheck,
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    accent: "from-emerald-500/15 to-emerald-500/0",
  },
  {
    key: "late_today",
    label: "Опоздали",
    icon: Clock,
    iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
    accent: "from-orange-500/15 to-orange-500/0",
  },
  {
    key: "absent_today",
    label: "Не пришли",
    icon: UserX,
    iconBg: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400",
    accent: "from-red-500/15 to-red-500/0",
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width - 0.5) * 2; // -1..1
    const py = ((e.clientY - r.top) / r.height - 0.5) * 2;
    setTilt({ x: -py * 4, y: px * 4 });
  }
  function onLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        animationDelay: `${index * 60}ms`,
        transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: "transform 0.18s ease-out",
      }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-card opacity-0 animate-slide-up [animation-fill-mode:forwards] hover:shadow-elevated dark:border-slate-800 dark:bg-slate-900"
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br ${def.accent} transition-transform duration-500 group-hover:scale-125`}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-slate-500">{def.label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
            {animated.toLocaleString("ru-RU")}
          </div>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-soft transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${def.iconBg}`}
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
    <div className="space-y-6 animate-fade-in">
      <div className="animate-slide-down">
        <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>
        <p className="mt-1 text-sm text-slate-500">Сводная статистика системы</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {KPI_DEFS.map((k, i) => (
          <KpiCard
            key={k.key}
            def={k}
            value={data?.kpis[k.key] ?? 0}
            index={i}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card opacity-0 animate-slide-up [animation-fill-mode:forwards] dark:border-slate-800 dark:bg-slate-900 lg:col-span-2"
          style={{ animationDelay: "400ms" }}
        >
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
              {data.weekly.map((w, i) => (
                <div key={w.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end justify-center gap-1">
                    <div
                      className="w-3.5 origin-bottom rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition-all duration-300 hover:scale-x-150 hover:from-brand-700 animate-bar-grow"
                      style={{
                        height: `${(w.came / weeklyMax) * 100}%`,
                        animationDelay: `${500 + i * 60}ms`,
                      }}
                      title={`Пришли: ${w.came}`}
                    />
                    <div
                      className="w-3.5 origin-bottom rounded-t-md bg-gradient-to-t from-orange-500 to-orange-300 transition-all duration-300 hover:scale-x-150 hover:from-orange-600 animate-bar-grow"
                      style={{
                        height: `${(w.late / weeklyMax) * 100}%`,
                        animationDelay: `${500 + i * 60 + 30}ms`,
                      }}
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

        <div
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card opacity-0 animate-slide-up [animation-fill-mode:forwards] dark:border-slate-800 dark:bg-slate-900"
          style={{ animationDelay: "500ms" }}
        >
          <h2 className="mb-4 text-sm font-semibold">Последние события</h2>
          {(!data || data.recent_events.length === 0) && (
            <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-800/30">
              Пока пусто
            </div>
          )}
          {data && data.recent_events.length > 0 && (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {data.recent_events.map((e, i) => (
                <li
                  key={e.id}
                  style={{ animationDelay: `${600 + i * 50}ms` }}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm opacity-0 animate-slide-right [animation-fill-mode:forwards] transition-all duration-200 hover:translate-x-1 hover:bg-slate-100 hover:shadow-soft dark:bg-slate-800/40 dark:hover:bg-slate-800/70"
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
