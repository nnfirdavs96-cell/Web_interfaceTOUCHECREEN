import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, Cpu, FileBarChart, User } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { attendanceApi } from "@/api/attendance";
import { devicesApi } from "@/api/devices";
import { employeesApi } from "@/api/employees";
import { reportsApi } from "@/api/reports";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";

const TABS = [
  { key: "profile", label: "Профиль", icon: User },
  { key: "devices", label: "Устройства", icon: Cpu },
  { key: "history", label: "История", icon: ClipboardList },
  { key: "timesheet", label: "Табель", icon: FileBarChart },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function mins(n: number) {
  if (!n) return "—";
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h ? `${h}ч ${m}м` : `${m}м`;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  normal: { text: "Норма", cls: "bg-emerald-100 text-emerald-700" },
  late: { text: "Опоздание", cls: "bg-orange-100 text-orange-700" },
  early_leave: { text: "Ранний уход", cls: "bg-amber-100 text-amber-700" },
  absent: { text: "Отсутствие", cls: "bg-red-100 text-red-700" },
  partial: { text: "Неполный день", cls: "bg-sky-100 text-sky-700" },
  day_off: { text: "Выходной", cls: "bg-slate-200 text-slate-600" },
};

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabKey>("profile");

  const employee = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const list = await employeesApi.list({ page_size: 500 });
      return list.items.find((e) => e.id === id) ?? null;
    },
    enabled: !!id,
  });

  const access = useQuery({
    queryKey: ["employee-access", id],
    queryFn: () => employeesApi.access(id!),
    enabled: !!id && tab === "devices",
  });
  const devices = useQuery({
    queryKey: ["devices", "all"],
    queryFn: () => devicesApi.list({ page_size: 200 }),
    enabled: tab === "devices",
  });
  const devMap = useMemo(
    () => new Map((devices.data?.items ?? []).map((d) => [d.id, d])),
    [devices.data],
  );

  const events = useQuery({
    queryKey: ["employee-events", id],
    queryFn: () =>
      attendanceApi.events({
        employee_id: id,
        page_size: 100,
      }),
    enabled: !!id && tab === "history",
  });

  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const timesheet = useQuery({
    queryKey: ["employee-timesheet", id],
    queryFn: () =>
      reportsApi.timesheet({ employee_id: id, date_from: monthAgo, date_to: today }),
    enabled: !!id && tab === "timesheet",
  });

  const emp = employee.data;

  return (
    <div>
      <div className="mb-4">
        <Link
          to="/employees"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" /> К списку сотрудников
        </Link>
      </div>

      <PageHeader
        title={emp ? `${emp.last_name} ${emp.first_name} ${emp.middle_name ?? ""}` : "Сотрудник"}
        subtitle={emp ? `${emp.position ?? ""} · ID ${emp.external_id ?? emp.id.slice(0, 8)}` : ""}
      />

      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "border-b-2 border-brand text-brand"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && emp && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="ФИО" value={`${emp.last_name} ${emp.first_name} ${emp.middle_name ?? ""}`} />
          <Field label="Внешний ID" value={emp.external_id ?? "—"} />
          <Field label="Должность" value={emp.position ?? "—"} />
          <Field label="Телефон" value={emp.phone ?? "—"} />
          <Field label="Email" value={emp.email ?? "—"} />
          <Field label="Статус" value={emp.status === "active" ? "Активен" : "Отключён"} />
          <Field label="Дата приёма" value={emp.hired_at ?? "—"} />
          <Field label="Комментарий" value={emp.comment ?? "—"} />
        </div>
      )}

      {tab === "devices" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          {(access.data?.length ?? 0) === 0 ? (
            <div className="py-10 text-center text-slate-400">
              Сотруднику ещё не назначены устройства
            </div>
          ) : (
            <ul className="space-y-2">
              {access.data?.map((a) => {
                const d = devMap.get(a.device_id);
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <Cpu className="h-4 w-4 text-brand" />
                      <div>
                        <div className="text-sm font-medium">{d?.name ?? a.device_id.slice(0, 8)}</div>
                        <div className="text-xs text-slate-500">
                          {d ? `${d.ip}:${d.port}` : "—"} · уровень: {a.access_level}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {a.synced_at ? `синк ${new Date(a.synced_at).toLocaleDateString("ru-RU")}` : "не синхронизирован"}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "history" && (
        <DataTable
          columns={[
            {
              key: "event_time",
              header: "Время",
              width: "180px",
              render: (r) => new Date(r.event_time).toLocaleString("ru-RU"),
            },
            {
              key: "event_type",
              header: "Событие",
              width: "120px",
              render: (r) => (r.event_type === "entry" ? "Вход" : r.event_type === "exit" ? "Выход" : r.event_type),
            },
            {
              key: "device_id",
              header: "Устройство",
              render: (r) => (r.device_id ? devMap.get(r.device_id)?.name ?? "—" : "—"),
            },
          ] as Column<NonNullable<typeof events.data>["items"][number]>[]}
          rows={events.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={events.isLoading}
          empty="Событий нет"
        />
      )}

      {tab === "timesheet" && (
        <>
          <div className="mb-3 flex justify-end">
            <Button
              variant="secondary"
              onClick={() =>
                reportsApi.download("excel", {
                  employee_id: id,
                  date_from: monthAgo,
                  date_to: today,
                })
              }
            >
              Экспорт Excel
            </Button>
          </div>
          <DataTable
            columns={[
              { key: "date", header: "Дата", width: "110px" },
              {
                key: "actual_check_in",
                header: "Факт вход",
                render: (r) =>
                  r.actual_check_in ? new Date(r.actual_check_in).toLocaleTimeString("ru-RU").slice(0, 5) : "—",
              },
              {
                key: "actual_check_out",
                header: "Факт выход",
                render: (r) =>
                  r.actual_check_out ? new Date(r.actual_check_out).toLocaleTimeString("ru-RU").slice(0, 5) : "—",
              },
              { key: "late_minutes", header: "Опозд.", render: (r) => mins(r.late_minutes) },
              { key: "worked_minutes", header: "Отработ.", render: (r) => mins(r.worked_minutes) },
              {
                key: "status",
                header: "Статус",
                render: (r) => {
                  const s = STATUS_LABEL[r.status] ?? { text: r.status, cls: "" };
                  return (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>
                  );
                },
              },
            ] as Column<NonNullable<typeof timesheet.data>["rows"][number]>[]}
            rows={timesheet.data?.rows ?? []}
            rowKey={(r) => r.date}
            loading={timesheet.isLoading}
            empty="Записей нет"
          />
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium">{value || "—"}</div>
    </div>
  );
}
