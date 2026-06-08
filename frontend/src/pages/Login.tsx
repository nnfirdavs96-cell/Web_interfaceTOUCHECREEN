import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Fingerprint, Loader2 } from "lucide-react";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";
import { useMouseParallax } from "@/lib/hooks";

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("admin@hikvision.dev");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { x, y } = useMouseParallax(20);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: data.user,
      });
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        t("app.loginError");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 dark:bg-slate-950">
      {/* Сетка фона */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.025)_1px,transparent_1px)] [background-size:40px_40px] dark:bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)]" />

      {/* Плавающие цветные шары с параллаксом */}
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-brand/30 opacity-50 mix-blend-multiply blur-3xl animate-float dark:opacity-30 dark:mix-blend-screen"
        style={{ transform: `translate(${x * 1.5}px, ${y * 1.5}px)` }}
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-violet-400/30 opacity-50 mix-blend-multiply blur-3xl animate-float-delayed dark:opacity-30 dark:mix-blend-screen"
        style={{ transform: `translate(${-x}px, ${-y}px)` }}
      />
      <div
        className="pointer-events-none absolute left-1/3 -bottom-32 h-72 w-72 rounded-full bg-cyan-300/30 opacity-40 mix-blend-multiply blur-3xl dark:opacity-25 dark:mix-blend-screen"
        style={{ transform: `translate(${x * 0.6}px, ${-y * 0.6}px)` }}
      />

      <div
        className="relative w-full max-w-md animate-slide-up"
        style={{
          transform: `perspective(1200px) rotateX(${-y * 0.05}deg) rotateY(${x * 0.05}deg)`,
          transition: "transform 0.15s ease-out",
        }}
      >
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-elevated backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-elevated animate-scale-in">
              <Fingerprint className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t("app.title")}</h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {t("app.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t("app.email")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-soft outline-none transition-all duration-150 hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t("app.password")}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-soft outline-none transition-all duration-150 hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 animate-slide-down dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-all duration-200 hover:bg-brand-dark hover:shadow-card active:scale-[0.99] disabled:opacity-60 disabled:active:scale-100"
            >
              {/* Глянец при hover */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span className="relative">{t("app.login")}</span>
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          Hikvision Access Platform · v0.7
        </p>
      </div>
    </div>
  );
}
