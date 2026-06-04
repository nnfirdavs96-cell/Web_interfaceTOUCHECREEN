import { LogOut, Moon, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Поиск сотрудников, устройств, отчётов…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-800"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setDark((d) => !d)}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="ml-2 flex items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-800">
          <div className="text-right">
            <div className="text-sm font-medium leading-tight">{user?.full_name}</div>
            <div className="text-xs text-slate-500">{user?.role}</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
            {user?.full_name?.[0] ?? "U"}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
