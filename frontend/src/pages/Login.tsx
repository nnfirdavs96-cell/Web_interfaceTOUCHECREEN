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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-mist px-4 dark:bg-slate-950">
      {/* Декоративные «watercolor» блобы по Calendly — магента/ultraviolet/амбер/cyan */}
      <div
        className="pointer-events-none absolute -left-40 top-1/4 h-[28rem] w-[28rem] rounded-full bg-magenta/40 mix-blend-multiply blur-3xl animate-float dark:opacity-25 dark:mix-blend-screen"
        style={{ transform: `translate(${x * 1.5}px, ${y * 1.5}px)` }}
      />
      <div
        className="pointer-events-none absolute -right-40 bottom-1/4 h-[28rem] w-[28rem] rounded-full bg-ultraviolet/40 mix-blend-multiply blur-3xl animate-float-delayed dark:opacity-25 dark:mix-blend-screen"
        style={{ transform: `translate(${-x}px, ${-y}px)` }}
      />
      <div
        className="pointer-events-none absolute left-1/3 -bottom-32 h-72 w-72 rounded-full bg-amber/30 mix-blend-multiply blur-3xl dark:opacity-20 dark:mix-blend-screen"
        style={{ transform: `translate(${x * 0.6}px, ${-y * 0.6}px)` }}
      />
      <div
        className="pointer-events-none absolute right-1/3 -top-20 h-64 w-64 rounded-full bg-cyan/30 mix-blend-multiply blur-3xl dark:opacity-20 dark:mix-blend-screen"
        style={{ transform: `translate(${-x * 0.4}px, ${y * 0.4}px)` }}
      />

      <div
        className="relative w-full max-w-md animate-slide-up"
        style={{
          transform: `perspective(1200px) rotateX(${-y * 0.04}deg) rotateY(${x * 0.04}deg)`,
          transition: "transform 0.15s ease-out",
        }}
      >
        {/* Product UI Card — белая поверхность с радиусом 16px (mockups) и signature blue-tinted shadow */}
        <div className="rounded-mockups border border-mist-border bg-paper p-10 shadow-elevated dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-cards bg-signal text-white shadow-button animate-scale-in">
              <Fingerprint className="h-7 w-7" />
            </div>
            <h1 className="text-heading tracking-tight">{t("app.title")}</h1>
            <p className="mt-2 text-body-sm text-slate2 dark:text-slate-400">
              {t("app.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-caption font-semibold text-navy dark:text-slate-300">
                {t("app.email")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-inputs border border-mist-border bg-paper px-3 py-2.5 text-body-sm outline-none transition-all duration-150 hover:border-steel focus:border-signal focus:ring-2 focus:ring-signal/20 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-caption font-semibold text-navy dark:text-slate-300">
                {t("app.password")}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-inputs border border-mist-border bg-paper px-3 py-2.5 text-body-sm outline-none transition-all duration-150 hover:border-steel focus:border-signal focus:ring-2 focus:ring-signal/20 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              />
            </div>

            {error && (
              <div className="rounded-inputs border border-red-200 bg-red-50 px-3 py-2.5 text-caption text-red-700 animate-slide-down dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-buttons bg-signal px-6 py-3 text-body-sm font-semibold text-white shadow-button transition-all duration-200 hover:bg-signal-dark active:scale-[0.99] disabled:opacity-60 disabled:active:scale-100"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span className="relative">{t("app.login")}</span>
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-micro text-steel">ANT Access · v0.7</p>
      </div>
    </div>
  );
}
