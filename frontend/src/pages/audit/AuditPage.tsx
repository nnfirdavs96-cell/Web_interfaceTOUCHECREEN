import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { auditApi } from "@/api/audit";
import type { AuditLog } from "@/api/types";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";

const ACTION_LABEL: Record<string, string> = {
  create: "Создание",
  update: "Изменение",
  delete: "Удаление",
};
const ACTION_COLOR: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  update: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
};

export default function AuditPage() {
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit", entityType, action],
    queryFn: () =>
      auditApi.list({
        entity_type: entityType || undefined,
        action: action || undefined,
        page_size: 100,
      }),
  });

  const columns: Column<AuditLog>[] = [
    {
      key: "created_at",
      header: "Дата",
      width: "170px",
      render: (r) => new Date(r.created_at).toLocaleString("ru-RU"),
    },
    {
      key: "action",
      header: "Действие",
      width: "120px",
      render: (r) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLOR[r.action] ?? ""}`}>
          {ACTION_LABEL[r.action] ?? r.action}
        </span>
      ),
    },
    { key: "entity_type", header: "Сущность", width: "140px" },
    {
      key: "entity_id",
      header: "ID",
      render: (r) => (r.entity_id ? <span className="font-mono text-xs">{r.entity_id.slice(0, 8)}…</span> : "—"),
    },
    { key: "ip", header: "IP", width: "120px" },
  ];

  return (
    <div>
      <PageHeader eyebrow="/ журнал · аудит" title="Логи действий" subtitle="История всех изменений в системе" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Все сущности</option>
          <option value="organization">Организации</option>
          <option value="department">Отделы</option>
          <option value="branch">Филиалы</option>
          <option value="user">Пользователи</option>
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Все действия</option>
          <option value="create">Создание</option>
          <option value="update">Изменение</option>
          <option value="delete">Удаление</option>
        </select>
        <Input placeholder="Поиск по ID сущности" className="max-w-xs" disabled />
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        loading={isLoading}
        empty="Записей нет"
      />
    </div>
  );
}
