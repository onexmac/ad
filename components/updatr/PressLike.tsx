"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, motionValue } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import type { Item } from "@/data/updatr/types";
import { setVerdict, useTaste, verdictOf, type Verdict } from "@/lib/updatr/taste";
import { CATCH_PX, CHOICES, Choice, Cross, OUT, pulled } from "./LikeFan";

const HOLD_MS = 420;
const MOVE_CANCEL_PX = 10;
/** The fan reaches this far to each side of its centre and this far above it: it is kept on screen. */
const SIDE_PX = 82;
const ABOVE_PX = 140;

type Press = { id: number; x: number; y: number; timer: number; held: boolean; el: HTMLElement };

/**
 * A text entry (a brief). Tap opens it, on the native click. Press and hold:
 * the like fan pops out where the finger is (the article's fan, the same
 * choices and gravity). Slide onto a choice and let go to pick it; or let go
 * first and tap one. A tap anywhere else, the centre key or Escape folds it.
 * Picking the verdict already given takes it back, as in the article.
 */
export function PressLike({
  item,
  onOpen,
  className,
  children,
}: {
  item: Item;
  onOpen: () => void;
  className?: string;
  children: (verdict: Verdict | null) => ReactNode;
}) {
  useTaste();
  const verdict = verdictOf(item.id);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<null | "hold" | "tap">(null);
  const [hover, setHover] = useState<Verdict | null>(null);
  const [pressed, setPressed] = useState(false);
  const press = useRef<Press | null>(null);
  const tapOk = useRef(false);
  const centre = useRef({ x: 0, y: 0 });
  const holdingRef = useRef(false);
  /** When the hold ended: the browser's click for that touch lands on whatever is under the finger (the centre key, a choice), and must not count. */
  const upAt = useRef(0);
  const [fx] = useState(() => motionValue(0));
  const [fy] = useState(() => motionValue(0));
  const [pulling] = useState(() => motionValue(0));

  // While the fan follows the finger the page must not scroll under it.
  useEffect(() => {
    const block = (e: TouchEvent) => {
      if (holdingRef.current && e.cancelable) e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false, capture: true });
    return () => document.removeEventListener("touchmove", block, { capture: true });
  }, []);

  const close = () => {
    holdingRef.current = false;
    pulling.set(0);
    setHover(null);
    setMode(null);
  };

  useEffect(() => {
    if (!mode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const follow = (x: number, y: number) => {
    fx.set(x - centre.current.x);
    fy.set(y - centre.current.y);
  };
  const under = (x: number, y: number): Verdict | null => {
    let best: { v: Verdict; d: number } | null = null;
    for (const o of CHOICES) {
      const p = pulled(o, x - centre.current.x, y - centre.current.y, true);
      if (p.d < CATCH_PX && (!best || p.d < best.d)) best = { v: o.v, d: p.d };
    }
    return best?.v ?? null;
  };
  const fresh = () => performance.now() - upAt.current > 400;
  const choose = (v: Verdict) => {
    haptic.complete();
    close();
    setVerdict(item, verdict === v ? null : v);
  };

  const hold = () => {
    const p = press.current;
    if (!p || p.held) return;
    p.held = true;
    tapOk.current = false;
    holdingRef.current = true;
    try {
      p.el.setPointerCapture(p.id);
    } catch {}
    const vw = window.innerWidth;
    const c = { x: Math.min(Math.max(p.x, SIDE_PX), vw - SIDE_PX), y: Math.max(p.y, ABOVE_PX) };
    centre.current = c;
    follow(p.x, p.y);
    setAt(c);
    setMode("hold");
    haptic.select();
  };

  const cancel = () => {
    const p = press.current;
    if (!p) return;
    clearTimeout(p.timer);
    press.current = null;
    tapOk.current = false;
    setPressed(false);
    if (p.held) close();
  };

  return (
    <>
      <motion.button
        type="button"
        className={className}
        animate={{ scale: pressed ? 0.97 : 1 }}
        transition={springs.snappy}
        style={{ touchAction: "manipulation", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
        aria-label={`${item.title}. Tap to open, hold for more or less like this.`}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          if (mode) return;
          const p: Press = { id: e.pointerId, x: e.clientX, y: e.clientY, timer: 0, held: false, el: e.currentTarget };
          p.timer = window.setTimeout(hold, HOLD_MS);
          press.current = p;
          tapOk.current = true;
          setPressed(true);
        }}
        onPointerMove={(e) => {
          const p = press.current;
          if (!p || p.id !== e.pointerId) return;
          if (!p.held) {
            // A drag before the hold is a scroll: let it be one.
            if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_CANCEL_PX) cancel();
            return;
          }
          e.stopPropagation();
          follow(e.clientX, e.clientY);
          pulling.set(1);
          const v = under(e.clientX, e.clientY);
          if (v !== hover) {
            if (v) haptic.select();
            setHover(v);
          }
        }}
        onPointerUp={(e) => {
          const p = press.current;
          if (!p || p.id !== e.pointerId) return;
          clearTimeout(p.timer);
          press.current = null;
          setPressed(false);
          if (!p.held) return; // a clean tap opens on the click that follows
          e.stopPropagation();
          holdingRef.current = false;
          upAt.current = performance.now();
          const v = under(e.clientX, e.clientY);
          if (v) {
            choose(v);
            return;
          }
          // Let go on nothing: the fan stays out for a tap.
          pulling.set(0);
          setHover(null);
          setMode("tap");
        }}
        onPointerCancel={cancel}
        onClick={(e) => {
          const keyboard = e.detail === 0;
          if (!keyboard && !tapOk.current) return;
          tapOk.current = false;
          onOpen();
        }}
      >
        {children(verdict)}
      </motion.button>

      {at
        ? createPortal(
            <>
              {mode === "tap" ? (
                <div
                  className="fixed inset-0 z-[64]"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    close();
                  }}
                />
              ) : null}
              <div className="pointer-events-none fixed z-[65] h-12 w-12" style={{ left: at.x - 24, top: at.y - 24 }} data-own-gesture>
                <AnimatePresence>
                  {mode ? (
                    <motion.button
                      key="hub"
                      type="button"
                      aria-label="Close"
                      onClick={() => {
                        if (fresh()) close();
                      }}
                      className="pointer-events-auto absolute inset-0 grid place-items-center bg-ink text-paper"
                      initial={{ scale: 0.4, opacity: 0, rotate: -135 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0, transition: OUT }}
                      exit={{ scale: 0.4, opacity: 0, rotate: 135, transition: { duration: 0.18 } }}
                    >
                      <Cross />
                    </motion.button>
                  ) : null}
                  {mode
                    ? CHOICES.map((o, i) => (
                        <Choice
                          key={o.v}
                          o={o}
                          i={i}
                          fx={fx}
                          fy={fy}
                          pulling={pulling}
                          hover={hover === o.v}
                          chosen={verdict === o.v}
                          onPick={() => {
                            if (fresh()) choose(o.v);
                          }}
                        />
                      ))
                    : null}
                </AnimatePresence>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
