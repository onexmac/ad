"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useTransform } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { AXIS_LOCK, freshVelocity, resist } from "@/lib/updatr/flight";
import type { Check } from "@/data/puncheo/formaleta-n1";
import { STATUS_LABEL, type Status } from "@/lib/puncheo/state";
import { StatusMark } from "./StatusMark";
import { CameraIcon, CheckIcon, CrossIcon, LockIcon, NaIcon } from "./Icons";

/** Fractions of the card's width: past SHORT a swipe arms, past LONG it upgrades. */
const SHORT = 0.2;
const LONG = 0.5;
/** A quick flick commits the short action even before SHORT. */
const FLING = 550;

type Zone = Status | "na-blocked" | null;

const ZONE_BG: Record<Exclude<Zone, null>, string> = {
  green: "var(--ok)",
  yellow: "var(--warn)",
  red: "var(--bad)",
  na: "var(--ink-3)",
  "na-blocked": "var(--card-2)",
};

const INK: Record<Status, string> = {
  green: "var(--ok-deep)",
  yellow: "var(--warn-deep)",
  red: "var(--bad)",
  na: "var(--ink-faint)",
};

type Props = {
  check: Check;
  index: number;
  punchN: number;
  status: Status | null;
  /** Bumps each time this row is marked, to replay the reward. 0 = no replay. */
  pulse: number;
  /** Bumps to shake the row (it is holding the sheet open). */
  nudge: number;
  open: boolean;
  onToggle: () => void;
  onMark: (s: Status | null) => void;
  onReject: (msg: string) => void;
};

