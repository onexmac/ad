"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import { Carrier } from "@/lib/updatr/carrier";
import { AXIS_LOCK, CANCEL_SPRING, rectOf, type Rect } from "@/lib/updatr/flight";
import type { PunchSheet } from "./usePunchSheet";

/*
 * A check's photo, opened. The picture itself (the one element on the page)
 * flies from its place into the middle of the screen on a spring, and flies
 * back on close. Under it, Leia's strip: the marker always out (four colours,
 * three widths, yellow at 16 px to start, undo; a finger on the picture draws
 * and the drawing is burned into the photo), then the back key, a
 * slide-to-delete and, at the far right, the camera key for another photo.
 * Closes with the back key, a tap outside or Escape.
 */

const OPEN = { type: "spring" as const, stiffness: 230, damping: 21 };
const CLOSE = { type: "spring" as const, stiffness: 260, damping: 28 };
const COLORS = [
  { id: "yellow", hex: "#ffd23f", label: "Amarillo" },
  { id: "red", hex: "#eb3b3b", label: "Rojo" },
  { id: "white", hex: "#ffffff", label: "Blanco" },
  { id: "black", hex: "#1c1e22", label: "Negro" },
];
const WIDTHS = [8, 16, 28];
const SHEET = 64; // the strip's main row
const TOOLS = 56; // the marker's row above it
const KNOB = 76; // the slide-to-delete handle: wide, an easy grab

/** A stroke in fractions of the picture (x, y and width over its width), so it holds at any size. */
type Stroke = { color: string; w: number; pts: [number, number][] };

const noop = () => () => {};

export function PhotoViewer({ s }: { s: PunchSheet }) {
  const client = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  if (!client || !s.viewing) return null;
  return createPortal(<Viewer key={`${s.viewing.id}:${s.viewing.i}`} s={s} id={s.viewing.id} i={s.viewing.i} />, document.body);
}

/** Where the picture sits open: as large as fits above the strip, centred. */
function stageRect(aspect: number, tools: boolean): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const css = getComputedStyle(document.documentElement);
  const sat = parseFloat(css.getPropertyValue("--sat")) || 0;
  const sab = parseFloat(css.getPropertyValue("--sab")) || 0;
  const top = sat + 20;
  const bottom = vh - sab - SHEET - (tools ? TOOLS : 0) - 20;
  const maxW = Math.min(vw - 24, 720);
  const maxH = Math.max(120, bottom - top);
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  return { x: (vw - w) / 2, y: top + (maxH - h) / 2, w, h };
}

