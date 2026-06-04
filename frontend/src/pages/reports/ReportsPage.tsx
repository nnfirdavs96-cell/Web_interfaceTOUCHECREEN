import { useQuery } from "@tanstack/react-query";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { branchesApi } from "@/api/branches";
import { depsApi } from "@/api/departments";
import { orgsApi } from "@/api/organizations";
import { reportsApi, type ReportFilters } from "@/api/reports";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  normal: { text: "Норма", cls: "bg-emerald-100 text-emerald-700" },
  late: { text: "Опоздание", cls: "bg-orange-100 text-orange-700" },
  early_leave: { text: "Ранний уход", cls: "bg-amber-100 text-amber-700" },
  absent: { text: "Отсутствие", cls: "bg-red-100 text-red-700" },
  partial: { text: "Неполный день", cls: "bg-sky-100 text-sky-700" },
  day_off: { text: "Выходной", cls: "bg-slate-200 text-slate-600" },
};

function mins(n: number) {
  if (!n) return "—";
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h ? `${h}ч ${m}м` : `${m}м`;
}

export default function ReportsPage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthAgoStr = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  const [filters, setFilters] = useState<ReportFilters>({
    date_from: monthAgoStr,
    date_to: todayStr,
  });

  const orgs = useQuery({ queryKey: ["organizations", "all"], queryFn: () => orgsApi.list({ page_size: 200 }) });
  const deps = useQuery({ queryKey: ["departments", "all"], queryFn: () => depsApi.list() });
  const branches = useQuery({
    queryKey: ["branches", "all"],
    queryFn: () => branchesApi.list({ page_size: 200 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["report-timesheet", filters],
    queryFn: () => reportsApi.timesheet(filters),
  });
  const summary = useQuery({
    queryKey: ["report-summary", filters],
    queryFn: () => reportsApi.summary(filters),
  });

  type Row = NonNullable<typeof data>["rows"][number];

  const columns: Column<Row>[] = [
    { key: "external_id", header: "ID", width: "100px" },
    { key: "full_name", header: "ФИО", render: (r) => <span className="font-medium">{r.full_name}</span> },
    { key: "date", header: "Дата", width: "110px" },
    {
      key: "required_check_in",
      header: "План вход",
      render: (r) => (r.required_check_in ? String(r.required_check_in).slice(0, 5) : "—"),
    },
    {
      key: "actual_check_in",
      header: "Факт вход",
      render: (r) => (r.actual_check_in ? new Date(r.actual_check_in).toLocaleTimeString("ru-RU").slice(0, 5) : "—"),
    },
    {
      key: "required_check_out",
      header: "План выход",
      render: (r) => (r.required_check_out ? String(r.required_check_out).slice(0, 5) : "—"),
    },
    {
      key: "actual_check_out",
      header: "Факт выход",
      render: (r) => (r.actual_check_out ? new Date(r.actual_check_out).toLocaleTimeString("ru-RU").slice(0, 5) : "—"),
    },
    { key: "late_minutes", header: "Опозд.", render: (r) => mins(r.late_minutes) },
    { key: "worked_minutes", header: "Отработ.", render: (r) => mins(r.worked_minutes) },
    {
      key: "status",
      header: "Статус",
      render: (r) => {
        const s = STATUS_LABEL[r.status] ?? { text: r.status, cls: "" };
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>;
      },
    },
  ];

  const summaryCards = useMemo(() => {
    const by = summary.data?.by_status ?? {};
    return [
      { key: "total", label: "Всего записей", value: summary.data?.total_rows ?? 0, cls: "bg-brand/10 text-brand" },
      { key: "normal", label: "Норма", value: by.normal ?? 0, cls: "bg-emerald-100 text-emerald-700" },
      { key: "late", label: "Опоздания", value: by.late ?? 0, cls: "bg-orange-100 text-orange-700" },
      { key: "absent", label: "Отсутствия", value: by.absent ?? 0, cls: "bg-red-100 text-red-700" },
    ];
  }, [summary.data]);

  return (
    <div>
      <PageHeader
        title="Отчёты"
        subtitle="Сводный табель рабочего времени с фильтрами и экспортом"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => reportsApi.download("csv", filters)}>
              <FileText className="h-4 w-4" /> CSV
            </Button>
            <Button variant="secondary" onClick={() => reportsApi.download("excel", filters)}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button onClick={() => reportsApi.download("pdf", filters)}>
              <FileDown className="h-4 w-4" /> PDF
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {summaryCards.map((c) => (
          <div
            key={c.key}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-sm font-semibold ${c.cls}`}>
                {c.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">С</span>
          <input
            type="date"
            value={filters.date_from ?? ""}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <span className="text-sm text-slate-500">по</span>
          <input
            type="date"
            value={filters.date_to ?? ""}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <select
          value={filters.organization_id ?? ""}
          onChange={(e) => setFilters({ ...filters, organization_id: e.target.value || undefined })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Все организации</option>
          {orgs.data?.items.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <select
          value={filters.department_id ?? ""}
          onChange={(e) => setFilters({ ...filters, department_id: e.target.value || undefined })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Все отделы</option>
          {deps.data?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={filters.branch_id ?? ""}
          onChange={(e) => setFilters({ ...filters, branch_id: e.target.value || undefined })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Все филиалы</option>
          {branches.data?.items.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={filters.status ?? ""}
          onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v.text}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(r) => `${r.external_id}-${r.date}`}
        loading={isLoading}
        empty="Записей не найдено. Запустите пересчёт табеля во вкладке «Приход/уход»."
      />
    </div>
  );
}
