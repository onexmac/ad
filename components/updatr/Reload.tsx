"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { CANCEL_SPRING, CLOSE_SPRING, freshVelocity, resist } from "@/lib/updatr/flight";
import { pad } from "@/lib/updatr/format";
import { Arrow } from "./Arrow";

/** How far the page lifts past its end (asymptote, px). */
const LIFT_MAX = 160;
/** Finger travel past the end, against that friction, that fetches a new issue. */
const COMMIT = 140;
/** Demo: how long the server takes to fetch and compose the next issue. */
export const FETCH_MS = 3000;
const ENTER_SPRING = { type: "spring" as const, stiffness: 260, damping: 32, mass: 1 };

const liftOf = (raw: number) => LIFT_MAX * (1 - Math.exp((-Math.max(0, raw) * 0.6) / LIFT_MAX));

/**
 * The server builds the next issue. Demo stub: it takes FETCH_MS and can be
 * aborted; swap the body for a real request (same signal) when the API exists.
 */
export function fetchNextIssue(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, FETCH_MS);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/**
 * Push on past the bottom of the page to fetch a new issue. Only a fresh
 * gesture that starts at the bottom counts (a scroll that arrives there never
 * does); the page lifts against friction and arms past the mark; release
 * there commits. Touch, mouse wheel and trackpad.
 */
export function useBottomPull({ enabled, onCommit }: { enabled: boolean; onCommit: () => void }) {
  const raw = useMotionValue(0);
  const lift = useTransform(raw, liftOf);
  const [armed, setArmed] = useState(false);
  const live = useRef({ enabled, onCommit });
  useEffect(() => {
    live.current = { enabled, onCommit };
  });

  useEffect(() => {
    let mode: "idle" | "pending" | "pull" | "none" = "idle";
    let sx = 0;
    let sy = 0;
    let base = 0;
    let isArmed = false;
    let last = { y: 0, t: 0, v: 0 };
    const max = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const atEnd = () => window.scrollY >= max() - 1;
    const blocked = () => !live.current.enabled || document.body.style.overflow === "hidden";
    const arm = (on: boolean) => {
      if (on === isArmed) return;
      isArmed = on;
      setArmed(on);
      if (on) haptic.select();
    };
    const release = (velocityUp = 0) => {
      const r = raw.get();
      arm(false);
      if (r > COMMIT) {
        haptic.complete();
        live.current.onCommit();
        animate(raw, 0, ENTER_SPRING);
      } else if (r > 0) animate(raw, 0, { ...CANCEL_SPRING, velocity: -velocityUp });
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || blocked() || !atEnd()) {
        mode = "none";
        return;
      }
      mode = "pending";
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      base = raw.get();
      last = { y: sy, t: performance.now(), v: 0 };
    };
    const onMove = (e: TouchEvent) => {
      if (mode === "idle" || mode === "none" || e.touches.length !== 1) return;
      if (e.defaultPrevented) {
        // Something else owns the finger (a held picture).
        mode = "none";
        return;
      }
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - sx;
      const dy = y - sy;
      if (mode === "pending") {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
          if (dy < 0 && e.cancelable) e.preventDefault();
          return;
        }
        if (dy < 0 && Math.abs(dy) >= Math.abs(dx) && e.cancelable) {
          mode = "pull";
          raw.stop();
          haptic.drag();
        } else {
          mode = "none";
          return;
        }
      }
      e.preventDefault();
      const now = performance.now();
      last = { y, t: now, v: ((last.y - y) / Math.max(1, now - last.t)) * 1000 };
      const r = Math.max(0, base - dy);
      raw.set(r);
      arm(r > COMMIT);
    };
    const onEnd = () => {
      const m = mode;
      mode = "idle";
      if (m === "pull") release(freshVelocity(last.v, last.t));
    };

    // Wheel and trackpad: a fresh run at the bottom drags the lift; going
    // quiet decides. A run that started above (momentum) never counts.
    let idle: ReturnType<typeof setTimeout> | null = null;
    let fromEnd: boolean | null = null;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (fromEnd === null) fromEnd = !blocked() && atEnd() && e.deltaY > 0;
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => {
        idle = null;
        fromEnd = null;
        release();
      }, 160);
      if (!fromEnd) return;
      raw.stop();
      const r = Math.max(0, raw.get() + e.deltaY * 0.6);
      raw.set(r);
      arm(r > COMMIT);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
      window.removeEventListener("wheel", onWheel);
      if (idle) clearTimeout(idle);
    };
  }, [raw]);

  return { raw, lift, armed };
}

