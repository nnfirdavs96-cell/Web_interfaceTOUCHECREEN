import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { branchesApi } from "@/api/branches";
import { orgsApi } from "@/api/organizations";
import type { Branch } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkingHoursPicker } from "@/components/ui/WorkingHoursPicker";

type Form = Partial<Branch>;

export default function BranchesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<Form>({});

  const { data, isLoading } = useQuery({
    queryKey: ["branches", search],
    queryFn: () => branchesApi.list({ search: search || undefined, page_size: 100 }),
  });

  const orgs = useQuery({
    queryKey: ["organizations", "all"],
    queryFn: () => orgsApi.list({ page_size: 200 }),
  });

  const orgMap = useMemo(
    () => new Map((orgs.data?.items ?? []).map((o) => [o.id, o.name])),
    [orgs.data],
  );

  const saveMut = useMutation({
    mutationFn: (payload: Form) =>
      editing ? branchesApi.update(editing.id, payload) : branchesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      close();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => branchesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches"] }),
  });

  function openCreate() {
    setEditing(null);
    setForm({ organization_id: orgs.data?.items[0]?.id });
    setOpen(true);
  }
  function openEdit(b: Branch) {
    setEditing(b);
    setForm(b);
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setEditing(null);
    setForm({});
  }

  const columns: Column<Branch>[] = [
    { key: "name", header: "Название", render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: "organization_id",
      header: "Организация",
      render: (r) => orgMap.get(r.organization_id) ?? "—",
    },
    { key: "address", header: "Адрес" },
    { key: "working_hours", header: "Часы работы" },
    { key: "responsible", header: "Ответственный" },
    {
      key: "actions",
      header: "",
      width: "100px",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Удалить филиал "${r.name}"?`)) deleteMut.mutate(r.id);
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
        title="Филиалы / Точки"
        subtitle="Физические точки присутствия: офисы, магазины, склады"
        actions={
          <Button onClick={openCreate} disabled={(orgs.data?.items.length ?? 0) === 0}>
            <Plus className="h-4 w-4" /> Добавить
          </Button>
        }
      />

      {(orgs.data?.items.length ?? 0) === 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
          Сначала создайте хотя бы одну организацию.
        </div>
      )}

      <div className="mb-4">
        <Input
          placeholder="Поиск по названию…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
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
        title={editing ? "Редактировать филиал" : "Новый филиал"}
        footer={
          <>
            <Button variant="secondary" onClick={close}>Отмена</Button>
            <Button
              onClick={() => saveMut.mutate(form)}
              disabled={!form.name?.trim() || !form.organization_id || saveMut.isPending}
            >
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Организация" required>
            <select
              value={form.organization_id ?? ""}
              onChange={(e) => setForm({ ...form, organization_id: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="" disabled>Выберите…</option>
              {orgs.data?.items.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Название" required>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Адрес">
            <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ответственный">
              <Input value={form.responsible ?? ""} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
            </Field>
            <Field label="Телефон">
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <Field label="График работы">
            <WorkingHoursPicker
              value={form.working_hours ?? ""}
              onChange={(v) => setForm({ ...form, working_hours: v })}
            />
          </Field>
          <Field label="Комментарий">
            <Textarea value={form.comment ?? ""} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          </Field>
        </div>
      </Drawer>
    </div>
  );
}
