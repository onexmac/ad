"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { PortalApp } from "@/lib/apps";
import { useEdgeSquish } from "@/components/updatr/useEdgeSquish";

/**
 * The Pads index. No title: the screen is an instrument panel. Black ground,
 * panels on a 6 px gutter, every label in mono, numerals in a squared face,
 * one signal green. The viewport's corners are rounded by the frame.
 */
export function PadsHome({ apps }: { apps: PortalApp[] }) {
  const { scale, origin } = useEdgeSquish();
  const n = String(apps.length).padStart(2, "0");

  return (
    <>
      <motion.main
        style={{ scale, transformOrigin: origin }}
        className="mx-auto flex w-full max-w-[460px] flex-col gap-[var(--gutter)] p-[var(--gutter)] pt-[calc(var(--gutter)+var(--sat))] pb-[calc(var(--gutter)+var(--sab)+24px)]"
      >
        <Header count={n} />
        <Bench count={n} />
        {apps.map((app, i) => (
          <Entry key={app.slug} app={app} index={i} />
        ))}
        <Footer />
      </motion.main>

      <i aria-hidden className="frame-corner tl" />
      <i aria-hidden className="frame-corner tr" />
      <i aria-hidden className="frame-corner bl" />
      <i aria-hidden className="frame-corner br" />
    </>
  );
}

/* ── Header: labels and a plate of brushed metal ───────────────────────── */

function Header({ count }: { count: string }) {
  return (
    <section className="grid grid-cols-[1fr_118px] gap-[var(--gutter)]">
      <div className="relative flex h-[118px] flex-col justify-between rounded-[var(--cell)] bg-panel p-4">
        <div className="flex items-start justify-between">
          <p className="font-mono text-[10px] font-semibold leading-[1.25] tracking-[0.08em] text-ink">
            AD
            <br />
            PADS
            <br />
            ÍNDICE
          </p>
          <p className="text-right font-mono text-[9px] leading-[1.4] tracking-[0.04em] text-ink-soft">
            REV: 11.2026
            <br />
            ID: AD-PADS
            <br />
            MODO: PROTOTIPO
            <br />
            ENTRADAS: {count}
          </p>
        </div>
        <div className="flex items-end justify-between">
          <span className="block h-3 w-3 bg-signal" />
          <p className="font-mono text-[9px] tracking-[0.04em] text-ink-faint">
            Probado en la mano. No en la nube.
          </p>
        </div>
      </div>
      <div className="metal h-[118px] rounded-[var(--cell)]" aria-hidden />
    </section>
  );
}

/* ── The bench: the poster that stands where a title would ─────────────── */

