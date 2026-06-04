import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { SystemUser } from "@/api/types";
import { usersApi } from "@/api/users";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Field, Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";

interface Form {
  email?: string;
  password?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [form, setForm] = useState<Form>({});

  const roles = useQuery({ queryKey: ["roles"], queryFn: () => usersApi.roles() });
  const { data, isLoading } = useQuery({
    queryKey: ["users", search],
    queryFn: () => usersApi.list({ search: search || undefined, page_size: 100 }),
  });

  const saveMut = useMutation({
    mutationFn: (payload: Form) =>
      editing
        ? usersApi.update(editing.id, {
            full_name: payload.full_name,
            role: payload.role,
            is_active: payload.is_active,
            password: payload.password || undefined,
          })
        : usersApi.create({
            email: payload.email!,
            password: payload.password!,
            full_name: payload.full_name!,
            role: payload.role!,
            is_active: payload.is_active ?? true,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      close();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  function openCreate() {
    setEditing(null);
    setForm({ is_active: true, role: roles.data?.[0]?.code });
    setOpen(true);
  }
  function openEdit(u: SystemUser) {
    setEditing(u);
    setForm({ full_name: u.full_name, role: u.role, is_active: u.is_active, email: u.email });
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setEditing(null);
    setForm({});
  }

  const roleName = (code: string) => roles.data?.find((r) => r.code === code)?.name ?? code;

  const columns: Column<SystemUser>[] = [
    { key: "full_name", header: "Имя", render: (r) => <span className="font-medium">{r.full_name}</span> },
    { key: "email", header: "Email" },
    { key: "role", header: "Роль", render: (r) => roleName(r.role) },
    {
      key: "is_active",
      header: "Статус",
      render: (r) =>
        r.is_active ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            Активен
          </span>
        ) : (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Отключён
          </span>
        ),
    },
    {
      key: "last_login_at",
      header: "Последний вход",
      render: (r) => (r.last_login_at ? new Date(r.last_login_at).toLocaleString("ru-RU") : "—"),
    },
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
              if (confirm(`Удалить пользователя "${r.full_name}"?`)) deleteMut.mutate(r.id);
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
        title="Пользователи системы"
        subtitle="Учётные записи администраторов, HR, бухгалтерии и наблюдателей"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Добавить
          </Button>
        }
      />
      <div className="mb-4">
        <Input
          placeholder="Поиск по имени или email…"
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
        title={editing ? "Редактировать пользователя" : "Новый пользователь"}
        footer={
          <>
            <Button variant="secondary" onClick={close}>Отмена</Button>
            <Button
              onClick={() => saveMut.mutate(form)}
              disabled={
                saveMut.isPending ||
                !form.full_name?.trim() ||
                !form.role ||
                (!editing && (!form.email?.trim() || !form.password))
              }
            >
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="ФИО" required>
            <Input
              value={form.full_name ?? ""}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </Field>
          <Field label="Email" required>
            <Input
              type="email"
              disabled={!!editing}
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label={editing ? "Новый пароль (если меняем)" : "Пароль"} required={!editing}>
            <Input
              type="password"
              autoComplete="new-password"
              value={form.password ?? ""}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="Роль" required>
            <select
              value={form.role ?? ""}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="" disabled>Выберите…</option>
              {roles.data?.map((r) => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Учётная запись активна
          </label>
        </div>
      </Drawer>
    </div>
  );
}
