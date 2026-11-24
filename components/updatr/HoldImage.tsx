"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
} from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { centredRect, layoutRectOf, openArea, rectOf, resist, type Rect } from "@/lib/updatr/flight";
import { Carrier } from "@/lib/updatr/carrier";
import type { Item } from "@/data/updatr/types";
import { setVerdict, useTaste, verdictOf, type Verdict } from "@/lib/updatr/taste";
import { Heart, OUT } from "./LikeFan";

const HOLD_MS = 260;
/** Held this long from the first touch, the lifted picture stays up when let go. */
const LOCK_MS = 1600;
const MOVE_CANCEL_PX = 10;
/** Slide a lifted image up this far and release to open it. */
const PEEK_OPEN_PX = 70;
/** Locked: slid sideways this share of its width (at least SWIPE_MIN_PX), or flung, it gives that side's verdict. */
const SWIPE_FRAC = 0.3;
const SWIPE_MIN_PX = 80;
const FLING_PX_MS = 0.5;
/** Locked: slid down this far (the finger's travel), it goes back into place. */
const CLOSE_PX = 110;
/** Tilt per pixel sideways, as a card pushed across a table, up to MAX_TILT degrees. */
const TILT = 0.07;
const MAX_TILT = 14;
const toColor = { duration: 0.45, ease: [0.2, 0, 0, 1] } as const;
const toMono = { duration: 0.65, ease: [0.4, 0, 0.2, 1] } as const;

/** One lifted picture at a time, whatever the fingers do. */
let holding = false;

export type OpenFrom = { rect: Rect; carrier: Carrier };

type Intent = null | Verdict | "close" | "open";
type Drag = {
  /** -1: the finger that held it, still down. */
  id: number;
  x0: number;
  y0: number;
  /** Where the picture was when this touch started (it may still be springing back). */
  bx: number;
  by: number;
  t0: number;
  lx: number;
  ly: number;
  lt: number;
  vx: number;
  vy: number;
  moved: number;
};

const mix = (a: string, b: string, t: number) => `color-mix(in srgb, var(${a}) ${Math.round(t * 100)}%, var(${b}))`;

/**
 * A picture: ONE <img>, black and white by a filter on that element.
 * - Tap: the image itself is handed to the article (onOpen) and flies there.
 *   A tap opens on the native click, so a touch that only stops a fling (the
 *   browser drops its click) never opens anything.
 * - Press and hold: it turns to colour and lifts out of the layout to the centre
 *   of the screen at its own proportions, the page blurred behind. Release: it
 *   springs home. Slide up and release: it opens from where it is.
 * - With `like` (an entry the reader can judge), a hold that lasts LOCK_MS
 *   from the first touch locks it up there: a hairline under the hint fills
 *   while it charges, and let go before, it springs home as before. Locked,
 *   the verdict keys sit at its resting bottom corners, less on the left and
 *   more on the right, fixed above it. Slide it sideways past a third of its width (or fling it) and
 *   let go: that side's verdict, and it goes back into place. Slide it down:
 *   back into place. Up: open. Tap it: open. Tap a key: that verdict (again
 *   takes it back), and it stays up. A tap beside it or Escape puts it back.
 * - A drag that starts on it scrolls the page (or the strip) and cancels the press.
 */
