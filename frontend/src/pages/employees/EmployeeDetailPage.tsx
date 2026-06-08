import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Camera,
  ClipboardList,
  CreditCard,
  Cpu,
  FileBarChart,
  Fingerprint,
  Loader2,
  Scan,
  Upload,
  User,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { attendanceApi } from "@/api/attendance";
import { devicesApi } from "@/api/devices";
import { employeesApi, type EnrollResult } from "@/api/employees";
import { reportsApi } from "@/api/reports";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Field, Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuthStore } from "@/stores/auth";
import { useEffect } from "react";

const TABS = [
  { key: "profile", label: "Профиль", icon: User },
  { key: "devices", label: "Устройства", icon: Cpu },
  { key: "credentials", label: "Регистрация", icon: Fingerprint },
  { key: "history", label: "История", icon: ClipboardList },
  { key: "timesheet", label: "Табель", icon: FileBarChart },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function mins(n: number) {
  if (!n) return "—";
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h ? `${h}ч ${m}м` : `${m}м`;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  normal: { text: "Норма", cls: "bg-emerald-100 text-emerald-700" },
  late: { text: "Опоздание", cls: "bg-orange-100 text-orange-700" },
  early_leave: { text: "Ранний уход", cls: "bg-amber-100 text-amber-700" },
  absent: { text: "Отсутствие", cls: "bg-red-100 text-red-700" },
  partial: { text: "Неполный день", cls: "bg-sky-100 text-sky-700" },
  day_off: { text: "Выходной", cls: "bg-slate-200 text-slate-600" },
};

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabKey>("profile");

  const employee = useQuery({
    queryKey: ["employee", id],
    queryFn: () => employeesApi.get(id!),
    enabled: !!id,
  });

  const access = useQuery({
    queryKey: ["employee-access", id],
    queryFn: () => employeesApi.access(id!),
    enabled: !!id && tab === "devices",
  });
  const devices = useQuery({
    queryKey: ["devices", "all"],
    queryFn: () => devicesApi.list({ page_size: 200 }),
    enabled: tab === "devices",
  });
  const devMap = useMemo(
    () => new Map((devices.data?.items ?? []).map((d) => [d.id, d])),
    [devices.data],
  );

  const events = useQuery({
    queryKey: ["employee-events", id],
    queryFn: () =>
      attendanceApi.events({
        employee_id: id,
        page_size: 100,
      }),
    enabled: !!id && tab === "history",
  });

  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const timesheet = useQuery({
    queryKey: ["employee-timesheet", id],
    queryFn: () =>
      reportsApi.timesheet({ employee_id: id, date_from: monthAgo, date_to: today }),
    enabled: !!id && tab === "timesheet",
  });

  const emp = employee.data;

  return (
    <div>
      <div className="mb-4">
        <Link
          to="/employees"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" /> К списку сотрудников
        </Link>
      </div>

      <PageHeader
        title={emp ? `${emp.last_name} ${emp.first_name} ${emp.middle_name ?? ""}` : "Сотрудник"}
        subtitle={emp ? `${emp.position ?? ""} · ID ${emp.external_id ?? emp.id.slice(0, 8)}` : ""}
      />

      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "border-b-2 border-brand text-brand"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && employee.isLoading && (
        <div className="py-10 text-center text-slate-400">Загрузка…</div>
      )}
      {tab === "profile" && employee.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          Не удалось загрузить сотрудника. Возможно, он был удалён или у вас нет прав.
        </div>
      )}
      {tab === "profile" && emp && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProfileField label="ФИО" value={`${emp.last_name} ${emp.first_name} ${emp.middle_name ?? ""}`} />
          <ProfileField label="Внешний ID" value={emp.external_id ?? "—"} />
          <ProfileField label="Должность" value={emp.position ?? "—"} />
          <ProfileField label="Телефон" value={emp.phone ?? "—"} />
          <ProfileField label="Email" value={emp.email ?? "—"} />
          <ProfileField label="Статус" value={emp.status === "active" ? "Активен" : "Отключён"} />
          <ProfileField label="Дата приёма" value={emp.hired_at ?? "—"} />
          <ProfileField label="Комментарий" value={emp.comment ?? "—"} />
        </div>
      )}

      {tab === "devices" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          {(access.data?.length ?? 0) === 0 ? (
            <div className="py-10 text-center text-slate-400">
              Сотруднику ещё не назначены устройства
            </div>
          ) : (
            <ul className="space-y-2">
              {access.data?.map((a) => {
                const d = devMap.get(a.device_id);
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <Cpu className="h-4 w-4 text-brand" />
                      <div>
                        <div className="text-sm font-medium">{d?.name ?? a.device_id.slice(0, 8)}</div>
                        <div className="text-xs text-slate-500">
                          {d ? `${d.ip}:${d.port}` : "—"} · уровень: {a.access_level}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {a.synced_at ? `синк ${new Date(a.synced_at).toLocaleDateString("ru-RU")}` : "не синхронизирован"}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "credentials" && (
        <CredentialsTab employeeId={id!} externalId={emp?.external_id ?? null} />
      )}

      {tab === "history" && (
        <DataTable
          columns={[
            {
              key: "event_time",
              header: "Время",
              width: "180px",
              render: (r) => new Date(r.event_time).toLocaleString("ru-RU"),
            },
            {
              key: "event_type",
              header: "Событие",
              width: "120px",
              render: (r) => (r.event_type === "entry" ? "Вход" : r.event_type === "exit" ? "Выход" : r.event_type),
            },
            {
              key: "device_id",
              header: "Устройство",
              render: (r) => (r.device_id ? devMap.get(r.device_id)?.name ?? "—" : "—"),
            },
          ] as Column<NonNullable<typeof events.data>["items"][number]>[]}
          rows={events.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={events.isLoading}
          empty="Событий нет"
        />
      )}

      {tab === "timesheet" && (
        <>
          <div className="mb-3 flex justify-end">
            <Button
              variant="secondary"
              onClick={() =>
                reportsApi.download("excel", {
                  employee_id: id,
                  date_from: monthAgo,
                  date_to: today,
                })
              }
            >
              Экспорт Excel
            </Button>
          </div>
          <DataTable
            columns={[
              { key: "date", header: "Дата", width: "110px" },
              {
                key: "actual_check_in",
                header: "Факт вход",
                render: (r) =>
                  r.actual_check_in ? new Date(r.actual_check_in).toLocaleTimeString("ru-RU").slice(0, 5) : "—",
              },
              {
                key: "actual_check_out",
                header: "Факт выход",
                render: (r) =>
                  r.actual_check_out ? new Date(r.actual_check_out).toLocaleTimeString("ru-RU").slice(0, 5) : "—",
              },
              { key: "late_minutes", header: "Опозд.", render: (r) => mins(r.late_minutes) },
              { key: "worked_minutes", header: "Отработ.", render: (r) => mins(r.worked_minutes) },
              {
                key: "status",
                header: "Статус",
                render: (r) => {
                  const s = STATUS_LABEL[r.status] ?? { text: r.status, cls: "" };
                  return (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>
                  );
                },
              },
            ] as Column<NonNullable<typeof timesheet.data>["rows"][number]>[]}
            rows={timesheet.data?.rows ?? []}
            rowKey={(r) => r.date}
            loading={timesheet.isLoading}
            empty="Записей нет"
          />
        </>
      )}
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

function CredentialsTab({
  employeeId,
  externalId,
}: {
  employeeId: string;
  externalId: string | null;
}) {
  const qc = useQueryClient();
  const devices = useQuery({
    queryKey: ["devices", "all"],
    queryFn: () => devicesApi.list({ page_size: 200 }),
  });
  const onlineDevices = useMemo(
    () => (devices.data?.items ?? []).filter((d) => d.online),
    [devices.data],
  );
  const [deviceId, setDeviceId] = useState<string>("");
  const effectiveDevice = deviceId || onlineDevices[0]?.id || "";
  const token = useAuthStore((s) => s.accessToken);

  const creds = useQuery({
    queryKey: ["employee-credentials", employeeId],
    queryFn: () => employeesApi.credentials(employeeId),
  });

  const [result, setResult] = useState<EnrollResult | null>(null);
  const [cardNo, setCardNo] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function show(res: EnrollResult) {
    setResult(res);
    qc.invalidateQueries({ queryKey: ["employee-credentials", employeeId] });
  }

  const syncMut = useMutation({
    mutationFn: () => employeesApi.syncToDevice(employeeId, effectiveDevice),
    onSuccess: show,
  });
  const fpMut = useMutation({
    mutationFn: () => employeesApi.enrollFingerprint(employeeId, effectiveDevice, 1),
    onSuccess: show,
  });
  const faceMut = useMutation({
    mutationFn: (file: File) => employeesApi.enrollFace(employeeId, effectiveDevice, file),
    onSuccess: show,
  });
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null);

  async function captureCurrentFrame(): Promise<File | null> {
    if (!effectiveDevice || !token) return null;
    try {
      // Запрашиваем свежий snapshot через наш API (без кэша браузера)
      const url = devicesApi.snapshotUrl(effectiveDevice, token, Date.now());
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) throw new Error(`snapshot HTTP ${resp.status}`);
      const blob = await resp.blob();
      // Сохраняем превью; освобождаем старое URL чтобы не было утечки
      setSnapshotPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      return new File([blob], "snapshot.jpg", { type: "image/jpeg" });
    } catch {
      return null;
    }
  }

  const faceCaptureMut = useMutation({
    mutationFn: async () => {
      const file = await captureCurrentFrame();
      if (!file) {
        throw new Error("snapshot");
      }
      return employeesApi.enrollFace(employeeId, effectiveDevice, file);
    },
    onSuccess: show,
    onError: () =>
      setResult({
        success: false,
        detail: "Не удалось получить кадр с камеры",
        value_ref: null,
      }),
  });
  const cardMut = useMutation({
    mutationFn: () => employeesApi.addCard(employeeId, effectiveDevice, cardNo),
    onSuccess: (res) => {
      show(res);
      if (res.success) setCardNo("");
    },
  });
  const cardCaptureMut = useMutation({
    mutationFn: () => employeesApi.captureCard(employeeId, effectiveDevice),
    onSuccess: show,
  });

  if (!externalId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
        Поле «ID сотрудника (для 1С)» пустое. Откройте профиль и заполните его —
        либо введите свой номер, либо просто оставьте пустым при создании
        нового сотрудника, и система автоматически подберёт следующий
        свободный номер (1001, 1002…).
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">Целевое устройство</h2>
        {onlineDevices.length === 0 ? (
          <div className="text-sm text-slate-500">Нет онлайн-устройств. Проверьте связь.</div>
        ) : (
          <select
            value={effectiveDevice}
            onChange={(e) => setDeviceId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {onlineDevices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.ip}:{d.port})
              </option>
            ))}
          </select>
        )}
      </div>

      {effectiveDevice && <LiveCamera deviceId={effectiveDevice} />}

      {result && (
        <div
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            result.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
          }`}
        >
          {snapshotPreview && (
            <img
              src={snapshotPreview}
              alt="snapshot"
              className="h-20 w-auto shrink-0 rounded border border-slate-300 object-cover dark:border-slate-600"
            />
          )}
          <div className="flex-1">
            <div>
              {result.success ? "✅ " : "❌ "}
              {result.detail}
              {result.value_ref && (
                <span className="ml-2 font-mono text-xs opacity-70">({result.value_ref})</span>
              )}
            </div>
            {snapshotPreview && (
              <div className="mt-1 text-xs opacity-70">↑ кадр, отправленный на устройство</div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          icon={Scan}
          title="1. Регистрация пользователя на устройстве"
          description={`Создаёт employeeNo=${externalId} на устройстве — это обязательный первый шаг перед добавлением отпечатка/лица/карты.`}
        >
          <Button
            onClick={() => syncMut.mutate()}
            disabled={!effectiveDevice || syncMut.isPending}
          >
            {syncMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Отправить на устройство
          </Button>
        </Section>

        <Section
          icon={Fingerprint}
          title="2. Отпечаток пальца"
          description="После запуска устройство покажет «Поднесите палец». Сотруднику нужно приложить палец 3 раза."
        >
          <Button
            onClick={() => fpMut.mutate()}
            disabled={!effectiveDevice || fpMut.isPending}
          >
            {fpMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Запросить регистрацию
          </Button>
          {fpMut.isPending && (
            <p className="mt-2 text-xs text-slate-500">
              Ожидание сканирования (до 30 сек)…
            </p>
          )}
        </Section>

        <Section
          icon={Camera}
          title="3. Лицо"
          description="«Сделать снимок» — захватит текущий кадр live-превью и зальёт на устройство (фоном, без действий на терминале — V4.48 не поддерживает enrollment-режим). «Загрузить фото» — выбрать готовый JPG с компьютера."
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) faceMut.mutate(f);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => faceCaptureMut.mutate()}
              disabled={!effectiveDevice || faceCaptureMut.isPending}
            >
              {faceCaptureMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Camera className="h-4 w-4" /> Сделать снимок
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={!effectiveDevice || faceMut.isPending}
            >
              {faceMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Upload className="h-4 w-4" /> Загрузить фото
            </Button>
          </div>
          {faceCaptureMut.isPending && (
            <p className="mt-2 text-xs text-slate-500">
              Снимок с камеры → загрузка на устройство…
            </p>
          )}
        </Section>

        <Section
          icon={CreditCard}
          title="4. RFID-карта"
          description="«Считать с устройства» — терминал перейдёт в режим ожидания, сотрудник приложит карту, номер запишется автоматически. Или введите номер вручную."
        >
          <Button
            onClick={() => cardCaptureMut.mutate()}
            disabled={!effectiveDevice || cardCaptureMut.isPending}
          >
            {cardCaptureMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <CreditCard className="h-4 w-4" /> Считать с устройства
          </Button>
          {cardCaptureMut.isPending && (
            <p className="mt-2 text-xs text-slate-500">
              Приложите карту к терминалу (до 30 сек)…
            </p>
          )}
          <div className="mt-3 flex gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
            <Field label="">
              <Input
                placeholder="или введите номер вручную"
                value={cardNo}
                onChange={(e) => setCardNo(e.target.value.replace(/\s/g, ""))}
              />
            </Field>
            <Button
              variant="secondary"
              onClick={() => cardMut.mutate()}
              disabled={!effectiveDevice || !cardNo.trim() || cardMut.isPending}
            >
              {cardMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Привязать
            </Button>
          </div>
        </Section>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">Зарегистрированные учётные данные</h2>
        {(creds.data?.length ?? 0) === 0 ? (
          <div className="py-4 text-center text-sm text-slate-400">Пока ничего</div>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {creds.data?.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800"
              >
                <div>
                  <span className="font-medium">
                    {c.type === "fingerprint" && "Отпечаток"}
                    {c.type === "face" && "Лицо"}
                    {c.type === "card" && "Карта"}
                    {c.type === "pin" && "PIN"}
                  </span>
                  {c.value_ref && (
                    <span className="ml-2 font-mono text-xs text-slate-500">{c.value_ref}</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {c.enrolled_at && new Date(c.enrolled_at).toLocaleString("ru-RU")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LiveCamera({ deviceId }: { deviceId: string }) {
  const token = useAuthStore((s) => s.accessToken);
  const [tick, setTick] = useState(() => Date.now());
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    setTick(Date.now());
  }, [deviceId]);

  useEffect(() => {
    if (error) return;
    const id = window.setInterval(() => setTick(Date.now()), 1500);
    return () => window.clearInterval(id);
  }, [error]);

  if (!token) return null;
  // DS-K1T343 не отдаёт snapshot по HTTP (только RTSP) — скрываем блок
  if (error) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-900 p-3 dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          LIVE с камеры устройства
        </span>
        <span className="text-[10px]">{new Date(tick).toLocaleTimeString("ru-RU")}</span>
      </div>
      <img
        src={devicesApi.snapshotUrl(deviceId, token, tick)}
        alt="live"
        className="mx-auto max-h-72 rounded-lg"
        onError={() => setError(true)}
      />
      <p className="mt-2 text-center text-[10px] text-slate-500">
        Обновление каждые 1.5 секунды
      </p>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Scan;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="mb-3 text-xs text-slate-500">{description}</p>
      {children}
    </div>
  );
}
