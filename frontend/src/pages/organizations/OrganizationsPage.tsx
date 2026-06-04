import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { orgsApi } from "@/api/organizations";
import type { Organization } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";

type Form = Partial<Organization>;

export default function OrganizationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [form, setForm] = useState<Form>({});

  const { data, isLoading } = useQuery({
    queryKey: ["organizations", search],
    queryFn: () => orgsApi.list({ search: search || undefined, page_size: 100 }),
  });

  const saveMut = useMutation({
    mutationFn: (payload: Form) =>
      editing ? orgsApi.update(editing.id, payload) : orgsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organizations"] });
      closeDrawer();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => orgsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizations"] }),
  });

  function openCreate() {
    setEditing(null);
    setForm({});
    setOpen(true);
  }

  function openEdit(o: Organization) {
    setEditing(o);
    setForm(o);
    setOpen(true);
  }

  function closeDrawer() {
    setOpen(false);
    setEditing(null);
    setForm({});
  }

  const columns: Column<Organization>[] = [
    { key: "name", header: "Название", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "inn", header: "ИНН" },
    { key: "phone", header: "Телефон" },
    { key: "email", header: "Email" },
    { key: "responsible_person", header: "Ответственный" },
    {
      key: "actions",
      header: "",
      width: "100px",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(r);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Удалить организацию "${r.name}"?`)) deleteMut.mutate(r.id);
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
        title="Организации"
        subtitle="Юридические лица, которым принадлежат филиалы и сотрудники"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Добавить
          </Button>
        }
      />

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
        onClose={closeDrawer}
        title={editing ? "Редактировать организацию" : "Новая организация"}
        footer={
          <>
            <Button variant="secondary" onClick={closeDrawer}>
              Отмена
            </Button>
            <Button
              onClick={() => saveMut.mutate(form)}
              disabled={!form.name?.trim() || saveMut.isPending}
            >
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Название" required>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ИНН">
              <Input value={form.inn ?? ""} onChange={(e) => setForm({ ...form, inn: e.target.value })} />
            </Field>
            <Field label="Телефон">
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Адрес">
            <Input
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Ответственный">
              <Input
                value={form.responsible_person ?? ""}
                onChange={(e) => setForm({ ...form, responsible_person: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Комментарий">
            <Textarea
              value={form.comment ?? ""}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />
          </Field>
        </div>
      </Drawer>
    </div>
  );
}
