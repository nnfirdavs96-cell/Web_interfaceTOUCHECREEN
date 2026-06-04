import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { depsApi } from "@/api/departments";
import { employeesApi } from "@/api/employees";
import { schedulesApi, type ScheduleInput } from "@/api/schedules";
import type { Schedule, ScheduleDay } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function defaultDays(): ScheduleDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    weekday: i,
    is_workday: i < 5,
    start_time: i < 5 ? "09:00:00" : null,
    end_time: i < 5 ? "18:00:00" : null,
    shift_no: 1,
  }));
}

export default function SchedulesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [form, setForm] = useState<ScheduleInput>({ name: "", days: defaultDays() });

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<Schedule | null>(null);
  const [targetType, setTargetType] = useState("employee");
  const [targetIds, setTargetIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => schedulesApi.list(),
  });
  const employees = useQuery({
    queryKey: ["employees", "all"],
    queryFn: () => employeesApi.list({ page_size: 500 }),
    enabled: assignOpen && targetType === "employee",
  });
  const deps = useQuery({
    queryKey: ["departments", "all"],
    queryFn: () => depsApi.list(),
    enabled: assignOpen && targetType === "department",
  });

  const saveMut = useMutation({
    mutationFn: (payload: ScheduleInput) =>
      editing ? schedulesApi.update(editing.id, payload) : schedulesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      close();
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => schedulesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
  const assignMut = useMutation({
    mutationFn: () =>
      schedulesApi.assign(assignFor!.id, {
        target_type: targetType,
        target_ids: Array.from(targetIds),
      }),
    onSuccess: () => {
      setAssignOpen(false);
      setAssignFor(null);
      setTargetIds(new Set());
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", type: "office", days: defaultDays() });
    setOpen(true);
  }
  function openEdit(s: Schedule) {
    setEditing(s);
    setForm({
      name: s.name,
      type: s.type,
      allowed_late_minutes: s.allowed_late_minutes,
      allowed_early_leave_minutes: s.allowed_early_leave_minutes,
      night_shift: s.night_shift,
      lunch_start: s.lunch_start,
      lunch_end: s.lunch_end,
      comment: s.comment,
      days: s.days.length === 7 ? s.days : defaultDays(),
    });
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setEditing(null);
  }

  function updateDay(idx: number, patch: Partial<ScheduleDay>) {
    const days = (form.days ?? defaultDays()).map((d, i) => (i === idx ? { ...d, ...patch } : d));
    setForm({ ...form, days });
  }

  function toggleTarget(id: string) {
    const next = new Set(targetIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setTargetIds(next);
  }

  return (
    <div>
      <PageHeader
        title="Расписания"
        subtitle="Графики работы для сотрудников, отделов и филиалов"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Создать расписание
          </Button>
        }
      />

      {isLoading && <div className="py-10 text-center text-slate-400">Загрузка…</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {data?.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {s.type === "office" ? "Офис" : s.type === "shop" ? "Магазин" : s.type === "security" ? "Охрана" : "Индивидуальный"}
                    {s.night_shift && " · ночная смена"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[10px]">
              {WEEKDAYS.map((w, i) => {
                const d = s.days.find((x) => x.weekday === i);
                return (
                  <div
                    key={i}
                    className={`rounded-md py-1 ${
                      d?.is_workday
                        ? "bg-brand/10 text-brand"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                    }`}
                    title={d?.is_workday ? `${d.start_time}–${d.end_time}` : "Выходной"}
                  >
                    {w}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setAssignFor(s);
                  setTargetIds(new Set());
                  setAssignOpen(true);
                }}
              >
                <Users className="h-3.5 w-3.5" /> Назначить
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => confirm(`Удалить расписание "${s.name}"?`) && deleteMut.mutate(s.id)}
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
        title={editing ? "Редактировать расписание" : "Новое расписание"}
        width="lg"
        footer={
          <>
            <Button variant="secondary" onClick={close}>Отмена</Button>
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
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Тип">
              <select
                value={form.type ?? "office"}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="office">Офис</option>
                <option value="shop">Магазин</option>
                <option value="security">Охрана</option>
                <option value="individual">Индивидуальный</option>
              </select>
            </Field>
            <Field label="Ночная смена">
              <select
                value={String(form.night_shift ?? false)}
                onChange={(e) => setForm({ ...form, night_shift: e.target.value === "true" })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="false">Нет</option>
                <option value="true">Да</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Допустимое опоздание (мин)">
              <Input
                type="number"
                value={form.allowed_late_minutes ?? 10}
                onChange={(e) => setForm({ ...form, allowed_late_minutes: Number(e.target.value) })}
              />
            </Field>
            <Field label="Допустимый ранний уход (мин)">
              <Input
                type="number"
                value={form.allowed_early_leave_minutes ?? 10}
                onChange={(e) =>
                  setForm({ ...form, allowed_early_leave_minutes: Number(e.target.value) })
                }
              />
            </Field>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              Рабочие дни и часы
            </div>
            <div className="space-y-2">
              {(form.days ?? defaultDays()).map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={d.is_workday}
                    onChange={(e) => updateDay(i, { is_workday: e.target.checked })}
                  />
                  <span className="w-10 text-sm font-medium">{WEEKDAYS[i]}</span>
                  <Input
                    type="time"
                    disabled={!d.is_workday}
                    value={d.start_time?.slice(0, 5) ?? ""}
                    onChange={(e) => updateDay(i, { start_time: e.target.value + ":00" })}
                    className="max-w-[120px]"
                  />
                  <span className="text-slate-400">—</span>
                  <Input
                    type="time"
                    disabled={!d.is_workday}
                    value={d.end_time?.slice(0, 5) ?? ""}
                    onChange={(e) => updateDay(i, { end_time: e.target.value + ":00" })}
                    className="max-w-[120px]"
                  />
                </div>
              ))}
            </div>
          </div>

          <Field label="Комментарий">
            <Textarea
              value={form.comment ?? ""}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />
          </Field>
        </div>
      </Drawer>

      <Drawer
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={assignFor ? `Назначить «${assignFor.name}»` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Отмена</Button>
            <Button onClick={() => assignMut.mutate()} disabled={targetIds.size === 0 || assignMut.isPending}>
              Назначить ({targetIds.size})
            </Button>
          </>
        }
      >
        <div className="mb-3 flex gap-2">
          {["employee", "department", "branch"].map((t) => (
            <Button
              key={t}
              size="sm"
              variant={targetType === t ? "primary" : "secondary"}
              onClick={() => {
                setTargetType(t);
                setTargetIds(new Set());
              }}
            >
              {t === "employee" ? "Сотрудники" : t === "department" ? "Отделы" : "Филиалы"}
            </Button>
          ))}
        </div>

        {targetType === "employee" && (
          <ul className="space-y-1 max-h-96 overflow-y-auto">
            {employees.data?.items.map((e) => (
              <li key={e.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={targetIds.has(e.id)}
                    onChange={() => toggleTarget(e.id)}
                  />
                  <span className="text-sm">
                    {e.last_name} {e.first_name}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {targetType === "department" && (
          <ul className="space-y-1 max-h-96 overflow-y-auto">
            {deps.data?.map((d) => (
              <li key={d.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={targetIds.has(d.id)}
                    onChange={() => toggleTarget(d.id)}
                  />
                  <span className="text-sm">{d.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </div>
  );
}
