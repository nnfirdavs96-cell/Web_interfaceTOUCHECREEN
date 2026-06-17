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
  normal: { text: "Норма", cls: "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
  late: { text: "Опоздание", cls: "border border-signal-orange/40 bg-signal-orange/10 text-signal-orange" },
  early_leave: { text: "Ранний уход", cls: "border border-amber-500/40 bg-amber-500/10 text-amber-400" },
  absent: { text: "Отсутствие", cls: "border border-red-500/40 bg-red-500/10 text-red-400" },
  partial: { text: "Неполный день", cls: "border border-electric-cobalt/40 bg-electric-cobalt/10 text-electric-cobalt" },
  day_off: { text: "Выходной", cls: "border border-ice-white/14 bg-slate/40 text-ice-white/70" },
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
      { key: "total", code: "01", label: "ВСЕГО ЗАПИСЕЙ", value: summary.data?.total_rows ?? 0, accent: "text-electric-cobalt" },
      { key: "normal", code: "02", label: "НОРМА", value: by.normal ?? 0, accent: "text-emerald-400" },
      { key: "late", code: "03", label: "ОПОЗДАНИЯ", value: by.late ?? 0, accent: "text-signal-orange" },
      { key: "absent", code: "04", label: "ОТСУТСТВИЯ", value: by.absent ?? 0, accent: "text-red-400" },
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

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {summaryCards.map((c) => (
          <div
            key={c.key}
            className="rounded-cards border border-ice-white/14 bg-carbon p-5"
          >
            <div className="flex items-start justify-between">
              <span className={`font-mono text-[10px] uppercase tracking-[0.16em] ${c.accent}`}>
                /{c.code}
              </span>
            </div>
            <div className="mt-5 text-[40px] leading-[1] tracking-[-0.03em] tabular-nums text-ice-white">
              {c.value}
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
              {c.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">С</span>
          <input
            type="date"
            value={filters.date_from ?? ""}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="rounded-inputs border border-ice-white/14 bg-carbon/60 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.06em] text-ice-white outline-none transition-colors hover:border-ice-white/30 focus:border-electric-cobalt"
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">по</span>
          <input
            type="date"
            value={filters.date_to ?? ""}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            className="rounded-inputs border border-ice-white/14 bg-carbon/60 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.06em] text-ice-white outline-none transition-colors hover:border-ice-white/30 focus:border-electric-cobalt"
          />
        </div>
        <select
          value={filters.organization_id ?? ""}
          onChange={(e) => setFilters({ ...filters, organization_id: e.target.value || undefined })}
          className="rounded-inputs border border-ice-white/14 bg-carbon/60 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.06em] text-ice-white outline-none transition-colors hover:border-ice-white/30 focus:border-electric-cobalt"
        >
          <option value="">Все организации</option>
          {orgs.data?.items.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <select
          value={filters.department_id ?? ""}
          onChange={(e) => setFilters({ ...filters, department_id: e.target.value || undefined })}
          className="rounded-inputs border border-ice-white/14 bg-carbon/60 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.06em] text-ice-white outline-none transition-colors hover:border-ice-white/30 focus:border-electric-cobalt"
        >
          <option value="">Все отделы</option>
          {deps.data?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={filters.branch_id ?? ""}
          onChange={(e) => setFilters({ ...filters, branch_id: e.target.value || undefined })}
          className="rounded-inputs border border-ice-white/14 bg-carbon/60 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.06em] text-ice-white outline-none transition-colors hover:border-ice-white/30 focus:border-electric-cobalt"
        >
          <option value="">Все филиалы</option>
          {branches.data?.items.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={filters.status ?? ""}
          onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
          className="rounded-inputs border border-ice-white/14 bg-carbon/60 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.06em] text-ice-white outline-none transition-colors hover:border-ice-white/30 focus:border-electric-cobalt"
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
