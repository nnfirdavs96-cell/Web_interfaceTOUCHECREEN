import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";

/**
 * Atlantic.vc — midnight observatory login.
 * Black canvas, particle cloud in #1f58f2, single-weight Space Grotesk display,
 * outlined #ff4105 CTA. Wireframe brand glyph + hand-drawn sparkle accent.
 */

function ParticleCloud() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const PARTICLES = 220;
    const dots = Array.from({ length: PARTICLES }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 0.4,
      a: Math.random() * 0.6 + 0.15,
    }));

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const tick = () => {
      ctx.clearRect(0, 0, w, h);

      // Draw connections (wave-cloud organic feel)
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 9000) {
            ctx.strokeStyle = `rgba(31, 88, 242, ${0.18 * (1 - d2 / 9000)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const d of dots) {
        ctx.fillStyle = `rgba(31, 88, 242, ${d.a})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  );
}

function Sparkle({ className = "" }: { className?: string }) {
  // Hand-drawn 6-point asterisk — Atlantic decorative motif
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      stroke="#1f58f2"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M20 4 V36" />
      <path d="M4 20 H36" />
      <path d="M8 8 L32 32" />
      <path d="M32 8 L8 32" />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("admin@hikvision.dev");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-void-black">
      <ParticleCloud />

      {/* Nav bar — Atlantic editorial */}
      <header className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center border border-ice-white/40">
            <div className="absolute h-2 w-2 bg-electric-cobalt" />
          </div>
          <span className="text-body tracking-[-0.01em] text-ice-white">ant access</span>
        </div>
        <nav className="hidden items-center gap-8 md:flex">
          {["главная", "подход", "устройства", "команда", "истории"].map((l) => (
            <a key={l} href="#" className="font-mono text-[10px] uppercase tracking-[0.16em] text-ice-white/70 hover:text-ice-white">
              {l}
            </a>
          ))}
        </nav>
        <a
          href="#"
          className="rounded-buttons border border-signal-orange px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-signal-orange transition-colors hover:bg-signal-orange/10"
        >
          следить →
        </a>
      </header>

      {/* Main — editorial hero with sign-in panel */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center justify-center gap-16 px-8 py-12 lg:flex-row lg:items-stretch">
        {/* Left: oversized headline */}
        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-5 flex items-center gap-3">
            <Sparkle className="h-9 w-9 animate-twinkle" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ice-white/70">
              доступ · контроль · обсерватория
            </span>
          </div>
          <h1 className="text-[64px] leading-[1.04] tracking-[-0.03em] text-ice-white md:text-[88px]">
            мы делаем <span className="text-gradient">неизвестное</span>
            <br />
            <span className="text-gradient">неизбежным</span>.
          </h1>
          <p className="mt-8 max-w-md font-mono text-[12px] leading-[1.8] tracking-[0.06em] text-fog-text">
            биометрическая платформа доступа для терминалов hikvision ds-k1t343mfwx.
            <br />
            тихая альтернатива hikcentral — для операторов, которые предпочитают
            данные дашбордам.
          </p>

          <div className="mt-12 flex items-center gap-4">
            <div className="wireframe-frame h-6 w-6 rounded-[2px]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
              войдите, чтобы продолжить
            </span>
          </div>
        </div>

        {/* Right: login card — wireframe outlined */}
        <div className="w-full max-w-md animate-slide-up">
          <div className="rounded-cards border border-ice-white/14 bg-carbon/80 p-10 backdrop-blur-sm">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-electric-cobalt">
                  /auth — сессия
                </div>
                <h2 className="text-heading-sm tracking-[-0.02em] text-ice-white">
                  {t("app.title")}
                </h2>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
                v0.7
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-ice-white/70">
                  {t("app.email")}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-inputs border border-ice-white/14 bg-transparent px-3 py-2.5 text-body-sm text-ice-white outline-none transition-all duration-150 hover:border-ice-white/30 focus:border-electric-cobalt"
                />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-ice-white/70">
                  {t("app.password")}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-inputs border border-ice-white/14 bg-transparent px-3 py-2.5 text-body-sm text-ice-white outline-none transition-all duration-150 hover:border-ice-white/30 focus:border-electric-cobalt"
                />
              </div>

              {error && (
                <div className="rounded-inputs border border-signal-orange/40 bg-signal-orange/5 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-signal-orange animate-slide-down">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-buttons border border-signal-orange bg-transparent px-6 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-signal-orange transition-all duration-150 hover:bg-signal-orange/10 active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("app.login")} →
              </button>
            </form>
          </div>

          <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-fog-text">
            ant access · полночная обсерватория
          </p>
        </div>
      </main>
    </div>
  );
}
