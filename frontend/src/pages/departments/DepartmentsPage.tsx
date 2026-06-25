import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { depsApi } from "@/api/departments";
import { orgsApi } from "@/api/organizations";
import type { Department } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";

interface TreeNode {
  dep: Department;
  children: TreeNode[];
}

function buildTree(items: Department[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  items.forEach((d) => map.set(d.id, { dep: d, children: [] }));
  const roots: TreeNode[] = [];
  items.forEach((d) => {
    const node = map.get(d.id)!;
    if (d.parent_id && map.has(d.parent_id)) {
      map.get(d.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [orgId, setOrgId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState<Partial<Department>>({});

  const orgs = useQuery({
    queryKey: ["organizations", "all"],
    queryFn: () => orgsApi.list({ page_size: 200 }),
  });

  const effectiveOrgId = orgId || orgs.data?.items[0]?.id || "";

  const { data: deps = [], isLoading } = useQuery({
    queryKey: ["departments", effectiveOrgId],
    queryFn: () => depsApi.list(effectiveOrgId),
    enabled: !!effectiveOrgId,
  });

  const tree = useMemo(() => buildTree(deps), [deps]);

  const saveMut = useMutation({
    mutationFn: (payload: Partial<Department>) =>
      editing ? depsApi.update(editing.id, payload) : depsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      close();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => depsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });

  function openCreate(parent?: Department) {
    setEditing(null);
    setForm({ organization_id: effectiveOrgId, parent_id: parent?.id ?? null });
    setOpen(true);
  }
  function openEdit(d: Department) {
    setEditing(d);
    setForm(d);
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
        eyebrow="/ структура · иерархия"
        title="Отделы"
        subtitle="Иерархическая структура подразделений организации"
        actions={
          <Button onClick={() => openCreate()} disabled={!effectiveOrgId}>
            <Plus className="h-4 w-4" /> Добавить корневой
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-slate-500">Организация:</span>
        <select
          value={effectiveOrgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          {orgs.data?.items.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        {isLoading && <div className="py-10 text-center text-slate-400">Загрузка…</div>}
        {!isLoading && tree.length === 0 && (
          <div className="py-10 text-center text-slate-400">Отделов пока нет</div>
        )}
        <ul className="space-y-0.5">
          {tree.map((node) => (
            <TreeRow
              key={node.dep.id}
              node={node}
              level={0}
              onAdd={openCreate}
              onEdit={openEdit}
              onDelete={(d) =>
                confirm(`Удалить отдел "${d.name}" и всех потомков?`) && deleteMut.mutate(d.id)
              }
            />
          ))}
        </ul>
      </div>

      <Drawer
        open={open}
        onClose={close}
        title={editing ? "Редактировать отдел" : "Новый отдел"}
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
          <Field label="Название" required>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Родительский отдел">
            <select
              value={form.parent_id ?? ""}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value || null })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">— корневой —</option>
              {deps
                .filter((d) => d.id !== editing?.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </select>
          </Field>
          <Field label="Комментарий">
            <Textarea value={form.comment ?? ""} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          </Field>
        </div>
      </Drawer>
    </div>
  );
}

function TreeRow({
  node,
  level,
  onAdd,
  onEdit,
  onDelete,
}: {
  node: TreeNode;
  level: number;
  onAdd: (parent?: Department) => void;
  onEdit: (d: Department) => void;
  onDelete: (d: Department) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div
        className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
        style={{ paddingLeft: 8 + level * 20 }}
      >
        <button onClick={() => setOpen(!open)} className="text-slate-400">
          <ChevronRight
            className={`h-4 w-4 transition ${open ? "rotate-90" : ""} ${
              hasChildren ? "" : "opacity-0"
            }`}
          />
        </button>
        <FolderTree className="h-4 w-4 text-brand" />
        <span className="flex-1 text-sm">{node.dep.name}</span>
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
          <Button size="sm" variant="ghost" onClick={() => onAdd(node.dep)} title="Добавить подотдел">
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit(node.dep)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(node.dep)}>
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      </div>
      {open && hasChildren && (
        <ul className="space-y-0.5">
          {node.children.map((c) => (
            <TreeRow
              key={c.dep.id}
              node={c}
              level={level + 1}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
