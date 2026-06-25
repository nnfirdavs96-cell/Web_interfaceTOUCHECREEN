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
  const [langOpen, setLangOpen] = useState(false);
  const [light, setLight] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("light"),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
    document.documentElement.classList.toggle("dark", !light);
    try { localStorage.setItem("ant-theme", light ? "light" : "dark"); } catch {
      // ignore
    }
  }, [light]);

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
    <header className="sticky top-0 z-20 flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-ice-white/14 bg-void-black/90 px-6 backdrop-blur-md">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ice-white/40" strokeWidth={1.5} />
        <input
          placeholder={t("app.search")}
          className="w-full rounded-inputs border border-ice-white/14 bg-carbon/40 py-2 pl-9 pr-3 font-mono text-[12px] tracking-[0.06em] text-ice-white outline-none transition-all duration-150 placeholder:uppercase placeholder:text-fog-text hover:border-ice-white/30 focus:border-electric-cobalt focus:bg-carbon"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-inputs border border-transparent px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ice-white/70 transition-colors hover:border-ice-white/20 hover:text-ice-white"
            aria-label="Language"
          >
            <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>{currentLang.code}</span>
          </button>
          {langOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-inputs border border-ice-white/14 bg-carbon animate-slide-up"
              onMouseLeave={() => setLangOpen(false)}
            >
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    void i18n.changeLanguage(l.code);
                    setLangOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.16em] transition-colors hover:bg-slate/60 ${
                    l.code === currentLang.code
                      ? "text-electric-cobalt"
                      : "text-ice-white/70"
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setLight((v) => !v)}
          className="flex items-center gap-1.5 rounded-inputs border border-transparent px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ice-white/70 transition-colors hover:border-ice-white/20 hover:text-ice-white"
          aria-label="Toggle theme"
        >
          {light ? <Moon className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Sun className="h-3.5 w-3.5" strokeWidth={1.5} />}
        </button>

        <div className="ml-2 flex items-center gap-3 border-l border-ice-white/14 pl-4">
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ice-white">
              {user?.full_name}
            </div>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-fog-text">
              {user?.role}
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-electric-cobalt/40 bg-gradient-to-br from-electric-cobalt/25 to-transparent font-mono text-[12px] tracking-[0.06em] text-ice-white shadow-[0_0_12px_-2px_rgba(31,88,242,0.6)]">
            {user?.full_name?.[0] ?? "U"}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-inputs border border-transparent p-2 text-ice-white/60 transition-colors hover:border-signal-orange/40 hover:text-signal-orange"
            aria-label="Logout"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
