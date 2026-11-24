"use client";

import type { ReactNode } from "react";
import { codeUrl, countApps, type PortalApp } from "@/lib/apps";
import { Vvs, VvvGrow as Grow } from "@/components/vvv/Vvv";
import { Tile, TileGroup, TileLink, TileStage } from "./tiles";

/**
 * An index in technical minimalism: the portal's front page and its /ad and
 * /kit section indices. No title: the screen is an instrument panel. Black ground,
 * panels on a 6 px gutter, every label in mono, numerals in a squared face,
 * one signal green. Wear it under a layout that loads `tech.css` and
 * `lib/tech-fonts`.
 *
 * The page sits in a vvs (the short vvv, components/vvv): a rounded frame on a
 * black screen that scrolls inside itself, black beyond. Its squares are tiles
 * (./tiles): they spring in at random when the page comes, and on a tap they
 * spring out at random, the tapped one last, before the page goes.
 */
export type TechIndexProps = {
  apps: PortalApp[];
  /** Where the entries live: `${base}/${slug}`. */
  base: string;
  /** The header's stacked label, e.g. ["AD", "PADS", "ÍNDICE"]. */
  label: string[];
  /** ID line, e.g. "AD-PADS". */
  id: string;
  /** MODO line, e.g. "PROTOTIPO". */
  mode: string;
  /** The header's small line, bottom right. */
  motto: string;
  /** What sits on the black plate beside the header. */
  mark: ReactNode;
  /** The green strip's two vertical stamps. */
  strip: [string, string];
  /** The poster's title, where a page title would be. */
  poster: string;
  /** The entry's code label, e.g. "pad" (a folder reads "dir"). */
  kind: string;
  /** Each entry's small glyph. */
  glyph: (app: PortalApp) => ReactNode;
  /** The footer's two lines, left and right. */
  colophon: [string, string];
  stamp: [string, string];
  /** A way out, as a plate above the footer. */
  back?: { href: string; label: string; path: string };
};

export function TechIndex(props: TechIndexProps) {
  const { apps } = props;
  const n = String(apps.length).padStart(2, "0");

  return (
    <Vvs radius={32} maxWidth={460} snap className="bg-deck">
      <noscript>
        <style>{"[data-tile]{opacity:1!important;transform:none!important}"}</style>
      </noscript>
      <TileStage>
      <main className="flex w-full flex-col gap-[var(--gutter)] p-[var(--gutter)]">
        {/* Every block is a snap stop, and grows into place as it comes up
            from the bottom of the frame (Noticss A's Grow, both ways). */}
        <Snap>
          <Grow>
            <Header {...props} count={n} />
          </Grow>
        </Snap>
        <Snap>
          <Grow>
            <Bench strip={props.strip} poster={props.poster} count={n} />
          </Grow>
        </Snap>
        {apps.map((app, i) => (
          <Snap key={app.slug}>
            <Entry app={app} index={i} base={props.base} kind={props.kind} glyph={props.glyph(app)} />
          </Snap>
        ))}
        <Snap end>
          <Grow>
            <Footer colophon={props.colophon} stamp={props.stamp} back={props.back} />
          </Grow>
        </Snap>
      </main>
      </TileStage>
    </Vvs>
  );
}

/** A snap stop: the block lands one gutter below the frame's top (or, last, on the bottom). */
function Snap({ children, end }: { children: ReactNode; end?: boolean }) {
  return (
    <div
      className={end ? "snap-end" : "snap-start"}
      style={{ scrollMarginTop: "var(--gutter)", scrollMarginBottom: "var(--gutter)" }}
    >
      {children}
    </div>
  );
}

/* ── Header: labels and the mark plate ───────────────────────── */

function Header({ label, id, mode, motto, mark, count }: TechIndexProps & { count: string }) {
  return (
    <section className="grid grid-cols-[1fr_118px] gap-[var(--gutter)]">
      <Tile className="relative flex h-[118px] flex-col justify-between rounded-[var(--cell)] bg-panel p-4">
        <div className="flex items-start justify-between">
          <p className="font-mono text-[10px] font-semibold leading-[1.25] tracking-[0.08em] text-ink">
            {label.map((l, i) => (
              <span key={i} className="block">
                {l}
              </span>
            ))}
          </p>
          <p className="text-right font-mono text-[9px] leading-[1.4] tracking-[0.04em] text-ink-soft">
            REV: 11.2026
            <br />
            ID: {id}
            <br />
            MODO: {mode}
            <br />
            ENTRADAS: {count}
          </p>
        </div>
        <div className="flex items-end justify-between">
          <span className="block h-3 w-3 bg-signal" />
          <p className="font-mono text-[9px] tracking-[0.04em] text-ink-faint">{motto}</p>
        </div>
      </Tile>
      <Tile className="grid h-[118px] place-items-center rounded-[var(--cell)] bg-black">{mark}</Tile>
    </section>
  );
}

