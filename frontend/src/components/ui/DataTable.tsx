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
  empty = "NO DATA",
}: Props<T>) {
  return (
    <div className="overflow-hidden rounded-cards border border-ice-white/14 bg-carbon">
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead className="border-b border-ice-white/14 bg-slate/30">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={cn(
                    "px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-ice-white/70",
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
                <td colSpan={columns.length} className="py-12 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
                  LOADING…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
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
                    "border-t border-ice-white/8 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-slate/40",
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn("px-4 py-3 text-ice-white/90", c.className)}
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
    </div>
  );
}
