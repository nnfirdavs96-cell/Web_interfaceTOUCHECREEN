import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Plus,
  RadioTower,
  Trash2,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { branchesApi } from "@/api/branches";
import { camerasApi } from "@/api/cameras";
import { devicesApi } from "@/api/devices";
import type { Camera } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuthStore } from "@/stores/auth";

const VENDOR_LABEL: Record<string, string> = {
  onvif: "ONVIF",
  rtsp: "RTSP (прямой)",
};

interface Form {
  branch_id?: string | null;
  linked_device_id?: string | null;
  name?: string;
  vendor?: string;
  ip?: string;
  port?: number;
  username?: string;
  password?: string;
  rtsp_url?: string;
  comment?: string;
}

/** Snapshot-poll превью (fallback когда MediaMTX выключен). */
function SnapshotPreview({ cameraId }: { cameraId: string }) {
  const token = useAuthStore((s) => s.accessToken);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const objUrl = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    async function tick() {
      if (!token) return;
      try {
        const url = camerasApi.snapshotUrl(cameraId, token, Date.now());
        const resp = await fetch(url, { cache: "no-store" });
        if (!resp.ok) throw new Error(String(resp.status));
        const blob = await resp.blob();
        if (!active) return;
        if (objUrl.current) URL.revokeObjectURL(objUrl.current);
        objUrl.current = URL.createObjectURL(blob);
        setSrc(objUrl.current);
        setFailed(false);
      } catch {
        if (active) setFailed(true);
      }
    }
    void tick();
    const id = setInterval(tick, 2500);
    return () => {
      active = false;
      clearInterval(id);
      if (objUrl.current) URL.revokeObjectURL(objUrl.current);
    };
  }, [cameraId, token]);

  if (src && !failed) {
    return <img src={src} alt="live" className="h-full w-full object-cover" />;
  }
  return (
    <div className="flex flex-col items-center gap-2 text-fog-text">
      <VideoOff className="h-6 w-6" strokeWidth={1.5} />
      <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
        {failed ? "нет сигнала" : "подключение…"}
      </span>
    </div>
  );
}

/** HLS-плеер (через MediaMTX). */
function HlsPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Safari умеет HLS нативно
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 2 });
      hls.loadSource(url);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
  }, [url]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="h-full w-full object-cover"
    />
  );
}

/** Live-превью: HLS через MediaMTX, иначе snapshot-polling. */
function CameraLive({ cameraId }: { cameraId: string }) {
  const { data } = useQuery({
    queryKey: ["camera-stream", cameraId],
    queryFn: () => camerasApi.stream(cameraId),
    staleTime: 60_000,
    retry: false,
  });
  const hlsUrl = data?.live ? data.hls_url : null;

  return (
    <div className="relative mb-4 flex aspect-video w-full items-center justify-center overflow-hidden rounded-inputs border border-ice-white/14 bg-carbon/60">
      {hlsUrl ? (
        <HlsPlayer url={hlsUrl} />
      ) : (
        <SnapshotPreview cameraId={cameraId} />
      )}
      <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full border border-signal-orange/40 bg-void-black/70 px-2 py-0.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-orange" />
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-signal-orange">
          {hlsUrl ? "live" : "snapshot"}
        </span>
      </div>
    </div>
  );
}