/** Adelante's mark, one colour (currentColor): the two parallelograms. */
export function AdelanteMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 162.804 70.7845" role="img" aria-label="Adelante">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 0H45.645L87.8835 70.7845H41.4411L0 0ZM72.5219 20.6455H118.403L133.203 45.715H162.804L148.004 70.7845H102.257L72.5219 20.6455Z"
      />
    </svg>
  );
}

/* ── The bench: the poster that stands where a title would ─────────────── */

function Bench({ strip, poster, count }: { strip: [string, string]; poster: string; count: string }) {
  return (
    <section className="grid h-[300px] grid-cols-[52px_1fr] gap-[var(--gutter)]">
      <Tile className="flex flex-col items-center justify-between rounded-[var(--cell)] bg-signal py-5">
        <span className="font-tech text-[15px] font-bold tracking-[0.06em] text-ink [writing-mode:vertical-rl] rotate-180">
          {strip[0]}
        </span>
        <span className="font-tech text-[15px] font-bold tracking-[0.06em] text-ink [writing-mode:vertical-rl] rotate-180">
          {strip[1]}
        </span>
      </Tile>

      <Tile className="relative overflow-hidden rounded-[var(--cell)] bg-panel-2">
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
          {poster}
        </p>
        <p className="absolute bottom-[18px] right-4 font-mono text-[10px] text-ink-soft">N.{count}</p>
      </Tile>
    </section>
  );
}

/* ── One entry: a numbered column and a plate ──────────────────────────── */

const COLUMNS = ["signal", "hatch", "dots", "void"] as const;

function Entry({
  app,
  index,
  base,
  kind,
  glyph,
}: {
  app: PortalApp;
  index: number;
  base: string;
  kind: string;
  glyph: ReactNode;
}) {
  const no = String(index + 1).padStart(2, "0");
  const column = COLUMNS[index % COLUMNS.length];
  const external = !!app.external;
  const folder = app.apps ? countApps(app.apps) : 0;
  const code = app.slug.toUpperCase();

  const href = `${base}/${app.slug}`;

  // The entry opens on a tap anywhere but its code key: the column is a link, and the plate has one stretched
  // over it, under its text. The code key (the small round one, top right) is a link of its own, to the app's
  // code on GitHub, so it can't sit inside the entry's link.
  return (
    <TileGroup name={app.slug}>
      <div className="press grid h-[208px] grid-cols-[40%_1fr] gap-[var(--gutter)]">
        <Grow className="flex">
          <TileLink href={href} group={app.slug} label={app.name} className="flex flex-1 outline-none">
            <Column kind={column} no={no} glyph={glyph} />
          </TileLink>
        </Grow>

        <Grow className="flex" lag={1}>
          <Tile className="relative flex flex-1 flex-col justify-between rounded-[var(--cell)] bg-panel p-5">
            <TileLink href={href} group={app.slug} label={app.name} className="absolute inset-0 rounded-[inherit] outline-none" />
            <div className="pointer-events-none relative flex items-center justify-between font-mono text-[11px]">
              <span className="text-ink-soft">
                {folder ? "dir" : kind}: <span className="text-ink">{code}</span>
              </span>
              <a
                href={codeUrl(app)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`El código de ${app.name} en GitHub`}
                className="code-key pointer-events-auto -m-2 grid h-11 w-11 place-items-center rounded-full outline-none"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-panel-2 text-ink">
                  <BranchGlyph />
                </span>
              </a>
            </div>
            <div className="pointer-events-none relative">
              <p className="font-tech text-[30px] font-semibold uppercase leading-[0.95] tracking-[-0.005em] text-ink">
                {app.name}
              </p>
              {app.description ? (
                <p className="mt-2 line-clamp-2 text-[13px] leading-[1.3] text-ink-soft">{app.description}</p>
              ) : null}
              <p className="mt-3 font-mono text-[9px] tracking-[0.04em] text-ink-faint">
                {external ? "EXT · " : ""}
                {href}
                {folder ? ` · ${String(folder).padStart(2, "0")} APPS` : ""}
              </p>
            </div>
          </Tile>
        </Grow>
      </div>
    </TileGroup>
  );
}

/** A branch: the code key's mark. */
function BranchGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <circle cx="4" cy="3" r="1.6" />
      <circle cx="4" cy="13" r="1.6" />
      <circle cx="12" cy="5" r="1.6" />
      <path d="M4 4.6v6.8M12 6.6c0 3-8 2.4-8 4.8" />
    </svg>
  );
}

