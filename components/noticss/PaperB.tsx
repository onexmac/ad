"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { animate, motion, motionValue, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import { springs } from "@/lib/histok/springs";
import { categoryName, categoryOrder, kindName, type Category, type Edition, type Indicator, type Note, type Subject } from "@/data/noticss/types";
import { dayMonth, longDate, shortDate, weekday } from "@/lib/noticss/format";
import { Arrow } from "@/components/updatr/Arrow";
import { AbSwitch } from "./AbSwitch";
import { SourceLine } from "./Article";
import { Delta, RainStrip, Sparkline } from "./Figures";

/*
 * Version B: the Paper / Push Pop Press grammar. Each section is a whole
 * screen: a full-bleed cover above, a tray of cards below. The cards are not
 * thumbnails of the story, they ARE the story, drawn at full size and scaled
 * down (one transform on the tray). Lift a card and the tray scales up under
 * the finger until the card is the screen; swipe sideways to read the next
 * one; pull down from the top to put it back. Swipe the cover to change
 * section: cover and tray travel together.
 */

/** Tray scale: a card is this share of the screen. */
const S = 0.4;
/** Gap between cards, in full-size pixels (so 11 px on the tray). */
const G = 28;
/** Tray inset from the left edge and from the bottom (screen px). */
const PAD = 14;
const BOTTOM = 16;
/** Card corner on the tray (screen px); full screen pages are square. */
const R = 14;

const EXPAND = { type: "spring" as const, stiffness: 230, damping: 28, mass: 1 };
const COLLAPSE = { type: "spring" as const, stiffness: 260, damping: 30, mass: 1 };
const SLIDE = { type: "spring" as const, stiffness: 300, damping: 34, mass: 1 };

type Card =
  | { type: "subject"; id: string; subject: Subject }
  | { type: "note"; id: string; subject: Subject; note: Note }
  | { type: "figures"; id: string; indicators: Indicator[] };

type SectionDef = { id: string; name: string; kind: "hoy" | Category; lead?: Subject; cards: Card[] };

function sectionsOf(ed: Edition): SectionDef[] {
  const hoy: SectionDef = {
    id: "hoy",
    name: "Hoy",
    kind: "hoy",
    cards: [
      ...ed.subjects.map((s): Card => ({ type: "subject", id: `hoy-${s.id}`, subject: s })),
      { type: "figures", id: "hoy-cifras", indicators: ed.indicators },
    ],
  };
  const cats = categoryOrder
    .map((c): SectionDef | null => {
      const subs = ed.subjects.filter((s) => s.category === c);
      if (!subs.length) return null;
      return {
        id: c,
        name: categoryName[c],
        kind: c,
        lead: subs.find((s) => s.image) ?? subs[0],
        cards: subs.flatMap((s): Card[] => [
          { type: "subject", id: `${c}-${s.id}`, subject: s },
          ...s.notes.map((n): Card => ({ type: "note", id: `${c}-${n.id}`, subject: s, note: n })),
        ]),
      };
    })
    .filter(Boolean) as SectionDef[];
  return [hoy, ...cats];
}

/** One tray's motion: p (0 tray, 1 full page), posC (tray scroll, in cards), cur (page in view). */
type Tray = { p: MotionValue<number>; posC: MotionValue<number>; cur: MotionValue<number> };
const makeTray = (): Tray => ({ p: motionValue(0), posC: motionValue(0), cur: motionValue(0) });

const rubber = (over: number, dim: number) => (over * dim * 0.32) / (dim + Math.abs(over) * 0.32 * 2);

