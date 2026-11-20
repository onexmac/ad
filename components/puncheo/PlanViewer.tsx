"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { haptic } from "@/lib/histok/haptic";

/*
 * A house drawing, opened from the ficha's Planos list. The sheet rises from
 * the key that opened it on a spring, over the dimmed app; pull it down or
 * swipe it right to put it away (a short pull springs back), or tap Volver,
 * outside, or Escape.
 */

export type PlanDoc = { id: string; name: string; drawing?: "formaleta"; url: string | null };

const CANCEL = { type: "spring", stiffness: 420, damping: 34 } as const;
const AXIS_LOCK = 8;

export function PlanViewer({ plan, from, house, condo, onClose }: { plan: PlanDoc | null; from: DOMRect | null; house: string; condo: string; onClose: () => void }) {
  return <AnimatePresence>{plan ? <Sheet key={plan.id} plan={plan} from={from} house={house} condo={condo} onClose={onClose} /> : null}</AnimatePresence>;
}

function Sheet({ plan, from, house, condo, onClose }: { plan: PlanDoc; from: DOMRect | null; house: string; condo: string; onClose: () => void }) {
  const dx = useMotionValue(0);
  const dy = useMotionValue(0);
  const pull = useMotionValue(0); // 0 at rest, 1 when pulled far
  const dim = useTransform(pull, [0, 1], [1, 0.25]);
  const [gone, setGone] = useState(false);

  // The sheet grows out of the key that opened it.
  const [origin] = useState(() => {
    if (!from || typeof window === "undefined") return { x: 0, y: 120 };
    return { x: from.left + from.width / 2 - window.innerWidth / 2, y: from.top + from.height / 2 - window.innerHeight / 2 };
  });

  const close = () => {
    if (gone) return;
    haptic.select();
    setGone(true);
    onClose();
  };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  });

  const drag = useRef<{ x: number; y: number; axis: "x" | "y" | null; t: number; v: number; last: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
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
      pull.set(Math.min(1, Math.max(0, my) / 380));
    } else {
      dx.set(mx > 0 ? mx : mx * 0.25);
      pull.set(Math.min(1, Math.max(0, mx) / 420));
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.axis) return;
    const far = d.axis === "y" ? dy.get() > 110 || d.v > 650 : dx.get() > window.innerWidth * 0.3 || d.v > 650;
    if (far) return close();
    animate(dx, 0, CANCEL);
    animate(dy, 0, CANCEL);
    animate(pull, 0, { duration: 0.2 });
  };

  return (
    <div className="leia-root fixed inset-0 z-[60]" style={{ touchAction: "none" }} data-plan-viewer>
      <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} onClick={close}>
        <motion.div className="absolute inset-0 bg-[#121417]/90" style={{ opacity: dim }} />
      </motion.div>
      <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center px-4" style={{ top: "calc(var(--sat) + 16px)", bottom: "calc(var(--sab) + 84px)" }}>
        <motion.div
          className="pointer-events-auto max-w-[480px]"
          style={{ aspectRatio: "3 / 4", width: "min(100%, calc((100dvh - var(--sat) - var(--sab) - 100px) * 0.75))" }}
          initial={{ opacity: 0, scale: 0.2, x: origin.x, y: origin.y }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } }}
          exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
        >
          <motion.div
            className="h-full w-full overflow-hidden rounded-[6px] bg-white shadow-[0_24px_60px_-18px_rgba(0,0,0,0.7)]"
            style={{ x: dx, y: dy }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            {plan.drawing === "formaleta" ? <FormaletaDrawing house={house} condo={condo} /> : null}
          </motion.div>
        </motion.div>
      </div>
      <motion.div
        className="leia-bar absolute inset-x-0 bottom-0 flex items-center gap-3 px-3"
        style={{ paddingBottom: "var(--sab)", height: "calc(var(--sab) + 64px)" }}
        initial={{ y: 80 }}
        animate={{ y: 0, transition: { type: "spring", stiffness: 380, damping: 32 } }}
        exit={{ y: 80, transition: { duration: 0.18 } }}
      >
        <button type="button" aria-label="Volver" onClick={close} className="leia-btn grid size-11 shrink-0 place-items-center rounded-[4px]">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth={3} strokeLinecap="square" />
          </svg>
        </button>
        <span className="min-w-0 flex-1 truncate text-[16px] font-bold text-white [text-shadow:0_-1px_0_rgba(0,0,0,0.4)]">{plan.name}</span>
        <span className="text-[13px] text-[#b9bcc2]">{house} · F-01</span>
      </motion.div>
    </div>
  );
}

/**
 * A stand-in formwork sheet for the house: the ground floor in plan, every wall
 * drawn as its run of forming panels (60 cm modules, numbered), the openings
 * left as blockouts, the ties marked, and the title block.
 */
