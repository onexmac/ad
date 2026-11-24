"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, cancelFrame, frame, motion } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import type { Instance } from "@/data/puncheo/rooms";
import type { Status } from "@/lib/puncheo/state";
import { PhotoButton } from "./PhotoButton";
import { SwipeUnder } from "./SwipeUnder";
import { CheckDetail, Expand } from "./CheckDetail";
import { HATCH, SquircleCheck } from "./Squircle";
import { useSwipeMark } from "./useSwipeMark";
import { rowState, type PunchSheet } from "./usePunchSheet";
import { inFrame, screenY, scrollToY, scrollTop, viewTop } from "@/lib/puncheo/scroller";

export const COLOR: Record<Status, string> = { green: "var(--ok)", yellow: "var(--warn)", red: "var(--bad)", na: "var(--na)" };
const TINT: Record<Exclude<Status, "na">, string> = {
  green: "rgba(149, 201, 85, 0.2)",
  yellow: "rgba(255, 213, 86, 0.24)",
  red: "rgba(235, 87, 87, 0.13)",
};
/**
 * Opening a row lands it at the top, under the pinned rooms bar (or the top
 * edge), so its whole explanation opens into view. A detail open above it is
 * closing as this one opens: its height is taken off the target.
 */
function snapToTop(el: HTMLElement | null) {
  const row = el?.closest("[data-check]") as HTMLElement | null;
  if (!row) return;
  const tabs = document.getElementById("puncheo-tabs");
  const sat = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sat")) || 0;
  // The tapped row is the anchor. Each frame we decide where it should sit on the
  // screen, on one smooth path from where it was tapped to just under the bar,
  // and move the page so it is exactly there. Whatever opens or closes above it
  // (the previous row's detail folding away) can't nudge it: the page absorbs
  // that change in the same frame.
  // Measured from the layout, not the painted box: a row still rising into view
  // carries a passing offset the anchor must not chase.
  const top = () => screenY(row);
  const from = top();
  // Under the bar, or the top of the vvv frame, or the status bar.
  const to = () => (tabs ? tabs.getBoundingClientRect().bottom : inFrame() ? viewTop() : sat) + 8;
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const GLIDE = 460;
  const HOLD = 760; // keep anchoring while the folding detail finishes
  const t0 = performance.now();
  // Runs in motion's frame loop after it has rendered this frame's heights, so
  // the anchor reads the layout the screen is about to show (no one-frame lag).
  const frame_ = () => {
    const now = performance.now();
    const t = Math.min(1, (now - t0) / GLIDE);
    const want = from + (to() - from) * ease(t);
    const off = top() - want;
    if (Math.abs(off) > 0.5) scrollToY(scrollTop() + off);
    if (now - t0 >= HOLD) {
      cancelFrame(frame_);
      snapRun = null;
    }
  };
  snapRun?.stop();
  frame.postRender(frame_, true);
  snapRun = { stop: () => cancelFrame(frame_) };
  // A finger on the page takes over.
  const stop = () => {
    snapRun?.stop();
    snapRun = null;
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("wheel", stop);
  };
  window.addEventListener("touchstart", stop, { once: true, passive: true });
  window.addEventListener("wheel", stop, { once: true, passive: true });
}
let snapRun: { stop: () => void } | null = null;

/** The big numeral takes its mark's colour, dark enough to read on the row's tint. */
const NUM: Record<Status | "none", string> = { none: "var(--brand)", green: "var(--ok-ink)", yellow: "var(--warn-deep)", red: "var(--bad)", na: "var(--ink-faint)" };
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
 * One check: the card slides under the finger (swipe to mark), opens on a tap,
 * and carries the camera and the check. Its place in the room shows on the
 * scroll rail at the right edge.
 */