export default function CamerasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Camera | null>(null);
  const [form, setForm] = useState<Form>({});
  const [testResult, setTestResult] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["cameras"],
    queryFn: () => camerasApi.list({ page_size: 200 }),
  });
  const branches = useQuery({
    queryKey: ["branches", "all"],
    queryFn: () => branchesApi.list({ page_size: 200 }),
  });
  const devices = useQuery({
    queryKey: ["devices", "all"],
    queryFn: () => devicesApi.list({ page_size: 200 }),
  });

  const branchMap = useMemo(
    () => new Map((branches.data?.items ?? []).map((b) => [b.id, b.name])),
    [branches.data],
  );
  const deviceMap = useMemo(
    () => new Map((devices.data?.items ?? []).map((d) => [d.id, d.name])),
    [devices.data],
  );

  const createMut = useMutation({
    mutationFn: (body: Form & { password: string }) => camerasApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cameras"] });
      close();
    },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Form }) => camerasApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cameras"] });
      close();
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => camerasApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cameras"] }),
  });
  const testMut = useMutation({
    mutationFn: (id: string) => camerasApi.test(id),
    onSuccess: (res, id) => {
      setTestResult((prev) => ({ ...prev, [id]: res.detail }));
      qc.invalidateQueries({ queryKey: ["cameras"] });
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ port: 80, vendor: "onvif", username: "admin" });
    setOpen(true);
  }
  function openEdit(c: Camera) {
    setEditing(c);
    setForm({
      branch_id: c.branch_id,
      linked_device_id: c.linked_device_id,
      name: c.name,
      vendor: c.vendor,
      ip: c.ip,
      port: c.port,
      username: c.username,
      rtsp_url: c.rtsp_url ?? "",
      comment: c.comment ?? "",
    });
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setEditing(null);
    setForm({});
  }

  function submit() {
    if (editing) {
      updateMut.mutate({ id: editing.id, body: form });
    } else {
      createMut.mutate({ ...form, password: form.password ?? "" });
    }
  }

  const selectCls =
    "w-full rounded-inputs border border-ice-white/14 bg-carbon/60 px-3 py-2 text-body-sm text-ice-white outline-none hover:border-ice-white/30 focus:border-electric-cobalt";

  return (
    <div>
      <PageHeader
        eyebrow="/ видео · наблюдение"
        title="Камеры"
        subtitle="IP-камеры ONVIF/RTSP: live-превью, привязка к точкам доступа"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Добавить камеру
          </Button>
        }
      />

      {isLoading && <Loading />}
      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <EmptyState icon={<Video className="h-6 w-6" strokeWidth={1.5} />}>
          Камер пока нет. Нажмите «Добавить камеру».
        </EmptyState>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.items.map((c) => (
          <Card key={c.id} hoverable>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-ice-white/30">
                  <Video className="h-4 w-4 text-electric-cobalt" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-body-sm tracking-[-0.01em] text-ice-white">
                    {c.name}
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
                    {VENDOR_LABEL[c.vendor] ?? c.vendor}
                    {c.branch_id && ` · ${branchMap.get(c.branch_id) ?? ""}`}
                  </div>
                </div>
              </div>
              {c.online ? (
                <Badge tone="success" icon={<Wifi className="h-3 w-3" strokeWidth={1.5} />}>
                  online
                </Badge>
              ) : (
                <Badge tone="neutral" icon={<WifiOff className="h-3 w-3" strokeWidth={1.5} />}>
                  offline
                </Badge>
              )}
            </div>

            <CameraLive cameraId={c.id} />

            <dl className="mb-4 space-y-1.5 font-mono text-[10px] uppercase tracking-[0.12em]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-fog-text">Адрес</dt>
                <dd className="truncate text-ice-white/90">{c.ip}:{c.port}</dd>
              </div>
              {c.linked_device_id && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-fog-text">Точка</dt>
                  <dd className="truncate text-right text-ice-white/90">
                    {deviceMap.get(c.linked_device_id) ?? "—"}
                  </dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-fog-text">Модель</dt>
                <dd className="truncate text-right text-ice-white/90">{c.model ?? "—"}</dd>
              </div>
            </dl>

            {testResult[c.id] && (
              <div className="mb-3 rounded-inputs border border-ice-white/14 bg-carbon/40 px-3 py-2 font-mono text-[10px] leading-relaxed tracking-[0.06em] text-fog-text">
                {testResult[c.id]}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => testMut.mutate(c.id)}
                disabled={testMut.isPending}
              >
                <RadioTower className="h-3.5 w-3.5" /> Проверить
              </Button>
              <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>
                <Pencil className="h-3.5 w-3.5" /> Изменить
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  confirm(`Удалить камеру "${c.name}"?`) && deleteMut.mutate(c.id)
                }
              >
                <Trash2 className="h-3.5 w-3.5" /> Удалить
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Drawer
        open={open}
        onClose={close}
        title={editing ? "Изменить камеру" : "Новая камера"}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Отмена
            </Button>
            <Button
              onClick={submit}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Название" required>
            <Input
              placeholder="напр. Вход · холл"
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Протокол">
            <select
              value={form.vendor ?? "onvif"}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              className={selectCls}
            >
              <option value="onvif">ONVIF (авто-обнаружение)</option>
              <option value="rtsp">RTSP (только прямой URL)</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="IP-адрес" required>
              <Input
                placeholder="192.168.1.64"
                value={form.ip ?? ""}
                onChange={(e) => setForm({ ...form, ip: e.target.value })}
              />
            </Field>
            <Field label="ONVIF-порт">
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
          <Field label="RTSP-URL (опционально, если ONVIF недоступен)">
            <Input
              placeholder="rtsp://192.168.1.64:554/Streaming/Channels/101"
              value={form.rtsp_url ?? ""}
              onChange={(e) => setForm({ ...form, rtsp_url: e.target.value })}
            />
          </Field>
          <Field label="Филиал">
            <select
              value={form.branch_id ?? ""}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value || null })}
              className={selectCls}
            >
              <option value="">— не привязано —</option>
              {branches.data?.items.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Привязать к точке доступа (устройству)">
            <select
              value={form.linked_device_id ?? ""}
              onChange={(e) =>
                setForm({ ...form, linked_device_id: e.target.value || null })
              }
              className={selectCls}
            >
              <option value="">— не привязано —</option>
              {devices.data?.items.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
        </div>
      </Drawer>
    </div>
  );
}