function FormaletaDrawing({ house, condo }: { house: string; condo: string }) {
  // Plan in metres → drawing units (1 m = 30 u), origin at the top-left wall.
  const M = 30;
  const X0 = 30;
  const Y0 = 40;
  const W = 8.4;
  const H = 10.2;
  const T = 0.12 * M; // wall thickness
  const panels: { x1: number; y1: number; x2: number; y2: number }[] = [
    // Outer walls.
    { x1: 0, y1: 0, x2: W, y2: 0 },
    { x1: W, y1: 0, x2: W, y2: H },
    { x1: W, y1: H, x2: 0, y2: H },
    { x1: 0, y1: H, x2: 0, y2: 0 },
    // Inner walls: the bedrooms' line, the bath, the hall.
    { x1: 0, y1: 4.2, x2: 5.4, y2: 4.2 },
    { x1: 5.4, y1: 0, x2: 5.4, y2: 4.2 },
    { x1: 2.7, y1: 0, x2: 2.7, y2: 4.2 },
    { x1: 5.4, y1: 2.4, x2: W, y2: 2.4 },
  ];
  const openings: { x: number; y: number; len: number; dir: "h" | "v"; kind: "door" | "win" }[] = [
    { x: 3.6, y: H, len: 1.0, dir: "h", kind: "door" },
    { x: 0.9, y: 0, len: 1.2, dir: "h", kind: "win" },
    { x: 3.6, y: 0, len: 1.2, dir: "h", kind: "win" },
    { x: W, y: 6.6, len: 1.8, dir: "v", kind: "win" },
    { x: 0, y: 6.9, len: 1.8, dir: "v", kind: "win" },
    { x: 1.2, y: 4.2, len: 0.9, dir: "h", kind: "door" },
    { x: 3.9, y: 4.2, len: 0.9, dir: "h", kind: "door" },
    { x: 5.4, y: 3.0, len: 0.8, dir: "v", kind: "door" },
    { x: 6.6, y: 0, len: 0.6, dir: "h", kind: "win" },
  ];
  const px = (m: number) => X0 + m * M;
  const py = (m: number) => Y0 + m * M;
  let n = 0;
  return (
    <svg viewBox="0 0 312 416" className="block h-full w-full" aria-label="Plano formaleta">
      <rect x={0} y={0} width={312} height={416} fill="#fbfbf8" />
      {/* The sheet's frame. */}
      <rect x={10} y={10} width={292} height={396} fill="none" stroke="#1d2a44" strokeWidth={0.8} />
      <text x={20} y={27} fontSize={9} fontWeight={700} fill="#1d2a44" letterSpacing={0.6}>
        PLANTA DE FORMALETA · NIVEL 1
      </text>
      <text x={292} y={27} fontSize={7} fill="#5b6376" textAnchor="end">
        ESC 1:75
      </text>

      {/* Walls as panel runs. */}
      {panels.map((w, wi) => {
        const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
        const count = Math.round(len / 0.6);
        const horiz = w.y1 === w.y2;
        const ticks = [];
        for (let k = 0; k <= count; k++) {
          const f = k / count;
          const mx = w.x1 + (w.x2 - w.x1) * f;
          const my = w.y1 + (w.y2 - w.y1) * f;
          ticks.push(
            horiz ? (
              <line key={k} x1={px(mx)} y1={py(my) - T / 2} x2={px(mx)} y2={py(my) + T / 2} stroke="#3b6fc4" strokeWidth={0.5} />
            ) : (
              <line key={k} x1={px(mx) - T / 2} y1={py(my)} x2={px(mx) + T / 2} y2={py(my)} stroke="#3b6fc4" strokeWidth={0.5} />
            ),
          );
          if (k < count && wi < 4 && k % 2 === 0) {
            n++;
            const cx = w.x1 + (w.x2 - w.x1) * (f + 0.5 / count);
            const cy = w.y1 + (w.y2 - w.y1) * (f + 0.5 / count);
            const off = 9;
            const tx = horiz ? px(cx) : px(cx) + (wi === 1 ? off : -off);
            const ty = horiz ? py(cy) + (wi === 0 ? -off + 2 : off + 2) : py(cy) + 2;
            ticks.push(
              <text key={`n${k}`} x={tx} y={ty} fontSize={4.6} fill="#3b6fc4" textAnchor="middle">
                P{String(n).padStart(2, "0")}
              </text>,
            );
          }
        }
        return (
          <g key={wi}>
            {horiz ? (
              <rect x={Math.min(px(w.x1), px(w.x2))} y={py(w.y1) - T / 2} width={Math.abs(w.x2 - w.x1) * M} height={T} fill="#dfe8f6" stroke="#1d2a44" strokeWidth={0.7} />
            ) : (
              <rect x={px(w.x1) - T / 2} y={Math.min(py(w.y1), py(w.y2))} width={T} height={Math.abs(w.y2 - w.y1) * M} fill="#dfe8f6" stroke="#1d2a44" strokeWidth={0.7} />
            )}
            {ticks}
          </g>
        );
      })}

      {/* Openings: the blockouts, doors with their swing. */}
      {openings.map((o, i) => {
        const horiz = o.dir === "h";
        const x = px(o.x);
        const y = py(o.y);
        const L = o.len * M;
        return (
          <g key={i}>
            {horiz ? (
              <rect x={x} y={y - T / 2 - 0.6} width={L} height={T + 1.2} fill="#fbfbf8" stroke="#c0392b" strokeWidth={0.7} strokeDasharray="2 1.2" />
            ) : (
              <rect x={x - T / 2 - 0.6} y={y} width={T + 1.2} height={L} fill="#fbfbf8" stroke="#c0392b" strokeWidth={0.7} strokeDasharray="2 1.2" />
            )}
            {o.kind === "door" ? (
              horiz ? (
                <path d={`M${x} ${y} A${L} ${L} 0 0 ${o.y === H ? 0 : 1} ${x + L} ${y + (o.y === H ? -L : L)}`} fill="none" stroke="#8a8d93" strokeWidth={0.5} />
              ) : (
                <path d={`M${x} ${y} A${L} ${L} 0 0 1 ${x + L} ${y + L}`} fill="none" stroke="#8a8d93" strokeWidth={0.5} />
              )
            ) : null}
          </g>
        );
      })}

      {/* Ties: one per panel joint along the outer walls, every other module. */}
      {[0.6, 1.8, 3.0, 4.2, 5.4, 6.6, 7.8].map((m) => (
        <circle key={`t${m}`} cx={px(m)} cy={py(H)} r={1.1} fill="#1d2a44" />
      ))}

      {/* Rooms. */}
      {[
        { x: 1.35, y: 2.1, t: "CUARTO 1" },
        { x: 4.05, y: 2.1, t: "CUARTO 2" },
        { x: 6.9, y: 1.2, t: "BAÑO" },
        { x: 4.2, y: 7.3, t: "SALA · COMEDOR · COCINA" },
      ].map((r) => (
        <text key={r.t} x={px(r.x)} y={py(r.y)} fontSize={6.4} fontWeight={700} fill="#5b6376" textAnchor="middle" letterSpacing={0.4}>
          {r.t}
        </text>
      ))}

      {/* Overall dimensions. */}
      <g stroke="#1d2a44" strokeWidth={0.5} fill="#1d2a44" fontSize={6}>
        <line x1={px(0)} y1={py(H) + 18} x2={px(W)} y2={py(H) + 18} />
        <line x1={px(0)} y1={py(H) + 14} x2={px(0)} y2={py(H) + 22} />
        <line x1={px(W)} y1={py(H) + 14} x2={px(W)} y2={py(H) + 22} />
        <rect x={px(W / 2) - 10} y={py(H) + 14} width={20} height={8} fill="#fbfbf8" stroke="none" />
        <text x={px(W / 2)} y={py(H) + 20.2} textAnchor="middle" stroke="none">
          8.40
        </text>
        <line x1={px(W) + 14} y1={py(0)} x2={px(W) + 14} y2={py(H)} />
        <line x1={px(W) + 10} y1={py(0)} x2={px(W) + 18} y2={py(0)} />
        <line x1={px(W) + 10} y1={py(H)} x2={px(W) + 18} y2={py(H)} />
        <text x={px(W) + 20} y={py(H / 2)} stroke="none" transform={`rotate(90 ${px(W) + 20} ${py(H / 2)})`} textAnchor="middle">
          10.20
        </text>
      </g>

      {/* Title block. */}
      <g>
        <line x1={10} y1={372} x2={302} y2={372} stroke="#1d2a44" strokeWidth={0.8} />
        <line x1={150} y1={372} x2={150} y2={406} stroke="#1d2a44" strokeWidth={0.5} />
        <line x1={240} y1={372} x2={240} y2={406} stroke="#1d2a44" strokeWidth={0.5} />
        <text x={18} y={385} fontSize={8} fontWeight={700} fill="#1d2a44">
          {condo.toUpperCase()}
        </text>
        <text x={18} y={398} fontSize={6.4} fill="#5b6376">
          Vivienda {house} · Paneles de 60 cm
        </text>
        <text x={158} y={385} fontSize={5.6} fill="#5b6376">
          LEYENDA
        </text>
        <rect x={158} y={390} width={8} height={4} fill="#dfe8f6" stroke="#1d2a44" strokeWidth={0.5} />
        <text x={169} y={394} fontSize={5} fill="#5b6376">
          Muro / panel
        </text>
        <rect x={206} y={390} width={8} height={4} fill="none" stroke="#c0392b" strokeWidth={0.6} strokeDasharray="2 1.2" />
        <text x={217} y={394} fontSize={5} fill="#5b6376">
          Vano
        </text>
        <text x={158} y={402} fontSize={5} fill="#5b6376">
          ● Corbata
        </text>
        <text x={271} y={386} fontSize={5.6} fill="#5b6376" textAnchor="middle">
          LÁMINA
        </text>
        <text x={271} y={400} fontSize={12} fontWeight={700} fill="#1d2a44" textAnchor="middle">
          F-01
        </text>
      </g>
    </svg>
  );
}