export function PunchRow({ check, index, punchN, status, pulse, nudge, open, onToggle, onMark, onReject }: Props) {
  const x = useMotionValue(0);
  const prog = useMotionValue(0); // 0..1 toward SHORT, then 1..2 toward LONG
  const [zone, setZone] = useState<Zone>(null);
  const [side, setSide] = useState<0 | 1 | -1>(0);
  const under = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const g = useRef({
    id: -1,
    x0: 0,
    y0: 0,
    w: 1,
    lock: null as null | "x" | "y",
    dragged: false,
    v: 0,
    lastX: 0,
    lastT: 0,
    zone: null as Zone,
  });

  // The coloured layer under the card exists only while the card is off its rest.
  useMotionValueEvent(x, "change", (v) => {
    if (under.current) under.current.style.visibility = Math.abs(v) > 0.5 ? "visible" : "hidden";
  });

  useEffect(() => {
    if (!nudge) return;
    animate(x, [0, -10, 9, -6, 4, 0], { duration: 0.42, ease: "easeOut" });
  }, [nudge, x]);

  const iconScale = useTransform(prog, [0, 1, 1.0001, 2], [0.55, 1, 1, 1.12]);
  const iconOpacity = useTransform(prog, [0, 0.6, 1], [0.35, 0.8, 1]);

  const zoneOf = (dx: number, w: number): Zone => {
    if (dx >= LONG * w) return "yellow";
    if (dx >= SHORT * w) return "green";
    if (dx <= -LONG * w) return check.na ? "na" : "na-blocked";
    if (dx <= -SHORT * w) return "red";
    return null;
  };

  const gen = useRef(0);
  /** Back to rest. A committed swipe keeps its colour under the card until it lands. */
  const settle = (velocity = 0, spring: object = springs.completing, keep: Zone = null) => {
    const my = ++gen.current;
    g.current.zone = null;
    animate(prog, 0, springs.snappy);
    if (!keep) setZone(null);
    animate(x, 0, { ...spring, velocity }).then(() => {
      if (gen.current === my && g.current.id === -1) setZone(null);
    });
  };

  // The card blushes the colour it was given, then fades back to grey.
  useEffect(() => {
    if (!pulse || !card.current) return;
    const from = status === "green" ? "#e1edd3" : status === "yellow" ? "#f9efd4" : status === "red" ? "#f5dada" : null;
    if (from) animate(card.current, { backgroundColor: [from, "#f7f7f7"] }, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    // Only a new mark replays it, not a status read back from storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse]);

  const onPointerDown = (e: React.PointerEvent) => {
    const s = g.current;
    if (s.id !== -1) {
      // A second finger settles whatever the first was doing.
      s.id = -1;
      settle();
      return;
    }
    if (e.pointerType === "mouse" && e.button !== 0) return;
    s.id = e.pointerId;
    s.x0 = e.clientX;
    s.y0 = e.clientY;
    s.w = card.current?.offsetWidth || 340;
    s.lock = null;
    s.dragged = false;
    s.v = 0;
    s.lastX = e.clientX;
    s.lastT = performance.now();
    s.zone = null;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (e.pointerId !== s.id) return;
    if (!s.lock) {
      const mx = e.clientX - s.x0;
      const my = e.clientY - s.y0;
      if (Math.abs(my) > AXIS_LOCK && Math.abs(my) > Math.abs(mx)) {
        s.lock = "y";
        return;
      }
      if (Math.abs(mx) > AXIS_LOCK && Math.abs(mx) > Math.abs(my)) {
        s.lock = "x";
        s.dragged = true;
        s.x0 = e.clientX; // the card follows from where the lock happened: no jump
        card.current?.setPointerCapture(e.pointerId);
        haptic.drag();
      } else return;
    }
    if (s.lock !== "x") return;
    const dx = e.clientX - s.x0;
    const now = performance.now();
    const dt = Math.max(1, now - s.lastT);
    s.v = ((e.clientX - s.lastX) / dt) * 1000;
    s.lastX = e.clientX;
    s.lastT = now;

    const w = s.w;
    const a = Math.abs(dx);
    const long = LONG * w;
    const shown = a <= long ? a : long + resist(a - long, w * 0.28);
    x.set(Math.sign(dx) * shown);
    prog.set(a < SHORT * w ? a / (SHORT * w) : 1 + Math.min(1, (a - SHORT * w) / ((LONG - SHORT) * w)));
    setSide(dx > 0 ? 1 : dx < 0 ? -1 : 0);
    const z = zoneOf(dx, w);
    if (z !== s.zone) {
      if (z) haptic.select();
      s.zone = z;
      setZone(z);
    }
  };

  const finish = (e: React.PointerEvent, cancelled: boolean) => {
    const s = g.current;
    if (e.pointerId !== s.id) return;
    s.id = -1;
    if (s.lock !== "x") return;
    if (cancelled) return settle(); // the system took the touch: settle back, no commit
    const dx = e.clientX - s.x0;
    const v = freshVelocity(s.v, s.lastT);
    let z = zoneOf(dx, s.w);
    if (!z && Math.abs(v) > FLING && Math.sign(v) === Math.sign(dx) && Math.abs(dx) > 24) z = dx > 0 ? "green" : "red";
    if (!z) return settle(v);
    if (z === "na-blocked") {
      haptic.error();
      onReject(`N/A no está permitido en ${check.id}`);
      return settle(v, springs.snappy);
    }
    if (z === "green" || z === "yellow") haptic.complete();
    else if (z === "red") haptic.delete();
    else haptic.select();
    onMark(z);
    settle(v, z === "green" ? springs.completing : springs.snappy, z);
  };

  const ink = status ? INK[status] : "var(--ink-faint)";
  const sub = status ? STATUS_LABEL[status] : STATUS_LABEL.pending;
  const needsEvidence = status === "yellow" || status === "red";

  return (
    // A freshly marked row sits above its neighbours so its rings spill over them.
    <div className="relative" style={{ zIndex: pulse ? 2 : undefined }}>
      {/* What the swipe will do, under the card. */}
      <div
        ref={under}
        aria-hidden
        className="absolute inset-0 flex items-center overflow-hidden rounded-[22px] px-6 transition-colors duration-150"
        style={{
          visibility: "hidden",
          justifyContent: side >= 0 ? "flex-start" : "flex-end",
          background: zone ? ZONE_BG[zone] : side >= 0 ? "var(--ok-soft)" : "var(--bad-soft)",
          backgroundImage:
            zone === "na-blocked"
              ? "repeating-linear-gradient(135deg, transparent 0 7px, rgba(25,28,34,0.06) 7px 8px)"
              : undefined,
        }}
      >
        <motion.span
          className="flex items-center gap-2.5"
          style={{
            scale: iconScale,
            opacity: iconOpacity,
            color: zone === "yellow" || zone === "na-blocked" ? "var(--ink)" : zone ? "#fff" : "var(--ink-3)",
            flexDirection: side >= 0 ? "row" : "row-reverse",
          }}
        >
          {side >= 0 ? (
            zone === "yellow" ? (
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="square" aria-hidden>
                <path d="M12 5v8.5" />
                <path d="M12 18v1" />
              </svg>
            ) : (
              <CheckIcon size={20} strokeWidth={2.2} />
            )
          ) : zone === "na" ? (
            <NaIcon size={20} strokeWidth={1.8} />
          ) : zone === "na-blocked" ? (
            <LockIcon size={18} />
          ) : (
            <CrossIcon size={18} strokeWidth={2.2} />
          )}
          <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
            {side >= 0
              ? zone === "yellow"
                ? "Con observación"
                : "Pasa"
              : zone === "na"
                ? "No aplica"
                : zone === "na-blocked"
                  ? "N/A no permitido"
                  : "No pasa"}
          </span>
        </motion.span>
      </div>

      <motion.div
        ref={card}
        style={{ x, touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finish(e, false)}
        onPointerCancel={(e) => finish(e, true)}
        onLostPointerCapture={(e) => {
          // Touches start captured by the button inside; handing capture to the
          // card makes the button lose it, and that event bubbles here. Only the
          // card losing its own capture means the gesture was taken away.
          if (e.target === card.current) finish(e, true);
        }}
        className="no-select relative rounded-[22px] bg-card"
      >
        <button
          type="button"
          onClick={() => {
            if (g.current.dragged) return;
            haptic.select();
            onToggle();
          }}
          aria-expanded={open}
          className="flex w-full items-center gap-4 py-4 pl-5 pr-4 text-left outline-none"
        >
          <span className="flex w-9 shrink-0 flex-col items-start leading-none">
            <span className="text-[13px] font-medium text-ink-faint">P{punchN}</span>
            <span
              className="mt-1.5 text-[26px] font-medium tracking-[-0.02em] transition-colors duration-300"
              style={{ color: status ? ink : "var(--ink-3)" }}
            >
              {String(index).padStart(2, "0")}
            </span>
          </span>
          <span className="h-11 w-px shrink-0 bg-hair" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[16px] font-semibold leading-5 tracking-[-0.01em] text-ink">{check.title}</span>
              {check.photo.required ? <CameraIcon size={13} className="shrink-0 text-ink-faint" /> : null}
            </span>
            <span className="mt-1 block text-[14px] font-medium leading-5 transition-colors duration-300" style={{ color: status ? ink : "var(--ink-faint)" }}>
              {sub}
              {needsEvidence ? <span className="text-ink-faint"> · nota y foto</span> : null}
            </span>
          </span>
          <StatusMark key={pulse} status={status} fresh={pulse > 0} />
        </button>

        {/* The reward for a pass: a hairline sweeps the card's foot. */}
        {pulse > 0 && status === "green" ? (
          <motion.span
            key={`sweep-${pulse}`}
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-5 right-5 h-[2px] origin-left rounded-full bg-ok"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1, opacity: [1, 1, 0] }}
            transition={{ scaleX: { duration: 0.5, delay: 0.1, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 1, delay: 0.1, times: [0, 0.6, 1] } }}
          />
        ) : null}

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ height: springs.shrinking, opacity: { duration: 0.18 } }}
              className="overflow-hidden"
            >
              <Detail check={check} status={status} onClear={() => onMark(null)} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function Detail({ check, status, onClear }: { check: Check; status: Status | null; onClear: () => void }) {
  const rows: { s: Status; label: string; text: string }[] = [
    { s: "green", label: "Verde", text: check.green },
    { s: "yellow", label: "Amarillo", text: check.yellow },
    { s: "red", label: "Rojo", text: check.red },
  ];
  return (
    <div className="px-5 pb-5">
      <div className="h-px bg-hair" />
      <Label className="mt-4">Qué se revisa</Label>
      <p className="mt-1.5 text-[15px] leading-[21px] text-ink-2">{check.what}</p>

      <div className="mt-4 grid gap-2">
        {rows.map((r) => (
          <div
            key={r.s}
            className="flex gap-3 rounded-2xl px-3.5 py-3 transition-colors"
            style={{ background: status === r.s ? "var(--ground)" : "transparent", boxShadow: status === r.s ? "var(--shadow-soft)" : "none" }}
          >
            <span className="mt-[5px] size-2.5 shrink-0 rounded-full" style={{ background: `var(--${r.s === "green" ? "ok" : r.s === "yellow" ? "warn" : "bad"})` }} />
            <span className="min-w-0">
              <span className="mono text-ink-soft">{r.label}</span>
              <span className="mt-0.5 block text-[14px] leading-5 text-ink-2">{r.text}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 border-t border-hair pt-4">
        <Label>Tolerancia</Label>
        <p className="text-[14px] leading-5 text-ink-2">{check.tolerance}</p>
        <Label>Foto</Label>
        <p className="text-[14px] leading-5 text-ink-2">
          <span className={check.photo.required ? "font-semibold text-ink" : ""}>{check.photo.required ? "Obligatoria" : "Opcional"}</span>
          {check.photo.note ? <span className="text-ink-soft"> · {check.photo.note}</span> : null}
        </p>
        <Label>N/A</Label>
        <p className="text-[14px] leading-5 text-ink-2">{check.na ? "Permitido" : "No permitido"}</p>
      </div>

      {status ? (
        <div className="mt-4 flex items-center justify-between border-t border-hair pt-4">
          <span className="text-[13px] text-ink-soft">
            {status === "yellow" || status === "red" ? "Amarillo y rojo exigen nota y foto." : "Marcado."}
          </span>
          <button
            type="button"
            onClick={() => {
              haptic.select();
              onClear();
            }}
            className="rounded-full bg-hair px-3.5 py-2 text-[13px] font-semibold text-ink-3 active:bg-hair-2"
          >
            Reiniciar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`mono block pt-[3px] text-ink-faint ${className}`}>{children}</span>;
}
