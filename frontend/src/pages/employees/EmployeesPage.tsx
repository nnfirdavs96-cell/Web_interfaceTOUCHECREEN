import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cpu, ExternalLink, Pencil, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { branchesApi } from "@/api/branches";
import { depsApi } from "@/api/departments";
import { devicesApi } from "@/api/devices";
import { employeesApi } from "@/api/employees";
import { orgsApi } from "@/api/organizations";
import type { Employee } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";

type Form = Partial<Employee>;

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  active: {
    text: "Активен",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  inactive: {
    text: "Отключён",
    cls: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
};

function initials(emp: Employee) {
  return `${emp.last_name?.[0] ?? ""}${emp.first_name?.[0] ?? ""}`.toUpperCase();
}

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Form>({});

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<Employee | null>(null);
  const [assignDevices, setAssignDevices] = useState<Set<string>>(new Set());

  const orgs = useQuery({ queryKey: ["organizations", "all"], queryFn: () => orgsApi.list({ page_size: 200 }) });
  const deps = useQuery({ queryKey: ["departments", "all"], queryFn: () => depsApi.list() });
  const branches = useQuery({ queryKey: ["branches", "all"], queryFn: () => branchesApi.list({ page_size: 200 }) });
  const devices = useQuery({ queryKey: ["devices", "all"], queryFn: () => devicesApi.list({ page_size: 200 }) });

  const { data, isLoading } = useQuery({
    queryKey: ["employees", search, orgFilter, statusFilter],
    queryFn: () =>
      employeesApi.list({
        search: search || undefined,
        organization_id: orgFilter || undefined,
        status: statusFilter || undefined,
        page_size: 100,
      }),
  });

  const depMap = useMemo(() => new Map((deps.data ?? []).map((d) => [d.id, d.name])), [deps.data]);
  const branchMap = useMemo(
    () => new Map((branches.data?.items ?? []).map((b) => [b.id, b.name])),
    [branches.data],
  );

  const saveMut = useMutation({
    mutationFn: (payload: Form) =>
      editing ? employeesApi.update(editing.id, payload) : employeesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      close();
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => employeesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
  const assignMut = useMutation({
    mutationFn: () =>
      employeesApi.assignDevices(assignFor!.id, {
        device_ids: Array.from(assignDevices),
        access_level: "default",
      }),
    onSuccess: () => {
      setAssignOpen(false);
      setAssignFor(null);
      setAssignDevices(new Set());
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ status: "active" });
    setOpen(true);
  }
  function openEdit(e: Employee) {
    setEditing(e);
    setForm(e);
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setEditing(null);
    setForm({});
  }

  async function openAssign(e: Employee) {
    setAssignFor(e);
    setAssignDevices(new Set());
    setAssignOpen(true);
    try {
      const existing = await employeesApi.access(e.id);
      setAssignDevices(new Set(existing.map((a) => a.device_id)));
    } catch {
      // ignore
    }
  }

  function toggleDevice(id: string) {
    const next = new Set(assignDevices);
    next.has(id) ? next.delete(id) : next.add(id);
    setAssignDevices(next);
  }

  const columns: Column<Employee>[] = [
    {
      key: "name",
      header: "Сотрудник",
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
            {initials(r)}
          </div>
          <div>
            <div className="font-medium">
              {r.last_name} {r.first_name} {r.middle_name ?? ""}
            </div>
            <div className="text-xs text-slate-500">{r.position ?? "—"}</div>
          </div>
        </div>
      ),
    },
    { key: "external_id", header: "ID", width: "100px" },
    {
      key: "department_id",
      header: "Отдел",
      render: (r) => (r.department_id ? (depMap.get(r.department_id) ?? "—") : "—"),
    },
    {
      key: "branch_id",
      header: "Филиал",
      render: (r) => (r.branch_id ? (branchMap.get(r.branch_id) ?? "—") : "—"),
    },
    { key: "phone", header: "Телефон" },
    {
      key: "status",
      header: "Статус",
      width: "110px",
      render: (r) => {
        const s = STATUS_LABEL[r.status] ?? { text: r.status, cls: "" };
        return (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      width: "180px",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Link
            to={`/employees/${r.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Открыть карточку"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Button
            size="sm"
            variant="ghost"
            title="Назначить устройства"
            onClick={(e) => {
              e.stopPropagation();
              openAssign(r);
            }}
          >
            <Cpu className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Удалить сотрудника "${r.last_name} ${r.first_name}"?`)) deleteMut.mutate(r.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="/ реестр · персонал"
        title="Сотрудники"
        subtitle="Реестр сотрудников, привязка к устройствам и расписаниям"
        actions={
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4" /> Добавить
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Поиск по ФИО, ID, телефону…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Все организации</option>
          {orgs.data?.items.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Все статусы</option>
          <option value="active">Активные</option>
          <option value="inactive">Отключённые</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        loading={isLoading}
        onRowClick={openEdit}
      />

      <Drawer
        open={open}
        onClose={close}
        title={editing ? "Редактировать сотрудника" : "Новый сотрудник"}
        width="lg"
        footer={
          <>
            <Button variant="secondary" onClick={close}>Отмена</Button>
            <Button
              onClick={() => saveMut.mutate(form)}
              disabled={!form.first_name?.trim() || !form.last_name?.trim() || saveMut.isPending}
            >
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Фамилия" required>
              <Input value={form.last_name ?? ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </Field>
            <Field label="Имя" required>
              <Input value={form.first_name ?? ""} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </Field>
            <Field label="Отчество">
              <Input value={form.middle_name ?? ""} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID сотрудника (для 1С)">
              <Input
                placeholder="оставь пустым — присвоится автоматически"
                value={form.external_id ?? ""}
                onChange={(e) => setForm({ ...form, external_id: e.target.value })}
              />
            </Field>
            <Field label="Должность">
              <Input value={form.position ?? ""} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Телефон">
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          </div>
          <Field label="Организация">
            <select
              value={form.organization_id ?? ""}
              onChange={(e) => setForm({ ...form, organization_id: e.target.value || null })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">— не выбрано —</option>
              {orgs.data?.items.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Отдел">
              <select
                value={form.department_id ?? ""}
                onChange={(e) => setForm({ ...form, department_id: e.target.value || null })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">— не выбрано —</option>
                {deps.data
                  ?.filter((d) => !form.organization_id || d.organization_id === form.organization_id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
              </select>
            </Field>
            <Field label="Филиал">
              <select
                value={form.branch_id ?? ""}
                onChange={(e) => setForm({ ...form, branch_id: e.target.value || null })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">— не выбрано —</option>
                {branches.data?.items
                  ?.filter((b) => !form.organization_id || b.organization_id === form.organization_id)
                  .map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Дата приёма на работу">
              <Input
                type="date"
                value={form.hired_at ?? ""}
                onChange={(e) => setForm({ ...form, hired_at: e.target.value })}
              />
            </Field>
            <Field label="Статус">
              <select
                value={form.status ?? "active"}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="active">Активен</option>
                <option value="inactive">Отключён</option>
              </select>
            </Field>
          </div>
          <Field label="Комментарий">
            <Textarea value={form.comment ?? ""} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          </Field>
        </div>
      </Drawer>

      <Drawer
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={assignFor ? `Устройства для ${assignFor.last_name} ${assignFor.first_name}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Отмена</Button>
            <Button onClick={() => assignMut.mutate()} disabled={assignDevices.size === 0 || assignMut.isPending}>
              Назначить ({assignDevices.size})
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-500">
          Выберите устройства, к которым у сотрудника будет доступ. Уровень доступа — обычный.
        </p>
        <ul className="space-y-2">
          {devices.data?.items.map((d) => (
            <li key={d.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={assignDevices.has(d.id)}
                  onChange={() => toggleDevice(d.id)}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{d.name}</div>
                  <div className="text-xs text-slate-500">
                    {d.ip}:{d.port} {d.branch_id && `· ${branchMap.get(d.branch_id) ?? ""}`}
                  </div>
                </div>
                {d.online ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    online
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                    offline
                  </span>
                )}
              </label>
            </li>
          ))}
          {(devices.data?.items.length ?? 0) === 0 && (
            <li className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
              Сначала добавьте устройства
            </li>
          )}
        </ul>
      </Drawer>
    </div>
  );
}
