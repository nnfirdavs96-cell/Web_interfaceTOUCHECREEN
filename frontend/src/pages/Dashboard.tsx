import { Cpu, ClipboardCheck, Clock, Users } from "lucide-react";

const kpis = [
  { label: "Сотрудников", value: "—", icon: Users, accent: "bg-brand/10 text-brand" },
  { label: "Устройств онлайн", value: "—", icon: Cpu, accent: "bg-emerald-100 text-emerald-700" },
  { label: "Пришли сегодня", value: "—", icon: ClipboardCheck, accent: "bg-sky-100 text-sky-700" },
  { label: "Опоздали", value: "—", icon: Clock, accent: "bg-orange-100 text-orange-700" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Дашборд</h1>
        <p className="text-sm text-slate-500">Сводная статистика системы</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">{k.label}</div>
                <div className="mt-2 text-3xl font-semibold">{k.value}</div>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${k.accent}`}>
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Посещаемость за неделю</h2>
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
            Данные появятся после подключения устройств (этап 4)
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold">Последние события</h2>
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
            Пока пусто
          </div>
        </div>
      </div>
    </div>
  );
}
