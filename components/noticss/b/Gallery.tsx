"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import { Carrier } from "@/lib/updatr/carrier";
import { centredRect, rectOf, type Rect } from "@/lib/updatr/flight";
import { clamp, rubber, PAGE, type Media } from "./model";

const OPEN = { type: "spring" as const, stiffness: 190, damping: 22, mass: 1 };
const HOME = { type: "spring" as const, stiffness: 210, damping: 27, mass: 1 };
const SLIDE_GAP = 24;
/** Space a caption needs under the picture; with less, it goes inside it. */
const CAPTION_ROOM = 112;

type Stage = "opening" | "open" | "closing";

/**
 * Press and hold a page's picture (or tap it): the picture itself lifts out of
 * the page and settles in the middle at its own proportions. Once it lands,
 * the viewer is a gallery of the section's media, one per story, landing on
 * each on a spring (vertical shorts will live here too). It closes by a pull
 * down, a tap on the dark, Escape or the button; the picture in view flies
 * home into its own page, and the row behind has already moved to that page.
 */
export function Gallery({
  items,
  start,
  piece,
  home,
  onNavigate,
  homeOf,
  onClosed,
}: {
  items: Media[];
  start: number;
  piece: HTMLElement;
  home: HTMLElement;
  onNavigate: (card: number) => void;
  homeOf: (card: number) => HTMLElement | null;
  onClosed: () => void;
}) {
  const [stage, setStageState] = useState<Stage>("opening");
  const stageRef = useRef<Stage>("opening");
  const setStage = (s: Stage) => {
    stageRef.current = s;
    setStageState(s);
  };
  const [index, setIndex] = useState(start);
  const indexRef = useRef(start);
  // The lifted picture's own proportions are known at once; the others as they load.
  const [aspects, setAspects] = useState<number[]>(() => {
    const img = piece as HTMLImageElement;
    const own = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.6;
    return items.map((_, i) => (i === start ? own : 16 / 10));
  });
  const [vw] = useState(() => window.innerWidth);
  const gx = useMotionValue(start);
  const dragY = useMotionValue(0);
  const dim = useMotionValue(0);
  const backdrop = useTransform(() => dim.get() * (1 - Math.min(1, Math.max(0, dragY.get()) / 520)));
  const shown = useMotionValue(0);
  const chrome = useTransform(() => shown.get() * (1 - Math.min(1, Math.abs(dragY.get()) / 160)));
  const carrier = useRef<Carrier | null>(null);
  const boxes = useRef<(HTMLDivElement | null)[]>([]);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);

  const rectFor = (i: number): Rect => centredRect(aspects[i] ?? 1.6, 0.92, 480, 0.62);

  // Lift the page's own picture and fly it to the middle. It starts where it
  // is really drawn (the page's scroll parallax included), cut to the window
  // its page shows it through, and opens out of that window.
  useLayoutEffect(() => {
    const aspect = aspects[start];
    const frame = home.parentElement ?? home;
    const c = new Carrier(piece, home, rectOf(home));
    c.clipTo(rectOf(frame));
    c.shadow(true);
    carrier.current = c;
    animate(dim, 0.94, { duration: 0.32, ease: [0.2, 0, 0, 1] });
    c.fly(
      centredRect(aspect, 0.92, 480, 0.62),
      OPEN,
      () => {
        const box = boxes.current[start];
        if (box) {
          // Shown in the same tick it lands (React's opening style would hide it a frame).
          box.style.visibility = "";
          c.shadow(false);
          c.land(box);
        }
        setStage("open");
        animate(shown, 1, { duration: 0.22 });
      },
      { clip: { from: rectOf(frame), to: null } },
    );
    return () => {
      // Unmounted mid-way: the picture always goes home.
      if (!c.atHome) c.goHome();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (i: number, v = 0) => {
    const to = clamp(i, 0, items.length - 1);
    if (to !== indexRef.current) haptic.select();
    indexRef.current = to;
    setIndex(to);
    animate(gx, to, { ...PAGE, velocity: v });
  };

  const close = (vy = 0) => {
    if (stageRef.current !== "open") return;
    setStage("closing");
    haptic.select();
    animate(shown, 0, { duration: 0.12 });
    const i = indexRef.current;
    const box = boxes.current[i];
    const c = carrier.current;
    animate(dim, 0, { duration: 0.42, ease: [0.4, 0, 0.2, 1] });
    /** The finger's release (px/s) as progress per second along the flight, toward home only. */
    const progressVelocity = (from: Rect, to: Rect) => {
      const d = to.y - from.y;
      return Math.abs(d) > 1 ? clamp(vy / d, 0, 3) : 0;
    };
    // The drag keeps its place while everything fades from where it is
    // (resetting it would flash the dark and the captions back).
    if (i === start && c && box) {
      // The page's own picture: lift it from here and fly it home, into the
      // window its page shows it through.
      c.lift(rectOf(box));
      // The slide's frame stays behind empty: it must not show as a dark box.
      box.style.visibility = "hidden";
      const frame = home.parentElement ?? home;
      c.fly(() => rectOf(home), { ...HOME, velocity: progressVelocity(c.rect, rectOf(home)) }, () => {
        c.goHome();
        onClosed();
      }, { clip: { from: null, to: rectOf(frame) } });
      return;
    }
    // Another story's picture: the row moves to that page behind the dark, then
    // that page's OWN picture is lifted to where this slide shows it and flies
    // home (one element per picture; the slide's copy only stood in for it).
    c?.goHome();
    const target = items[i];
    onNavigate(target.card);
    const t0 = performance.now();
    const carry = async () => {
      const dest = homeOf(target.card);
      const destImg = dest?.querySelector("img") ?? null;
      if ((!dest || !destImg) && performance.now() - t0 < 400) {
        requestAnimationFrame(carry);
        return;
      }
      if (!dest || !destImg || !box) {
        onClosed();
        return;
      }
      // Decoded before it is shown, so neither end of the flight can be an empty box.
      await Promise.race([destImg.decode().catch(() => {}), new Promise((r) => setTimeout(r, 250))]);
      const from = rectOf(box);
      const c2 = new Carrier(destImg, dest, from);
      box.style.visibility = "hidden";
      const frame = dest.parentElement ?? dest;
      c2.fly(() => rectOf(dest), { ...HOME, velocity: progressVelocity(from, rectOf(dest)) }, () => {
        c2.goHome();
        onClosed();
      }, { clip: { from: null, to: rectOf(frame) } });
    };
    requestAnimationFrame(() => requestAnimationFrame(carry));
  };

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(indexRef.current + 1);
      if (e.key === "ArrowLeft") go(indexRef.current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One finger: sideways steps through the gallery, down closes.
  const g = useRef<{ id: number; x0: number; y0: number; axis: "none" | "x" | "y"; base: number; t: number; vx: number; vy: number; lx: number; ly: number; moving: boolean; yb: number } | null>(null);
  /** Put the strip back on its slide (a touch may have stopped it between two). */
  const settleStrip = () => {
    if (Math.abs(gx.get() - indexRef.current) > 0.001) go(indexRef.current);
  };
  const onPointerDown = (e: PointerEvent) => {
    if (stageRef.current !== "open") return;
    if (g.current) {
      // A second finger settles the first.
      g.current = null;
      go(indexRef.current);
      animate(dragY, 0, { ...PAGE, velocity: 0 });
      return;
    }
    const moving = Math.abs(gx.getVelocity()) > 0.05;
    gx.stop();
    g.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, axis: "none", base: gx.get(), t: performance.now(), vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, moving, yb: 0 };
  };
  const onPointerMove = (e: PointerEvent) => {
    const s = g.current;
    if (!s || s.id !== e.pointerId) return;
    const now = performance.now();
    const dt = Math.max(1, now - s.t);
    s.vx = ((e.clientX - s.lx) / dt) * 1000;
    s.vy = ((e.clientY - s.ly) / dt) * 1000;
    s.lx = e.clientX;
    s.ly = e.clientY;
    s.t = now;
    const dx = e.clientX - s.x0;
    const dy = e.clientY - s.y0;
    if (s.axis === "none") {
      if (Math.hypot(dx, dy) < 8) return;
      s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (s.axis === "y") {
        // Catch the picture where it is (it may still be springing back).
        dragY.stop();
        s.yb = dragY.get() - dy;
      }
      haptic.drag();
    }
    const step = vw + SLIDE_GAP;
    if (s.axis === "x") {
      let v = s.base - dx / step;
      const max = items.length - 1;
      if (v < 0) v = rubber(v * step, vw) / step;
      else if (v > max) v = max + rubber((v - max) * step, vw) / step;
      gx.set(v);
    } else {
      const v = s.yb + dy;
      dragY.set(v > 0 ? v : rubber(v, 300));
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    const s = g.current;
    if (!s || s.id !== e.pointerId) return;
    g.current = null;
    const fresh = performance.now() - s.t < 80;
    const vx = fresh ? s.vx : 0;
    const vy = fresh ? s.vy : 0;
    const dx = e.clientX - s.x0;
    const dy = e.clientY - s.y0;
    if (s.axis === "none") {
      settleStrip();
      // A tap on the dark (not on the picture or its words) closes, unless it only stopped the strip.
      const t = e.target as HTMLElement;
      if (!s.moving && !t.closest("[data-slide-media],[data-caption],button")) close();
      return;
    }
    const step = vw + SLIDE_GAP;
    if (s.axis === "x") {
      let to = indexRef.current;
      if (dx < -step * 0.18 || vx < -320) to += 1;
      else if (dx > step * 0.18 || vx > 320) to -= 1;
      go(to, -vx / step);
      return;
    }
    settleStrip();
    if (dy > 110 || vy > 520) close(vy);
    else animate(dragY, 0, { ...PAGE, velocity: vy });
  };
  const onPointerCancel = () => {
    if (!g.current) return;
    g.current = null;
    go(indexRef.current);
    animate(dragY, 0, { ...PAGE, velocity: 0 });
  };

  // Native listeners, not React props: the lifted picture is the page's own
  // element, and React would route its events through the page it came from.
  const root = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel });
  useEffect(() => {
    handlers.current = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
  });
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const down = (e: PointerEvent) => handlers.current.onPointerDown(e);
    const moveH = (e: PointerEvent) => handlers.current.onPointerMove(e);
    const up = (e: PointerEvent) => handlers.current.onPointerUp(e);
    const cancel = () => handlers.current.onPointerCancel();
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", moveH);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", moveH);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
    };
  }, []);

  const x = useTransform(() => -gx.get() * (vw + SLIDE_GAP));
  const lift = useTransform(dragY, (v) => v);
  const shrink = useTransform(dragY, (v) => 1 - Math.min(0.18, Math.max(0, v) / 1600));

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[60] select-none"
      style={{ touchAction: "none" }}
      role="dialog"
      aria-modal="true"
      aria-label="Galería"
    >
      <motion.div className="absolute inset-0 bg-black" style={{ opacity: backdrop }} />
      <motion.div className="absolute inset-0" style={{ x }}>
        {items.map((m, i) => {
          const r = rectFor(i);
          const inside = window.innerHeight - (r.y + r.h) < CAPTION_ROOM;
          const near = Math.abs(i - index) <= 1;
          const mine = i === start;
          return (
            <motion.div
              key={`${m.card}-${m.src}`}
              className="absolute top-0 h-full"
              style={{ left: i * (vw + SLIDE_GAP), width: vw, y: i === index ? lift : 0, scale: i === index ? shrink : 1 }}
            >
              <div
                ref={(el) => {
                  boxes.current[i] = el;
                }}
                data-slide-media
                className="absolute overflow-hidden bg-ink"
                style={{ left: r.x, top: r.y, width: r.w, height: r.h, visibility: mine && stage === "opening" ? "hidden" : undefined }}
              >
                {!mine && near ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    ref={(el) => {
                      imgs.current[i] = el;
                    }}
                    src={m.src}
                    alt={m.alt}
                    draggable={false}
                    onLoad={(e) => {
                      const im = e.currentTarget;
                      if (im.naturalWidth) setAspects((a) => a.map((v, k) => (k === i ? im.naturalWidth / im.naturalHeight : v)));
                    }}
                    className="block h-full w-full object-cover"
                  />
                ) : null}
                {inside ? (
                  <motion.div
                    data-caption
                    className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.72))] px-4 pb-4 pt-12 text-paper"
                    style={{ opacity: chrome }}
                  >
                    <Caption m={m} />
                  </motion.div>
                ) : null}
              </div>
              {!inside ? (
                <motion.div data-caption className="absolute px-1 pt-4 text-paper" style={{ left: r.x, top: r.y + r.h, width: r.w, opacity: chrome }}>
                  <Caption m={m} />
                </motion.div>
              ) : null}
            </motion.div>
          );
        })}
      </motion.div>
      <motion.div className="pointer-events-none absolute inset-x-0 top-[calc(14px+var(--sat))] mx-auto flex max-w-[520px] items-center justify-between px-4" style={{ opacity: chrome }}>
        <span className="lnum rounded-full bg-white/10 px-3 py-[6px] text-[14px] italic text-paper">
          {index + 1} de {items.length}
        </span>
        <button
          type="button"
          aria-label="Cerrar galería"
          onClick={() => close()}
          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/12 text-paper"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
          </svg>
        </button>
      </motion.div>
    </div>
  );
}

function Caption({ m }: { m: Media }) {
  return (
    <>
      <p className="mono text-paper/65">{m.kicker}</p>
      <p className="mt-1 text-[19px] leading-[1.18]">{m.title}</p>
      {m.credit ? <p className="mt-1 text-[12px] italic text-paper/55">Foto: {m.credit}</p> : null}
    </>
  );
}
