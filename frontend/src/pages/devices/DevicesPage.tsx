import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Cpu, Pencil, Plus, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { branchesApi } from "@/api/branches";
import { devicesApi } from "@/api/devices";
import type { Device } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Field, Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";

const PURPOSE_LABEL: Record<string, string> = {
  entry: "Вход",
  exit: "Выход",
  warehouse: "Склад",
  server_room: "Серверная",
  main: "Главный вход",
};

interface Form {
  branch_id?: string | null;
  name?: string;
  type?: string;
  ip?: string;
  port?: number;
  username?: string;
  password?: string;
  purpose?: string;
  timezone_offset?: number;
  comment?: string;
}

const TIMEZONES: { value: number; label: string }[] = [
  { value: 0, label: "UTC (Лондон)" },
  { value: 3, label: "UTC+3 (Москва)" },
  { value: 4, label: "UTC+4 (Ереван, Баку)" },
  { value: 5, label: "UTC+5 (Ташкент, Худжанд, Алматы)" },
  { value: 6, label: "UTC+6 (Бишкек, Астана)" },
  { value: 7, label: "UTC+7 (Бангкок, Новосиб)" },
  { value: 8, label: "UTC+8 (Пекин)" },
];

export default function DevicesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [form, setForm] = useState<Form>({});
  const [testResult, setTestResult] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: () => devicesApi.list({ page_size: 200 }),
  });
  const branches = useQuery({
    queryKey: ["branches", "all"],
    queryFn: () => branchesApi.list({ page_size: 200 }),
  });
  const branchMap = useMemo(
    () => new Map((branches.data?.items ?? []).map((b) => [b.id, b.name])),
    [branches.data],
  );

  const saveMut = useMutation({
    mutationFn: (payload: Form) =>
      editing
        ? devicesApi.update(editing.id, payload)
        : devicesApi.create({ ...(payload as Partial<Device>), password: payload.password ?? "" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
      close();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => devicesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });

  const testMut = useMutation({
    mutationFn: (id: string) => devicesApi.test(id),
    onSuccess: (res, id) => {
      setTestResult((p) => ({ ...p, [id]: res.detail }));
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (err: unknown, id) =>
      setTestResult((p) => ({
        ...p,
        [id]: (err as Error)?.message ?? "Ошибка проверки",
      })),
  });

  const syncMut = useMutation({
    mutationFn: (id: string) => devicesApi.sync(id),
    onSuccess: (_, id) =>
      setTestResult((p) => ({ ...p, [id]: "Задача синхронизации поставлена в очередь" })),
  });

  const timeSyncMut = useMutation({
    mutationFn: (id: string) => devicesApi.syncTime(id),
    onSuccess: (res, id) =>
      setTestResult((p) => ({ ...p, [id]: res.detail })),
  });

  function openCreate() {
    setEditing(null);
    setForm({
      port: 80,
      type: "multi",
      purpose: "entry",
      username: "admin",
      timezone_offset: 5,
    });
    setOpen(true);
  }
  function openEdit(d: Device) {
    setEditing(d);
    setForm({
      branch_id: d.branch_id,
      name: d.name,
      type: d.type,
      ip: d.ip,
      port: d.port,
      username: d.username,
      purpose: d.purpose,
      timezone_offset: d.timezone_offset ?? 5,
      comment: d.comment ?? "",
    });
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setEditing(null);
    setForm({});
  }

  return (
    <div>
      <PageHeader
        title="Устройства"
        subtitle="Терминалы Hikvision: статус, синхронизация, проверка связи"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Добавить устройство
          </Button>
        }
      />

      {isLoading && <div className="py-10 text-center text-slate-400">Загрузка…</div>}
      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400 dark:border-slate-700 dark:bg-slate-900">
          Устройств пока нет. Нажмите «Добавить устройство».
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.items.map((d) => (
          <div
            key={d.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">{d.name}</div>
                  <div className="text-xs text-slate-500">
                    {PURPOSE_LABEL[d.purpose] ?? d.purpose}
                    {d.branch_id && ` · ${branchMap.get(d.branch_id) ?? ""}`}
                  </div>
                </div>
              </div>
              {d.online ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <Wifi className="h-3 w-3" /> online
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <WifiOff className="h-3 w-3" /> offline
                </span>
              )}
            </div>

            <div className="mb-3 grid grid-cols-2 gap-y-1 text-xs text-slate-500">
              <span>Адрес</span>
              <span className="text-right font-mono text-slate-700 dark:text-slate-300">
                {d.ip}:{d.port}
              </span>
              <span>Серийный</span>
              <span className="text-right font-mono text-slate-700 dark:text-slate-300">
                {d.serial_number ?? "—"}
              </span>
              <span>Прошивка</span>
              <span className="text-right font-mono text-slate-700 dark:text-slate-300">
                {d.firmware ?? "—"}
              </span>
            </div>

            {testResult[d.id] && (
              <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
                {testResult[d.id]}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => testMut.mutate(d.id)}
                disabled={testMut.isPending}
              >
                <Wifi className="h-3.5 w-3.5" /> Проверить
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => syncMut.mutate(d.id)}
                disabled={syncMut.isPending}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Синк
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => timeSyncMut.mutate(d.id)}
                disabled={timeSyncMut.isPending}
                title="Синхронизировать время устройства с временем сервера"
              >
                <Clock className="h-3.5 w-3.5" /> Время
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openEdit(d)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => confirm(`Удалить устройство "${d.name}"?`) && deleteMut.mutate(d.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Drawer
        open={open}
        onClose={close}
        title={editing ? "Редактировать устройство" : "Новое устройство"}
        footer={
          <>
            <Button variant="secondary" onClick={close}>Отмена</Button>
            <Button
              onClick={() => saveMut.mutate(form)}
              disabled={
                saveMut.isPending ||
                !form.name?.trim() ||
                !form.ip?.trim() ||
                !form.username?.trim() ||
                (!editing && !form.password)
              }
            >
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Название" required>
            <Input
              placeholder="напр. Главный вход"
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="IP-адрес" required>
              <Input
                placeholder="192.168.1.100"
                value={form.ip ?? ""}
                onChange={(e) => setForm({ ...form, ip: e.target.value })}
              />
            </Field>
            <Field label="Порт">
              <Input
                type="number"
                value={form.port ?? 80}
                onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Логин" required>
              <Input
                value={form.username ?? ""}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
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
          </div>
          <Field label="Назначение">
            <select
              value={form.purpose ?? "entry"}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {Object.entries(PURPOSE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Филиал">
            <select
              value={form.branch_id ?? ""}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value || null })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">— не привязано —</option>
              {branches.data?.items.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Часовой пояс устройства">
            <select
              value={form.timezone_offset ?? 5}
              onChange={(e) => setForm({ ...form, timezone_offset: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Тип устройства">
            <select
              value={form.type ?? "multi"}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="multi">Комбинированное (лицо + отпечаток + карта)</option>
              <option value="face">Распознавание лиц</option>
              <option value="fingerprint">Отпечаток пальца</option>
              <option value="card">Карта</option>
            </select>
          </Field>
        </div>
      </Drawer>
    </div>
  );
}
