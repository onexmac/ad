/**
 * One image, one element. A picture is a single <img> (black and white by a CSS
 * filter on that same element). To lift it, open it or bring it home, the live
 * element itself is carried: out of its tile into a fixed flight box, into the
 * article's hero slot, and back. Nothing is cloned, nothing reloads, nothing
 * cross-fades, so a size change can never show two images.
 *
 * React keeps owning the element (it was rendered by the tile); only its parent
 * changes while it travels, and it always goes back to the same parent.
 */

import { animate } from "motion/react";
import { lerp, opacityOf, rectOf, viewport, type Rect } from "./flight";

let layer: HTMLDivElement | null = null;

function flightLayer() {
  if (layer && layer.isConnected) return layer;
  layer = document.createElement("div");
  layer.setAttribute("data-updatr-flights", "");
  Object.assign(layer.style, {
    position: "fixed",
    inset: "0",
    zIndex: "70",
    pointerEvents: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(layer);
  return layer;
}

/**
 * The layer leaves the page once its last flight lands: a full-screen fixed
 * element left behind would be picked up by iOS Safari, which tints its
 * toolbar from fixed elements at the screen edge.
 */
function retireLayer() {
  if (layer && layer.isConnected && !layer.childElementCount) {
    layer.remove();
    layer = null;
  }
}

type Spring = { type: "spring"; stiffness: number; damping: number; mass?: number; velocity?: number };

export type FlyOptions = {
  /** Opacity to arrive at (a tile inside a dimmed card lands dimmed). Default 1. */
  opacity?: number;
  /**
   * Where the picture may show, from start to end of the flight (null: the whole
   * screen). Lets it slide under a floating bar instead of over it.
   */
  clip?: { from: Rect | null; to: Rect | null };
};

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
});

export class Carrier {
  readonly piece: HTMLElement;
  readonly home: HTMLElement;
  rect: Rect;
  private box: HTMLDivElement | null = null;
  private dx = 0;
  private dy = 0;
  private rot = 0;
  private s = 1;
  private o = 1;
  private area: Rect | null = null;
  private run: { stop: () => void } | null = null;

  constructor(piece: HTMLElement, home: HTMLElement, from: Rect) {
    this.piece = piece;
    this.home = home;
    this.rect = from;
    this.lift(from);
  }

  /** How see-through the tile is where it sits (a peeking strip card, a rising block). */
  homeOpacity() {
    return this.home.isConnected ? opacityOf(this.home) : 1;
  }

  /** Put the piece in a flight box at this rect (from wherever it is now). */
  lift(at: Rect) {
    const fromHome = this.piece.parentElement === this.home;
    if (!this.box) {
      const box = document.createElement("div");
      Object.assign(box.style, {
        position: "absolute",
        left: "0",
        top: "0",
        overflow: "hidden",
        background: "var(--ink)",
        willChange: "transform, width, height",
        transformOrigin: "50% 50%",
        containerType: "inline-size",
      } satisfies Partial<CSSStyleDeclaration>);
      flightLayer().appendChild(box);
      this.box = box;
    }
    // Keep the look it had where it was: a dimmed tile starts dimmed.
    this.o = fromHome ? this.homeOpacity() : 1;
    this.box.appendChild(this.piece);
    this.dx = 0;
    this.dy = 0;
    this.rot = 0;
    this.s = 1;
    this.area = null;
    this.place(at);
  }

  get flying() {
    return !!this.box;
  }

  /** The flight box, while there is one (a locked picture puts its keys in it). */
  get el(): HTMLElement | null {
    return this.box;
  }

  /** Where the picture may show right now (null: anywhere), outside a flight. */
  clipTo(area: Rect | null) {
    this.area = area;
    this.paint();
  }

  place(r: Rect) {
    this.rect = r;
    this.paint();
  }

  /** Extra offset, tilt (degrees) and scale from a finger, on top of the rect. */
  nudge(dy: number, scale: number, dx = 0, rot = 0) {
    this.dx = dx;
    this.dy = dy;
    this.rot = rot;
    this.s = scale;
    this.paint();
  }

