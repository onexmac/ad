"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValue, useScroll, useTransform, animate } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";

const HOLD_MS = 260;
const MOVE_CANCEL_PX = 10;
/** Slide a held peek up this far and release to open it. */
const PEEK_OPEN_PX = 70;
const toColor = { duration: 0.5, ease: [0.2, 0, 0, 1] } as const;
const toMono = { duration: 0.7, ease: [0.4, 0, 0.2, 1] } as const;

/** Resisted travel: follows the finger at first, then grips. */
function resist(d: number, max = 160) {
  const s = Math.sign(d);
  return s * max * (1 - Math.exp(-Math.abs(d) / max));
}

/**
 * Black-and-white image.
 * - Tap: opens (onOpen); the image morphs into the detail.
 * - Press and hold: it turns to colour and lifts out of the layout into the
 *   centre of the screen, at its own proportions, with the page dimmed behind.
 *   Release and it springs back into place. Slide up while holding and release
 *   to open it from there.
 * - A drag that starts on it scrolls the page and cancels the press.
 */
export function HoldImage({
  src,
  alt,
  fallbackTitle,
  onOpen,
  onHoldChange,
  layoutId,
  hidden = false,
  ratio = "1 / 1",
  className,
  style,
  index,
  parallax = false,
  caption,
}: {
  src?: string;
  alt: string;
  fallbackTitle: string;
  onOpen: () => void;
  onHoldChange?: (holding: boolean) => void;
  layoutId?: string;
  hidden?: boolean;
  ratio?: string;
  className?: string;
  style?: CSSProperties;
  index?: string;
  parallax?: boolean;
  /** Shown under the image while it is lifted. */
  caption?: { kicker: string; title: string };
}) {
  const frame = useRef<HTMLButtonElement>(null);
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  const [pressed, setPressed] = useState(false);
  const [lit, setLit] = useState(false);
  const [peek, setPeek] = useState<{ w: number; h: number } | null>(null);
  const [armed, setArmed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [portal, setPortal] = useState(false);
  const aspect = useRef(1);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekY = useMotionValue(0);
  const peekScale = useTransform(peekY, [-160, 0, 160], [1.04, 1, 0.92]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // While lifted, the finger owns the gesture: stop the page from scrolling.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const block = (e: TouchEvent) => {
      if (held.current) e.preventDefault();
    };
    el.addEventListener("touchmove", block, { passive: false });
    return () => el.removeEventListener("touchmove", block);
  }, []);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const endHold = () => {
    held.current = false;
    setPeek(null);
    setArmed(false);
    animate(peekY, 0, springs.snappy);
    onHoldChange?.(false);
  };

  const cancel = () => {
    if (!start.current) return;
    start.current = null;
    clear();
    setPressed(false);
    setLit(false);
    if (held.current) endHold();
  };

  const lift = () => {
    // Size the lifted frame to the image's own proportions, inside the viewport.
    const img = frame.current?.querySelector("img");
    if (img?.naturalWidth && img.naturalHeight) aspect.current = img.naturalWidth / img.naturalHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxW = Math.min(vw * 0.88, 460);
    const maxH = vh * 0.62;
    let w = maxW;
    let h = w / aspect.current;
    if (h > maxH) {
      h = maxH;
      w = h * aspect.current;
    }
    setPortal(true);
    setPeek({ w, h });
  };

  const showImage = src && !failed;
  const peeking = peek !== null;

  const image = (inPeek: boolean) =>
    showImage ? (
      <motion.img
        src={src}
        alt={inPeek ? "" : alt}
        draggable={false}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) aspect.current = img.naturalWidth / img.naturalHeight;
        }}
        initial={false}
        animate={{ filter: lit || inPeek ? "grayscale(0) contrast(1)" : "grayscale(1) contrast(1.06)" }}
        transition={lit || inPeek ? toColor : toMono}
        style={
          parallax && !inPeek
            ? { position: "absolute", left: 0, top: "-9%", width: "100%", height: "118%", objectFit: "cover", y: drift }
            : { width: "100%", height: "100%", objectFit: "cover", display: "block" }
        }
      />
    ) : (
      <motion.span
        initial={false}
        animate={{ backgroundColor: lit || inPeek ? "var(--accent)" : "var(--ink)" }}
        transition={lit ? toColor : toMono}
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
    );

  return (
    <>
      <motion.button
        ref={frame}
        type="button"
        aria-label={`${alt}. Tap to open, hold to look closer.`}
        className={className}
        animate={{ scale: pressed && !peeking ? 0.955 : 1 }}
        transition={pressed ? springs.snappy : springs.popping}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          held.current = false;
          setPressed(true);
          setLit(true);
          clear();
          const el = e.currentTarget;
          timer.current = setTimeout(() => {
            held.current = true;
            try {
              el.setPointerCapture(e.pointerId);
            } catch {}
            haptic.select();
            lift();
            onHoldChange?.(true);
          }, HOLD_MS);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const dx = e.clientX - start.current.x;
          const dy = e.clientY - start.current.y;
          if (held.current) {
            peekY.set(resist(dy));
            const nowArmed = dy < -PEEK_OPEN_PX;
            if (nowArmed !== armed) {
              setArmed(nowArmed);
              if (nowArmed) haptic.select();
            }
            return;
          }
          if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) cancel();
        }}
        onPointerUp={() => {
          if (!start.current) return;
          start.current = null;
          clear();
          setPressed(false);
          if (held.current) {
            const open = armed;
            endHold();
            setLit(false);
            if (open) {
              haptic.complete();
              onOpen();
            }
            return;
          }
          haptic.select();
          onOpen();
          setTimeout(() => setLit(false), 450);
        }}
        onPointerCancel={cancel}
        onPointerLeave={() => {
          if (!held.current) cancel();
        }}
        onClick={(e) => {
          if (e.detail === 0) onOpen();
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
        <motion.span
          layoutId={peeking ? undefined : layoutId}
          transition={springs.expanding}
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            visibility: hidden || peeking ? "hidden" : "visible",
            background: "var(--ink)",
          }}
        >
          {image(false)}
        </motion.span>
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
              visibility: hidden || peeking ? "hidden" : "visible",
            }}
          >
            {index}
          </span>
        ) : null}
      </motion.button>

      {portal
        ? createPortal(
            <AnimatePresence>
              {peek ? (
                <motion.div
                  key="peek"
                  className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
                  style={{ pointerEvents: "none" }}
                >
                  <motion.div
                    className="absolute inset-0 bg-ground/70 backdrop-blur-[14px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  />
                  <motion.div style={{ y: peekY, scale: peekScale }} className="relative">
                    <motion.div
                      layoutId={layoutId}
                      transition={springs.popping}
                      style={{
                        position: "relative",
                        width: peek.w,
                        height: peek.h,
                        overflow: "hidden",
                        background: "var(--ink)",
                        boxShadow: "0 30px 80px -20px rgba(11,11,11,0.45)",
                        containerType: "inline-size",
                      }}
                    >
                      {image(true)}
                    </motion.div>
                    {caption ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0, transition: { ...springs.popping, delay: 0.08 } }}
                        exit={{ opacity: 0, transition: { duration: 0.1 } }}
                        className="mt-4"
                        style={{ width: peek.w }}
                      >
                        <p className="mono text-ink-soft">{caption.kicker}</p>
                        <p className="mt-1 text-[20px] font-medium leading-[1.1] tracking-[-0.025em] text-ink">
                          {caption.title}
                        </p>
                      </motion.div>
                    ) : null}
                  </motion.div>
                  <motion.p
                    className="mono absolute bottom-[calc(28px+var(--sab))]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, color: armed ? "var(--accent)" : "var(--ink-soft)" }}
                    exit={{ opacity: 0 }}
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
