import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, RotateCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { attendanceApi } from "@/api/attendance";
import { devicesApi } from "@/api/devices";
import { employeesApi } from "@/api/employees";
import type { AttendanceEvent } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AttendancePage() {
  const qc = useQueryClient();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [liveCount, setLiveCount] = useState(0);

  const employees = useQuery({
    queryKey: ["employees", "all"],
    queryFn: () => employeesApi.list({ page_size: 500 }),
  });
  const devices = useQuery({
    queryKey: ["devices", "all"],
    queryFn: () => devicesApi.list({ page_size: 200 }),
  });

  const empMap = useMemo(
    () => new Map((employees.data?.items ?? []).map((e) => [e.id, `${e.last_name} ${e.first_name}`])),
    [employees.data],
  );
  const devMap = useMemo(
    () => new Map((devices.data?.items ?? []).map((d) => [d.id, d.name])),
    [devices.data],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["attendance-events", dateFrom, dateTo],
    queryFn: () =>
      attendanceApi.events({
        date_from: `${dateFrom}T00:00:00Z`,
        date_to: `${dateTo}T23:59:59Z`,
        page_size: 200,
      }),
  });

  const fetchMut = useMutation({
    mutationFn: () => attendanceApi.fetchNow(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance-events"] }),
  });
  const recalcMut = useMutation({
    mutationFn: () => attendanceApi.recalculate(dateFrom, dateTo),
  });

  // WebSocket подписка на live-события
  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/api/v1/attendance/ws/events`;
    const ws = new WebSocket(url);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "attendance_event") {
          setLiveCount((c) => c + 1);
          qc.invalidateQueries({ queryKey: ["attendance-events"] });
        }
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, [qc]);

  const columns: Column<AttendanceEvent>[] = [
    {
      key: "event_time",
      header: "Время",
      width: "180px",
      render: (r) => new Date(r.event_time).toLocaleString("ru-RU"),
    },
    {
      key: "employee_id",
      header: "Сотрудник",
      render: (r) =>
        r.employee_id ? (
          empMap.get(r.employee_id) ?? <span className="text-slate-400">ID {r.employee_id.slice(0, 8)}</span>
        ) : (
          <span className="text-slate-400">не сопоставлен (ext: {r.external_user_id})</span>
        ),
    },
    {
      key: "event_type",
      header: "Событие",
      width: "120px",
      render: (r) => {
        const cls =
          r.event_type === "entry"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
            : r.event_type === "exit"
              ? "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400"
              : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
        return (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
            {r.event_type === "entry" ? "Вход" : r.event_type === "exit" ? "Выход" : r.event_type}
          </span>
        );
      },
    },
    {
      key: "device_id",
      header: "Устройство",
      render: (r) => (r.device_id ? devMap.get(r.device_id) ?? "—" : "—"),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="/ поток · события"
        title="Приход / уход"
        subtitle="События прохода и пересчёт табеля"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => fetchMut.mutate()} disabled={fetchMut.isPending}>
              <RefreshCw className="h-4 w-4" /> Опросить устройства
            </Button>
            <Button onClick={() => recalcMut.mutate()} disabled={recalcMut.isPending}>
              <RotateCw className="h-4 w-4" /> Пересчитать табель
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">С</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <span className="text-sm text-slate-500">по</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        {liveCount > 0 && (
          <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            🟢 Live: +{liveCount} новых событий с момента входа
          </div>
        )}
        {fetchMut.data && (
          <div className="text-xs text-slate-500">Опрос: получено {fetchMut.data.saved} событий</div>
        )}
        {recalcMut.data && (
          <div className="text-xs text-slate-500">Пересчёт: обработано {recalcMut.data.processed} записей</div>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        loading={isLoading}
        empty="События не найдены за выбранный период"
      />
    </div>
  );
}