function Bench({ count }: { count: string }) {
  return (
    <section className="grid h-[300px] grid-cols-[52px_1fr] gap-[var(--gutter)]">
      <div className="flex flex-col items-center justify-between rounded-[var(--cell)] bg-signal py-5">
        <span className="font-tech text-[15px] font-bold tracking-[0.06em] text-ink [writing-mode:vertical-rl] rotate-180">
          AD-2611
        </span>
        <span className="font-tech text-[15px] font-bold tracking-[0.06em] text-ink [writing-mode:vertical-rl] rotate-180">
          PADS-BANCO
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[var(--cell)] bg-panel-2">
        {/* Ghost numerals behind everything. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -left-3 font-tech text-[230px] font-bold leading-none tracking-[-0.04em] text-[#d9dadd]"
        >
          {count}
        </span>

        <Barcode className="absolute left-5 top-5" />

        <div className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-[10px] bg-[#9a9da3]">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-panel">
            <span className="flex -rotate-45 gap-[3px]">
              <i className="block h-[5px] w-[5px] rounded-full bg-ink-soft" />
              <i className="block h-[5px] w-[5px] rounded-full bg-ink-soft" />
              <i className="block h-[5px] w-[5px] rounded-full bg-ink-soft" />
            </span>
          </span>
        </div>

        <Lattice className="absolute left-1/2 top-[46%] w-[86%] -translate-x-1/2 -translate-y-1/2" />

        <p className="absolute bottom-4 left-5 font-tech text-[30px] font-semibold leading-none tracking-[-0.01em] text-ink">
          Banco de prueba
        </p>
        <p className="absolute bottom-[18px] right-4 font-mono text-[10px] text-ink-soft">
          N.{count}
        </p>
      </div>
    </section>
  );
}

/* ── One entry: a numbered column and a plate ──────────────────────────── */

const COLUMNS = ["signal", "hatch", "dots", "void"] as const;

function Entry({ app, index }: { app: PortalApp; index: number }) {
  const no = String(index + 1).padStart(2, "0");
  const kind = COLUMNS[index % COLUMNS.length];
  const external = !!app.external;
  const code = app.slug.toUpperCase();

  return (
    <Link
      href={`/ad/pads/${app.slug}`}
      prefetch={false}
      className="press grid h-[208px] grid-cols-[40%_1fr] gap-[var(--gutter)] outline-none"
    >
      <Column kind={kind} no={no} slug={app.slug} />

      <div className="flex flex-col justify-between rounded-[var(--cell)] bg-panel p-5">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="text-ink-soft">
            pad: <span className="text-ink">{code}</span>
          </span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-panel-2 text-ink">
            {external ? "↗" : "→"}
          </span>
        </div>
        <div>
          <p className="font-tech text-[30px] font-semibold uppercase leading-[0.95] tracking-[-0.005em] text-ink">
            {app.name}
          </p>
          {app.description ? (
            <p className="mt-2 text-[13px] leading-[1.3] text-ink-soft">{app.description}</p>
          ) : null}
          <p className="mt-3 font-mono text-[9px] tracking-[0.04em] text-ink-faint">
            {external ? "EXT · " : ""}/ad/pads/{app.slug}
          </p>
        </div>
      </div>
    </Link>
  );
}

function Column({ kind, no, slug }: { kind: (typeof COLUMNS)[number]; no: string; slug: string }) {
  const glyph = <Glyph slug={slug} />;
  if (kind === "signal") {
    return (
      <div className="flex flex-col gap-[var(--gutter)]">
        <div className="hatch h-[64px] rounded-[var(--cell)] border border-signal bg-[var(--signal-night)] [--hatch-ink:var(--signal)]" />
        <div className="flex flex-1 flex-col items-center justify-end gap-3 rounded-[var(--cell)] bg-signal pb-4">
          <span className="font-tech text-[64px] font-semibold leading-[0.8] tracking-[-0.04em] text-ink">{no}</span>
          <Badge dark>{glyph}</Badge>
        </div>
      </div>
    );
  }
  if (kind === "hatch") {
    return (
      <div className="relative flex flex-col justify-between overflow-hidden rounded-[var(--cell)] bg-panel-2 p-4">
        <div className="hatch-bold -mx-4 -mt-4 h-[46px]" />
        <span className="font-tech text-[64px] font-semibold leading-[0.8] tracking-[-0.04em] text-ink">{no}</span>
        <Badge>{glyph}</Badge>
      </div>
    );
  }
  if (kind === "dots") {
    return (
      <div className="dots relative flex flex-col justify-end rounded-[var(--cell)] bg-panel p-4 [--pitch:16px]">
        <div className="flex items-end justify-between rounded-[12px] bg-panel pr-1 pt-2">
          <span className="font-tech text-[64px] font-semibold leading-[0.8] tracking-[-0.04em] text-ink">{no}</span>
          <Badge>{glyph}</Badge>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col justify-between rounded-[var(--cell)] bg-ink p-4">
      <div className="flex gap-[5px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <i key={i} className="block h-[5px] w-[5px] bg-signal" style={{ opacity: 1 - i * 0.17 }} />
        ))}
      </div>
      <span className="font-tech text-[64px] font-semibold leading-[0.8] tracking-[-0.04em] text-signal">{no}</span>
      <Badge dark invert>{glyph}</Badge>
    </div>
  );
}

function Badge({ children, dark, invert }: { children: React.ReactNode; dark?: boolean; invert?: boolean }) {
  return (
    <span
      className={`grid h-9 w-9 place-items-center rounded-full ${
        invert ? "bg-signal text-ink" : dark ? "bg-[var(--signal-night)] text-signal" : "bg-ink text-panel"
      }`}
    >
      {children}
    </span>
  );
}

/** Each pad's gesture, drawn small: the +, the slider, the pressed squircle, the bars. */
function Glyph({ slug }: { slug: string }) {
  const s = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 2 } as const;
  if (slug === "pad01")
    return (
      <svg {...s} aria-hidden>
        <path d="M8 2v12M2 8h12" />
      </svg>
    );
  if (slug === "pad02")
    return (
      <svg {...s} aria-hidden>
        <path d="M1.5 8h13" strokeWidth={1.4} />
        <rect x="8" y="4.5" width="6" height="7" rx="2" fill="currentColor" stroke="none" />
      </svg>
    );
  if (slug === "pad03")
    return (
      <svg {...s} aria-hidden>
        <rect x="4" y="4" width="8" height="8" rx="2.6" fill="currentColor" stroke="none" />
        <rect x="1.5" y="1.5" width="13" height="13" rx="4.5" strokeWidth={1.2} />
      </svg>
    );
  return (
    <svg {...s} aria-hidden>
      <path d="M3 14V9M8 14V3M13 14V6" />
    </svg>
  );
}

