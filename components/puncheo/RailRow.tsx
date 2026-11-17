"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import type { Instance } from "@/data/puncheo/rooms";
import type { Status } from "@/lib/puncheo/state";
import { PhotoButton } from "./PhotoButton";
import { SwipeUnder } from "./SwipeUnder";
import { CheckDetail, Expand } from "./CheckDetail";
import { HATCH, SquircleCheck } from "./Squircle";
import { useSwipeMark } from "./useSwipeMark";
import { rowState, type PunchSheet } from "./usePunchSheet";

const COLOR: Record<Status, string> = { green: "var(--ok)", yellow: "var(--warn)", red: "var(--bad)", na: "var(--na)" };
const EDGE: Record<Exclude<Status, "na">, string> = { green: "var(--ok)", yellow: "var(--warn-deep)", red: "var(--bad)" };

/** How a layout dresses the shared row. */
export type RowSkin = {
  /** Card classes at rest and open. */
  card: string;
  cardOpen: string;
  /** Resting background colours, for the blush to fade back to. */
  rest: string;
  restOpen: string;
  /** Background of the empty rail node (the page's ground). */
  node: string;
  /** Background of the criterion matching the mark, in the detail. */
  highlight: string;
  /** Show the AD Visual tags (FOTO, N/A, 3/5) under the subline. */
  tags?: boolean;
  /** Corner radius of the card, px. */
  radius?: number;
  /** Leia's big light blue numeral for the check number, in its own column. */
  bigNum?: boolean;
  /** The page ground is dark (Leia's slate): text around the cards goes light. */
  dark?: boolean;
  /** Leia's polish on the controls: bevelled square buttons. */
  leia?: boolean;
  /** AD Visual: flat grey square controls, Figma's tags (grey, green for FOTO), the grey Clave panel. */
  yard?: boolean;
};

/**
 * The card's outline, drawn from the check into the line: two strokes leave the
 * middle of the right side (where the check is), one over the top and one under
 * the bottom, and meet at the left.
 */
function CardEdge({ radius, color, fresh }: { radius: number; color: string; fresh: boolean }) {
  const box = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  let top = "";
  let bottom = "";
  if (size) {
    const { w, h } = size;
    const r = Math.min(radius, h / 2, w / 2);
    const m = h / 2;
    // From the check's side (right) into the line, leftward over the top and under the bottom.
    top = `M${w} ${m} V${r} A${r} ${r} 0 0 0 ${w - r} 0 H${r} A${r} ${r} 0 0 0 0 ${r} V${m}`;
    bottom = `M${w} ${m} V${h - r} A${r} ${r} 0 0 1 ${w - r} ${h} H${r} A${r} ${r} 0 0 1 0 ${h - r} V${m}`;
  }
  const t = { pathLength: { duration: 0.6, delay: 0.1, ease: [0.65, 0, 0.35, 1] as const }, opacity: { duration: 0.05, delay: 0.1 } };
  return (
    <span ref={box} className="pointer-events-none absolute inset-0" aria-hidden>
      {size ? (
        <svg className="absolute inset-0 overflow-visible" width={size.w} height={size.h}>
          {[top, bottom].map((d) => (
            <motion.path
              key={d.slice(0, 12) + d.length}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={2}
              initial={fresh ? { pathLength: 0, opacity: 0 } : false}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={t}
            />
          ))}
        </svg>
      ) : null}
    </span>
  );
}

type Tag = { label: string; bg: string; ink: string };

function tagsOf(c: Instance, yard = false): Tag[] {
  const t: Tag[] = [];
  // AD Visual's tags are grey, with green for the one that matters (as ESPARTA, BAÑO).
  const grey = { bg: "var(--hair)", ink: "var(--ink-soft)" };
  if (c.photo.required) t.push({ label: "Foto", ...(yard ? { bg: "var(--ok)", ink: "var(--ink)" } : { bg: "var(--brand-2)", ink: "var(--brand)" }) });
  if (c.tolerance.includes("3/5")) t.push({ label: "Regla 3/5", ...(yard ? grey : { bg: "var(--warn-soft)", ink: "var(--warn-deep)" }) });
  else if (/mm/.test(c.tolerance)) t.push({ label: "mm", ...(yard ? grey : { bg: "var(--warn-soft)", ink: "var(--warn-deep)" }) });
  if (c.na) t.push({ label: "N/A", ...grey });
  return t;
}

/**
 * One check on the rail: the node on the left fills when it is marked and the
 * rail draws on to the next check; the card slides under the finger (swipe to
 * mark), opens on a tap, and carries the camera and the squircle check.
 */
