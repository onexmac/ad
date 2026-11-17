"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";

const HOLD_MS = 280;
const MOVE_CANCEL_PX = 10;
const toColor = { duration: 0.5, ease: [0.2, 0, 0, 1] } as const;
const toMono = { duration: 0.7, ease: [0.4, 0, 0.2, 1] } as const;

/**
 * Black-and-white image. Press and hold: it turns to colour while held and
 * goes back on release. Tap: it opens (onOpen) in colour. A drag that starts
 * on it scrolls the page and cancels the press.
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
}: {
  src?: string;
  alt: string;
  /** Shown as a black typographic tile when there is no image or it fails. */
  fallbackTitle: string;
  onOpen: () => void;
  onHoldChange?: (holding: boolean) => void;
  layoutId?: string;
  /** Hide the content while its shared-layout twin is open. */
  hidden?: boolean;
  ratio?: string;
  className?: string;
  style?: CSSProperties;
  /** Small mono index in the corner, e.g. "01". */
  index?: string;
  /** Image drifts inside its frame as the page scrolls. */
  parallax?: boolean;
}) {
  const frame = useRef<HTMLButtonElement>(null);
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const [pressed, setPressed] = useState(false);
  const [lit, setLit] = useState(false);
  const [failed, setFailed] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const held = useRef(false);
  const cancelled = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const cancel = () => {
    if (!start.current) return;
    cancelled.current = true;
    start.current = null;
    clear();
    setPressed(false);
    setLit(false);
    if (held.current) onHoldChange?.(false);
    held.current = false;
  };

  const showImage = src && !failed;

  return (
    <motion.button
      ref={frame}
      type="button"
      aria-label={`${alt}. Tap to open, hold for colour.`}
      className={className}
      animate={{ scale: pressed ? 0.965 : 1 }}
      transition={pressed ? springs.snappy : springs.popping}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
        held.current = false;
        cancelled.current = false;
        setPressed(true);
        setLit(true);
        clear();
        timer.current = setTimeout(() => {
          held.current = true;
          haptic.select();
          onHoldChange?.(true);
        }, HOLD_MS);
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        const dx = e.clientX - start.current.x;
        const dy = e.clientY - start.current.y;
        if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) cancel();
      }}
      onPointerUp={() => {
        if (!start.current) return;
        start.current = null;
        clear();
        setPressed(false);
        if (held.current) {
          held.current = false;
          setLit(false);
          onHoldChange?.(false);
          return;
        }
        haptic.select();
        onOpen();
        // Fall back to mono after the detail has taken over.
        setTimeout(() => setLit(false), 450);
      }}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onClick={(e) => {
        // Keyboard activation only; pointer taps are handled above.
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
        layoutId={layoutId}
        transition={springs.expanding}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          visibility: hidden ? "hidden" : "visible",
          background: "var(--ink)",
        }}
      >
        {showImage ? (
          // Remote press images, hotlinked for the prototype.
          <motion.img
            src={src}
            alt={alt}
            draggable={false}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            initial={false}
            animate={{
              filter: lit ? "grayscale(0) contrast(1)" : "grayscale(1) contrast(1.06)",
            }}
            transition={lit ? toColor : toMono}
            style={
              parallax
                ? { position: "absolute", left: 0, top: "-9%", width: "100%", height: "118%", objectFit: "cover", y: drift }
                : { width: "100%", height: "100%", objectFit: "cover", display: "block" }
            }
          />
        ) : (
          <motion.span
            initial={false}
            animate={{ backgroundColor: lit ? "var(--accent)" : "var(--ink)" }}
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
        )}
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
            visibility: hidden ? "hidden" : "visible",
          }}
        >
          {index}
        </span>
      ) : null}
    </motion.button>
  );
}
