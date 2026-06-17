import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Clock, Cpu, UserX, Users, Wifi } from "lucide-react";
import { useMemo } from "react";
import { dashboardApi } from "@/api/dashboard";
import { useCountUp } from "@/lib/hooks";

const KPI_DEFS = [
  { key: "total_employees", code: "01", label: "EMPLOYEES", icon: Users },
  { key: "online_devices", code: "02", label: "DEVICES · ONLINE", icon: Wifi },
  { key: "total_devices", code: "03", label: "DEVICES · TOTAL", icon: Cpu },
  { key: "came_today", code: "04", label: "ARRIVED TODAY", icon: ClipboardCheck },
  { key: "late_today", code: "05", label: "LATE", icon: Clock },
  { key: "absent_today", code: "06", label: "ABSENT", icon: UserX },
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
      className="group rounded-cards border border-ice-white/14 bg-carbon p-6 opacity-0 animate-slide-up [animation-fill-mode:forwards] transition-colors duration-200 hover:border-ice-white/30"
    >
      <div className="flex items-start justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-electric-cobalt">
          /{def.code}
        </span>
        <def.icon className="h-3.5 w-3.5 text-ice-white/30" strokeWidth={1.5} />
      </div>
      <div className="mt-8 text-[48px] leading-[1] tracking-[-0.03em] tabular-nums text-ice-white">
        {animated.toLocaleString("ru-RU")}
      </div>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
        {def.label}
      </div>
    </div>
  );
}

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" stroke="#1f58f2" strokeWidth="1.5" strokeLinecap="round">
      <path d="M20 4 V36" />
      <path d="M4 20 H36" />
      <path d="M8 8 L32 32" />
      <path d="M32 8 L8 32" />
    </svg>
  );
}

export default function DashboardPage() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashboardApi.get() });

  const weeklyMax = useMemo(
    () => Math.max(1, ...(data?.weekly.map((w) => w.came) ?? [1])),
    [data?.weekly],
  );

  return (
    <div className="space-y-16 animate-fade-in">
      {/* Editorial hero */}
      <div className="animate-slide-down">
        <div className="mb-4 flex items-center gap-3">
          <Sparkle className="h-7 w-7 animate-twinkle" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-electric-cobalt">
            / observatory · live
          </span>
        </div>
        <h1 className="text-[64px] leading-[1.04] tracking-[-0.03em] text-ice-white">
          dashboard <span className="text-electric-cobalt">overview</span>.
        </h1>
        <p className="mt-5 max-w-xl font-mono text-[12px] leading-[1.8] tracking-[0.06em] text-fog-text">
          real-time signal from the access network — devices, people, events.
        </p>
      </div>

      {/* KPI grid */}
      <div>
        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-ice-white/14" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
            kpis — 06 metrics
          </span>
          <div className="h-px flex-1 bg-ice-white/14" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {KPI_DEFS.map((k, i) => (
            <KpiCard key={k.key} def={k} value={data?.kpis[k.key] ?? 0} index={i} />
          ))}
        </div>
      </div>

      {/* Chart + events */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div
          className="rounded-cards border border-ice-white/14 bg-carbon p-8 opacity-0 animate-slide-up [animation-fill-mode:forwards] lg:col-span-2"
          style={{ animationDelay: "400ms" }}
        >
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-electric-cobalt">
                / weekly
              </div>
              <h2 className="text-heading-sm tracking-[-0.02em] text-ice-white">
                attendance signal
              </h2>
            </div>
            <div className="flex gap-5 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-electric-cobalt" /> arrived
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-signal-orange" /> late
              </span>
            </div>
          </div>
          {(!data || data.weekly.length === 0) && (
            <div className="flex h-56 items-center justify-center rounded-inputs border border-dashed border-ice-white/14 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
              no data — run attendance recalculation
            </div>
          )}
          {data && data.weekly.length > 0 && (
            <div className="flex h-56 items-end justify-around gap-3">
              {data.weekly.map((w, i) => (
                <div key={w.date} className="flex flex-1 flex-col items-center gap-3">
                  <div className="flex w-full flex-1 items-end justify-center gap-1.5">
                    <div
                      className="w-3 origin-bottom bg-electric-cobalt transition-all duration-200 animate-bar-grow"
                      style={{
                        height: `${(w.came / weeklyMax) * 100}%`,
                        animationDelay: `${500 + i * 60}ms`,
                      }}
                      title={`arrived: ${w.came}`}
                    />
                    <div
                      className="w-3 origin-bottom bg-signal-orange transition-all duration-200 animate-bar-grow"
                      style={{
                        height: `${(w.late / weeklyMax) * 100}%`,
                        animationDelay: `${500 + i * 60 + 30}ms`,
                      }}
                      title={`late: ${w.late}`}
                    />
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fog-text">
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
          className="rounded-cards border border-ice-white/14 bg-carbon p-8 opacity-0 animate-slide-up [animation-fill-mode:forwards]"
          style={{ animationDelay: "500ms" }}
        >
          <div className="mb-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-electric-cobalt">
              / stream
            </div>
            <h2 className="text-heading-sm tracking-[-0.02em] text-ice-white">
              recent events
            </h2>
          </div>
          {(!data || data.recent_events.length === 0) && (
            <div className="flex h-56 items-center justify-center rounded-inputs border border-dashed border-ice-white/14 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
              empty
            </div>
          )}
          {data && data.recent_events.length > 0 && (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {data.recent_events.map((e, i) => (
                <li
                  key={e.id}
                  style={{ animationDelay: `${600 + i * 50}ms` }}
                  className="flex items-center justify-between border-b border-ice-white/8 py-3 opacity-0 animate-slide-right [animation-fill-mode:forwards] transition-colors duration-150 hover:border-electric-cobalt/50"
                >
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ice-white">
                      {e.event_type === "entry"
                        ? "→ ENTRY"
                        : e.event_type === "exit"
                          ? "← EXIT"
                          : e.event_type.toUpperCase()}
                    </div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-fog-text">
                      id {e.employee_id?.slice(0, 8) ?? "—"}
                    </div>
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.06em] text-electric-cobalt">
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
