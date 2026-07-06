import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Plus, Router, Trash2, Wifi, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { branchesApi } from "@/api/branches";
import { gatewaysApi } from "@/api/gateways";
import type { Gateway, GatewayCreated } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";

interface Form {
  branch_id?: string | null;
  name?: string;
  comment?: string;
}

export default function GatewaysPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Gateway | null>(null);
  const [form, setForm] = useState<Form>({});
  const [issuedToken, setIssuedToken] = useState<GatewayCreated | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["gateways"],
    queryFn: () => gatewaysApi.list({ page_size: 200 }),
  });
  const branches = useQuery({
    queryKey: ["branches", "all"],
    queryFn: () => branchesApi.list({ page_size: 200 }),
  });
  const branchMap = useMemo(
    () => new Map((branches.data?.items ?? []).map((b) => [b.id, b.name])),
    [branches.data],
  );

  const createMut = useMutation({
    mutationFn: (body: Form) => gatewaysApi.create(body),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["gateways"] });
      setIssuedToken(created);
      close();
    },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Form }) => gatewaysApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gateways"] });
      close();
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => gatewaysApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gateways"] }),
  });
  const regenMut = useMutation({
    mutationFn: (id: string) => gatewaysApi.regenerateToken(id),
    onSuccess: (created) => setIssuedToken(created),
  });

  function openCreate() {
    setEditing(null);
    setForm({});
    setOpen(true);
  }
  function openEdit(g: Gateway) {
    setEditing(g);
    setForm({ branch_id: g.branch_id, name: g.name, comment: g.comment ?? "" });
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setEditing(null);
    setForm({});
  }
  function submit() {
    if (editing) updateMut.mutate({ id: editing.id, body: form });
    else createMut.mutate(form);
  }

  return (
    <div>
      <PageHeader
        eyebrow="/ сеть · шлюзы"
        title="Edge Gateway"
        subtitle="Локальные агенты в сети клиента — доступ к устройствам за NAT"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Добавить шлюз
          </Button>
        }
      />

      {issuedToken && (
        <div className="mb-6 rounded-cards border border-signal-orange/40 bg-signal-orange/5 p-5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-signal-orange">
            Токен «{issuedToken.name}» — показывается один раз, сохраните его
          </div>
          <code className="block break-all rounded-inputs border border-ice-white/14 bg-void-black/60 px-3 py-2 text-body-sm text-ice-white">
            {issuedToken.token}
          </code>
          <div className="mt-3 font-mono text-[10px] leading-relaxed tracking-[0.08em] text-fog-text">
            Запуск агента на машине в LAN клиента:
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-ice-white/80">
{`export CLOUD_WS_URL="wss://<сервер>/api/v1/gateways/ws"
export GATEWAY_TOKEN="${issuedToken.token}"
python -m edge.agent`}
            </pre>
          </div>
          <button
            onClick={() => setIssuedToken(null)}
            className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text hover:text-ice-white"
          >
            скрыть
          </button>
        </div>
      )}

      {isLoading && <Loading />}
      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <EmptyState icon={<Router className="h-6 w-6" strokeWidth={1.5} />}>
          Шлюзов пока нет. Добавьте шлюз и запустите агент в сети клиента.
        </EmptyState>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.items.map((g) => (
          <Card key={g.id} hoverable>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-ice-white/30">
                  <Router className="h-4 w-4 text-electric-cobalt" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-body-sm tracking-[-0.01em] text-ice-white">
                    {g.name}
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
                    {g.branch_id ? branchMap.get(g.branch_id) ?? "—" : "без филиала"}
                  </div>
                </div>
              </div>
              {g.online ? (
                <Badge tone="success" icon={<Wifi className="h-3 w-3" strokeWidth={1.5} />}>
                  online
                </Badge>
              ) : (
                <Badge tone="neutral" icon={<WifiOff className="h-3 w-3" strokeWidth={1.5} />}>
                  offline
                </Badge>
              )}
            </div>

            <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.12em] text-fog-text">
              {g.last_seen_at
                ? `последний контакт: ${new Date(g.last_seen_at).toLocaleString()}`
                : "ещё не подключался"}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => regenMut.mutate(g.id)}
                disabled={regenMut.isPending}
              >
                <KeyRound className="h-3.5 w-3.5" /> Новый токен
              </Button>
              <Button size="sm" variant="secondary" onClick={() => openEdit(g)}>
                <Pencil className="h-3.5 w-3.5" /> Изменить
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => confirm(`Удалить шлюз "${g.name}"?`) && deleteMut.mutate(g.id)}
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
        title={editing ? "Изменить шлюз" : "Новый шлюз"}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Отмена
            </Button>
            <Button onClick={submit} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Название" required>
            <Input
              placeholder="напр. Шлюз · офис Худжанд"
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Филиал">
            <select
              value={form.branch_id ?? ""}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value || null })}
              className="w-full rounded-inputs border border-ice-white/14 bg-carbon/60 px-3 py-2 text-body-sm text-ice-white outline-none hover:border-ice-white/30 focus:border-electric-cobalt"
            >
              <option value="">— не привязано —</option>
              {branches.data?.items.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Комментарий">
            <Input
              value={form.comment ?? ""}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />
          </Field>
        </div>
      </Drawer>
    </div>
  );
}