export function RailRow({ s, check, first, last, skin }: { s: PunchSheet; check: Instance; first: boolean; last: boolean; skin: RowSkin }) {
  const r = rowState(s, check);
  const [shake, setShake] = useState(0);
  /** A check whose sheet makes the photo mandatory can't be marked, either way, until it has one. */
  const photoFirst = () => {
    if (!check.photo.required || r.photos.length) return true;
    haptic.error();
    setShake((n) => n + 1);
    s.say(`Foto obligatoria antes de marcar ${check.num}`);
    return false;
  };
  const ref = useRef<HTMLDivElement>(null);
  const underRef = useRef<HTMLDivElement>(null);
  const sw = useSwipeMark({
    ref,
    underRef,
    id: check.num,
    na: check.na,
    status: r.status,
    pulse: r.pulse,
    nudge: r.nudge,
    rest: r.open ? skin.restOpen : skin.rest,
    onMark: (m) => s.setMark(check.id, m),
    onReject: s.say,
    guard: () => photoFirst(),
  });
  const color = r.status ? COLOR[r.status] : null;
  const NODE_Y = 31; // level with the title
  const tags = skin.tags ? tagsOf(check, skin.yard) : [];
  const R = skin.radius ?? 20;

  return (
    // A freshly marked row sits above its neighbours so its rings spill over them.
    <div className="relative flex" style={{ zIndex: r.pulse ? 2 : undefined }}>
      {/* The rail sits out in the page's gutter so the card gets the room. */}
      <div className="relative -ml-3 w-4 shrink-0" aria-hidden>
        <span
          className="absolute left-1/2 w-[2px] -translate-x-1/2 bg-hair-2"
          style={{ top: first ? NODE_Y : 0, bottom: last ? `calc(100% - ${NODE_Y}px)` : 0 }}
        />
        {color && !last ? (
          <motion.span
            key={`rail-${r.pulse}`}
            className="absolute left-1/2 w-[2px] origin-top -translate-x-1/2"
            style={{ top: NODE_Y, bottom: 0, background: color }}
            initial={r.pulse ? { scaleY: 0 } : false}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.45, delay: 0.12, ease: [0.65, 0, 0.35, 1] }}
          />
        ) : null}
        <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: NODE_Y }}>
          <motion.span
            key={`node-${r.pulse}`}
            className="relative block size-3 rounded-full border-2"
            style={{ borderColor: color ?? "var(--hair-2)", background: color ?? skin.node }}
            initial={r.pulse ? { scale: 0.4 } : false}
            animate={{ scale: 1 }}
            transition={springs.popping}
          />
        </span>
      </div>

      <div className="relative min-w-0 flex-1 pb-2.5 pl-1">
        <div className="relative">
          <SwipeUnder sw={sw} underRef={underRef} radius={R} />
          <motion.div
            ref={ref}
            style={{ x: sw.x, touchAction: "pan-y", borderRadius: R }}
            {...sw.bind}
            className={`no-select relative transition-shadow duration-300 ${r.open ? skin.cardOpen : skin.card}`}
          >
            {/* A mark draws the card's outline in its colour, from the check leftward along top and bottom at once; it stays. */}
            {r.status && r.status !== "na" ? <CardEdge key={`edge-${r.status}-${r.pulse}`} radius={R} color={EDGE[r.status]} fresh={r.pulse > 0} /> : null}

            {/* N/A: the item is hatched over, its box hatched too. */}
            <AnimatePresence>
              {r.status === "na" ? (
                <motion.span
                  key="hatch"
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{ backgroundImage: HATCH, borderRadius: R }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              ) : null}
            </AnimatePresence>

            <div className="relative flex items-center gap-2.5 py-3.5 pl-4 pr-3">
              <button
                type="button"
                onClick={() => {
                  if (sw.dragged()) return;
                  haptic.select();
                  s.toggle(check.id);
                }}
                aria-expanded={r.open}
                className="flex min-w-0 flex-1 items-start gap-3 text-left outline-none"
              >
                {skin.bigNum ? (
                  <span
                    className="w-[50px] shrink-0 pt-0.5 text-[22px] font-extralight leading-none tracking-[-0.03em] tabular-nums"
                    style={{ color: r.status === "na" ? "var(--ink-faint)" : "var(--brand)" }}
                  >
                    {check.num}
                  </span>
                ) : null}
                <span className="block min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  {skin.bigNum ? null : <span className="text-[12px] font-semibold tabular-nums text-ink-faint">{check.num}</span>}
                  <span
                    className="truncate text-[16.5px] font-semibold leading-6 tracking-[-0.015em] transition-colors duration-300"
                    style={{ color: r.status === "na" ? "var(--ink-faint)" : "var(--ink)" }}
                  >
                    {check.title}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[13.5px] leading-5 text-ink-soft">{check.sub}</span>
                {tags.length ? (
                  <span className="mt-2 flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <span
                        key={t.label}
                        className="rounded-[4px] px-1.5 py-[3px] text-[9.5px] font-semibold uppercase leading-none tracking-[0.04em]"
                        style={{ background: t.bg, color: t.ink }}
                      >
                        {t.label}
                      </span>
                    ))}
                  </span>
                ) : null}
                </span>
              </button>
              <PhotoButton
                photos={r.photos}
                missing={r.missingPhoto || (check.photo.required && !r.photos.length)}
                shake={shake}
                leia={skin.leia}
                flat={skin.yard}
                dragged={sw.dragged}
                onPick={(f) => s.pickPhoto(check, f)}
                size={34}
              />
              <button
                type="button"
                aria-label={r.status === "green" ? `Quitar pasa de ${check.num}` : `Marcar ${check.num} como pasa`}
                onClick={() => {
                  if (sw.dragged()) return;
                  if (r.status !== "green" && !photoFirst()) return;
                  s.tapCheck(check.id);
                }}
                className="ml-2.5 shrink-0" // a clear gap from the camera: two different targets
              >
                <SquircleCheck key={r.pulse} status={r.status} fresh={r.pulse > 0} leia={skin.leia} flat={skin.yard} />
              </button>
            </div>

            <Expand open={r.open}>
              <div className="relative px-4 pb-4">
                <div className="mb-4 h-px bg-hair" />
                <CheckDetail
                  check={check}
                  status={r.status}
                  photos={r.photos}
                  highlight={skin.highlight}
                  outer={R}
                  onClear={() => s.setMark(check.id, null)}
                  onRemovePhoto={(i) => s.removePhoto(check.id, i)}
                />
              </div>
            </Expand>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
