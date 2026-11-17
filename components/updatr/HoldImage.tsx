"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { centredRect, layoutRectOf, openArea, rectOf, resist, type Rect } from "@/lib/updatr/flight";
import { Carrier } from "@/lib/updatr/carrier";

const HOLD_MS = 260;
const MOVE_CANCEL_PX = 10;
/** Slide a lifted image up this far and release to open it. */
const PEEK_OPEN_PX = 70;
const toColor = { duration: 0.45, ease: [0.2, 0, 0, 1] } as const;
const toMono = { duration: 0.65, ease: [0.4, 0, 0.2, 1] } as const;

/** One lifted picture at a time, whatever the fingers do. */
let holding = false;

export type OpenFrom = { rect: Rect; carrier: Carrier };

/**
 * A picture: ONE <img>, black and white by a filter on that element.
 * - Tap: the image itself is handed to the article (onOpen) and flies there.
 *   A tap opens on the native click, so a touch that only stops a fling (the
 *   browser drops its click) never opens anything.
 * - Press and hold: it turns to colour and lifts out of the layout to the centre
 *   of the screen at its own proportions, the page blurred behind. Release: it
 *   springs home. Slide up and release: it opens from where it is.
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
  /** The press is still a clean tap: no hold, no drag. */
  const tapOk = useRef(false);
  const [failed, setFailed] = useState(false);
  const [box, setBox] = useState<Rect | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const carrier = useRef<Carrier | null>(null);

  const fingerY = useMotionValue(0);
  const fingerScale = useTransform(fingerY, [-160, 0, 160], [1.04, 1, 0.92]);

  // The finger nudges the lifted picture.
  useEffect(
    () =>
      fingerY.on("change", (v) => {
        carrier.current?.nudge(v, fingerScale.get());
      }),
    [fingerY, fingerScale],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (held.current) holding = false;
      carrier.current?.goHome();
    },
    [],
  );

  // While lifted, the finger owns the gesture: the page must not scroll. The
  // touch's target is the picture itself, which now lives in the flight layer,
  // so its touchmoves no longer pass through this button: block at the document.
  useEffect(() => {
    const block = (e: TouchEvent) => {
      if (held.current && e.cancelable) e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false, capture: true });
    return () => document.removeEventListener("touchmove", block, { capture: true });
  }, []);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
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
    setBox(to);
    setPortal(true);
    setLifted(true);
    setOut(true);
    c.fly(to, springs.popping, undefined, { clip: { from: area, to: null } });
  };

  const goHome = () => {
    const c = carrier.current;
    const el = frame.current;
    setLifted(false);
    setArmed(false);
    if (!c || !el) return;
    animate(fingerY, 0, springs.snappy);
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
    onHoldChange?.(false);
    const c = carrier.current;
    if (open && c) {
      // Hand the picture to the article exactly where it is now.
      const rect = c.bake();
      fingerY.jump(0);
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

  const cancel = () => {
    if (!start.current) return;
    start.current = null;
    tapOk.current = false;
    clearTimer();
    setPressed(false);
    if (held.current) release(false);
    else setLit(false);
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
          const dx = e.clientX - start.current.x;
          const dy = e.clientY - start.current.y;
          if (held.current) {
            // The lifted picture is ours: a strip or sheet behind must not react.
            e.stopPropagation();
            fingerY.set(resist(dy, 160));
            const nowArmed = dy < -PEEK_OPEN_PX;
            if (nowArmed !== armedRef.current) {
              setArmed(nowArmed);
              if (nowArmed) haptic.select();
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
                  <div className="absolute inset-0 bg-ground/70 backdrop-blur-[14px]" />
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
                    className="mono absolute inset-x-0 bottom-[calc(28px+var(--sab))] text-center"
                    animate={{ color: armed ? "var(--accent)" : "var(--ink-soft)" }}
                  >
                    {armed ? "Release to open" : "Slide up to open"}
                  </motion.p>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