/** Revealed under the page as it lifts past its end. Render it before the page. */
export function PullReadout({
  raw,
  lift,
  armed,
  issueNo,
}: {
  raw: MotionValue<number>;
  lift: MotionValue<number>;
  armed: boolean;
  issueNo: number;
}) {
  const opacity = useTransform(lift, [6, 50], [0, 1], { clamp: true });
  // Mounted only while the page is lifted: iOS Safari tints its toolbar from
  // elements fixed at the screen edge, and an idle transparent strip there
  // shows as white while the bar collapses and expands on scroll.
  const [on, setOn] = useState(false);
  useMotionValueEvent(lift, "change", (v) => setOn(v > 0.5));
  const fill = useTransform(raw, [0, COMMIT], [0, 1], { clamp: true });
  const pct = useTransform(raw, (r) => pad(Math.min(100, Math.round((r / COMMIT) * 100)), 3));
  if (!on) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-0 mx-auto w-full max-w-[520px] bg-ground pb-[calc(var(--sab)+30px)] pl-5 pr-[88px] pt-4"
      style={{ opacity }}
    >
      <div className="mono flex items-center justify-between text-ink-soft">
        <span className="flex items-center gap-2">
          <span className="block h-[7px] w-[7px] bg-ink" />
          End of issue {issueNo}
        </span>
        <motion.span className="tabular-nums">{pct}</motion.span>
      </div>
      <div className="relative mt-3 h-[2px] bg-rule-soft">
        <motion.div
          className={`absolute inset-y-0 left-0 w-full origin-left ${armed ? "bg-accent" : "bg-ink"}`}
          style={{ scaleX: fill }}
        />
      </div>
      <p className={`mono mt-3 ${armed ? "text-accent" : "text-ink"}`}>
        {armed ? `Release to fetch issue ${issueNo + 1}` : `Pull to fetch issue ${issueNo + 1}`}
      </p>
    </motion.div>
  );
}

const STEPS = [
  { at: 0.02, k: "Request", v: (n: number) => `GET /issues/${n}`, done: "200" },
  { at: 0.18, k: "Sources", v: () => "finals · tfd · cod · sb · zzz", done: "05/05" },
  { at: 0.42, k: "Entries", v: () => "parse · dedupe · rank", done: "ok" },
  { at: 0.62, k: "Images", v: () => "fetch · resize · mono", done: "ok" },
  { at: 0.82, k: "Layout", v: (n: number) => `compose issue ${n}`, done: "ok" },
];

/**
 * The fetch, full screen and technical: a three-digit counter, a hairline
 * that fills, the server's steps logging in as they happen, elapsed time.
 * It rises from the bottom (where the pull left off). Slide it down, scroll up,
 * or press Escape to cancel; when the issue is ready it lifts away over the
 * new cover.
 */
