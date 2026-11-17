"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import {
  AXIS_LOCK,
  BACK_COMMIT,
  CANCEL_SPRING,
  CLOSE_SPRING,
  freshVelocity,
  swipeProgress,
} from "@/lib/updatr/flight";
import { MONTHS, SNAPSHOT, isoDate, isoWeek, isoWeekMonday, pad } from "@/lib/updatr/format";
import { Arrow } from "./Arrow";

const ENTER_SPRING = { type: "spring" as const, stiffness: 240, damping: 30, mass: 1 };
const END_LIFT_MAX = 160;
const END_COMMIT = 130;
const DAY = 86_400_000;

/** Demo: how many entries an edition carried (the server will say). */
export const entriesIn = (n: number) => 12 + ((n * 7) % 9);

type Week = { n: number; days: { iso: string; day: number; inMonth: boolean }[]; from: string; to: string };
type Month = { year: number; month: number; weeks: Week[] };

/** Months of the year up to the snapshot's, newest first; each lists the ISO weeks that touch it. */
function monthsOf(year: number, lastMonth: number): Month[] {
  const out: Month[] = [];
  for (let m = lastMonth; m >= 0; m--) {
    const first = new Date(Date.UTC(year, m, 1));
    const last = new Date(Date.UTC(year, m + 1, 0));
    const start = new Date(first.getTime() - ((first.getUTCDay() + 6) % 7) * DAY);
    const weeks: Week[] = [];
    for (let mon = start; mon <= last; mon = new Date(mon.getTime() + 7 * DAY)) {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(mon.getTime() + i * DAY);
        return { iso: isoDate(d), day: d.getUTCDate(), inMonth: d.getUTCMonth() === m };
      });
      weeks.push({ n: isoWeek(days[3].iso), days, from: days[0].iso, to: days[6].iso });
    }
    out.push({ year, month: m, weeks });
  }
  return out;
}

const short = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

/** Revealed above the page as it is pulled down from the top. Render it before the page. */
export function EditionsReadout({
  raw,
  lift,
  armed,
  issueNo,
  commitAt,
}: {
  raw: MotionValue<number>;
  lift: MotionValue<number>;
  armed: boolean;
  issueNo: number;
  commitAt: number;
}) {
  const opacity = useTransform(lift, [6, 50], [0, 1], { clamp: true });
  const fill = useTransform(raw, [0, commitAt], [0, 1], { clamp: true });
  // Mounted only while the page is pulled: nothing idle fixed at the screen edge.
  const [on, setOn] = useState(false);
  useMotionValueEvent(lift, "change", (v) => setOn(v > 0.5));
  if (!on) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-0 mx-auto w-full max-w-[520px] bg-ground px-5 pb-4 pt-[calc(var(--sat)+22px)]"
      style={{ opacity }}
    >
      <div className="mono flex items-center justify-between text-ink-soft">
        <span className="flex items-center gap-2">
          <span className="block h-[7px] w-[7px] bg-ink" />
          Issue {issueNo}
        </span>
        <span>Editions</span>
      </div>
      <div className="relative mt-3 h-[2px] bg-rule-soft">
        <motion.div
          className={`absolute inset-y-0 left-0 w-full origin-left ${armed ? "bg-accent" : "bg-ink"}`}
          style={{ scaleX: fill }}
        />
      </div>
      <p className={`mono mt-3 ${armed ? "text-accent" : "text-ink"}`}>
        {armed ? "Release for the calendar" : "Pull for past editions"}
      </p>
    </motion.div>
  );
}

/**
 * Past editions on a calendar: one block per month, newest first, each row an
 * ISO week (one edition) with its issue number in the gutter. The issue in
 * view is ink; the latest carries the accent mark; weeks without an edition
 * are faint. Pick a week to fetch that issue.
 * It drops in from the top (where the pull came from) and leaves the same way:
 * the Close button, Escape, a push on past its end, or a right swipe.
 */
