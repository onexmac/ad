"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { animate, motion, motionValue, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import { springs } from "@/lib/histok/springs";
import type { Edition } from "@/data/noticss/types";
import { dayMonth } from "@/lib/noticss/format";
import { Arrow } from "@/components/updatr/Arrow";
import { AbSwitch } from "./AbSwitch";
import { Cover } from "./b/Cover";
import { Gallery } from "./b/Gallery";
import { TopFill } from "./b/TopFill";
import { darken, hexToRgb, topTone } from "@/lib/noticss/tone";
import { Page, titleOf } from "./b/Pages";
import {
  BOTTOM,
  COLLAPSE,
  END_COMMIT,
  END_LIFT_MAX,
  EXPAND,
  G,
  PAD,
  PAGE,
  POP,
  RU,
  S,
  SECTION,
  SETTLE,
  TRAY,
  Tray,
  clamp,
  endLiftOf,
  mediaOf,
  rubber,
  sectionsOf,
  type Media,
  type SectionDef,
} from "./b/model";

/*
 * Version B: the Paper / Push Pop Press grammar. Each section is a whole
 * screen: a full-bleed cover above, a tray of cards below. A card is not a
 * thumbnail of its page, it IS the page, drawn at full size and scaled down
 * (one transform on the row). Lift a card and it grows from under the finger,
 * its neighbours riding along beside it, until it is the screen; the cover
 * behind sinks to near black. Sideways is the next page; down from the top
 * puts it back; on past the end of a page, the next one rises from below.
 * The row's order never changes: a page that arrives from somewhere else
 * (from below, from a row of notes) is a visual override on top of a jump the
 * row has already made underneath, released once it is covered.
 */

type Open = { sec: number; card: number };
type GalleryState = { sec: number; items: Media[]; start: number; piece: HTMLElement; home: HTMLElement };

const HOLD_MS = 260;