  /** Fold the finger nudge into the rect (before a handoff). */
  bake() {
    if (!this.box) return this.rect;
    const prev = this.box.style.clipPath;
    this.box.style.clipPath = "";
    this.place(rectOf(this.box));
    this.box.style.clipPath = prev;
    this.dx = 0;
    this.dy = 0;
    this.rot = 0;
    this.s = 1;
    this.paint();
    return this.rect;
  }

  shadow(on: boolean) {
    if (this.box) this.box.style.boxShadow = on ? "0 30px 80px -20px rgba(11,11,11,0.45)" : "none";
  }

  private paint() {
    const b = this.box;
    if (!b) return;
    const r = this.rect;
    b.style.width = `${Math.max(1, r.w)}px`;
    b.style.height = `${Math.max(1, r.h)}px`;
    b.style.transform = `translate3d(${r.x + this.dx}px, ${r.y + this.dy}px, 0)${this.rot ? ` rotate(${this.rot}deg)` : ""} scale(${this.s})`;
    b.style.opacity = this.o >= 0.999 ? "" : String(this.o);
    const a = this.area;
    if (!a) {
      b.style.clipPath = "";
      return;
    }
    const x = r.x + this.dx;
    const y = r.y + this.dy;
    const top = Math.max(0, a.y - y);
    const left = Math.max(0, a.x - x);
    const right = Math.max(0, x + r.w - (a.x + a.w));
    const bottom = Math.max(0, y + r.h - (a.y + a.h));
    b.style.clipPath =
      top || left || right || bottom ? `inset(${top}px ${right}px ${bottom}px ${left}px)` : "";
  }

  /**
   * Spring the box to a rect. The target may be a function, read every frame,
   * so a tile that moves (the page scrolled, a strip settled) is still hit.
   * The spring starts on the next frame: a flight usually begins in the same
   * moment as a heavy render (an article mounting, the blurred peek), and
   * starting its clock then would make the first visible frame skip ahead.
   */
  fly(to: Rect | (() => Rect), spring: Spring, onDone?: () => void, opts: FlyOptions = {}) {
    this.run?.stop();
    let ctl: { stop: () => void } | null = null;
    let cancelled = false;
    const handle = {
      stop: () => {
        cancelled = true;
        cancelAnimationFrame(raf);
        ctl?.stop();
      },
    };
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      const from = { ...this.rect };
      const o0 = this.o;
      const o1 = opts.opacity ?? 1;
      const target = typeof to === "function" ? to : () => to;
      const clip = opts.clip;
      ctl = animate(0, 1, {
        ...spring,
        onUpdate: (t) => {
          const end = target();
          this.o = lerp(o0, o1, clamp01(t));
          if (clip) {
            const k = clamp01(t);
            this.area = lerpRect(clip.from ?? viewport(), clip.to ?? viewport(), k);
          }
          this.place({
            x: lerp(from.x, end.x, t),
            y: lerp(from.y, end.y, t),
            w: Math.max(1, lerp(from.w, end.w, t)),
            h: Math.max(1, lerp(from.h, end.h, t)),
          });
        },
        onComplete: () => {
          if (this.run === handle) this.run = null;
          onDone?.();
        },
      });
    });
    this.run = handle;
    return handle;
  }

  stop() {
    this.run?.stop();
    this.run = null;
  }

  /** Drop the piece into a host element (the hero slot) and retire the box. */
  land(into: HTMLElement) {
    this.stop();
    into.appendChild(this.piece);
    this.box?.remove();
    this.box = null;
    retireLayer();
  }

  /** Back into its tile. If the tile is gone, the piece is discarded with it. */
  goHome() {
    this.stop();
    if (this.home.isConnected) this.home.appendChild(this.piece);
    else this.piece.remove();
    this.box?.remove();
    this.box = null;
    retireLayer();
  }

  get atHome() {
    return this.piece.parentElement === this.home;
  }
}

/** The slot (piece holder) inside a tile button. */
export function slotOf(button: HTMLElement | null): HTMLElement | null {
  return button?.querySelector<HTMLElement>("[data-slot]") ?? null;
}