export function Editions({
  issueNo,
  latest,
  onPick,
  onClose,
}: {
  /** The issue in view. */
  issueNo: number;
  /** The newest edition that exists. */
  latest: number;
  onPick: (n: number) => void;
  onClose: () => void;
}) {
  const year = Number(SNAPSHOT.slice(0, 4));
  const months = useMemo(() => monthsOf(year, Number(SNAPSHOT.slice(5, 7)) - 1), [year]);
  const vh = () => (typeof window === "undefined" ? 800 : window.innerHeight);
  const vw = () => (typeof window === "undefined" ? 400 : window.innerWidth);

  const y = useMotionValue(-vh());
  const swipeX = useMotionValue(0);
  const endRaw = useMotionValue(0);
  const endLift = useTransform(endRaw, (r) => END_LIFT_MAX * (1 - Math.exp((-Math.max(0, r) * 0.6) / END_LIFT_MAX)));
  const sheetY = useTransform(() => y.get() - endLift.get() * 0.6);
  const scale = useTransform(
    () => 1 - Math.min(swipeX.get() / vw(), 1) * 0.08 - (endLift.get() / END_LIFT_MAX) * 0.08,
  );
  const radius = useTransform(() => Math.max(Math.min(swipeX.get() / (vw() * 0.25), 1), Math.min(endLift.get() / 50, 1)) * 28);
  const veil = useTransform(() => {
    const inK = 1 - Math.min(1, Math.abs(y.get()) / vh());
    return inK * (1 - Math.min(swipeX.get() / vw(), 1)) * 0.12;
  });
  const endHint = useTransform(endLift, [8, 90], [0, 1], { clamp: true });
  const [endArmed, setEndArmed] = useState(false);
  const leaving = useRef(false);
  const cbs = useRef({ onPick, onClose });
  useEffect(() => {
    cbs.current = { onPick, onClose };
  });

  useEffect(() => {
    animate(y, 0, ENTER_SPRING);
  }, [y]);

  const close = (how: "up" | "swipe", then?: () => void, velocity = 0) => {
    if (leaving.current) return;
    leaving.current = true;
    const done = () => {
      then?.();
      cbs.current.onClose();
    };
    if (how === "swipe") animate(swipeX, vw() * 1.1, { ...CLOSE_SPRING, velocity, onComplete: done });
    else animate(y, -vh() * 1.05, { ...CLOSE_SPRING, velocity, onComplete: done });
  };
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  const pick = (n: number) => {
    if (leaving.current) return;
    haptic.select();
    if (n === issueNo) close("up");
    // Up and away, then the fetch for that edition takes the screen.
    else close("up", () => cbs.current.onPick(n));
  };

  // Gestures on the sheet: right swipe from anywhere; a fresh push past the end.
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    let mode: "idle" | "pending" | "swipe" | "end" | "native" = "idle";
    let sx = 0;
    let sy = 0;
    let atEnd = false;
    let last = { x: 0, y: 0, t: 0 };
    let vx = 0;
    let vy = 0;
    let armed = false;
    let dragged = false;
    const arm = (on: boolean) => {
      if (on === armed) return;
      armed = on;
      setEndArmed(on);
      if (on) haptic.select();
    };
    const begin = (x: number, yy: number) => {
      if (leaving.current) return;
      mode = "pending";
      sx = x;
      sy = yy;
      atEnd = el.scrollTop >= el.scrollHeight - el.clientHeight - 1;
      last = { x, y: yy, t: performance.now() };
      vx = vy = 0;
      dragged = false;
    };
    const move = (x: number, yy: number, cancelable: boolean, prevent: () => void) => {
      if (mode === "idle" || mode === "native") return;
      const dx = x - sx;
      const dy = yy - sy;
      if (mode === "pending") {
        if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) {
          if (atEnd && dy < 0 && cancelable) prevent();
          return;
        }
        if (Math.abs(dx) > Math.abs(dy) && dx > 0) mode = "swipe";
        else if (atEnd && dy < 0 && Math.abs(dy) >= Math.abs(dx)) mode = "end";
        else {
          mode = "native";
          return;
        }
        if (!cancelable) {
          mode = "native";
          return;
        }
        dragged = true;
        swipeX.stop();
        endRaw.stop();
        haptic.drag();
      }
      prevent();
      const now = performance.now();
      const dt = Math.max(1, now - last.t);
      vx = ((x - last.x) / dt) * 1000;
      vy = ((yy - last.y) / dt) * 1000;
      last = { x, y: yy, t: now };
      if (mode === "swipe") swipeX.set(swipeProgress(dx, vw()) * vw());
      else {
        const r = Math.max(0, -dy);
        endRaw.set(r);
        arm(r > END_COMMIT);
      }
    };
    const end = () => {
      const m = mode;
      mode = "idle";
      const now = performance.now();
      const rvx = freshVelocity(vx, last.t, now);
      const rvy = freshVelocity(vy, last.t, now);
      if (m === "swipe") {
        const p = swipeX.get() / vw();
        if (p > BACK_COMMIT || (p > 0.1 && rvx > 520)) closeRef.current("swipe", undefined, rvx);
        else animate(swipeX, 0, { ...CANCEL_SPRING, velocity: rvx });
      } else if (m === "end") {
        const r = endRaw.get();
        arm(false);
        if (r > END_COMMIT) closeRef.current("up", undefined, rvy);
        else animate(endRaw, 0, { ...CANCEL_SPRING, velocity: -rvy });
      }
    };
    const ts = (e: TouchEvent) => (e.touches.length === 1 ? begin(e.touches[0].clientX, e.touches[0].clientY) : (mode = "native"));
    const tm = (e: TouchEvent) =>
      e.touches.length === 1 && move(e.touches[0].clientX, e.touches[0].clientY, e.cancelable, () => e.preventDefault());
    const tc = () => {
      mode = "idle";
      arm(false);
      animate(swipeX, 0, CANCEL_SPRING);
      animate(endRaw, 0, CANCEL_SPRING);
    };
    const pd = (e: PointerEvent) => e.pointerType === "mouse" && e.button === 0 && begin(e.clientX, e.clientY);
    const pm = (e: PointerEvent) => e.pointerType === "mouse" && move(e.clientX, e.clientY, true, () => e.preventDefault());
    const pu = (e: PointerEvent) => e.pointerType === "mouse" && end();
    const click = (e: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      e.preventDefault();
      e.stopPropagation();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current("up");
    };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", tc);
    el.addEventListener("pointerdown", pd);
    window.addEventListener("pointermove", pm);
    window.addEventListener("pointerup", pu);
    el.addEventListener("click", click, true);
    window.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", tc);
      el.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointermove", pm);
      window.removeEventListener("pointerup", pu);
      el.removeEventListener("click", click, true);
      window.removeEventListener("keydown", key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewing = isoWeekMonday(year, issueNo);
  const viewFrom = isoDate(viewing);
  const viewTo = isoDate(new Date(viewing.getTime() + 6 * DAY));

  return (
    <div className="fixed inset-0 z-[45]" role="dialog" aria-modal="true" aria-label="Past editions">
      <motion.div className="absolute inset-0 bg-ink" style={{ opacity: veil }} />
      <motion.div
        ref={sheet}
        className="absolute inset-0 overflow-y-auto overscroll-none bg-ground [scrollbar-gutter:stable]"
        style={{ y: sheetY, x: swipeX, scale, borderRadius: radius, transformOrigin: "50% 0%", touchAction: "pan-y" }}
      >
        <div className="mx-auto w-full max-w-[520px] px-6 pb-[calc(var(--sab)+140px)] pt-[calc(var(--sat)+28px)]">
          <div className="mono flex items-center justify-between text-ink-soft">
            <span className="flex items-center gap-2">
              <span className="block h-[8px] w-[8px] bg-ink" />
              Editions
            </span>
            <span>{year}</span>
            <span>{pad(latest)} issues</span>
          </div>

          <div className="mt-14">
            <p className="mono text-ink-soft">In view</p>
            <p className="mt-2 text-[64px] font-medium leading-[0.85] tracking-[-0.05em] tabular-nums">Nº{issueNo}</p>
            <p className="mono mt-4 text-ink-soft">
              {short(viewFrom)} — {short(viewTo)} · {pad(entriesIn(issueNo))} entries
            </p>
          </div>

          {months.map((m, mi) => (
            <section key={m.month} className="mt-16">
              <div className="flex items-baseline justify-between border-b border-ink pb-2">
                <h3 className="text-[28px] font-normal uppercase leading-none tracking-[-0.04em]">{MONTHS[m.month]}</h3>
                <span className="mono text-ink-soft">
                  {pad(m.month + 1)} · {m.year}
                </span>
              </div>
              <div className="mono grid grid-cols-[56px_repeat(7,minmax(0,1fr))_36px] py-3 text-ink-faint">
                <span>Nº</span>
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span key={i} className="text-center">
                    {d}
                  </span>
                ))}
                <span className="text-right">#</span>
              </div>
              <ol>
                {m.weeks.map((w) => {
                  const exists = w.n >= 1 && w.n <= latest && Number(w.days[3].iso.slice(0, 4)) === year;
                  const inView = w.n === issueNo && exists;
                  return (
                    <li key={w.from}>
                      <motion.button
                        type="button"
                        disabled={!exists}
                        onClick={() => pick(w.n)}
                        whileTap={exists ? { scale: 0.98 } : undefined}
                        transition={springs.snappy}
                        aria-label={exists ? `Issue ${w.n}, ${short(w.from)} to ${short(w.to)}` : `No edition for ${short(w.from)}`}
                        aria-current={inView ? "true" : undefined}
                        className={`grid h-[52px] w-full grid-cols-[56px_repeat(7,minmax(0,1fr))_36px] items-center border-b border-rule-soft text-left ${
                          inView ? "bg-ink text-paper" : exists ? "text-ink active:bg-paper" : "text-ink-faint"
                        }`}
                        style={{ WebkitTapHighlightColor: "transparent" }}
                      >
                        <span className={`mono flex items-center gap-[6px] ${inView ? "pl-2" : ""}`}>
                          {w.n === latest && exists && !inView ? <span className="block h-[6px] w-[6px] bg-accent" /> : null}
                          {exists ? pad(w.n) : "—"}
                        </span>
                        {w.days.map((d) => (
                          <span
                            key={d.iso}
                            className={`relative text-center text-[15px] tabular-nums ${
                              d.inMonth ? "" : inView ? "text-paper/40" : "text-ink-faint/60"
                            }`}
                          >
                            {d.day}
                            {d.iso === SNAPSHOT ? (
                              <span className="absolute -bottom-[5px] left-1/2 block h-[3px] w-[3px] -translate-x-1/2 bg-accent" />
                            ) : null}
                          </span>
                        ))}
                        <span className={`mono pr-2 text-right ${inView ? "text-paper/70" : "text-ink-soft"}`}>
                          {exists ? pad(entriesIn(w.n)) : ""}
                        </span>
                      </motion.button>
                    </li>
                  );
                })}
              </ol>
              {mi === months.length - 1 ? (
                <p className="mono mt-10 text-ink-faint">First edition · Nº01 · {short(isoDate(isoWeekMonday(year, 1)))}</p>
              ) : null}
            </section>
          ))}
        </div>
      </motion.div>

      {/* The way out, revealed as the calendar is pushed past its end. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--sab)+34px)] flex flex-col items-center gap-2"
        style={{ opacity: endHint }}
      >
        <span className={`mono bg-ground px-2 py-[5px] ${endArmed ? "text-accent" : "text-ink"}`}>
          {endArmed ? "Release to close" : "Back to the issue"}
        </span>
      </motion.div>

      {/* Bottom chrome: close, under the thumb. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="absolute inset-x-0 bottom-0 h-[calc(110px+var(--sab))] bg-gradient-to-t from-ground via-ground/80 to-transparent" />
        <div className="relative mx-auto flex max-w-[520px] items-center justify-between px-4 pb-[calc(var(--sab)+16px)]">
          <motion.button
            type="button"
            onClick={() => {
              haptic.select();
              close("up");
            }}
            whileTap={{ scale: 0.94 }}
            transition={springs.snappy}
            className="mono pointer-events-auto flex h-12 items-center gap-2 bg-ink px-4 text-paper"
            style={{ x: swipeX }}
          >
            <Arrow dir="up" /> Close
          </motion.button>
          <span className="mono bg-ground/85 px-3 py-2 text-ink-soft backdrop-blur-md">Pick a week</span>
        </div>
      </div>
    </div>
  );
}
