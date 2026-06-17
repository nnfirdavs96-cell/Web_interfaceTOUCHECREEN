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
    <header className="sticky top-0 z-20 flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-mist-border bg-paper/90 px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
        <input
          placeholder={t("app.search")}
          className="w-full rounded-inputs border border-mist-border bg-mist py-2 pl-9 pr-3 text-body-sm outline-none transition-all duration-150 placeholder:text-steel hover:border-steel focus:border-signal focus:bg-paper focus:ring-2 focus:ring-signal/20 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600 dark:focus:bg-slate-800"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-inputs px-2.5 py-2 text-caption text-slate2 transition-colors hover:bg-fog hover:text-navy dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Language"
          >
            <Globe className="h-4 w-4" />
            <span className="text-micro font-semibold uppercase">{currentLang.code}</span>
          </button>
          {langOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-cards border border-mist-border bg-paper shadow-elevated dark:border-slate-700 dark:bg-slate-900 animate-slide-up"
              onMouseLeave={() => setLangOpen(false)}
            >
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    void i18n.changeLanguage(l.code);
                    setLangOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-body-sm transition-colors hover:bg-fog dark:hover:bg-slate-800 ${
                    l.code === currentLang.code
                      ? "font-semibold text-signal bg-signal/5 dark:bg-signal/10"
                      : "text-navy dark:text-slate-300"
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
          className="rounded-inputs p-2 text-slate2 transition-colors hover:bg-fog hover:text-navy dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="ml-2 flex items-center gap-3 border-l border-mist-border pl-3 dark:border-slate-800">
          <div className="text-right">
            <div className="text-caption font-semibold leading-tight text-navy dark:text-white">
              {user?.full_name}
            </div>
            <div className="text-micro text-slate2 dark:text-slate-400">{user?.role}</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-signal text-caption font-bold text-white shadow-soft">
            {user?.full_name?.[0] ?? "U"}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-inputs p-2 text-slate2 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