export function HoldImage({
  src,
  alt,
  fallbackTitle,
  onOpen,
  onHoldChange,
  flightKey,
  away = false,
  ratio = "1 / 1",
  className,
  style,
  index,
  caption,
  hint,
  like,
}: {
  src?: string;
  alt: string;
  fallbackTitle: string;
  onOpen: (from: OpenFrom) => void;
  onHoldChange?: (holding: boolean) => void;
  /** Identifies this picture so an open article can fly it back. */
  flightKey?: string;
  /** The article holds this picture right now. */
  away?: boolean;
  ratio?: string;
  className?: string;
  style?: CSSProperties;
  index?: string;
  /** Shown under the picture while it is lifted. */
  caption?: { kicker: string; title: string };
  /** The lift's instruction, in the app's language. */
  hint?: { slide: string; release: string };
  /** The entry this picture stands for: a long hold locks it, with its verdict keys. */
  like?: Item;
}) {
  const frame = useRef<HTMLButtonElement>(null);
  const slot = useRef<HTMLSpanElement>(null);

  const [pressed, setPressed] = useState(false);
  const [lit, setLit] = useState(false);
  const [lifted, setLifted] = useState(false);
  const [out, setOut] = useState(false);
  const [portal, setPortal] = useState(false);
  const [armed, setArmedState] = useState(false);
  const armedRef = useRef(false);
  const setArmed = (v: boolean) => {
    armedRef.current = v;
    setArmedState(v);
  };
  const [locked, setLockedState] = useState(false);
  const lockedRef = useRef(false);
  const setLocked = (v: boolean) => {
    lockedRef.current = v;
    setLockedState(v);
  };
  const [intent, setIntentState] = useState<Intent>(null);
  const intentRef = useRef<Intent>(null);
  const setIntent = (v: Intent) => {
    if (v === intentRef.current) return;
    intentRef.current = v;
    setIntentState(v);
    if (v) haptic.select();
  };
  const [note, setNote] = useState<{ text: string; key: number } | null>(null);
  /** The press is still a clean tap: no hold, no drag. */
  const tapOk = useRef(false);
  const [failed, setFailed] = useState(false);
  const [box, setBox] = useState<Rect | null>(null);
  const boxRef = useRef<Rect | null>(null);
  const [flightBox, setFlightBox] = useState<HTMLElement | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const last = useRef({ x: 0, y: 0 });
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const carrier = useRef<Carrier | null>(null);
  const drag = useRef<Drag | null>(null);
  const charging = useRef<AnimationPlaybackControls | null>(null);
  const lockDue = useRef(false);
  /** A press that started on the blurred page: only that one's tap puts the picture back. */
  const besideDown = useRef(false);

  const fingerY = useMotionValue(0);
  const fingerX = useMotionValue(0);
  /** 0..1 while a hold charges toward the lock. */
  const charge = useMotionValue(0);
  /** The lock's little pop. */
  const pop = useMotionValue(1);
  const fingerScale = useTransform(fingerY, [-160, 0, 160], [1.04, 1, 0.92]);

  // The finger moves, tilts and scales the lifted picture.
  useEffect(() => {
    const paint = () => {
      const x = fingerX.get();
      const rot = Math.max(-MAX_TILT, Math.min(MAX_TILT, x * TILT));
      carrier.current?.nudge(fingerY.get(), fingerScale.get() * pop.get(), x, rot);
    };
    const offs = [fingerY.on("change", paint), fingerX.on("change", paint), pop.on("change", paint)];
    return () => offs.forEach((off) => off());
  }, [fingerX, fingerY, fingerScale, pop]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      charging.current?.stop();
      if (held.current || lockedRef.current) holding = false;
      carrier.current?.goHome();
    },
    [],
  );

  // While lifted or locked, the finger owns the gesture: the page must not
  // scroll. The touch's target is the picture itself, which now lives in the
  // flight layer, so its touchmoves no longer pass through this button: block
  // at the document.
  useEffect(() => {
    const block = (e: TouchEvent) => {
      if ((held.current || lockedRef.current) && e.cancelable) e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false, capture: true });
    return () => document.removeEventListener("touchmove", block, { capture: true });
  }, []);

  // A verdict's note stays a moment under the picture.
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 1400);
    return () => clearTimeout(t);
  }, [note]);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const stopCharge = () => {
    charging.current?.stop();
    charging.current = null;
    lockDue.current = false;
    charge.jump(0);
  };

  const piece = () => (slot.current?.firstElementChild as HTMLElement | null) ?? null;

  const liftUp = () => {
    const el = frame.current;
    const p = piece();
    if (!el || !slot.current || !p) return;
    const img = p instanceof HTMLImageElement ? p : null;
    const aspect =
      img && img.naturalWidth && img.naturalHeight
        ? img.naturalWidth / img.naturalHeight
        : el.offsetWidth / (el.offsetHeight || 1);
    const to = centredRect(aspect);
    // Lift from what shows (a tile half under the bar starts half hidden).
    const area = openArea();
    const c = new Carrier(p, slot.current, rectOf(el));
    c.shadow(true);
    carrier.current = c;
    fingerY.jump(0);
    fingerX.jump(0);
    pop.jump(1);
    boxRef.current = to;
    setBox(to);
    setFlightBox(c.el);
    setPortal(true);
    setLifted(true);
    setOut(true);
    c.fly(to, springs.popping, undefined, { clip: { from: area, to: null } });
    if (like) {
      charge.jump(0);
      lockDue.current = false;
      charging.current = animate(charge, 1, { duration: (LOCK_MS - HOLD_MS) / 1000, ease: "linear", onComplete: tryLock });
    }
  };

  const goHome = () => {
    const c = carrier.current;
    const el = frame.current;
    setLifted(false);
    setArmed(false);
    if (!c || !el) return;
    animate(fingerY, 0, springs.snappy);
    animate(fingerX, 0, springs.snappy);
    c.shadow(false);
    c.fly(
      () => layoutRectOf(el),
      springs.snappy,
      () => {
        c.goHome();
        if (carrier.current === c) carrier.current = null;
        setOut(false);
        setLit(false);
      },
      { opacity: c.homeOpacity(), clip: { from: null, to: openArea() } },
    );
  };

  const release = (open: boolean) => {
    held.current = false;
    holding = false;
    stopCharge();
    setLocked(false);
    drag.current = null;
    setIntent(null);
    onHoldChange?.(false);
    const c = carrier.current;
    if (open && c) {
      // Hand the picture to the article exactly where it is now.
      const rect = c.bake();
      fingerY.jump(0);
      fingerX.jump(0);
      c.shadow(false);
      carrier.current = null;
      setLifted(false);
      setArmed(false);
      setOut(false);
      setLit(false);
      haptic.complete();
      onOpen({ rect, carrier: c });
      return;
    }
    goHome();
  };

  /* ---------- the lock ---------- */

  function tryLock() {
    charging.current = null;
    if (!held.current || lockedRef.current) return;
    // Sliding up to open when the time comes: lock if the finger comes back.
    if (armedRef.current) {
      lockDue.current = true;
      return;
    }
    lock();
  }

  function lock() {
    lockDue.current = false;
    setLocked(true);
    haptic.complete();
    animate(pop, [1, 1.035, 1], { duration: 0.32, ease: "easeOut" });
    // The finger that held it carries on: sideways starts from where it is now.
    const now = performance.now();
    drag.current = {
      id: -1,
      x0: last.current.x,
      y0: start.current?.y ?? last.current.y,
      bx: 0,
      by: 0,
      t0: now,
      lx: last.current.x,
      ly: last.current.y,
      lt: now,
      vx: 0,
      vy: 0,
      moved: 0,
    };
  }

  const threshold = () => Math.max(SWIPE_MIN_PX, (boxRef.current?.w ?? 300) * SWIPE_FRAC);

  const lockMove = (x: number, y: number, t: number) => {
    const d = drag.current;
    if (!d) return;
    const dt = Math.max(1, t - d.lt);
    // A light average, so one jittery frame does not decide a fling.
    d.vx = d.vx * 0.4 + ((x - d.lx) / dt) * 0.6;
    d.vy = d.vy * 0.4 + ((y - d.ly) / dt) * 0.6;
    d.lx = x;
    d.ly = y;
    d.lt = t;
    d.moved = Math.max(d.moved, Math.hypot(x - d.x0, y - d.y0));
    const dyRaw = y - d.y0;
    const nx = d.bx + (x - d.x0);
    fingerX.set(nx);
    fingerY.set(d.by + resist(dyRaw, 160));
    const thr = threshold();
    setIntent(
      Math.abs(nx) > thr && Math.abs(nx) > Math.abs(dyRaw)
        ? nx > 0
          ? "like"
          : "dislike"
        : dyRaw > CLOSE_PX
          ? "close"
          : dyRaw < -PEEK_OPEN_PX
            ? "open"
            : null,
    );
  };

  const springBack = () => {
    setIntent(null);
    animate(fingerX, 0, springs.snappy);
    animate(fingerY, 0, springs.snappy);
  };

  /** Back into place, from wherever it is. */
  const putBack = () => {
    held.current = false;
    holding = false;
    stopCharge();
    drag.current = null;
    setIntent(null);
    setLocked(false);
    onHoldChange?.(false);
    goHome();
  };

  const say = (v: Verdict | null) =>
    setNote({ text: v === "like" ? "More like this" : v === "dislike" ? "Less like this" : "No opinion", key: performance.now() });

  /** A key tapped: that verdict, or none if it was already given. It stays up. */
  const choose = (v: Verdict) => {
    if (!like) return;
    const next = verdictOf(like.id) === v ? null : v;
    setVerdict(like, next);
    haptic.complete();
    say(next);
  };

  const lockUp = (y: number, t: number) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const nx = fingerX.get();
    const dyRaw = y - d.y0;
    const flungSide = Math.abs(d.vx) > FLING_PX_MS && Math.abs(nx) > 30 && Math.sign(d.vx) === Math.sign(nx);
    const flungDown = d.vy > FLING_PX_MS && dyRaw > 40;
    if ((Math.abs(nx) > threshold() || flungSide) && Math.abs(nx) > Math.abs(dyRaw) * 0.8 && like) {
      // The verdict that side shows (set, not toggled: a swipe always means it), then back into place.
      const v: Verdict = nx > 0 ? "like" : "dislike";
      setVerdict(like, v);
      haptic.complete();
      say(v);
      putBack();
      return;
    }
    if (dyRaw > CLOSE_PX || flungDown) {
      putBack();
      return;
    }
    if (dyRaw < -PEEK_OPEN_PX) {
      release(true);
      return;
    }
    // A fresh, still, short touch is a tap: open. The finger that held it only lets go.
    if (d.id !== -1 && d.moved < MOVE_CANCEL_PX && t - d.t0 < 500) {
      release(true);
      return;
    }
    springBack();
  };

  useEffect(() => {
    if (!locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") putBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  const cancel = () => {
    if (!start.current) return;
    start.current = null;
    tapOk.current = false;
    clearTimer();
    setPressed(false);
    if (held.current) {
      if (lockedRef.current) {
        held.current = false;
        drag.current = null;
        springBack();
      } else release(false);
    } else setLit(false);
  };

  const tapOpen = () => {
    const el = frame.current;
    const p = piece();
    if (!el || !slot.current || !p || carrier.current || away) return;
    const rect = rectOf(el);
    onOpen({ rect, carrier: new Carrier(p, slot.current, rect) });
  };

  const showImage = src && !failed;
  const colour = lit || out || away;
  const empty = out || away;

  const hintText = locked
    ? note?.text ??
      (intent === "like"
        ? "Release: more like this"
        : intent === "dislike"
          ? "Release: less like this"
          : intent === "close"
            ? "Release to put it back"
            : intent === "open"
              ? "Release to open"
              : "← Less · Tap to open · More →")
    : armed
      ? hint?.release ?? "Release to open"
      : like
        ? "Slide up to open · Hold to keep"
        : hint?.slide ?? "Slide up to open";
  const hintHot = armed || (locked && (!!intent || !!note));

  return (
    <>
      <motion.button
        ref={frame}
        type="button"
        data-flight-key={flightKey}
        aria-label={`${alt}. Tap to open, hold to look closer.`}
        className={className}
        animate={{ scale: pressed && !lifted ? 0.955 : 1 }}
        transition={pressed ? springs.snappy : springs.popping}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          // Events from the picture while it sits in the article still bubble
          // here through React: only presses on the tile itself count.
          if (!e.currentTarget.contains(e.target as Node)) return;
          tapOk.current = false;
          if (e.pointerType === "mouse" && e.button !== 0) return;
          if (carrier.current || away || holding) return; // still travelling
          start.current = { x: e.clientX, y: e.clientY };
          last.current = { x: e.clientX, y: e.clientY };
          tapOk.current = true;
          held.current = false;
          setPressed(true);
          setLit(true);
          clearTimer();
          const el = e.currentTarget;
          const id = e.pointerId;
          timer.current = setTimeout(() => {
            if (holding || !start.current) return;
            held.current = true;
            holding = true;
            tapOk.current = false;
            try {
              el.setPointerCapture(id);
            } catch {}
            haptic.select();
            liftUp();
            onHoldChange?.(true);
          }, HOLD_MS);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          last.current = { x: e.clientX, y: e.clientY };
          const dx = e.clientX - start.current.x;
          const dy = e.clientY - start.current.y;
          if (held.current) {
            // The lifted picture is ours: a strip or sheet behind must not react.
            e.stopPropagation();
            if (lockedRef.current) {
              lockMove(e.clientX, e.clientY, e.timeStamp);
              return;
            }
            fingerY.set(resist(dy, 160));
            const nowArmed = dy < -PEEK_OPEN_PX;
            if (nowArmed !== armedRef.current) {
              setArmed(nowArmed);
              if (nowArmed) haptic.select();
              else if (lockDue.current) lock();
            }
            return;
          }
          if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) cancel();
        }}
        onPointerUp={(e) => {
          const s0 = start.current;
          if (!s0) return;
          start.current = null;
          clearTimer();
          setPressed(false);
          if (held.current) {
            e.stopPropagation();
            if (lockedRef.current) {
              held.current = false;
              lockUp(e.clientY, e.timeStamp);
              return;
            }
            // Decide from the release itself: a flick up and let go can land in
            // one frame, before React has drawn the armed state.
            const dy = e.clientY - s0.y;
            release(armedRef.current || dy < -PEEK_OPEN_PX);
            return;
          }
          // A clean tap opens on the click that follows (see onClick).
          setLit(false);
        }}
        onPointerCancel={cancel}
        onPointerLeave={() => {
          if (!held.current) cancel();
        }}
        onClick={(e) => {
          if (!e.currentTarget.contains(e.target as Node)) return;
          const keyboard = e.detail === 0;
          if (!keyboard && !tapOk.current) return;
          tapOk.current = false;
          haptic.select();
          tapOpen();
        }}
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          aspectRatio: ratio,
          touchAction: "manipulation",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          cursor: "pointer",
          containerType: "inline-size",
          ...style,
        }}
      >
        {/* The slot: the picture's home. Empty (a quiet hole) while it travels. */}
        <span
          ref={slot}
          data-slot
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            background: empty ? "var(--rule-soft)" : "var(--ink)",
            transition: "background-color 200ms ease-out",
          }}
        >
          {showImage ? (
            <motion.img
              src={src}
              alt={alt}
              draggable={false}
              referrerPolicy="no-referrer"
              decoding="async"
              onError={(e) => {
                // Only while at home: React must find it where it rendered it.
                if (e.currentTarget.parentElement === slot.current) setFailed(true);
              }}
              initial={false}
              animate={{ filter: colour ? "grayscale(0) contrast(1)" : "grayscale(1) contrast(1.06)" }}
              transition={colour ? toColor : toMono}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                WebkitTouchCallout: "none",
                userSelect: "none",
              }}
            />
          ) : (
            <motion.span
              initial={false}
              animate={{ backgroundColor: colour ? "var(--accent)" : "var(--ink)" }}
              transition={colour ? toColor : toMono}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "flex-end",
                padding: "10%",
                color: "var(--paper)",
                textAlign: "left",
                fontWeight: 700,
                fontSize: "clamp(12px, 9cqw, 40px)",
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
              }}
            >
              {fallbackTitle}
            </motion.span>
          )}
        </span>
        {index ? (
          <span
            className="mono"
            style={{
              position: "absolute",
              left: 6,
              top: 5,
              fontSize: 9,
              color: "var(--paper)",
              mixBlendMode: "difference",
              opacity: empty ? 0 : 1,
              transition: "opacity 160ms ease-out",
            }}
          >
            {index}
          </span>
        ) : null}
      </motion.button>

      {portal
        ? createPortal(
            <AnimatePresence>
              {lifted ? (
                <motion.div
                  key="lift"
                  className="fixed inset-0 z-[60]"
                  style={{ pointerEvents: "none" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Locked, a tap beside the picture puts it back. */}
                  <div
                    className="absolute inset-0 bg-ground/70 backdrop-blur-[14px]"
                    style={{ pointerEvents: locked ? "auto" : "none" }}
                    onPointerDown={() => {
                      besideDown.current = true;
                    }}
                    onClick={() => {
                      // The click that ends the hold itself lands here when the finger is beside the picture: not that one.
                      const mine = besideDown.current;
                      besideDown.current = false;
                      if (mine && lockedRef.current && !drag.current) putBack();
                    }}
                  />
                  {caption && box ? (
                    <motion.div
                      className="absolute"
                      style={{ left: box.x, top: box.y + box.h + 14, width: box.w, y: fingerY }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { duration: 0.25, delay: 0.1 } }}
                    >
                      <p className="mono text-ink-soft">{caption.kicker}</p>
                      <p className="mt-1 text-[20px] font-medium leading-[1.1] tracking-[-0.025em] text-ink">{caption.title}</p>
                    </motion.div>
                  ) : null}
                  <motion.p
                    key={note?.key ?? "hint"}
                    className="mono absolute inset-x-0 bottom-[calc(28px+var(--sab))] text-center"
                    initial={note ? { opacity: 0, y: 4 } : false}
                    animate={{ opacity: 1, y: 0, color: hintHot ? "var(--accent)" : "var(--ink-soft)" }}
                  >
                    {hintText}
                  </motion.p>
                  {like && !locked ? (
                    // The lock's charge: a hairline that fills while the finger holds.
                    <div className="absolute bottom-[calc(18px+var(--sab))] left-1/2 h-px w-[120px] -translate-x-1/2 bg-rule">
                      <motion.div className="h-full w-full origin-left bg-accent" style={{ scaleX: charge }} />
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {like && flightBox
        ? createPortal(
            <AnimatePresence>
              {locked ? (
                <LockFace
                  key="face"
                  onDown={(e) => {
                    if (drag.current) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    fingerX.stop();
                    fingerY.stop();
                    drag.current = {
                      id: e.pointerId,
                      x0: e.clientX,
                      y0: e.clientY,
                      bx: fingerX.get(),
                      by: fingerY.get(),
                      t0: e.timeStamp,
                      lx: e.clientX,
                      ly: e.clientY,
                      lt: e.timeStamp,
                      vx: 0,
                      vy: 0,
                      moved: 0,
                    };
                  }}
                  onMove={(e) => {
                    if (drag.current?.id === e.pointerId) lockMove(e.clientX, e.clientY, e.timeStamp);
                  }}
                  onUp={(e) => {
                    if (drag.current?.id === e.pointerId) lockUp(e.clientY, e.timeStamp);
                  }}
                  onCancel={() => {
                    drag.current = null;
                    springBack();
                  }}
                />
              ) : null}
            </AnimatePresence>,
            flightBox,
          )
        : null}

      {like && portal
        ? createPortal(
            <AnimatePresence>
              {locked && box ? <LockKeys key="keys" item={like} box={box} x={fingerX} threshold={threshold} onChoose={choose} /> : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * The locked picture's face, inside its flight box so it moves and tilts with
 * it: the surface that takes the finger.
 */
function LockFace({
  onDown,
  onMove,
  onUp,
  onCancel,
}: {
  onDown: (e: RPointerEvent<HTMLDivElement>) => void;
  onMove: (e: RPointerEvent<HTMLDivElement>) => void;
  onUp: (e: RPointerEvent<HTMLDivElement>) => void;
  onCancel: () => void;
}) {
  // Events here bubble through React to the tile's ancestors (strips, sheets): stop them.
  const own = (fn?: (e: RPointerEvent<HTMLDivElement>) => void) => (e: RPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    fn?.(e);
  };
  return (
    <motion.div
      className="absolute inset-0"
      data-own-gesture
      style={{ pointerEvents: "auto", touchAction: "none" }}
      exit={{ opacity: 1, transition: { duration: 0.22 } }}
      onPointerDown={own(onDown)}
      onPointerMove={own(onMove)}
      onPointerUp={own(onUp)}
      onPointerCancel={own(onCancel)}
    />
  );
}

/**
 * The verdict keys of a locked picture: fixed at the bottom corners of where
 * it rests (less on the left, more on the right, the way a card is swiped),
 * above it, so a picture pushed sideways slides under the key it is pushed
 * toward instead of carrying it off the screen. That key grows and warms to
 * the accent, its tag showing; the other one fades.
 */
function LockKeys({
  item,
  box,
  x,
  threshold,
  onChoose,
}: {
  item: Item;
  box: Rect;
  x: MotionValue<number>;
  threshold: () => number;
  onChoose: (v: Verdict) => void;
}) {
  useTaste();
  const verdict = verdictOf(item.id);
  return (
    <motion.div
      className="pointer-events-none fixed z-[72]"
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
      exit={{ opacity: 1, transition: { duration: 0.22 } }}
      data-own-gesture
    >
      <Key v="dislike" side="left" chosen={verdict === "dislike"} x={x} threshold={threshold} onPick={() => onChoose("dislike")} />
      <Key v="like" side="right" chosen={verdict === "like"} x={x} threshold={threshold} onPick={() => onChoose("like")} />
    </motion.div>
  );
}

function Key({
  v,
  side,
  chosen,
  x,
  threshold,
  onPick,
}: {
  v: Verdict;
  side: "left" | "right";
  chosen: boolean;
  x: MotionValue<number>;
  threshold: () => number;
  onPick: () => void;
}) {
  const sign = side === "right" ? 1 : -1;
  // How far the picture is pushed toward this key (0..1), and away from it.
  const toward = useTransform(x, (val) => Math.max(0, Math.min(1, (sign * val) / threshold())));
  const away = useTransform(x, (val) => Math.max(0, Math.min(1, (-sign * val) / threshold())));
  const scale = useTransform(toward, [0, 1], [1, 1.2]);
  const fill = useTransform(toward, (t) => mix("--accent", "--paper", t));
  const mark = useTransform(toward, (t) => mix("--paper", "--ink", Math.min(1, t * 1.6)));
  const tag = useTransform(toward, [0.15, 0.6], [0, 1]);
  const opacity = useTransform(away, [0, 1], [1, 0.35]);
  // Only a press that started on the key picks it (the click ending the hold may land here).
  const down = useRef(false);
  return (
    <motion.div
      className={`absolute bottom-3 ${side === "right" ? "right-3" : "left-3"}`}
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, transition: { ...OUT, delay: side === "right" ? 0 : 0.08 } }}
      exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }}
    >
      <motion.span
        aria-hidden
        className={`mono absolute bottom-[calc(100%+6px)] whitespace-nowrap bg-ink px-2 py-[4px] text-paper ${side === "right" ? "right-0" : "left-0"}`}
        style={{ opacity: tag }}
      >
        {v === "like" ? "More" : "Less"}
      </motion.span>
      <motion.button
        type="button"
        aria-label={v === "like" ? "More like this" : "Less like this"}
        aria-pressed={chosen}
        onPointerDown={(e) => {
          e.stopPropagation();
          down.current = true;
        }}
        onClick={(e) => {
          e.stopPropagation();
          const mine = down.current || e.detail === 0;
          down.current = false;
          if (mine) onPick();
        }}
        className="grid h-12 w-12 place-items-center border border-ink shadow-[0_10px_24px_-10px_rgba(11,11,11,.45)]"
        style={{
          pointerEvents: "auto",
          touchAction: "manipulation",
          scale,
          opacity,
          backgroundColor: chosen ? "var(--accent)" : fill,
          color: chosen ? "var(--paper)" : mark,
        }}
      >
        <Heart on={chosen && v === "like"} crossed={v === "dislike"} />
      </motion.button>
    </motion.div>
  );
}
