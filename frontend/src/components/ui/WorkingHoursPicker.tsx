import { useEffect, useState } from "react";
import { Input } from "./Input";

const DAYS = [
  { key: "Mon", label: "Пн" },
  { key: "Tue", label: "Вт" },
  { key: "Wed", label: "Ср" },
  { key: "Thu", label: "Чт" },
  { key: "Fri", label: "Пт" },
  { key: "Sat", label: "Сб" },
  { key: "Sun", label: "Вс" },
] as const;

const PRESETS: { label: string; days: string[]; start: string; end: string }[] = [
  { label: "Пн–Пт 09:00–18:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start: "09:00", end: "18:00" },
  { label: "Пн–Сб 09:00–18:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], start: "09:00", end: "18:00" },
  { label: "Ежедневно 08:00–22:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], start: "08:00", end: "22:00" },
  { label: "Круглосуточно (24/7)", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], start: "00:00", end: "23:59" },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

/** Формат сохранения в БД (строка):
 *    "Пн,Вт,Ср,Чт,Пт 09:00-18:00"     — обычное
 *    "Пн-Пт 09:00-18:00"               — если идут подряд
 *    "Ежедневно 08:00-22:00"           — все 7 дней
 *    "Круглосуточно"                    — 24/7 все дни
 */
function formatLabel(days: string[], start: string, end: string): string {
  if (days.length === 0) return "";
  const orderedKeys = DAYS.map((d) => d.key);
  const selected = orderedKeys.filter((k) => days.includes(k));
  const labels = selected.map((k) => DAYS.find((d) => d.key === k)!.label);

  // 24/7
  if (selected.length === 7 && start === "00:00" && (end === "23:59" || end === "24:00")) {
    return "Круглосуточно";
  }
  // Все 7 дней
  if (selected.length === 7) {
    return `Ежедневно ${start}–${end}`;
  }
  // Идут подряд (5+ дней) — диапазон
  const indices = selected.map((k) => orderedKeys.indexOf(k));
  const isContiguous =
    indices.length >= 3 &&
    indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
  if (isContiguous) {
    return `${labels[0]}–${labels[labels.length - 1]} ${start}–${end}`;
  }
  return `${labels.join(",")} ${start}–${end}`;
}

function parseValue(value: string): { days: string[]; start: string; end: string } {
  // Старые свободные строки — оставляем дефолт
  const m = value.match(/(\d{2}:\d{2})[–-](\d{2}:\d{2})/);
  const start = m?.[1] ?? "09:00";
  const end = m?.[2] ?? "18:00";

  if (/круглосуточн/i.test(value)) {
    return { days: DAYS.map((d) => d.key), start: "00:00", end: "23:59" };
  }
  if (/ежедневн/i.test(value)) {
    return { days: DAYS.map((d) => d.key), start, end };
  }
  // Диапазон через тире "Пн–Пт"
  const range = value.match(/(Пн|Вт|Ср|Чт|Пт|Сб|Вс)[–-](Пн|Вт|Ср|Чт|Пт|Сб|Вс)/);
  if (range) {
    const from = DAYS.findIndex((d) => d.label === range[1]);
    const to = DAYS.findIndex((d) => d.label === range[2]);
    if (from >= 0 && to >= from) {
      return {
        days: DAYS.slice(from, to + 1).map((d) => d.key),
        start,
        end,
      };
    }
  }
  // Перечисление через запятую
  const labels = value.match(/(Пн|Вт|Ср|Чт|Пт|Сб|Вс)/g);
  if (labels && labels.length) {
    return {
      days: labels.map((l) => DAYS.find((d) => d.label === l)!.key),
      start,
      end,
    };
  }
  return { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start, end };
}

export function WorkingHoursPicker({ value, onChange }: Props) {
  const parsed = parseValue(value);
  const [days, setDays] = useState<string[]>(parsed.days);
  const [start, setStart] = useState<string>(parsed.start);
  const [end, setEnd] = useState<string>(parsed.end);
  const [initialized, setInitialized] = useState(false);

  // Первичная инициализация из value (один раз)
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      return;
    }
    onChange(formatLabel(days, start, end));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, start, end]);

  function toggle(key: string) {
    setDays((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function applyPreset(p: (typeof PRESETS)[number]) {
    setDays(p.days);
    setStart(p.start);
    setEnd(p.end);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {DAYS.map((d) => {
          const active = days.includes(d.key);
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => toggle(d.key)}
              className={`h-8 w-10 rounded-md border text-xs font-medium transition ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="max-w-[120px]"
        />
        <span className="text-slate-400">—</span>
        <Input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="max-w-[120px]"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p)}
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="text-xs text-slate-500">
        Будет сохранено как: <span className="font-medium">{formatLabel(days, start, end) || "—"}</span>
      </div>
    </div>
  );
}
