import { Globe, LogOut, Moon, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth";
import { LANGS } from "@/i18n";
import { useAuthStore } from "@/stores/auth";

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [langOpen, setLangOpen] = useState(false);

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

  const currentLang = LANGS.find((l) => l.code === i18n.resolvedLanguage) ?? LANGS[0];

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder={t("app.search")}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-sm shadow-soft outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600 dark:focus:bg-slate-800"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Language"
          >
            <Globe className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">{currentLang.code}</span>
          </button>
          {langOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated dark:border-slate-700 dark:bg-slate-900 animate-slide-up"
              onMouseLeave={() => setLangOpen(false)}
            >
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    void i18n.changeLanguage(l.code);
                    setLangOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    l.code === currentLang.code
                      ? "font-medium text-brand bg-brand/5 dark:bg-brand/10"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setDark((d) => !d)}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="ml-2 flex items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-800">
          <div className="text-right">
            <div className="text-sm font-medium leading-tight">{user?.full_name}</div>
            <div className="text-[11px] text-slate-500">{user?.role}</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white shadow-soft">
            {user?.full_name?.[0] ?? "U"}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