/* ── Footer: the colophon ──────────────────────────────────────────────── */

function Footer() {
  return (
    <section className="grid grid-cols-[1fr_1fr] gap-[var(--gutter)]">
      <div className="flex h-[150px] flex-col justify-between rounded-[var(--cell)] bg-panel p-4">
        <div className="dots h-[54px] w-[118px] [--dot:var(--ink)] [--pitch:13px] [background-position:0_0]" />
        <p className="font-mono text-[9px] leading-[1.4] tracking-[0.03em] text-ink-soft">
          Losa Flotante × AD Visual.
          <br />
          Cada pad es un gesto, no una app.
        </p>
      </div>
      <div className="flex h-[150px] flex-col justify-between overflow-hidden rounded-[var(--cell)] bg-panel">
        <div className="flex items-start justify-between p-4">
          <XMark />
          <span className="block h-3 w-3 bg-signal" />
        </div>
        <div>
          <p className="px-4 pb-3 font-mono text-[9px] leading-[1.4] tracking-[0.03em] text-ink">
            estudio visual /
            <br />
            grid & patrones
          </p>
          <div className="hatch-bold h-[26px]" />
        </div>
      </div>
    </section>
  );
}

function XMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <g fill="var(--ink)">
        <path d="M2 2h5l4 4.5L15 2h5l-6.5 9L20 20h-5l-4-4.5L7 20H2l6.5-9z" />
      </g>
    </svg>
  );
}

/* ── Drawn instruments ─────────────────────────────────────────────────── */

const BARS = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 1, 3, 1, 2, 2, 1, 4, 1, 1, 2, 1, 3, 1, 1, 2, 1, 2, 3, 1, 1];

function Barcode({ className }: { className?: string }) {
  let x = 0;
  const rects = BARS.map((w, i) => {
    const r = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={34} fill="var(--ink)" /> : null;
    x += w + (i % 3 === 0 ? 2 : 1);
    return r;
  });
  return (
    <svg className={className} width={x} height={34} viewBox={`0 0 ${x} 34`} aria-hidden>
      {rects}
    </svg>
  );
}

/** A row of chamfered crosses with diamonds between: the signal motif. */
function Lattice({ className }: { className?: string }) {
  const unit = 70;
  const cells = 4;
  const w = unit * cells;
  // One arm of a cross: a bar along the diagonal (dx, dy), from just off the
  // centre out to the cell's corner, its outer end cut square to the cell.
  const arm = (cx: number, cy: number, dx: number, dy: number, key: string) => {
    const t = 8.5; // half the bar's thickness, measured along x and y
    const a = 13; // inner end, from centre
    const b = 35; // outer end: the cell's corner
    const pts = [
      [cx + dx * a, cy + dy * (a - t)],
      [cx + dx * b, cy + dy * (b - t)],
      [cx + dx * b, cy + dy * b],
      [cx + dx * (b - t), cy + dy * b],
      [cx + dx * (a - t), cy + dy * a],
    ];
    return <polygon key={key} points={pts.map((p) => p.join(",")).join(" ")} fill="var(--signal)" />;
  };
  const crosses = Array.from({ length: cells }).flatMap((_, i) => {
    const cx = unit * i + unit / 2;
    const cy = 35;
    return [
      arm(cx, cy, -1, -1, `${i}a`),
      arm(cx, cy, 1, -1, `${i}b`),
      arm(cx, cy, -1, 1, `${i}c`),
      arm(cx, cy, 1, 1, `${i}d`),
      <rect key={`${i}m`} x={cx - 6} y={cy - 6} width={12} height={12} transform={`rotate(45 ${cx} ${cy})`} fill="var(--signal)" />,
    ];
  });
  return (
    <svg className={className} viewBox={`0 0 ${w} 70`} aria-hidden>
      {crosses}
    </svg>
  );
}
