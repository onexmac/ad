// The sections fan (Pinterest's long-press): bubbles on an arc above the
// finger, chosen by sliding toward one.

export const RADIUS = 125;
export const BUBBLE = 46;

export type Fan = { ox: number; oy: number; w: number; pts: { x: number; y: number; a: number }[]; sel: number | null; sticky: boolean };

/** Lay the sections on an arc above the touch, leaning toward the middle of the screen, kept on screen. */
export function layout(ox: number, oy: number, n: number): Fan["pts"] {
  const w = window.innerWidth;
  const deg = Math.PI / 180;
  const span = Math.min(130, (n - 1) * 28) * deg;
  // Lean toward the middle of the screen, but keep the whole arc above the finger.
  const lean = Math.max(-1, Math.min(1, (w / 2 - ox) / (w / 2))) * 40 * deg;
  const lo = -160 * deg + span / 2;
  const hi = -20 * deg - span / 2;
  const mid = Math.max(lo, Math.min(hi, -Math.PI / 2 + lean));
  const pts = Array.from({ length: n }, (_, k) => {
    const a = n === 1 ? mid : mid - span / 2 + (k * span) / (n - 1);
    return { x: ox + RADIUS * Math.cos(a), y: oy + RADIUS * Math.sin(a), a };
  });
  const m = BUBBLE / 2 + 8;
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const dx = minX < m ? m - minX : maxX > w - m ? w - m - maxX : 0;
  return pts.map((p) => ({ ...p, x: p.x + dx }));
}

/** The section the finger points at: by direction from where the touch began, once it has moved off it. */
export function pick(f: Fan, x: number, y: number): number | null {
  const vx = x - f.ox;
  const vy = y - f.oy;
  if (Math.hypot(vx, vy) < 26) return null;
  let best: number | null = null;
  let bestD = Infinity;
  f.pts.forEach((p, i) => {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return bestD < RADIUS * 1.1 ? best : null;
}