export function RailRow({ s, check, skin }: { s: PunchSheet; check: Instance; skin: RowSkin }) {
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
  const tags = skin.tags ? tagsOf(check, skin.yard) : [];
  // A fresh mark pops the row's content: it swells a little and springs back.
  const content = useRef<HTMLDivElement>(null);
  const seen = useRef(r.pulse);
  useEffect(() => {
    const el = content.current;
    const fresh = r.pulse > seen.current;
    seen.current = r.pulse;
    if (!fresh || !el || !r.status) return;
    const grow = animate(el, { scale: 1.045 }, { duration: 0.12, ease: [0.3, 0, 0.4, 1], delay: 0.06 });
    grow.then(() => animate(el, { scale: 1 }, { type: "spring", stiffness: 520, damping: 11 }));
    return () => grow.stop();
  }, [r.pulse, r.status]);
  const R = skin.radius ?? 20;

  return (
    // A freshly marked row sits above its neighbours so its rings spill over them.
    <div className="relative flex" style={{ zIndex: r.pulse ? 2 : undefined }}>
      <div className={`relative min-w-0 flex-1 ${skin.leia ? "" : "pb-2.5"}`}>
        <div className="relative">
          <SwipeUnder sw={sw} underRef={underRef} radius={R} />
          <motion.div
            ref={ref}
            style={{ x: sw.x, touchAction: "pan-y", borderRadius: R }}
            {...sw.bind}
            className={`no-select relative transition-shadow duration-300 ${r.open ? skin.cardOpen : skin.card}`}
          >
            {/* A mark draws the card's outline in its colour, from the check leftward along top and bottom at once; it stays. */}
            {r.status && r.status !== "na" && !skin.leia ? <CardEdge key={`edge-${r.status}-${r.pulse}`} radius={R} color={EDGE[r.status]} fresh={r.pulse > 0} /> : null}
            {/* Leia's rows are flush in the panel: a mark tints the row's ground instead. */}
            {r.status && r.status !== "na" && skin.leia ? (
              <motion.span
                key={`tint-${r.status}`}
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: TINT[r.status] }}
                initial={r.pulse ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
              />
            ) : null}

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

            <div ref={content} className={`relative flex items-center gap-2.5 ${skin.leia ? "py-3 pl-3 pr-3" : "py-3.5 pl-4 pr-3"}`}>
              <button
                type="button"
                onClick={() => {
                  if (sw.dragged()) return;
                  haptic.select();
                  // Anchor from this very frame, before the previous detail starts folding.
                  if (!r.open) snapToTop(content.current);
                  s.toggle(check.id);
                }}
                aria-expanded={r.open}
                className="flex min-w-0 flex-1 items-start gap-3 text-left outline-none"
              >
                {skin.bigNum ? (
                  <span
                    className={`shrink-0 font-[200] leading-none tabular-nums ${skin.leia ? "w-[46px] text-[26px] tracking-[-0.04em]" : "w-[50px] pt-0.5 text-[22px] tracking-[-0.03em]"}`}
                    style={{ color: NUM[r.status ?? "none"], transition: "color 300ms" }}
                  >
                    {check.num}
                  </span>
                ) : null}
                <span className="block min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  {skin.bigNum ? null : <span className="text-[12px] font-semibold tabular-nums text-ink-faint">{check.num}</span>}
                  <span
                    className={`truncate leading-6 transition-colors duration-300 ${skin.leia ? "text-[17px] font-bold" : "text-[16.5px] font-semibold tracking-[-0.015em]"}`}
                    style={{ color: r.status === "na" ? "var(--ink-faint)" : "var(--ink)" }}
                  >
                    {check.title}
                  </span>
                </span>
                <span className={`mt-0.5 block truncate text-[13.5px] leading-5 ${skin.leia ? "text-[#8a8d93]" : "text-ink-soft"}`}>{check.sub}</span>
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
                onOpen={(img) => s.viewPhoto(check.id, r.photos.length - 1, img)}
                size={skin.leia ? 38 : 34}
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
                <SquircleCheck key={r.pulse} status={r.status} fresh={r.pulse > 0} leia={skin.leia} flat={skin.yard} size={skin.leia ? 38 : 34} />
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
                  onOpenPhoto={(i, img) => s.viewPhoto(check.id, i, img)}
                />
              </div>
            </Expand>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