export function ReloadScreen({
  issueNo,
  onReady,
  onCancel,
  onGone,
}: {
  /** The issue being fetched. */
  issueNo: number;
  /** The server has the new issue: swap it in (the screen still covers the page). */
  onReady: () => void;
  onCancel: () => void;
  /** The screen has left after either outcome. */
  onGone: () => void;
}) {
  const y = useMotionValue(typeof window === "undefined" ? 800 : window.innerHeight);
  const progress = useMotionValue(0);
  const [elapsed, setElapsed] = useState(0);
  const [stage, setStage] = useState<"loading" | "ready" | "cancelled">("loading");
  const stageRef = useRef(stage);
  const cbs = useRef({ onReady, onCancel, onGone });
  useEffect(() => {
    cbs.current = { onReady, onCancel, onGone };
  });
  const ctl = useRef<AbortController | null>(null);

  const pct = useTransform(progress, (p) => pad(Math.round(p * 100), 3));
  const bar = useTransform(progress, [0, 1], [0, 1]);
  const veil = useTransform(y, (v) => 1 - Math.min(1, Math.max(0, v) / 500));

  const cancel = (velocity = 0) => {
    if (stageRef.current !== "loading") return;
    stageRef.current = "cancelled";
    setStage("cancelled");
    ctl.current?.abort();
    haptic.select();
    cbs.current.onCancel();
    animate(y, window.innerHeight, { ...CLOSE_SPRING, velocity, onComplete: () => cbs.current.onGone() });
  };
  const cancelRef = useRef(cancel);
  useEffect(() => {
    cancelRef.current = cancel;
  });

  // Rise in, start the fetch, run the readout.
  useEffect(() => {
    animate(y, 0, ENTER_SPRING);
    const ac = new AbortController();
    ctl.current = ac;
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const t = performance.now() - t0;
      setElapsed(t);
      // Eases toward 96% while the server works; the answer completes it.
      if (stageRef.current === "loading") {
        const k = Math.min(1, t / FETCH_MS);
        progress.set(0.96 * (1 - Math.pow(1 - k, 2.2)));
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    fetchNextIssue(ac.signal)
      .then(() => {
        if (stageRef.current !== "loading") return;
        stageRef.current = "ready";
        setStage("ready");
        animate(progress, 1, { duration: 0.25, ease: "easeOut" });
        haptic.complete();
        setTimeout(() => {
          cbs.current.onReady();
          // The new issue is in place under the screen: lift away over it.
          animate(y, -window.innerHeight, { ...CLOSE_SPRING, onComplete: () => cbs.current.onGone() });
        }, 380);
      })
      .catch(() => {});
    return () => {
      cancelAnimationFrame(raf);
      ac.abort();
    };
  }, [y, progress]);

  // Slide down (touch or mouse), scroll up, or Escape: cancel.
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    let sy = 0;
    let on = false;
    let last = { y: 0, t: 0, v: 0 };
    const start = (cy: number) => {
      if (stageRef.current !== "loading") return;
      on = true;
      sy = cy;
      y.stop();
      last = { y: cy, t: performance.now(), v: 0 };
    };
    const move = (cy: number, prevent: () => void) => {
      if (!on) return;
      prevent();
      const now = performance.now();
      last = { y: cy, t: now, v: ((cy - last.y) / Math.max(1, now - last.t)) * 1000 };
      y.set(resist(Math.max(0, cy - sy), 420));
    };
    const end = () => {
      if (!on) return;
      on = false;
      const v = freshVelocity(last.v, last.t);
      if (y.get() > 90 || (y.get() > 20 && v > 500)) cancelRef.current(v);
      else animate(y, 0, { ...CANCEL_SPRING, velocity: v });
    };
    const ts = (e: TouchEvent) => e.touches.length === 1 && start(e.touches[0].clientY);
    const tm = (e: TouchEvent) => e.touches.length === 1 && move(e.touches[0].clientY, () => e.cancelable && e.preventDefault());
    const pd = (e: PointerEvent) => e.pointerType === "mouse" && start(e.clientY);
    const pm = (e: PointerEvent) => e.pointerType === "mouse" && move(e.clientY, () => e.preventDefault());
    const pu = (e: PointerEvent) => e.pointerType === "mouse" && end();
    const wheel = (e: WheelEvent) => {
      if (e.deltaY < -4) cancelRef.current();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelRef.current();
    };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    el.addEventListener("pointerdown", pd);
    window.addEventListener("pointermove", pm);
    window.addEventListener("pointerup", pu);
    el.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
      el.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointermove", pm);
      window.removeEventListener("pointerup", pu);
      el.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
    };
  }, [y]);

  const p = elapsed / FETCH_MS;
  const secs = (elapsed / 1000).toFixed(2).padStart(5, "0");

  return (
    <div className="fixed inset-0 z-[45]" role="status" aria-live="polite" aria-label={`Fetching issue ${issueNo}`}>
      {/* The page dims a touch behind the screen while it rises or is pulled away. */}
      <motion.div className="absolute inset-0 bg-ink/10" style={{ opacity: veil }} />
      <motion.div
        ref={sheet}
        className="absolute inset-0 flex flex-col bg-ground"
        style={{ y, touchAction: "none" }}
      >
        <div className="mx-auto flex h-full w-full max-w-[520px] flex-col px-5 pb-[calc(var(--sab)+28px)] pt-[calc(var(--sat)+18px)]">
          <div className="mono flex items-center justify-between text-ink-soft">
            <span className="flex items-center gap-2">
              <motion.span
                className="block h-[8px] w-[8px] bg-ink"
                animate={stage === "loading" ? { opacity: [1, 0.15, 1] } : { opacity: 1 }}
                transition={stage === "loading" ? { duration: 0.9, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
              />
              Fetch
            </span>
            <span>Issue {issueNo}</span>
            <span className="tabular-nums">{secs}s</span>
          </div>

          <div className="mt-auto">
            <div className="flex items-end justify-between">
              <motion.span className="text-[30vw] font-medium leading-[0.78] tracking-[-0.06em] tabular-nums min-[520px]:text-[150px]">
                {pct}
              </motion.span>
              <span className="mono mb-2 text-ink-soft">%</span>
            </div>
            <div className="relative mt-5 h-px bg-rule-soft">
              <motion.div className="absolute inset-y-0 left-0 w-full origin-left bg-ink" style={{ scaleX: bar }} />
            </div>

            <ol className="mt-5">
              {STEPS.map((s, i) => {
                const shown = stage !== "loading" || p >= s.at;
                const next = STEPS[i + 1];
                const done = stage === "ready" || (next ? p >= next.at : false);
                return (
                  <motion.li
                    key={s.k}
                    initial={false}
                    animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 6 }}
                    transition={springs.snappy}
                    className="mono grid grid-cols-[112px_1fr_auto] gap-3 border-b border-rule-soft py-[7px]"
                  >
                    <span className="text-ink-soft">{pad(i + 1)} {s.k}</span>
                    <span className="truncate text-ink">{s.v(issueNo)}</span>
                    <span className={done ? "text-ink" : "text-ink-faint"}>{done ? s.done : "···"}</span>
                  </motion.li>
                );
              })}
            </ol>
          </div>

          <div className="mono mt-8 flex items-center justify-center gap-2 text-ink-soft">
            {stage === "ready" ? (
              <span className="text-accent">Issue {issueNo} ready</span>
            ) : (
              <>
                <Arrow dir="down" /> Slide down to cancel
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