export function PaperB({ editions }: { editions: Edition[] }) {
  const [edIndex, setEdIndex] = useState(0);
  const ed = editions[edIndex];
  const sections = useMemo(() => sectionsOf(ed), [ed]);
  const [sec, setSec] = useState(0);
  const secRef = useRef(0);
  const secX = useMemo(() => motionValue(0), []);
  const trays = useMemo(() => sections.map(makeTray), [sections]);
  const [open, setOpen] = useState<{ sec: number; card: number } | null>(null);
  const openRef = useRef<{ sec: number; card: number } | null>(null);
  const setOpenBoth = (o: { sec: number; card: number } | null) => {
    openRef.current = o;
    setOpen(o);
  };

  const col = useRef<HTMLDivElement>(null);
  const Wm = useMemo(() => motionValue(390), []);
  const Hm = useMemo(() => motionValue(844), []);
  const [dims, setDims] = useState({ w: 390, h: 844 });
  useLayoutEffect(() => {
    const el = col.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      Wm.set(w);
      Hm.set(h);
      setDims({ w, h });
      secX.set(-secRef.current * w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [Wm, Hm, secX]);


  // The page behind must not scroll or bounce: this is a full-screen surface.
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
      document.body.style.overflow = "";
    };
  }, []);

  /* ---------- actions ---------- */

  const visible = () => (Wm.get() - PAD + G * S) / ((Wm.get() + G) * S);
  const maxPos = (n: number) => Math.max(0, n - visible());

  const goSection = (i: number, v = 0) => {
    const n = sections.length;
    const to = Math.max(0, Math.min(n - 1, i));
    if (to !== secRef.current) haptic.select();
    secRef.current = to;
    setSec(to);
    animate(secX, -to * Wm.get(), { ...SLIDE, velocity: v });
  };

  const expand = (card: number, v = 0) => {
    const s = secRef.current;
    const t = trays[s];
    if (!openRef.current) t.cur.set(card);
    setOpenBoth({ sec: s, card });
    haptic.complete();
    animate(t.p, 1, { ...EXPAND, velocity: v });
  };

  const collapse = (v = 0) => {
    const o = openRef.current;
    if (!o) return;
    const t = trays[o.sec];
    const n = sections[o.sec].cards.length;
    // Land the card where it can be seen on the tray.
    const j = Math.round(t.cur.get());
    const pc = t.posC.get();
    const vis = Math.floor(visible());
    if (j < pc) t.posC.set(j);
    else if (j > pc + vis - 1) t.posC.set(Math.min(maxPos(n), j - vis + 1));
    // Back at the top of the page before it shrinks.
    const scroller = document.querySelector<HTMLElement>(`[data-page="${o.sec}-${j}"]`);
    if (scroller) scroller.scrollTop = 0;
    setOpenBoth(null);
    haptic.select();
    animate(t.p, 0, { ...COLLAPSE, velocity: v });
  };

  const pageTo = (j: number, v = 0) => {
    const o = openRef.current;
    if (!o) return;
    const n = sections[o.sec].cards.length;
    const to = Math.max(0, Math.min(n - 1, j));
    if (to !== o.card) haptic.select();
    const prev = document.querySelector<HTMLElement>(`[data-page="${o.sec}-${o.card}"]`);
    setOpenBoth({ sec: o.sec, card: to });
    animate(trays[o.sec].cur, to, { ...SLIDE, velocity: v });
    if (prev && to !== o.card) setTimeout(() => (prev.scrollTop = 0), 400);
  };

  /* ---------- the one gesture surface ---------- */

  useEffect(() => {
    const el = col.current;
    if (!el) return;
    type Zone = "cover" | "tray" | "page";
    let g: {
      zone: Zone;
      axis: "none" | "x" | "y" | "native";
      x0: number;
      y0: number;
      t0: number;
      card: number;
      base: number;
      last: { x: number; y: number; t: number; vx: number; vy: number };
      id: number | "mouse";
    } | null = null;

    const trayTop = () => Hm.get() - Hm.get() * S - BOTTOM;
    const cardAt = (x: number) => {
      const t = trays[secRef.current];
      const step = (Wm.get() + G) * S;
      const j = Math.floor(t.posC.get() + (x - PAD) / step);
      return Math.max(0, Math.min(sections[secRef.current].cards.length - 1, j));
    };
    const local = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      return { x: cx - r.left, y: cy - r.top };
    };

    const start = (cx: number, cy: number, id: number | "mouse") => {
      const { x, y } = local(cx, cy);
      const o = openRef.current;
      const s = secRef.current;
      const t = trays[s];
      // Interrupt whatever is moving: it continues from where it is.
      t.p.stop();
      t.posC.stop();
      t.cur.stop();
      secX.stop();
      let zone: Zone = o ? "page" : y >= trayTop() - 6 ? "tray" : "cover";
      // A tray caught mid-flight belongs to the page gesture.
      if (!o && t.p.get() > 0.02) zone = "page";
      g = {
        zone,
        axis: "none",
        x0: x,
        y0: y,
        t0: performance.now(),
        card: zone === "tray" ? cardAt(x) : o?.card ?? 0,
        base: zone === "cover" ? secX.get() : zone === "tray" ? t.posC.get() : t.cur.get(),
        last: { x, y, t: performance.now(), vx: 0, vy: 0 },
        id,
      };
    };

    /** Returns true when the move is ours (the caller then blocks native scroll). */
    const move = (cx: number, cy: number): boolean => {
      if (!g) return false;
      const { x, y } = local(cx, cy);
      const now = performance.now();
      const dt = Math.max(1, now - g.last.t);
      g.last = { x, y, t: now, vx: ((x - g.last.x) / dt) * 1000, vy: ((y - g.last.y) / dt) * 1000 };
      const dx = x - g.x0;
      const dy = y - g.y0;
      if (g.axis === "native") return false;
      if (g.axis === "none") {
        if (Math.hypot(dx, dy) < 8) return g.zone !== "page";
        if (Math.abs(dx) > Math.abs(dy)) g.axis = "x";
        else {
          g.axis = "y";
          if (g.zone === "page") {
            const o = openRef.current;
            const sc = o ? document.querySelector<HTMLElement>(`[data-page="${o.sec}-${o.card}"]`) : null;
            // Down at the top of the page puts the card back; anything else scrolls.
            if (!(dy > 0 && (!sc || sc.scrollTop <= 0))) {
              g.axis = "native";
              return false;
            }
            haptic.drag();
          }
          if (g.zone === "tray") haptic.drag();
        }
      }
      const W = Wm.get();
      const H = Hm.get();
      const s = secRef.current;
      const t = trays[s];
      const n = sections[s].cards.length;
      if (g.zone === "cover") {
        if (g.axis !== "x") return true;
        let v = g.base + dx;
        const min = -(sections.length - 1) * W;
        if (v > 0) v = rubber(v, W);
        else if (v < min) v = min + rubber(v - min, W);
        secX.set(v);
        return true;
      }
      if (g.zone === "tray") {
        if (g.axis === "x") {
          const step = (W + G) * S;
          let v = g.base - dx / step;
          const mx = maxPos(n);
          if (v < 0) v = -rubber(-v * step, W) / step;
          else if (v > mx) v = mx + rubber((v - mx) * step, W) / step;
          t.posC.set(v);
        } else {
          if (t.cur.get() !== g.card) t.cur.set(g.card);
          const travel = trayTop();
          let p = -dy / travel;
          if (p < 0) p = -rubber(-dy, H) / travel;
          t.p.set(Math.min(1.04, p));
        }
        return true;
      }
      // page
      if (g.axis === "x") {
        let v = g.base - dx / (W + G);
        if (v < 0) v = -rubber(-v * W, W) / W;
        else if (v > n - 1) v = n - 1 + rubber((v - (n - 1)) * W, W) / W;
        t.cur.set(v);
        return true;
      }
      // pulling the page down, back into the tray
      const travel = trayTop();
      t.p.set(Math.max(0, Math.min(1, 1 - dy / (travel * 1.15))));
      return true;
    };

    const end = (cancelled = false) => {
      if (!g) return;
      const gg = g;
      g = null;
      const fresh = performance.now() - gg.last.t < 80;
      const vx = fresh ? gg.last.vx : 0;
      const vy = fresh ? gg.last.vy : 0;
      const W = Wm.get();
      const s = secRef.current;
      const t = trays[s];
      const n = sections[s].cards.length;
      const dist = Math.hypot(gg.last.x - gg.x0, gg.last.y - gg.y0);
      const quick = performance.now() - gg.t0 < 420;

      if (gg.axis === "native") return;
      if (gg.axis === "none") {
        if (cancelled || dist > 10 || !quick) {
          // settle anything we stopped
          if (gg.zone === "tray") animate(t.posC, Math.min(maxPos(n), Math.max(0, Math.round(t.posC.get()))), SLIDE);
          if (gg.zone === "cover") goSection(secRef.current);
          if (gg.zone === "page" && openRef.current) {
            animate(t.p, 1, EXPAND);
            animate(t.cur, openRef.current.card, SLIDE);
          } else if (gg.zone === "page") animate(t.p, 0, COLLAPSE);
          return;
        }
        if (gg.zone === "tray") expand(gg.card);
        else if (gg.zone === "cover") {
          t.posC.set(0);
          expand(0);
        } else if (!openRef.current) animate(t.p, 0, COLLAPSE);
        else animate(t.p, 1, EXPAND);
        return;
      }
      if (gg.zone === "cover") {
        if (gg.axis !== "x") return goSection(secRef.current);
        const projected = secX.get() + vx * 0.22;
        const target = Math.round(-projected / W);
        const step = Math.max(-1, Math.min(1, target - secRef.current));
        goSection(secRef.current + step, vx);
        return;
      }
      if (gg.zone === "tray") {
        if (gg.axis === "x") {
          const step = (W + G) * S;
          const projected = t.posC.get() - (vx * 0.22) / step;
          const mx = maxPos(n);
          const to = Math.max(0, Math.min(mx, Math.round(projected)));
          if (Math.round(to) !== Math.round(gg.base)) haptic.select();
          animate(t.posC, to, { ...SLIDE, velocity: -vx / step });
        } else {
          const travel = trayTop();
          const vp = -vy / travel;
          if (!cancelled && (t.p.get() > 0.3 || vy < -420)) expand(gg.card, vp);
          else animate(t.p, 0, { ...COLLAPSE, velocity: vp });
        }
        return;
      }
      // page
      if (gg.axis === "x") {
        const o = openRef.current;
        if (!o) return;
        const projected = t.cur.get() - (vx * 0.22) / W;
        let to = Math.round(projected);
        to = Math.max(o.card - 1, Math.min(o.card + 1, to));
        if (cancelled) to = o.card;
        pageTo(to, -vx / W);
        return;
      }
      const travel = trayTop();
      const vp = -vy / (travel * 1.15);
      if (!cancelled && (t.p.get() < 0.8 || vy > 420)) collapse(vp);
      else animate(t.p, 1, { ...EXPAND, velocity: vp });
    };

    // Touch: one finger drives; a second settles. preventDefault on the first
    // move that is ours, before iOS commits to its own scroll.
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        end(true);
        return;
      }
      const t = e.touches[0];
      start(t.clientX, t.clientY, t.identifier);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!g || g.id === "mouse") return;
      const t = [...e.changedTouches].find((c) => c.identifier === g!.id);
      if (!t) return;
      const ours = move(t.clientX, t.clientY);
      if (ours) {
        if (e.cancelable) e.preventDefault();
        else if (g && g.axis !== "none") g.axis = "native"; // iOS already owns it
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!g || g.id === "mouse") return;
      if ([...e.changedTouches].some((c) => c.identifier === g!.id)) end(false);
    };
    const onTouchCancel = () => end(true);

    // Mouse, for desktop.
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("a,button")) return;
      start(e.clientX, e.clientY, "mouse");
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!g || g.id !== "mouse") return;
      if (move(e.clientX, e.clientY)) e.preventDefault();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!g || g.id !== "mouse" || e.pointerType !== "mouse") return;
      end(false);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchCancel);
    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, trays]);

  // Keys: arrows step, Enter opens, Escape puts the card back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const o = openRef.current;
      const s = secRef.current;
      const t = trays[s];
      const n = sections[s].cards.length;
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (e.key === "Escape" && o) collapse();
      else if (step && o) pageTo(o.card + step);
      else if (step && e.shiftKey) goSection(s + step);
      else if (step) animate(t.posC, Math.max(0, Math.min(maxPos(n), Math.round(t.posC.get()) + step)), SLIDE);
      else if (e.key === "Enter" && !o) expand(Math.round(t.posC.get()));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, trays]);

  const near = (i: number) => Math.abs(i - sec) <= 1;
  const openCard = open ? sections[open.sec].cards[open.card] : null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink" data-app>
      <div
        ref={col}
        className="relative mx-auto h-full w-full max-w-[520px] overflow-hidden"
        style={{ touchAction: open ? "pan-y" : "none" }}
      >
        {sections.map((s, i) =>
          near(i) ? (
            <SectionScreen
              key={`${ed.date}-${s.id}`}
              section={s}
              index={i}
              count={sections.length}
              edition={ed}
              tray={trays[i]}
              secX={secX}
              W={Wm}
              H={Hm}
              dims={dims}
              open={open?.sec === i ? open.card : null}
            />
          ) : null,
        )}

        {/* Section dots: where am I among the sections */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-[calc(14px+var(--sat))] z-20 flex items-center gap-[6px] px-4"
          animate={{ opacity: open ? 0 : 1 }}
          transition={springs.snappy}
        >
          {sections.map((s, i) => (
            <span key={s.id} className={`block h-[6px] rounded-full transition-all duration-300 ${i === sec ? "w-5 bg-paper" : "w-[6px] bg-paper/45"}`} />
          ))}
        </motion.div>

        {/* Full page controls, under the thumb */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center justify-between px-4 pb-[calc(var(--sab)+16px)]"
          initial={false}
          animate={{ opacity: open ? 1 : 0, y: open ? 0 : 24 }}
          transition={springs.snappy}
        >
          <button
            type="button"
            aria-label="Volver a la bandeja"
            onClick={() => collapse()}
            className={`grid h-12 w-12 place-items-center rounded-full bg-ink text-paper shadow-[0_6px_18px_rgba(0,0,0,.25)] ${open ? "pointer-events-auto" : ""}`}
          >
            <Arrow dir="down" weight={1.75} />
          </button>
          {open ? (
            <span className="lnum rounded-full bg-ground/90 px-3 py-2 text-[14px] italic text-ink backdrop-blur-md">
              {open.card + 1} de {sections[open.sec].cards.length}
            </span>
          ) : null}
          {openCard && openCard.type === "note" && openCard.note.source.url ? (
            <a
              href={openCard.note.source.url}
              target="_blank"
              rel="noreferrer"
              className="mono pointer-events-auto flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-paper"
            >
              Fuente <Arrow dir="out" />
            </a>
          ) : (
            <span className="w-12" />
          )}
        </motion.div>
      </div>

      <AbSwitch current="b" hidden={!!open} tone="dark" />

      {/* Editions: a quiet switch under the last section's tray */}
      {editions.length > 1 && !open && sec === sections.length - 1 ? (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(42px+var(--sat))] z-20 mx-auto flex max-w-[520px] gap-2 px-4">
          {editions.map((e, i) => (
            <button
              key={e.date}
              type="button"
              onClick={() => {
                if (i === edIndex) return;
                haptic.complete();
                // A new edition starts at the front.
                secRef.current = 0;
                setSec(0);
                secX.set(0);
                setOpenBoth(null);
                setEdIndex(i);
              }}
              className={`pointer-events-auto rounded-full px-3 py-[6px] text-[13px] italic ${i === edIndex ? "bg-paper text-ink" : "bg-ink/50 text-paper/80"}`}
            >
              Nº {e.number} · {dayMonth(e.date)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- one section: cover + tray ---------- */

function SectionScreen({
  section,
  index,
  count,
  edition,
  tray,
  secX,
  W,
  H,
  dims,
  open,
}: {
  section: SectionDef;
  index: number;
  count: number;
  edition: Edition;
  tray: Tray;
  secX: MotionValue<number>;
  W: MotionValue<number>;
  H: MotionValue<number>;
  dims: { w: number; h: number };
  open: number | null;
}) {
  const left = useTransform(() => index * W.get() + secX.get());
  // Push Pop parallax: the cover photo lags its page.
  const photoX = useTransform(() => -(index * W.get() + secX.get()) * 0.4);
  const p = tray.p;
  const k = useTransform(p, (v) => S + (1 - S) * v);
  const tx = useTransform(() => {
    const v = p.get();
    const kk = S + (1 - S) * v;
    const pos = tray.posC.get() * (1 - v) + tray.cur.get() * v;
    return PAD * (1 - v) - pos * (W.get() + G) * kk;
  });
  const ty = useTransform(() => {
    const v = p.get();
    const kk = S + (1 - S) * v;
    return (H.get() - H.get() * kk - BOTTOM) * (1 - v);
  });
  const radius = useTransform(() => {
    const v = Math.max(0, Math.min(1, p.get()));
    return (R / (S + (1 - S) * v)) * (1 - v);
  });
  const coverDim = useTransform(p, [0, 1], [0, 0.6]);
  const [lifted, setLifted] = useState(false);
  useMotionValueEvent(p, "change", (v) => setLifted(v > 0.01));

  return (
    <motion.section className="absolute inset-y-0 w-full overflow-hidden" style={{ x: left }} aria-label={section.name}>
      <Cover section={section} index={index} count={count} edition={edition} photoX={photoX} />
      <motion.div className="pointer-events-none absolute inset-0 bg-ink" style={{ opacity: coverDim }} />
      <motion.div
        className="absolute left-0 top-0"
        style={{ x: tx, y: ty, scale: k, originX: 0, originY: 0, zIndex: lifted ? 10 : 1 }}
      >
        {section.cards.map((c, i) => (
          <motion.div
            key={c.id}
            className="absolute top-0 overflow-hidden bg-ground shadow-[0_10px_40px_rgba(0,0,0,.35)]"
            style={{ left: i * (dims.w + G), width: dims.w, height: dims.h, borderRadius: radius }}
          >
            <Page card={c} edition={edition} live={open === i} id={`${index}-${i}`} h={dims.h} />
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

function Cover({
  section,
  index,
  count,
  edition,
  photoX,
}: {
  section: SectionDef;
  index: number;
  count: number;
  edition: Edition;
  photoX: MotionValue<number>;
}) {
  const w = edition.weather;
  if (section.kind === "hoy") {
    const sky = w?.sky ?? ["#6f6a62", "#8f897f", "#b3ada2", "#d2cdc3", "#ebe6dc"];
    return (
      <div className="absolute inset-0 text-paper" style={{ background: `linear-gradient(180deg, ${sky.join(", ")})` }}>
        <div
          className="absolute inset-x-0 top-[calc(46px+var(--sat))] flex flex-col overflow-hidden px-5"
          style={{ bottom: `calc(${S * 100}% + ${BOTTOM + 40}px)` }}
        >
          <p className="mono text-paper/80">
            Nº {edition.number} · {weekday(edition.date)}
          </p>
          <h1 className="mt-1 text-[19vw] italic leading-[0.86] tracking-[-0.03em] text-paper min-[520px]:text-[98px]" style={{ fontVariationSettings: '"opsz" 72' }}>
            Noticss
          </h1>
          <p className="mt-2 text-[16px] italic text-paper/90">{longDate(edition.date)}</p>
          <div className="mt-auto flex items-end gap-4 pt-3">
            <span className="lnum text-[68px] font-light leading-[0.8] tracking-[-0.04em]">{w?.tempC ?? "—"}°</span>
            <span className="pb-1 text-[15px] leading-snug">
              <span className="block italic">{w?.condition ?? "sin pronóstico"}</span>
              <span className="mono block text-paper/75">
                {w?.place ?? ""} · {w?.minC ?? "—"}° / {w?.maxC ?? "—"}°
              </span>
            </span>
          </div>
          <div className="mt-4 max-w-[340px] shrink-0 text-paper [@media(max-height:700px)]:hidden [&_.bg-ink]:bg-paper [&_.bg-ink\/25]:bg-paper/35 [&_.text-ink-faint]:text-paper/60">
            <RainStrip hours={w?.rainHours ?? null} />
          </div>
        </div>
        <SectionLabel name="Hoy" sub={`${edition.subjects.length} temas`} index={index} count={count} />
      </div>
    );
  }
  const lead = section.lead;
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink text-paper">
      {lead?.image ? (
        <motion.img
          src={lead.image.src}
          alt={lead.image.alt}
          draggable={false}
          className="absolute inset-y-0 left-[-20%] h-full w-[140%] max-w-none object-cover"
          style={{ x: photoX, filter: "saturate(.92) contrast(1.04)" }}
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.55)_0%,rgba(0,0,0,.05)_32%,rgba(0,0,0,.1)_45%,rgba(0,0,0,.82)_62%,rgba(0,0,0,.92)_100%)]" />
      <div className="absolute inset-x-0 top-[calc(54px+var(--sat))] px-5">
        <h2 className="text-[19vw] italic leading-[0.86] tracking-[-0.025em] min-[520px]:text-[98px]" style={{ fontVariationSettings: '"opsz" 72' }}>
          {section.name}
        </h2>
        {lead ? <p className="mt-4 max-w-[30ch] text-[21px] leading-[1.18]">{lead.title}</p> : null}
        {lead?.image?.credit ? <p className="mt-2 text-[12px] italic text-paper/60">Foto: {lead.image.credit}</p> : null}
      </div>
      <SectionLabel name={section.name} sub={`${section.cards.length} páginas`} index={index} count={count} />
    </div>
  );
}

/** The line just above the tray: section, count, and the hint. */
function SectionLabel({ name, sub, index, count }: { name: string; sub: string; index: number; count: number }) {
  return (
    <div className="absolute inset-x-0 px-[14px]" style={{ bottom: `calc(${S * 100}% + ${BOTTOM + 12}px)` }}>
      <div className="mono flex items-baseline justify-between text-paper/75">
        <span>
          {name} · {sub}
        </span>
        <span>
          {index + 1} / {count}
        </span>
      </div>
    </div>
  );
}

/* ---------- a page: the card at full size ---------- */

function Page({ card, edition, live, id, h }: { card: Card; edition: Edition; live: boolean; id: string; h: number }) {
  const scroller = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  // The photo drifts at half speed as the page scrolls (Push Pop's depth).
  const onScroll = () => {
    const y = scroller.current?.scrollTop ?? 0;
    if (photo.current) photo.current.style.transform = `translate3d(0, ${Math.max(0, y) * 0.5}px, 0)`;
  };
  return (
    <div
      ref={scroller}
      data-page={id}
      onScroll={onScroll}
      className={`no-scrollbar h-full w-full overscroll-none ${live ? "pointer-events-auto overflow-y-auto" : "pointer-events-none overflow-hidden"}`}
    >
      {card.type === "figures" ? (
        <FiguresPage indicators={card.indicators} edition={edition} />
      ) : card.type === "subject" ? (
        <SubjectPage subject={card.subject} edition={edition} photo={photo} h={h} />
      ) : (
        <NotePage note={card.note} subject={card.subject} edition={edition} photo={photo} h={h} />
      )}
    </div>
  );
}

function Photo({ src, alt, photo, h }: { src: string; alt: string; photo: React.RefObject<HTMLDivElement | null>; h: number | string }) {
  return (
    <div className="relative overflow-hidden bg-ink" style={{ height: h }}>
      <div ref={photo} className="absolute inset-0 will-change-transform">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} draggable={false} className="h-full w-full object-cover" style={{ filter: "saturate(.9) contrast(1.03)" }} />
      </div>
    </div>
  );
}

function SubjectPage({ subject, edition, photo, h }: { subject: Subject; edition: Edition; photo: React.RefObject<HTMLDivElement | null>; h: number }) {
  return (
    <div className="min-h-full pb-[calc(110px+var(--sab))]">
      <div className="relative" style={{ height: h }}>
        {subject.image ? (
          <Photo src={subject.image.src} alt={subject.image.alt} photo={photo} h="100%" />
        ) : (
          <div className="absolute inset-0 bg-paper" />
        )}
        <div className={`absolute inset-0 ${subject.image ? "bg-[linear-gradient(180deg,rgba(0,0,0,0)_30%,rgba(0,0,0,.78)_78%)]" : ""}`} />
        <div className={`absolute inset-x-0 bottom-0 px-6 pb-[calc(96px+var(--sab))] ${subject.image ? "text-paper" : "text-ink"}`}>
          <p className={`mono ${subject.image ? "text-paper/80" : "text-accent"}`}>
            {categoryName[subject.category]} · {subject.scope === "mundo" ? "Mundo" : "Costa Rica"}
          </p>
          <h2 className="mt-3 text-[44px] leading-[0.98] tracking-[-0.018em]" style={{ fontVariationSettings: '"opsz" 60' }}>
            {subject.title}
          </h2>
          <p className={`mt-4 text-[13px] italic ${subject.image ? "text-paper/70" : "text-ink-soft"}`}>
            {subject.notes.length} notas · {shortDate(edition.date)}
            {subject.image?.credit ? ` · Foto: ${subject.image.credit}` : ""}
          </p>
        </div>
      </div>
      <div className="px-6 pt-10">
        <p className="text-[23px] italic leading-[1.4] first-letter:float-left first-letter:mr-2 first-letter:mt-[6px] first-letter:text-[64px] first-letter:not-italic first-letter:leading-[0.74] first-letter:text-accent">
          {subject.synopsis}
        </p>
        <div className="mt-10 border-t-[3px] border-ink pt-2">
          <p className="mono">Las notas</p>
        </div>
        {subject.notes.map((n, i) => (
          <div key={n.id} className="grid grid-cols-[28px_1fr] gap-2 border-b border-rule-soft py-4">
            <span className="lnum pt-[2px] text-[16px] italic text-accent">{i + 1}</span>
            <span>
              <span className={`block text-[19px] leading-[1.2] ${n.corrected ? "line-through decoration-accent/70" : ""}`}>{n.headline}</span>
              <span className="mono mt-1 block text-ink-faint">
                {n.source.name} · {kindName[n.kind]}
              </span>
            </span>
          </div>
        ))}
        <p className="mt-6 flex items-center gap-2 text-[15px] italic text-ink-soft">
          Deslice a la izquierda para leerlas <Arrow dir="right" />
        </p>
      </div>
    </div>
  );
}

function NotePage({ note, subject, edition, photo, h }: { note: Note; subject: Subject; edition: Edition; photo: React.RefObject<HTMLDivElement | null>; h: number }) {
  const head = (
    <>
      <p className="mono text-accent">
        {categoryName[subject.category]} · {kindName[note.kind]} · {shortDate(note.published)}
      </p>
      <h2
        className={`mt-3 text-[36px] leading-[1.02] tracking-[-0.012em] ${note.corrected ? "line-through decoration-accent/70 decoration-1" : ""}`}
        style={{ fontVariationSettings: '"opsz" 48' }}
      >
        {note.headline}
      </h2>
    </>
  );
  return (
    <div className="min-h-full bg-ground pb-[calc(120px+var(--sab))]">
      {note.image ? (
        <Photo src={note.image.src} alt={note.image.alt} photo={photo} h={Math.round(h * 0.52)} />
      ) : (
        <div className="relative flex items-end overflow-hidden bg-paper px-6 pb-6" style={{ height: Math.round(h * 0.44) }}>
          <span className="pointer-events-none absolute -right-4 -top-10 select-none text-[260px] italic leading-none text-accent/10">
            {note.kind === "quote" ? "“" : note.kind === "number" ? "№" : "§"}
          </span>
          <p className="relative text-[15px] italic text-ink-soft">{subject.title}</p>
        </div>
      )}
      <div className="relative bg-ground px-6 pt-6">
        {head}
        {note.corrected ? (
          <div className="mt-5 border-y border-accent py-3">
            <p className="mono text-accent">Corrección</p>
            <p className="mt-1 text-[17px] italic leading-[1.4]">{note.corrected}</p>
          </div>
        ) : null}
        <p className="mt-5 text-[19px] leading-[1.52]">{note.body}</p>
        {note.why ? (
          <div className="mt-8 border-l-[2px] border-accent pl-4">
            <p className="mono text-ink-soft">Por qué importa</p>
            <p className="mt-2 text-[19px] italic leading-[1.42] text-ink/90">{note.why}</p>
          </div>
        ) : null}
        {note.tags.length ? (
          <div className="mt-7 flex flex-wrap gap-x-4 gap-y-1">
            {note.tags.map((t) => (
              <span key={t} className="text-[15px] italic text-ink-soft">
                #{t}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mono mt-8 text-ink-soft">Del tema</p>
        <p className="mt-1 text-[17px] leading-snug">{subject.title}</p>
        <SourceLine name={note.source.name} url={note.source.url} credit={note.image?.credit} />
        <p className="mt-6 text-[13px] italic text-ink-faint">Edición del {longDate(edition.date).toLowerCase()}</p>
      </div>
    </div>
  );
}

function FiguresPage({ indicators, edition }: { indicators: Indicator[]; edition: Edition }): ReactNode {
  return (
    <div className="min-h-full bg-paper px-6 pb-[calc(120px+var(--sab))] pt-[calc(64px+var(--sat))]">
      <p className="mono text-accent">Cifras · {shortDate(edition.date)}</p>
      <h2 className="mt-3 text-[52px] italic leading-[0.95] tracking-[-0.02em]" style={{ fontVariationSettings: '"opsz" 72' }}>
        Los números del día
      </h2>
      <div className="mt-8">
        {indicators.map((ind) => (
          <div key={ind.id} className="grid grid-cols-[1fr_auto] items-end gap-4 border-t border-rule-soft py-5">
            <div>
              <p className="mono text-ink-soft">{ind.label}</p>
              <p className="lnum mt-1 text-[46px] font-light leading-none tracking-[-0.02em]">{ind.value ?? "—"}</p>
              <p className="mt-2 text-[13px] italic leading-snug text-ink-soft">{ind.note}</p>
            </div>
            <div className="pb-1 text-right">
              <Sparkline series={ind.series} className="ml-auto text-ink" w={104} h={32} />
              <p className="lnum mt-1 text-[13px]">
                <Delta d={ind.delta} />
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12px] italic text-ink-faint">Un guion es un dato que no se pudo verificar: nunca se inventa.</p>
    </div>
  );
}
