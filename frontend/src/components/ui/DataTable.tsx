import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  empty = "Нет данных",
}: Props<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/60">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                className={cn(
                  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500",
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-slate-400">
                Загрузка…
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-slate-400">
                {empty}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-t border-slate-100 dark:border-slate-800",
                  onRowClick && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60",
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn("px-4 py-3 text-slate-700 dark:text-slate-300", c.className)}
                  >
                    {c.render
                      ? c.render(row)
                      : ((row as Record<string, React.ReactNode>)[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
