import { useQuery } from "@tanstack/react-query";
import { Database, Globe, Server, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { settingsApi } from "@/api/settings";
import { LANGS } from "@/i18n";
import { PageHeader } from "@/components/ui/PageHeader";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm last:border-0 dark:border-slate-800">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Database;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => settingsApi.get() });

  return (
    <div>
      <PageHeader eyebrow="/ конфигурация · система" title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section icon={Server} title="System">
          <Row label={t("settings.version")} value={data?.version ?? "—"} />
          <Row label={t("settings.env")} value={data?.env ?? "—"} />
          <Row label="Debug" value={data?.debug ? "on" : "off"} />
          <Row label={t("settings.demoSeed")} value={data?.demo_seed_enabled ? "on" : "off"} />
        </Section>

        <Section icon={Shield} title="Security">
          <Row label={t("settings.tokenTtl")} value={data?.access_token_ttl_minutes ?? "—"} />
          <Row label={t("settings.refreshTtl")} value={data?.refresh_token_ttl_days ?? "—"} />
          <Row
            label={t("settings.cors")}
            value={
              <span className="font-mono text-xs">{data?.cors_origins.join(", ") ?? "—"}</span>
            }
          />
        </Section>

        <Section icon={Database} title="Hikvision">
          <Row
            label={t("settings.hikvisionMode")}
            value={
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  data?.hikvision_mode === "isapi"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                }`}
              >
                {data?.hikvision_mode ?? "—"}
              </span>
            }
          />
          <div className="mt-2 text-xs text-slate-500">
            Для подключения реальных устройств переключите HIKVISION_MODE=isapi в backend/.env и
            дополните backend/app/services/hikvision/isapi.py
          </div>
        </Section>

        <Section icon={Globe} title="Interface">
          <Row
            label={t("settings.language")}
            value={
              <select
                value={i18n.resolvedLanguage}
                onChange={(e) => void i18n.changeLanguage(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
            }
          />
          <Row
            label={t("settings.theme")}
            value={
              <button
                onClick={() => document.documentElement.classList.toggle("dark")}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Переключить
              </button>
            }
          />
        </Section>
      </div>
    </div>
  );
}
