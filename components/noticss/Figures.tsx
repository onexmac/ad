import type { Indicator, Weather } from "@/data/noticss/types";

/** A hairline sparkline; no history, no line (never an invented one). */
export function Sparkline({ series, className = "", w = 96, h = 28 }: { series: number[] | null; className?: string; w?: number; h?: number }) {
  if (!series || series.length < 2) return <span className={`block text-ink-faint ${className}`}>—</span>;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => [(i / (series.length - 1)) * (w - 4) + 2, h - 3 - ((v - min) / span) * (h - 6)]);
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="miter" />
      <circle cx={last[0]} cy={last[1]} r="2.25" fill="var(--accent)" />
    </svg>
  );
}

export function Delta({ d, className = "" }: { d: number | null; className?: string }) {
  if (d === null || d === 0) return <span className={`text-ink-faint ${className}`}>sin cambio</span>;
  const up = d > 0;
  return (
    <span className={`${up ? "text-accent" : "text-ink"} ${className}`}>
      {up ? "+" : "−"}
      {Math.abs(d).toLocaleString("es-CR", { maximumFractionDigits: 2 })}
    </span>
  );
}

/** Twenty-four hours of chance of rain, as a printed bar strip. */
export function RainStrip({ hours, className = "" }: { hours: number[] | null; className?: string }) {
  if (!hours) return null;
  return (
    <div className={className}>
      <div className="flex h-[44px] items-end gap-[2px]">
        {hours.map((p, i) => (
          <span
            key={i}
            className={`block flex-1 ${p >= 60 ? "bg-ink" : "bg-ink/25"}`}
            style={{ height: `${Math.max(4, p)}%` }}
            title={`${String(i).padStart(2, "0")}:00 · ${p}%`}
          />
        ))}
      </div>
      <div className="mono mt-1 flex justify-between text-ink-faint">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </div>
  );
}

export function weatherLine(w: Weather | null) {
  if (!w) return "Sin pronóstico";
  const t = w.tempC !== null ? `${w.tempC}°` : "—";
  return `${w.place}, ${t}, ${w.condition}`;
}

export function indicatorValue(i: Indicator) {
  return i.value ?? "—";
}