function Viewer({ s, id, i }: { s: PunchSheet; id: string; i: number }) {
  const check = s.byId.get(id)!;
  const src = (s.photos[id] ?? [])[i];
  const slot = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const carrier = useRef<Carrier | null>(null);
  const [aspect] = useState(() => {
    const img = s.viewFrom.current;
    return img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 3 / 4;
  });
  // No picture to carry (it left the page): show one here instead.
  const [own] = useState(() => {
    const img = s.viewFrom.current;
    return !img || !img.isConnected || !img.parentElement;
  });
  const [landed, setLanded] = useState(own);
  // The marker is always out: a finger on the picture draws. (Closing is the back
  // key, a tap outside or Escape; the picture itself no longer drags away.)
  const drawing = true;
  const camera = useRef<HTMLInputElement>(null);
  // The stage: the marker's row takes room under the picture, so it shrinks to make it.
  const rect: Rect = stageRect(aspect, drawing);
  const [color, setColor] = useState(COLORS[0].hex);
  const [width, setWidth] = useState(16);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const closing = useRef(false);
  const dim = useMotionValue(0);
  const sheetY = useMotionValue(1);
  const sheetPct = useTransform(sheetY, (v) => `${v * 100}%`);
  const dx = useMotionValue(0);
  const dy = useMotionValue(0);
  const scale = useTransform([dx, dy], ([x, y]: number[]) => 1 - Math.min(0.28, Math.max(Math.max(0, y), Math.max(0, x) * 0.6) / 1100));

  // Open: lift the picture out of its place and fly it to the stage.
  useLayoutEffect(() => {
    const img = s.viewFrom.current;
    const target = stageRect(aspect, true);
    document.body.style.overflow = "hidden";
    animate(dim, 1, { duration: 0.28 });
    animate(sheetY, 0, { type: "spring", stiffness: 380, damping: 34 });
    if (own || !img || !img.parentElement) return () => {
      document.body.style.overflow = "";
    };
    const c = new Carrier(img, img.parentElement, rectOf(img));
    carrier.current = c;
    c.shadow(true);
    c.fly(target, OPEN, () => {
      if (slot.current) {
        c.land(slot.current);
        setLanded(true);
      }
    });
    return () => {
      document.body.style.overflow = "";
      // Leaving any other way (the page changing under us): the picture goes home.
      if (carrier.current && !carrier.current.atHome) carrier.current.goHome();
    };
    // Runs once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The canvas follows the stage, sharp on the screen's pixels.
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const k = window.devicePixelRatio || 1;
    cv.width = Math.round(rect.w * k);
    cv.height = Math.round(rect.h * k);
    paint(cv, strokes);
  }, [rect.w, rect.h, strokes]);

  /** Burn what was drawn into the photo, at the photo's own size. */
  const commit = () => {
    if (!strokes.length) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0);
      paint(c, strokes, false);
      s.replacePhoto(id, i, c.toDataURL("image/jpeg", 0.8));
      setStrokes([]);
    };
    img.src = src;
  };

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    commit();
    animate(dim, 0, { duration: 0.24 });
    animate(sheetY, 1, { type: "spring", stiffness: 380, damping: 34 });
    const c = carrier.current;
    const piece = slot.current?.querySelector("img");
    if (!c || own || !piece || !c.home.isConnected) {
      s.closeViewer();
      return;
    }
    c.lift(rectOf(piece));
    dx.set(0);
    dy.set(0);
    c.fly(
      () => rectOf(c.home),
      CLOSE,
      () => {
        c.goHome();
        carrier.current = null;
        s.closeViewer();
      },
    );
  };

  const remove = () => {
    if (closing.current) return;
    closing.current = true;
    haptic.delete();
    animate(dim, 0, { duration: 0.3 });
    animate(sheetY, 1, { type: "spring", stiffness: 380, damping: 34 });
    // The picture drops away; then it goes home unseen and the photo is removed.
    const el = slot.current;
    const done = () => {
      carrier.current?.goHome();
      carrier.current = null;
      s.removePhoto(id, i);
      s.say(`Foto borrada · ${check.num}`);
      s.closeViewer();
    };
    if (el) animate(el, { y: 120, scale: 0.55, opacity: 0, rotate: -6 }, { duration: 0.32, ease: [0.4, 0, 1, 1] }).then(done);
    else done();
  };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  });

  // Pull down or swipe right to close; a short pull springs back.
  const drag = useRef<{ x: number; y: number; axis: "x" | "y" | null; t: number; v: number; last: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (drawing || !landed || closing.current) return;
    drag.current = { x: e.clientX, y: e.clientY, axis: null, t: performance.now(), v: 0, last: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const mx = e.clientX - d.x;
    const my = e.clientY - d.y;
    if (!d.axis) {
      if (Math.abs(mx) < AXIS_LOCK && Math.abs(my) < AXIS_LOCK) return;
      d.axis = Math.abs(my) >= Math.abs(mx) ? "y" : "x";
    }
    const now = performance.now();
    const val = d.axis === "y" ? my : mx;
    d.v = ((val - d.last) / Math.max(1, now - d.t)) * 1000;
    d.last = val;
    d.t = now;
    if (d.axis === "y") {
      dy.set(my > 0 ? my : my * 0.25);
      dx.set(mx * 0.3);
      dim.set(1 - Math.min(0.8, Math.max(0, my) / 380));
    } else {
      dx.set(mx > 0 ? mx : mx * 0.25);
      dim.set(1 - Math.min(0.8, Math.max(0, mx) / 420));
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.axis) return;
    const far = d.axis === "y" ? dy.get() > 110 || d.v > 650 : dx.get() > window.innerWidth * 0.3 || d.v > 650;
    if (far) return close();
    animate(dx, 0, CANCEL_SPRING);
    animate(dy, 0, CANCEL_SPRING);
    animate(dim, 1, { duration: 0.2 });
  };

  // Drawing on the picture.
  const pen = useRef<Stroke | null>(null);
  const local = (e: React.PointerEvent): [number, number] => {
    const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return [(e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height];
  };
  const penDown = (e: React.PointerEvent) => {
    if (!drawing) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pen.current = { color, w: width / rect.w, pts: [local(e)] };
  };
  const penMove = (e: React.PointerEvent) => {
    const st = pen.current;
    if (!st || !canvas.current) return;
    st.pts.push(local(e));
    paint(canvas.current, [...strokes, st]);
  };
  const penUp = () => {
    const st = pen.current;
    pen.current = null;
    if (st) setStrokes((p) => [...p, st]);
  };

  return (
    <div className="leia-root fixed inset-0 z-[60]" style={{ touchAction: "none" }}>
      <motion.div className="absolute inset-0 bg-[#121417]/90" style={{ opacity: dim }} onClick={close} />
      {(
        <motion.div
          ref={slot}
          className="absolute overflow-hidden rounded-[4px] shadow-[0_24px_60px_-18px_rgba(0,0,0,0.7)]"
          initial={false}
          animate={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          style={{ x: dx, y: dy, scale, visibility: landed ? "visible" : "hidden" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {own ? <img src={src} alt="" draggable={false} className="h-full w-full object-cover" /> : null}
          <canvas
            ref={canvas}
            className="absolute inset-0 h-full w-full"
            style={{ pointerEvents: drawing ? "auto" : "none", cursor: drawing ? "crosshair" : undefined }}
            onPointerDown={penDown}
            onPointerMove={penMove}
            onPointerUp={penUp}
            onPointerCancel={penUp}
          />
        </motion.div>
      )}

      {/* Leia's strip under the picture. */}
      <motion.div className="leia-strip absolute inset-x-0 bottom-0" style={{ y: sheetPct, paddingBottom: "var(--sab)" }}>
        <AnimatePresence initial={false}>
          {drawing ? (
            // The marker's row, always open with the strip.
            <motion.div
              key="tools"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: TOOLS, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
              className="overflow-hidden shadow-[inset_0_-1px_0_#b9bbc0]"
            >
              <div className="mx-auto flex h-[56px] max-w-[560px] items-center gap-1.5 px-3">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={c.label}
                    aria-pressed={color === c.hex}
                    onClick={() => {
                      haptic.select();
                      setColor(c.hex);
                    }}
                    className={`grid size-9 shrink-0 place-items-center rounded-[4px] ${color === c.hex ? "leia-btn-on" : "leia-btn"}`}
                  >
                    <span className="size-5 rounded-[2px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]" style={{ background: c.hex }} />
                  </button>
                ))}
                <span className="mx-0.5 h-7 w-px bg-[#b9bbc0] shadow-[1px_0_0_#fff]" />
                {WIDTHS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    aria-label={`Trazo ${w} px`}
                    aria-pressed={width === w}
                    onClick={() => {
                      haptic.select();
                      setWidth(w);
                    }}
                    className={`grid size-9 shrink-0 place-items-center rounded-[4px] ${width === w ? "leia-btn-on" : "leia-btn"}`}
                  >
                    <span className="rounded-full" style={{ width: Math.max(4, w * 0.7), height: Math.max(4, w * 0.7), background: color, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)" }} />
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Deshacer"
                  disabled={!strokes.length}
                  onClick={() => {
                    haptic.select();
                    setStrokes((p) => p.slice(0, -1));
                  }}
                  className="leia-btn ml-auto grid size-9 shrink-0 place-items-center rounded-[4px] disabled:opacity-40"
                >
                  <UndoGlyph />
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="mx-auto flex h-[64px] max-w-[560px] items-center gap-2 px-3">
          <button type="button" aria-label="Volver" onClick={close} className="leia-btn grid size-11 shrink-0 place-items-center rounded-[4px]">
            <BackGlyph />
          </button>
          <SlideToDelete onDelete={remove} />
          {/* Another photo for this check, without leaving the viewer. */}
          <button
            type="button"
            aria-label="Agregar otra foto"
            onClick={() => camera.current?.click()}
            className="leia-btn grid size-11 shrink-0 place-items-center rounded-[4px]"
          >
            <CameraGlyph />
          </button>
          <input
            ref={camera}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) s.pickPhoto(check, f);
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}

/** Strokes onto a canvas of any size (they are kept in fractions of the picture). */
function paint(cv: HTMLCanvasElement, strokes: Stroke[], clear = true) {
  const g = cv.getContext("2d");
  if (!g) return;
  const W = cv.width;
  const H = cv.height;
  if (clear) g.clearRect(0, 0, W, H);
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const st of strokes) {
    g.strokeStyle = st.color;
    g.lineWidth = st.w * W;
    g.beginPath();
    st.pts.forEach(([x, y], n) => (n ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H)));
    if (st.pts.length === 1) g.lineTo(st.pts[0][0] * W + 0.01, st.pts[0][1] * H);
    g.stroke();
  }
}

/**
 * Slide to delete: a sunk track, the handle a key with the bin. The handle
 * stretches with the finger and reddens as it goes; at the end the photo goes,
 * let go short and it springs back.
 */
function SlideToDelete({ onDelete }: { onDelete: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0); // how far the finger has stretched the handle
  const room = useMotionValue(200); // how far it can stretch
  const width = useTransform(x, (v) => KNOB + v);
  const red = useTransform([x, room], ([v, r]: number[]) => Math.min(1, v / Math.max(1, r * 0.9)));
  const ink = useTransform(red, [0, 0.5], ["#55585e", "#ffffff"]);
  const hint = useTransform(x, [0, 90], [1, 0]);
  const start = useRef<{ px: number; x: number; max: number } | null>(null);
  const done = useRef(false);
  const back = () => animate(x, 0, { type: "spring", stiffness: 500, damping: 32 });
  return (
    <div ref={track} className="leia-track relative h-11 min-w-0 flex-1 rounded-[6px] p-[2px]">
      <motion.span style={{ opacity: hint }} className="leia-emboss pointer-events-none absolute inset-0 grid place-items-center pl-[84px] pr-2 text-[14px] text-[#7d8087]">
        Desliza para borrar
      </motion.span>
      <motion.button
        type="button"
        aria-label="Desliza para borrar la foto"
        className="leia-btn relative flex h-10 items-center justify-end overflow-hidden rounded-[4px]"
        style={{ width, touchAction: "none" }}
        onPointerDown={(e) => {
          if (done.current) return;
          const max = (track.current?.offsetWidth ?? 200) - 4 - KNOB;
          room.set(max);
          start.current = { px: e.clientX, x: x.get(), max };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          haptic.drag();
        }}
        onPointerMove={(e) => {
          const st = start.current;
          if (!st) return;
          x.set(Math.max(0, Math.min(st.max, st.x + e.clientX - st.px)));
        }}
        onPointerUp={() => {
          const st = start.current;
          start.current = null;
          if (!st) return;
          if (x.get() >= st.max * 0.9) {
            done.current = true;
            animate(x, st.max, { type: "spring", stiffness: 600, damping: 40 });
            onDelete();
          } else back();
        }}
        onPointerCancel={() => {
          start.current = null;
          back();
        }}
      >
        {/* The red comes up through the key as it stretches. */}
        <motion.span aria-hidden className="leia-fill-red pointer-events-none absolute inset-0" style={{ opacity: red }} />
        <motion.span className="relative flex w-[76px] shrink-0 items-center justify-center gap-1.5" style={{ color: ink }}>
          <BinGlyph />
          <Chevron />
        </motion.span>
      </motion.button>
    </div>
  );
}

// Leia's keys carry solid glyphs, engraved.
function CameraGlyph() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" className="leia-glyph" aria-hidden>
      <path d="M8.2 4.5h7.6l1.4 2.2H21a1 1 0 011 1V19a1 1 0 01-1 1H3a1 1 0 01-1-1V7.7a1 1 0 011-1h3.8z" fill="currentColor" />
      <circle cx="12" cy="13" r="4.2" fill="#e9eaec" />
      <circle cx="12" cy="13" r="2.6" fill="currentColor" />
    </svg>
  );
}

function BackGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" className="leia-glyph" aria-hidden>
      <path d="M14.5 5l-7 7 7 7" stroke="currentColor" strokeWidth={3} strokeLinecap="square" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" className="leia-glyph" aria-hidden>
      <path d="M8 4l8 8-8 8" stroke="currentColor" strokeWidth={3.4} strokeLinecap="square" />
    </svg>
  );
}

function BinGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" className="leia-glyph" aria-hidden>
      <path d="M9 3h6l1 2h4v2.4H4V5h4z" fill="currentColor" />
      <path d="M5.5 9h13l-1 11.2a1 1 0 01-1 .8h-9a1 1 0 01-1-.8z" fill="currentColor" />
    </svg>
  );
}

function UndoGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" className="leia-glyph" aria-hidden>
      <path d="M9 5L4 10l5 5" stroke="currentColor" strokeWidth={2.6} strokeLinecap="square" />
      <path d="M5 10h9a6 6 0 010 12h-3" stroke="currentColor" strokeWidth={2.6} />
    </svg>
  );
}