export function PaperB({ editions }: { editions: Edition[] }) {
  const [edIndex, setEdIndex] = useState(0);
  const ed = editions[edIndex];
  const sections = useMemo(() => sectionsOf(ed), [ed]);
  const [sec, setSec] = useState(0);
  const secRef = useRef(0);
  const secX = useMemo(() => motionValue(0), []);
  const trays = useMemo(() => sections.map(() => new Tray()), [sections]);
  const [open, setOpenState] = useState<Open | null>(null);
  const openRef = useRef<Open | null>(null);
  const setOpen = (o: Open | null) => {
    openRef.current = o;
    setOpenState(o);
  };
  const [gallery, setGallery] = useState<GalleryState | null>(null);
  const galleryRef = useRef(false);
  /** Pages that must stay fully drawn while an override carries them. */
  const [keep, setKeep] = useState<number[]>([]);
  /** Pushing on past the end of a page: the lift (px) and whether it would commit. */
  const endLift = useMemo(() => motionValue(0), []);
  const [endArmed, setEndArmed] = useState(false);
  const [endNext, setEndNext] = useState<string | null>(null);

  const col = useRef<HTMLDivElement>(null);
  const Wm = useMemo(() => motionValue(390), []);
  const Hm = useMemo(() => motionValue(844), []);
  /** The tray's bottom inset: its margin plus the home indicator's safe area. */
  const Bm = useMemo(() => motionValue(BOTTOM), []);
  const probe = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 390, h: 844 });
  useLayoutEffect(() => {
    const el = col.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const sab = probe.current ? parseFloat(getComputedStyle(probe.current).paddingBottom) || 0 : 0;
      Bm.set(BOTTOM + sab);
      Wm.set(w);
      Hm.set(h);
      setDims({ w, h });
      secX.set(-secRef.current * w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [Wm, Hm, Bm, secX]);

  // A full-screen surface: the document behind must not scroll or bounce.
  useEffect(() => {
    const html = document.documentElement;
    const prev = [html.style.overflow, document.body.style.overflow];
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev[0];
      document.body.style.overflow = prev[1];
    };
  }, []);

  /* ---------- geometry helpers ---------- */

  const W = () => Wm.get();
  const H = () => Hm.get();
  const visible = () => (W() - PAD + G * S) / ((W() + G) * S);
  const maxPos = (n: number) => Math.max(0, n - visible());
  const trayTop = () => H() - H() * S - Bm.get();
  const pageEl = (s: number, c: number) => col.current?.querySelector<HTMLElement>(`[data-page="${s}-${c}"]`) ?? null;
  const toTop = (s: number, c: number) => {
    const el = pageEl(s, c);
    if (el) el.scrollTop = 0;
  };

  /* ---------- actions ---------- */

  const goSection = (i: number, v = 0) => {
    const to = clamp(i, 0, sections.length - 1);
    if (to !== secRef.current) haptic.select();
    secRef.current = to;
    setSec(to);
    trays[to].run(secX, -to * W(), { ...SECTION, velocity: v });
  };

  /** Grow card j into the page (fx: which point of the card the growth comes from). */
  const expand = (j: number, vp = 0, fx = 0.5) => {
    const s = secRef.current;
    const t = trays[s];
    if (t.p.get() < 0.02 && !openRef.current) {
      t.cur.set(j);
      t.fx.set(fx);
    }
    setOpen({ sec: s, card: j });
    haptic.complete();
    t.run(t.p, 1, { ...EXPAND, velocity: vp });
    t.run(t.ox, 0, EXPAND);
  };

  /** Before a page shrinks: choose where it lands on the tray (in view), from its centre. */
  const prepareCollapse = (s: number, fx = 0.5) => {
    const t = trays[s];
    const n = sections[s].cards.length;
    const j = Math.round(t.cur.get());
    t.cur.set(j);
    const pc = t.posC.get();
    const vis = Math.floor(visible());
    if (j < pc) t.posC.set(j);
    else if (j > pc + vis - 1) t.posC.set(Math.min(maxPos(n), Math.max(0, j - vis + 1)));
    t.fx.set(fx);
    return j;
  };

  const collapse = (vp = 0) => {
    const o = openRef.current;
    if (!o) return;
    const t = trays[o.sec];
    const j = prepareCollapse(o.sec);
    setOpen(null);
    haptic.select();
    t.run(t.ox, 0, COLLAPSE);
    t.run(t.p, 0, { ...COLLAPSE, velocity: vp }, () => toTop(o.sec, j));
  };

  const pageTo = (j: number, v = 0) => {
    const o = openRef.current;
    if (!o) return;
    const n = sections[o.sec].cards.length;
    const to = clamp(j, 0, n - 1);
    if (to !== o.card) haptic.select();
    const from = o.card;
    setOpen({ sec: o.sec, card: to });
    const t = trays[o.sec];
    t.run(t.cur, to, { ...PAGE, velocity: v }, () => {
      if (from !== to) toTop(o.sec, from);
    });
  };

  /**
   * A note picked from a page's list pops out of its row into the page,
   * while the row jumps to it underneath (the page we left stays put under
   * an override, receding, until it is covered).
   */
  const presentFrom = (noteId: string, from: DOMRect) => {
    const o = openRef.current;
    if (!o) return;
    const s = o.sec;
    const t = trays[s];
    const j = sections[s].cards.findIndex((c) => c.type === "note" && c.note.id === noteId);
    const i = o.card;
    if (j < 0 || j === i) return;
    const box = col.current!.getBoundingClientRect();
    const w = W();
    const h = H();
    const k0 = from.width / w;
    const tr = t.begin(() => {
      t.resetOverride(i);
      t.resetOverride(j);
      setKeep([]);
      toTop(s, i);
    });
    const oi = t.override(i);
    const oj = t.override(j);
    setKeep([i, j]);
    haptic.complete();
    toTop(s, j);
    // The jump underneath, with both pages held where they look to be.
    t.cur.stop();
    t.cur.jump(j);
    oi.x.jump((j - i) * (w + G));
    oi.z.jump(1);
    oj.x.jump(from.left - box.left);
    oj.y.jump(from.top - box.top);
    oj.s.jump(k0);
    oj.clip.jump(Math.max(0, h - from.height / k0));
    oj.z.jump(5);
    setOpen({ sec: s, card: j });
    // The springs start on the next frame: this one mounts the page.
    requestAnimationFrame(() => {
      if (!t.isPending(tr)) return;
      let left = 8;
      const done = () => {
        if (!--left) t.complete(tr);
      };
      tr.anims.push(
        t.run(oj.x, 0, POP, done),
        t.run(oj.y, 0, POP, done),
        t.run(oj.s, 1, POP, done),
        t.run(oj.clip, 0, POP, done),
        // The page we leave recedes a little, from its centre.
        t.run(oi.s, 0.94, POP, done),
        t.run(oi.o, 0.45, POP, done),
        t.run(oi.x, (j - i) * (w + G) + w * 0.03, POP, done),
        t.run(oi.y, h * 0.03, POP, done),
      );
    });
  };

  /** The end pull committed: the next page rises from below; the row is already there. */
  const commitNext = (v: number) => {
    const o = openRef.current;
    if (!o) return;
    const s = o.sec;
    const t = trays[s];
    const i = o.card;
    const j = i + 1;
    const w = W();
    const h = H();
    const tr = t.begin(() => {
      t.resetOverride(i);
      t.resetOverride(j);
      setKeep([]);
      toTop(s, i);
    });
    const oi = t.override(i);
    const oj = t.override(j);
    haptic.complete();
    t.cur.stop();
    t.cur.jump(j);
    oj.x.jump(0);
    oi.x.jump(w + G);
    setOpen({ sec: s, card: j });
    let left = 2;
    const done = () => {
      if (!--left) t.complete(tr);
    };
    tr.anims.push(t.run(oj.y, 0, { ...PAGE, velocity: v }, done));
    // The page we leave becomes the background: it sinks back from its centre
    // and fades all the way out, a little slower than the new one rises, so
    // nothing is left to vanish when it is put back in its place.
    const y0 = oi.y.get();
    const o0 = oi.o.get();
    const q = motionValue(0);
    t.hold();
    let held = true;
    const letGo = () => {
      if (!held) return;
      held = false;
      t.release();
    };
    tr.anims.push(
      animate(q, 1, {
        duration: 0.62,
        ease: [0.33, 0, 0.2, 1],
        onUpdate: (k) => {
          const sc = 1 - 0.08 * k;
          oi.s.set(sc);
          oi.x.set(w + G + (w * (1 - sc)) / 2);
          oi.y.set(y0 + (-h * 0.06 - y0) * k + (h * (1 - sc)) / 2);
          oi.o.set(o0 * Math.pow(1 - k, 1.35));
        },
        onStop: letGo,
        onComplete: () => {
          letGo();
          done();
        },
      }),
    );
    t.run(endLift, 0, SETTLE);
  };

  const cancelNext = () => {
    const o = openRef.current;
    if (!o) return;
    const t = trays[o.sec];
    const i = o.card;
    const hasNext = !!sections[o.sec].cards[i + 1];
    const tr = t.begin(() => {
      t.resetOverride(i);
      if (hasNext) t.resetOverride(i + 1);
      setKeep([]);
    });
    const oi = t.override(i);
    let left = hasNext ? 3 : 2;
    const done = () => {
      if (!--left) t.complete(tr);
    };
    tr.anims.push(t.run(oi.y, 0, SETTLE, done), t.run(oi.o, 1, SETTLE, done));
    if (hasNext) tr.anims.push(t.run(t.override(i + 1).y, H(), SETTLE, done));
    t.run(endLift, 0, SETTLE);
  };

  /** The page's picture lifts into the gallery of the section's media. */
  const openGallery = (media: HTMLElement) => {
    const o = openRef.current;
    const piece = media.querySelector("img");
    if (!o || !piece || galleryRef.current) return;
    const items = mediaOf(sections[o.sec]);
    const start = items.findIndex((m) => m.card === o.card);
    if (start < 0) return;
    galleryRef.current = true;
    haptic.complete();
    setGallery({ sec: o.sec, items, start, piece, home: media });
  };

  /* ---------- the one gesture surface ---------- */

  useEffect(() => {
    const el = col.current;
    if (!el) return;
    type Zone = "cover" | "tray" | "page";
    type Mode = "none" | "x" | "y" | "native" | "held" | "end" | "collapse";
    let g: {
      zone: Zone;
      mode: Mode;
      x0: number;
      y0: number;
      t0: number;
      card: number;
      base: number;
      fx: number;
      fy: number;
      atTop: boolean;
      atEnd: boolean;
      /** p and the drift where the finger caught them (a card caught mid-flight). */
      pBase: number;
      oxBase: number;
      /** Caught while opening: whatever this gesture does, the page finishes opening. */
      resume: boolean;
      /** The touch landed on something moving: it only stops it, it opens nothing. */
      stopped: boolean;
      /** This gesture holds the row as its own layer (released at the end). */
      layer: boolean;
      media: HTMLElement | null;
      hold: number;
      armed: boolean;
      samples: { x: number; y: number; t: number }[];
      last: { x: number; y: number; t: number };
      id: number | "mouse";
    } | null = null;
    /** A finger that held a picture up: its touches no longer pass through the column. */
    let heldFinger: number | null = null;
    /** When the open page last scrolled (a touch that stops momentum is not a tap). */
    let lastScroll = 0;

    const cardAt = (x: number) => {
      const t = trays[secRef.current];
      const step = (W() + G) * S;
      const j = Math.floor(t.posC.get() + (x - PAD) / step);
      return clamp(j, 0, sections[secRef.current].cards.length - 1);
    };
    const local = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      return { x: cx - r.left, y: cy - r.top };
    };
    /** Finger travel that takes a card from the tray to the page, keeping the grabbed point under the finger. */
    const travel = (fy: number) => Math.max(170, (1 - fy) * H() * (1 - S) - Bm.get());
    /** Release velocity over the last ~100 ms of the finger (px/s), zero if it rested. */
    const velocity = (gg: NonNullable<typeof g>) => {
      const now = performance.now();
      const sm = gg.samples.filter((p) => now - p.t < 100);
      if (sm.length < 2 || now - sm[sm.length - 1].t > 80) return { vx: 0, vy: 0 };
      const a = sm[0];
      const b = sm[sm.length - 1];
      const dt = Math.max(16, b.t - a.t) / 1000;
      return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt };
    };

    /**
     * Put back whatever the touch stopped and this gesture will not drive:
     * the section between two, the tray between cards, a page between pages
     * or half open. Branches that animate afterwards replace these.
     */
    const settleRest = (gg: NonNullable<typeof g>) => {
      const s = secRef.current;
      const t = trays[s];
      const n = sections[s].cards.length;
      const w = W();
      if (!(gg.zone === "cover" && gg.mode === "x") && Math.abs(secX.get() + s * w) > 0.5) goSection(s);
      const o = openRef.current;
      if (o) {
        if (gg.mode !== "collapse" && t.p.get() < 0.999) t.run(t.p, 1, EXPAND);
        if (gg.mode !== "x" && Math.abs(t.cur.get() - o.card) > 0.001) t.run(t.cur, o.card, PAGE);
        if (gg.mode !== "collapse" && Math.abs(t.ox.get()) > 0.5) t.run(t.ox, 0, EXPAND);
      } else {
        if (!(gg.zone === "tray" && gg.mode === "x")) {
          const rest = clamp(Math.round(t.posC.get()), 0, maxPos(n));
          if (Math.abs(t.posC.get() - rest) > 0.001) t.run(t.posC, rest, TRAY);
        }
        if (!(gg.zone === "tray" && gg.mode === "y") && t.p.get() > 0.001) t.run(t.p, 0, COLLAPSE);
        if (!(gg.zone === "tray" && gg.mode === "y") && Math.abs(t.ox.get()) > 0.5) t.run(t.ox, 0, COLLAPSE);
      }
    };

    const start = (cx: number, cy: number, id: number | "mouse", target: EventTarget | null) => {
      if (galleryRef.current) return;
      const { x, y } = local(cx, cy);
      const o = openRef.current;
      const s = secRef.current;
      const t = trays[s];
      const w = W();
      // Was anything moving? Then this touch only stops it (iOS): it opens nothing.
      const sc0 = o ? pageEl(s, o.card) : null;
      const stopped =
        Math.abs(secX.getVelocity()) > 40 ||
        Math.abs(t.posC.getVelocity()) * (w + G) * S > 40 ||
        Math.abs(t.cur.getVelocity()) * (w + G) > 40 ||
        Math.abs(t.p.getVelocity()) > 0.3 ||
        (!!sc0 && performance.now() - lastScroll < 120);
      const sliding = !o && Math.abs(secX.get() + s * w) > 0.5;
      // A page arriving from elsewhere is finished at once; whatever moves stops
      // where it is, and the finger takes it from there.
      t.settle();
      t.stopAll();
      secX.stop();
      // A card caught on its way back to the tray belongs to the tray gesture;
      // a section caught sliding belongs to the cover.
      const caught = !o && !sliding && t.p.get() > 0.02;
      const zone: Zone = o ? "page" : sliding ? "cover" : caught || y >= trayTop() - 6 ? "tray" : "cover";
      const step = (w + G) * S;
      const card = caught ? Math.round(t.cur.get()) : zone === "tray" ? cardAt(x) : o?.card ?? Math.round(t.cur.get());
      const left0 = PAD + (card - t.posC.get()) * step;
      const sc = sc0;
      const tgt = target as HTMLElement | null;
      const media = o && sc && tgt ? (tgt.closest("[data-media]") as HTMLElement | null) : null;
      const now = performance.now();
      g = {
        zone,
        mode: "none",
        x0: x,
        y0: y,
        t0: now,
        card,
        base: zone === "cover" ? secX.get() : zone === "tray" ? t.posC.get() : t.cur.get(),
        fx: caught ? t.fx.get() : zone === "tray" ? clamp((x - left0) / (w * S), 0, 1) : clamp(x / w, 0, 1),
        fy: zone === "tray" ? clamp((y - trayTop()) / (H() * S), 0, 1) : clamp(y / H(), 0, 1),
        atTop: !sc || sc.scrollTop <= 0,
        atEnd: !sc || sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2,
        pBase: caught ? t.p.get() : o ? t.p.get() : 0,
        oxBase: t.ox.get(),
        resume: !!o && t.p.get() < 0.999,
        stopped,
        layer: false,
        media: media && sc!.contains(media) && !stopped ? media : null,
        hold: 0,
        armed: false,
        samples: [{ x, y, t: now }],
        last: { x, y, t: now },
        id,
      };
      if (g.media) {
        const gg = g;
        gg.hold = window.setTimeout(() => {
          if (g !== gg || gg.mode !== "none") return;
          // The gesture ends here: the picture leaves the column, and so do
          // this finger's touches. Put back what it stopped, then lift.
          g = null;
          gg.mode = "held";
          settleRest(gg);
          if (gg.id !== "mouse") heldFinger = gg.id;
          openGallery(gg.media!);
        }, HOLD_MS);
      }
    };

    /** True when the move is ours (the caller then blocks the native scroll). */
    const move = (cx: number, cy: number, cancelable = true): boolean => {
      if (!g) return false;
      const { x, y } = local(cx, cy);
      const now = performance.now();
      g.samples.push({ x, y, t: now });
      if (g.samples.length > 12) g.samples.shift();
      g.last = { x, y, t: now };
      const dx = x - g.x0;
      const dy = y - g.y0;
      if (g.mode === "native") return false;
      if (g.mode === "held") return true;
      const s = secRef.current;
      const t = trays[s];
      const n = sections[s].cards.length;
      if (g.mode === "none") {
        if (Math.hypot(dx, dy) < 8) {
          if (g.zone !== "page") return true;
          // Inside the slop on a page: hold iOS off whatever may become ours
          // (sideways, a pull at the top, a push at the end); let a scroll start.
          return Math.abs(dx) > Math.abs(dy) || (dy > 0 && g.atTop) || (dy < 0 && g.atEnd);
        }
        clearTimeout(g.hold);
        // iOS already owns this touch: give it back before changing anything.
        if (!cancelable) {
          g.mode = "native";
          return false;
        }
        if (Math.abs(dx) > Math.abs(dy) && !(g.zone === "tray" && g.pBase > 0)) g.mode = "x";
        else if (g.zone === "page") {
          if (dy > 0 && g.atTop) {
            g.mode = "collapse";
            prepareCollapse(s, g.fx);
            haptic.drag();
          } else if (dy < 0 && g.atEnd) {
            g.mode = "end";
            const next = sections[s].cards[g.card + 1];
            setEndNext(next ? titleOf(next) : null);
            setKeep([g.card, g.card + 1]);
            if (next) {
              const oj = t.override(g.card + 1);
              oj.x.set(-(W() + G));
              oj.y.set(H());
              oj.z.set(5);
            }
          } else {
            g.mode = "native";
            return false;
          }
        } else {
          g.mode = "y";
          if (g.zone === "tray") {
            t.cur.set(g.card);
            t.fx.set(g.fx);
            haptic.drag();
          }
        }
        // Moving the row without scaling it: it may be its own layer meanwhile.
        if (g.mode === "x" || g.mode === "end") {
          t.hold();
          g.layer = true;
        }
      }
      const w = W();
      const h = H();
      if (g.zone === "cover") {
        if (g.mode !== "x") return true;
        let v = g.base + dx;
        const min = -(sections.length - 1) * w;
        if (v > 0) v = rubber(v, w);
        else if (v < min) v = min + rubber(v - min, w);
        secX.set(v);
        return true;
      }
      if (g.zone === "tray") {
        if (g.mode === "x") {
          const step = (w + G) * S;
          let v = g.base - dx / step;
          const mx = maxPos(n);
          if (v < 0) v = -rubber(-v * step, w) / step;
          else if (v > mx) v = mx + rubber((v - mx) * step, w) / step;
          t.posC.set(v);
        } else {
          // The grabbed point stays under the finger; the card follows it sideways too.
          const d = travel(g.fy);
          const p = g.pBase - dy / d;
          t.p.set(p < 0 ? -rubber(-p * d, h) / d : Math.min(1.03, p));
          t.ox.set(g.oxBase + dx);
        }
        return true;
      }
      // page
      if (g.mode === "x") {
        let v = g.base - dx / (w + G);
        if (v < 0) v = -rubber(-v * w, w) / w;
        else if (v > n - 1) v = n - 1 + rubber((v - (n - 1)) * w, w) / w;
        t.cur.set(v);
        return true;
      }
      if (g.mode === "collapse") {
        const d = travel(g.fy);
        t.p.set(clamp(g.pBase - dy / d, -0.02, 1));
        t.ox.set(g.oxBase + dx);
        return true;
      }
      if (g.mode === "end") {
        const raw = -dy;
        const lift = endLiftOf(raw);
        endLift.set(lift);
        const oi = t.override(g.card);
        oi.y.set(-lift * 0.4);
        oi.o.set(1 - (0.25 * lift) / END_LIFT_MAX);
        if (sections[s].cards[g.card + 1]) t.override(g.card + 1).y.set(h - lift);
        const armed = raw >= END_COMMIT && !!sections[s].cards[g.card + 1];
        if (armed !== g.armed) {
          g.armed = armed;
          setEndArmed(armed);
          if (armed) haptic.select();
        }
        return true;
      }
      return true;
    };

    const end = (cancelled = false) => {
      if (!g) return;
      const gg = g;
      g = null;
      clearTimeout(gg.hold);
      const { vx, vy } = velocity(gg);
      const w = W();
      const s = secRef.current;
      const t = trays[s];
      const n = sections[s].cards.length;
      const dist = Math.hypot(gg.last.x - gg.x0, gg.last.y - gg.y0);
      const quick = performance.now() - gg.t0 < 420;
      if (gg.layer) t.release();
      // First, everything this gesture stopped and will not drive goes back to rest.
      settleRest(gg);
      if (gg.mode === "native" || gg.mode === "held") return;

      if (gg.mode === "none") {
        const tap = !cancelled && !gg.stopped && dist < 10 && quick;
        if (tap && gg.zone === "tray") return expand(gg.card, 0, gg.fx);
        if (tap && gg.zone === "cover") return expand(clamp(Math.round(t.posC.get()), 0, n - 1));
        if (tap && gg.media) return openGallery(gg.media);
        return;
      }

      if (gg.zone === "cover") {
        if (gg.mode !== "x") return;
        const dx = gg.last.x - gg.x0;
        let to = secRef.current;
        if (!cancelled && (dx < -w * 0.2 || vx < -350)) to += 1;
        else if (!cancelled && (dx > w * 0.2 || vx > 350)) to -= 1;
        return goSection(to, vx);
      }

      if (gg.zone === "tray") {
        if (gg.mode === "x") {
          // Momentum carries the tray (iOS's deceleration), then it lands on a card.
          const step = (w + G) * S;
          const projected = t.posC.get() - (vx * 0.32) / step;
          const to = clamp(Math.round(projected), 0, maxPos(n));
          if (Math.round(to) !== Math.round(gg.base)) haptic.select();
          t.run(t.posC, to, { ...TRAY, velocity: -vx / step });
          return;
        }
        const vp = -vy / travel(gg.fy);
        if (!cancelled && (t.p.get() > 0.28 || vy < -380) && vy < 300) return expand(gg.card, vp, gg.fx);
        t.run(t.ox, 0, COLLAPSE);
        t.run(t.p, 0, { ...COLLAPSE, velocity: vp });
        return;
      }

      // page
      const o = openRef.current;
      if (gg.mode === "x" && o) {
        const dx = gg.last.x - gg.x0;
        let to = o.card;
        if (!cancelled && (dx < -w * 0.18 || vx < -320)) to += 1;
        else if (!cancelled && (dx > w * 0.18 || vx > 320)) to -= 1;
        return pageTo(to, -vx / (w + G));
      }
      if (gg.mode === "collapse") {
        const vp = -vy / travel(gg.fy);
        if (!cancelled && (t.p.get() < 0.8 || vy > 380) && vy > -300) return collapse(vp);
        t.run(t.ox, 0, EXPAND);
        t.run(t.p, 1, { ...EXPAND, velocity: vp });
        return;
      }
      if (gg.mode === "end") {
        setEndArmed(false);
        if (!cancelled && gg.armed) commitNext(vy);
        else cancelNext();
      }
    };

    // Touch: one finger drives; a second settles. preventDefault on the first
    // move that is ours, before iOS commits to its own scroll.
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) return end(true);
      const t = e.touches[0];
      start(t.clientX, t.clientY, t.identifier, e.target);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!g || g.id === "mouse") return;
      const t = [...e.changedTouches].find((c) => c.identifier === g!.id);
      if (!t) return;
      if (move(t.clientX, t.clientY, e.cancelable) && e.cancelable) e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!g || g.id === "mouse") return;
      if ([...e.changedTouches].some((c) => c.identifier === g!.id)) end(false);
    };
    const onTouchCancel = () => end(true);
    const onScroll = () => {
      lastScroll = performance.now();
    };

    // Mouse, for desktop.
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      if ((e.target as HTMLElement).closest("a,button")) return;
      start(e.clientX, e.clientY, "mouse", e.target);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!g || g.id !== "mouse") return;
      if (move(e.clientX, e.clientY)) e.preventDefault();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!g || g.id !== "mouse" || e.pointerType !== "mouse") return;
      end(false);
    };

    // Document level: the left edge is ours, not Safari's history swipe (B is
    // sideways edge to edge); and a finger that held a picture up must not
    // scroll the page underneath while the gallery takes over.
    const docStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || t.clientX > 30 || !e.cancelable) return;
      if ((e.target as HTMLElement | null)?.closest("a,button")) return;
      e.preventDefault();
    };
    const docMove = (e: TouchEvent) => {
      if (heldFinger === null) return;
      if ([...e.changedTouches].some((c) => c.identifier === heldFinger) && e.cancelable) e.preventDefault();
    };
    const docEnd = (e: TouchEvent) => {
      if (heldFinger !== null && [...e.changedTouches].some((c) => c.identifier === heldFinger)) heldFinger = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchCancel);
    el.addEventListener("scroll", onScroll, { capture: true, passive: true });
    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    document.addEventListener("touchstart", docStart, { capture: true, passive: false });
    document.addEventListener("touchmove", docMove, { capture: true, passive: false });
    document.addEventListener("touchend", docEnd, true);
    document.addEventListener("touchcancel", docEnd, true);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
      el.removeEventListener("scroll", onScroll, true);
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("touchstart", docStart, true);
      document.removeEventListener("touchmove", docMove, true);
      document.removeEventListener("touchend", docEnd, true);
      document.removeEventListener("touchcancel", docEnd, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, trays]);

  // Keys: arrows step, Enter opens, Escape puts the card back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (galleryRef.current) return;
      const o = openRef.current;
      const s = secRef.current;
      const t = trays[s];
      const n = sections[s].cards.length;
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (e.key === "Escape" && o) collapse();
      else if (step && o) pageTo(o.card + step);
      else if (step && e.shiftKey) goSection(s + step);
      else if (step) t.run(t.posC, clamp(Math.round(t.posC.get()) + step, 0, maxPos(n)), TRAY);
      else if (e.key === "Enter" && !o) expand(Math.round(t.posC.get()));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, trays]);

  const onPick = useCallback((noteId: string, from: DOMRect) => presentFrom(noteId, from), // eslint-disable-next-line react-hooks/exhaustive-deps
  [sections, trays]);

  // A story opened: its notes' photos are fetched and decoded now, so a note
  // popped from its list arrives with its picture.
  const warmed = useRef(new Map<string, HTMLImageElement>());
  useEffect(() => {
    if (!open) return;
    const c = sections[open.sec]?.cards[open.card];
    if (!c || c.type !== "subject") return;
    for (const n of c.subject.notes) {
      const src = n.image?.src;
      if (!src || warmed.current.has(src)) continue;
      const im = new Image();
      im.src = src;
      im.decode().catch(() => {});
      warmed.current.set(src, im);
    }
  }, [open, sections]);

  /*
   * The colour at the top of what is showing, for the status bar: the top of
   * the open page's photo (or its paper once scrolled past it), the cover's
   * sky or photo under its dark gradient on the tray, black in the gallery.
   * Safari's own chrome and the overscroll take it too.
   */
  const [tone, setTone] = useState("rgb(20, 17, 14)");
  useEffect(() => {
    const GROUND = hexToRgb("#f1ece2");
    const PAPER = hexToRgb("#f8f5ee");
    const read = () => {
      if (gallery) return "rgb(0, 0, 0)";
      const o = openRef.current;
      const c = col.current;
      if (!c) return null;
      if (o) {
        const card = sections[o.sec]?.cards[o.card];
        const sc = pageEl(o.sec, o.card);
        if (!card || !sc) return null;
        if (card.type === "figures") return PAPER;
        const media = sc.querySelector<HTMLElement>("[data-media]");
        const frame = media?.parentElement;
        if (media && frame && sc.scrollTop < frame.clientHeight * 0.7) return topTone(media.querySelector("img"));
        if (!media && card.type === "note" && sc.scrollTop < H() * 0.3) return PAPER;
        return GROUND;
      }
      const sd = sections[secRef.current];
      if (sd?.kind === "hoy") return hexToRgb(ed.weather?.sky?.[0] ?? "#6f6a62");
      const img = c.querySelector<HTMLImageElement>(`[data-cover="${secRef.current}"] img`);
      const t = topTone(img);
      return t ? darken(t, 0.55) : null;
    };
    let raf = 0;
    const apply = () => {
      raf = 0;
      const t = read();
      if (t) setTone((p) => (p === t ? p : t));
    };
    const soon = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    // Pictures may still be arriving: look again once they have.
    const later = window.setTimeout(apply, 450);
    const el = col.current;
    el?.addEventListener("scroll", soon, { capture: true, passive: true });
    el?.addEventListener("load", soon, true);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(later);
      el?.removeEventListener("scroll", soon, true);
      el?.removeEventListener("load", soon, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sec, open, gallery, sections, ed]);
  useEffect(() => {
    const html = document.documentElement;
    html.style.backgroundColor = tone;
    document.body.style.backgroundColor = tone;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = tone;
  }, [tone]);
  useEffect(
    () => () => {
      document.documentElement.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
    },
    [],
  );

  const near = (i: number) => Math.abs(i - sec) <= 1;
  const openCard = open ? sections[open.sec].cards[open.card] : null;
  const endY = useTransform(() => Hm.get() - endLift.get() - 44);
  const endO = useTransform(endLift, [0, 40, END_LIFT_MAX], [0, 0.6, 1]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink" data-app>
      <div ref={probe} aria-hidden className="pointer-events-none invisible fixed bottom-0 left-0 h-0 w-0 pb-[env(safe-area-inset-bottom)]" />
      <div ref={col} className="relative mx-auto h-full w-full max-w-[520px] overflow-hidden" style={{ touchAction: open ? "pan-y" : "none" }}>
        {sections.map((s, i) =>
          near(i) ? (
            <SectionScreen
              key={`${ed.date}-${s.id}`}
              section={s}
              index={i}
              count={sections.length}
              edition={ed}
              tray={trays[i]}
              secX={secX}
              W={Wm}
              H={Hm}
              B={Bm}
              dims={dims}
              open={open?.sec === i ? open.card : null}
              keep={open?.sec === i ? keep : NONE}
              onPick={onPick}
            />
          ) : null,
        )}

        {/* Section dots */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-[calc(14px+var(--sat))] z-20 flex items-center gap-[6px] px-4"
          animate={{ opacity: open ? 0 : 1 }}
          transition={springs.snappy}
        >
          {sections.map((s, i) => (
            <span key={s.id} className={`block h-[6px] rounded-full transition-all duration-300 ${i === sec ? "w-5 bg-paper" : "w-[6px] bg-paper/45"}`} />
          ))}
        </motion.div>

        {/* On past the end: what comes next, riding on top of it */}
        <motion.div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center" style={{ y: endY, opacity: endO }}>
          <span className={`rounded-full px-4 py-2 text-[14px] italic shadow-[0_6px_18px_rgba(0,0,0,.25)] ${endArmed ? "bg-accent text-paper" : "bg-paper text-ink"}`}>
            {endNext ? (endArmed ? "Suelte para seguir" : "Siga para la siguiente") : "Fin de la sección"}
          </span>
        </motion.div>

        {/* Full page controls, under the thumb */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center justify-between px-4 pb-[calc(var(--sab)+16px)]"
          initial={false}
          animate={{ opacity: open ? 1 : 0, y: open ? 0 : 24 }}
          transition={springs.snappy}
        >
          <button
            type="button"
            aria-label="Volver a la bandeja"
            onClick={() => collapse()}
            className={`grid h-12 w-12 place-items-center rounded-full bg-ink text-paper shadow-[0_6px_18px_rgba(0,0,0,.25)] ${open ? "pointer-events-auto" : ""}`}
          >
            <Arrow dir="down" weight={1.75} />
          </button>
          {open ? (
            <span className="lnum rounded-full bg-ground/90 px-3 py-2 text-[14px] italic text-ink backdrop-blur-md">
              {open.card + 1} de {sections[open.sec].cards.length}
            </span>
          ) : null}
          {openCard && openCard.type === "note" && openCard.note.source.url ? (
            <a href={openCard.note.source.url} target="_blank" rel="noreferrer" className="mono pointer-events-auto flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-paper">
              Fuente <Arrow dir="out" />
            </a>
          ) : (
            <span className="w-12" />
          )}
        </motion.div>
      </div>

      <TopFill tone={tone} />
      <AbSwitch current="b" hidden={!!open} tone="dark" />

      {editions.length > 1 && !open && sec === sections.length - 1 ? (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(42px+var(--sat))] z-20 mx-auto flex max-w-[520px] gap-2 px-4">
          {editions.map((e, i) => (
            <button
              key={e.date}
              type="button"
              onClick={() => {
                if (i === edIndex) return;
                haptic.complete();
                secRef.current = 0;
                setSec(0);
                secX.jump(0);
                trays.forEach((t) => t.settle());
                endLift.jump(0);
                setEndArmed(false);
                setKeep([]);
                setOpen(null);
                setEdIndex(i);
              }}
              className={`pointer-events-auto rounded-full px-3 py-[6px] text-[13px] italic ${i === edIndex ? "bg-paper text-ink" : "bg-ink/50 text-paper/80"}`}
            >
              Nº {e.number} · {dayMonth(e.date)}
            </button>
          ))}
        </div>
      ) : null}

      {gallery ? (
        <Gallery
          items={gallery.items}
          start={gallery.start}
          piece={gallery.piece}
          home={gallery.home}
          onNavigate={(card) => {
            const o = openRef.current;
            if (!o || card === o.card) return;
            const t = trays[gallery.sec];
            t.cur.set(card);
            toTop(gallery.sec, o.card);
            setOpen({ sec: gallery.sec, card });
            toTop(gallery.sec, card);
          }}
          homeOf={(card) => pageEl(gallery.sec, card)?.querySelector<HTMLElement>("[data-media]") ?? null}
          onClosed={() => {
            galleryRef.current = false;
            setGallery(null);
          }}
        />
      ) : null}
    </div>
  );
}

const NONE: number[] = [];

/* ---------- one section: cover + tray ---------- */

function SectionScreen({
  section,
  index,
  count,
  edition,
  tray,
  secX,
  W,
  H,
  B,
  dims,
  open,
  keep,
  onPick,
}: {
  section: SectionDef;
  index: number;
  count: number;
  edition: Edition;
  tray: Tray;
  secX: MotionValue<number>;
  W: MotionValue<number>;
  H: MotionValue<number>;
  B: MotionValue<number>;
  dims: { w: number; h: number };
  open: number | null;
  keep: number[];
  onPick: (noteId: string, from: DOMRect) => void;
}) {
  const left = useTransform(() => index * W.get() + secX.get());
  // Push Pop parallax: the cover photo lags its page.
  const photoX = useTransform(() => -(index * W.get() + secX.get()) * 0.4);
  const { p, posC, cur, ox, fx } = tray;
  const k = useTransform(p, (v) => S + (1 - S) * v);
  /*
   * The row's transform. The page in focus (cur) sits where the tray put it,
   * plus the finger's drift, and grows from the grabbed point (fx) until it
   * is the screen; every other page keeps its place beside it.
   */
  const tx = useTransform(() => {
    const v = p.get();
    const kk = S + (1 - S) * v;
    const w = W.get();
    const a = cur.get();
    const left0 = PAD + (a - posC.get()) * (w + G) * S;
    const L = (left0 + fx.get() * w * S + ox.get() - fx.get() * w * kk) * (1 - v);
    return L - a * (w + G) * kk;
  });
  const ty = useTransform(() => {
    const v = p.get();
    const kk = S + (1 - S) * v;
    return H.get() - B.get() * (1 - v) - H.get() * kk;
  });
  // The cover sinks to near black from 80% open, so pages turn over the dark.
  const dim = useTransform(p, [0, 0.5, 0.8, 1], [0, 0.14, 0.9, 0.9]);

  // Which pages are drawn in full: a few around the one in view, plus any an override carries.
  // Two windows, always both: around the page in view, and around the tray's
  // view, each leading in the direction it moves. Nothing changes while a
  // card grows or shrinks, so no page is mounted mid-flight by the window.
  const winOf = (): [number, number, number, number] => {
    const c = Math.round(cur.get());
    const t = Math.floor(posC.get());
    const vc = cur.getVelocity();
    const vt = posC.getVelocity();
    const lc = Math.ceil(Math.abs(vc) * 0.15);
    const lt = Math.ceil(Math.abs(vt) * 0.15);
    return [c - 2 - (vc < 0 ? lc : 0), c + 2 + (vc > 0 ? lc : 0), t - 1 - (vt < 0 ? lt : 0), t + 4 + (vt > 0 ? lt : 0)];
  };
  const [win, setWin] = useState<[number, number, number, number]>([-2, 2, -1, 4]);
  const syncWin = () => {
    const nw = winOf();
    setWin((w) => (w.every((v, k) => v === nw[k]) ? w : nw));
  };
  useMotionValueEvent(cur, "change", syncWin);
  useMotionValueEvent(posC, "change", syncWin);
  const [lifted, setLifted] = useState(false);
  useMotionValueEvent(p, "change", (v) => setLifted(v > 0.005));

  const row = useCallback((el: HTMLDivElement | null) => tray.attach(el), [tray]);

  return (
    <motion.section className="absolute inset-y-0 w-full overflow-hidden" style={{ x: left }} aria-label={section.name}>
      <Cover section={section} index={index} count={count} edition={edition} photoX={photoX} />
      <motion.div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: dim }} />
      <motion.div ref={row} className="absolute left-0 top-0" style={{ x: tx, y: ty, scale: k, originX: 0, originY: 0, zIndex: lifted ? 10 : 1 }}>
        {section.cards.map((c, i) => {
          const heavy = (i >= win[0] && i <= win[1]) || (i >= win[2] && i <= win[3]) || i === open || keep.includes(i);
          const next = section.cards[i + 1];
          return (
            <RowCard key={c.id} tray={tray} i={i} w={dims.w} h={dims.h}>
              <Page
                card={c}
                edition={edition}
                live={open === i}
                id={`${index}-${i}`}
                h={dims.h}
                light={!heavy}
                next={next ? titleOf(next) : null}
                onPick={onPick}
              />
            </RowCard>
          );
        })}
      </motion.div>
    </motion.section>
  );
}

/** One page in the row, with its override (where it appears to be, if not its place). */
const RowCard = memo(function RowCard({ tray, i, w, h, children }: { tray: Tray; i: number; w: number; h: number; children: React.ReactNode }) {
  const o = tray.override(i);
  const clipPath = useTransform(o.clip, (b) => (b > 0.5 ? `inset(0px 0px ${b}px 0px round ${RU}px)` : "none"));
  return (
    <motion.div
      className="absolute top-0 overflow-hidden bg-ground shadow-[0_10px_40px_rgba(0,0,0,.35)]"
      style={{
        left: i * (w + G),
        width: w,
        height: h,
        borderRadius: RU,
        x: o.x,
        y: o.y,
        scale: o.s,
        opacity: o.o,
        zIndex: o.z,
        originX: 0,
        originY: 0,
        clipPath,
      }}
    >
      {children}
    </motion.div>
  );
});