function Column({ kind, no, glyph }: { kind: (typeof COLUMNS)[number]; no: string; glyph: ReactNode }) {
  if (kind === "signal") {
    return (
      <div className="flex-1 flex flex-col gap-[var(--gutter)]">
        <Tile className="hatch h-[64px] rounded-[var(--cell)] border border-signal bg-[var(--signal-night)] [--hatch-ink:var(--signal)]" />
        <Tile className="flex flex-1 flex-col items-center justify-end gap-3 rounded-[var(--cell)] bg-signal pb-4">
          <span className="font-tech text-[64px] font-semibold leading-[0.8] tracking-[-0.04em] text-ink">{no}</span>
          <Badge dark>{glyph}</Badge>
        </Tile>
      </div>
    );
  }
  if (kind === "hatch") {
    return (
      <Tile className="flex-1 relative flex flex-col justify-between overflow-hidden rounded-[var(--cell)] bg-panel-2 p-4">
        <div className="hatch-bold -mx-4 -mt-4 h-[46px]" />
        <span className="font-tech text-[64px] font-semibold leading-[0.8] tracking-[-0.04em] text-ink">{no}</span>
        <Badge>{glyph}</Badge>
      </Tile>
    );
  }
  if (kind === "dots") {
    return (
      <Tile className="flex-1 dots relative flex flex-col justify-end rounded-[var(--cell)] bg-panel p-4 [--pitch:16px]">
        <div className="flex items-end justify-between rounded-[12px] bg-panel pr-1 pt-2">
          <span className="font-tech text-[64px] font-semibold leading-[0.8] tracking-[-0.04em] text-ink">{no}</span>
          <Badge>{glyph}</Badge>
        </div>
      </Tile>
    );
  }
  return (
    <Tile className="flex-1 flex flex-col justify-between rounded-[var(--cell)] bg-black p-4">
      <div className="flex gap-[5px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <i key={i} className="block h-[5px] w-[5px] bg-signal" style={{ opacity: 1 - i * 0.17 }} />
        ))}
      </div>
      <span className="font-tech text-[64px] font-semibold leading-[0.8] tracking-[-0.04em] text-signal">{no}</span>
      <Badge dark invert>
        {glyph}
      </Badge>
    </Tile>
  );
}

function Badge({ children, dark, invert }: { children: ReactNode; dark?: boolean; invert?: boolean }) {
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

/** The props for a 16 px stroked glyph. */
export const GLYPH = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 2 } as const;

/* ── Footer: the way out and the colophon ──────────────────────────────── */

function Footer({
  colophon,
  stamp,
  back,
}: {
  colophon: [string, string];
  stamp: [string, string];
  back?: TechIndexProps["back"];
}) {
  return (
    <section className="flex flex-col gap-[var(--gutter)]">
      {back ? (
        <TileLink href={back.href} group="back" className="press block outline-none">
          <Tile className="flex h-[64px] items-center justify-between rounded-[var(--cell)] bg-black pl-3 pr-5">
          <span className="flex items-center gap-3">
            {/* 40 px round in a 64 px plate: 12 px in, radius 20 < 22. */}
            <span className="grid h-10 w-10 place-items-center rounded-full bg-signal text-ink">
              <svg {...GLYPH} aria-hidden>
                <path d="M13 8H3M7 4L3 8l4 4" />
              </svg>
            </span>
            <span className="font-tech text-[22px] font-semibold uppercase leading-none tracking-[0.02em] text-signal">
              {back.label}
            </span>
          </span>
          <span className="font-mono text-[9px] tracking-[0.04em] text-ink-faint">{back.path}</span>
          </Tile>
        </TileLink>
      ) : null}
      <div className="grid grid-cols-[1fr_1fr] gap-[var(--gutter)]">
        <Tile className="flex h-[150px] flex-col justify-between rounded-[var(--cell)] bg-panel p-4">
          <div className="dots h-[54px] w-[118px] [--dot:var(--ink)] [--pitch:13px] [background-position:0_0]" />
          <p className="font-mono text-[9px] leading-[1.4] tracking-[0.03em] text-ink-soft">
            {colophon[0]}
            <br />
            {colophon[1]}
          </p>
        </Tile>
        <Tile className="flex h-[150px] flex-col justify-between overflow-hidden rounded-[var(--cell)] bg-panel">
          <div className="flex items-start justify-between p-4">
            <XMark />
            <span className="block h-3 w-3 bg-signal" />
          </div>
          <div>
            <p className="px-4 pb-3 font-mono text-[9px] leading-[1.4] tracking-[0.03em] text-ink">
              {stamp[0]}
              <br />
              {stamp[1]}
            </p>
            <div className="hatch-bold h-[26px]" />
          </div>
        </Tile>
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

// Each bar's left edge: the widths before it, each followed by a gap of 2 (every third) or 1.
const BAR_X = BARS.map((_, i) => BARS.slice(0, i).reduce((x, w, j) => x + w + (j % 3 === 0 ? 2 : 1), 0));

function Barcode({ className }: { className?: string }) {
  const x = BAR_X[BARS.length - 1] + BARS[BARS.length - 1] + ((BARS.length - 1) % 3 === 0 ? 2 : 1);
  const rects = BARS.map((w, i) =>
    i % 2 === 0 ? <rect key={i} x={BAR_X[i]} y={0} width={w} height={34} fill="var(--ink)" /> : null,
  );
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
