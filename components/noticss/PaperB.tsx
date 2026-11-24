"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, motionValue, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import { springs } from "@/lib/histok/springs";
import type { Edition } from "@/data/noticss/types";
import { Arrow } from "@/components/updatr/Arrow";
import { AbSwitch } from "./AbSwitch";
import { Cover } from "./b/Cover";
import { Gallery } from "./b/Gallery";
import { TopFill, type FillMode } from "./b/TopFill";
import { useVvvInset } from "@/components/vvv/inset";
import { editionKey } from "@/lib/noticss/editions";
import { featuresOf, itemId, markSeen, nudge, setVerdict, useFrozenTaste, useTaste, verdictOf, type Verdict } from "@/lib/noticss/taste";
import { LikeFan, type Fan } from "./b/LikeFan";
import { darken, hexToRgb, topTone } from "@/lib/noticss/tone";
import { Page, titleOf } from "./b/Pages";
import { useFollowing } from "@/lib/noticss/following";
import { Bookmark } from "@/components/updatr/Bookmark";
import {
  BOTTOM,
  COLLAPSE,
  END_COMMIT,
  END_LIFT_MAX,
  EXPAND,
  G,
  GLIDE,
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
/** Open, a page stops this far above the bottom edge: a card, its rounded corners in view. */
/** vvt: the frame's bottom corners, the same as an open page's (it fills the frame). */
const FRAME_R = RU;
/** How far B runs up behind Safari's status bar (more than any status bar is tall). */
const BLEED = 80;

export function PaperB({ editions }: { editions: Edition[] }) {
  const [edIndex, setEdIndex] = useState(0);
  const ed = editions[edIndex];
  const [open, setOpenState] = useState<Open | null>(null);
  const openRef = useRef<Open | null>(null);
  const setOpen = (o: Open | null) => {
    openRef.current = o;
    setOpenState(o);
  };
  // Followed topics: the section is rebuilt from them only while no page is
  // open (a page never changes under the finger).
  const following = useFollowing();
  const [snap, setSnap] = useState<string[]>(following.ids);
  if (!open && snap !== following.ids) setSnap(following.ids);
  // The reader's taste picks a share of every section. It is read once per
  // edition and visit (a verdict counts from the next one), so cards never
  // reshuffle under the finger.
  const taste = useFrozenTaste(editionKey(ed));
  const sections = useMemo(() => sectionsOf(ed, editions, snap, taste ?? undefined), [ed, editions, snap, taste]);
  const [sec, setSec] = useState(0);
  const secRef = useRef(0);
  const secX = useMemo(() => motionValue(0), []);
  // One tray per section, kept across rebuilds of the section list (the
  // followed section changes its cards; its tray keeps its motion).
  const [trayCache] = useState(() => new Map<string, Tray>());
  const trays = useMemo(
    () =>
      sections.map((sd) => {
        const key = `${editionKey(ed)}:${sd.id}`;
        let t = trayCache.get(key);
        if (!t) {
          t = new Tray();
          trayCache.set(key, t);
        }
        t.setCount(sd.cards.length);
        return t;
      }),
    [sections, ed, trayCache],
  );
  const [gallery, setGallery] = useState<GalleryState | null>(null);
  const galleryRef = useRef(false);
  /** Pages that must stay fully drawn while an override carries them. */
  const [keep, setKeep] = useState<number[]>([]);
  /** Pushing on past the end of a page: the lift (px) and whether it would commit. */
  const endLift = useMemo(() => motionValue(0), []);
  const [endArmed, setEndArmed] = useState(false);
  const [endNext, setEndNext] = useState<string | null>(null);
  /** Pushing on past the tray's last card: the next section peeks in (px), and whether letting go goes there. */
  const sideLift = useMemo(() => motionValue(0), []);
  const [sideArmed, setSideArmed] = useState(false);
  /** Which way the pull goes: 1, the next section (past the last card); −1, the previous one (back past the first). */
  const [sideDir, setSideDir] = useState<1 | -1>(1);
  const sideDirV = useMemo(() => motionValue(1), []);

  const col = useRef<HTMLDivElement>(null);
  const Wm = useMemo(() => motionValue(390), []);
  const Hm = useMemo(() => motionValue(844), []);
  /** A page's height: the screen below the status bar (an open page stays below the cut). */
  const Cm = useMemo(() => motionValue(844), []);
  /** The tray's bottom inset: its margin plus the home indicator's safe area. */
  const Bm = useMemo(() => motionValue(BOTTOM), []);
  const root = useRef<HTMLDivElement>(null);
  /**
   * vvt (components/vvv): the frame runs from the top of the screen (the page
   * shows around the Dynamic Island) down to just above Safari's bar or the
   * home indicator; beyond it, black.
   */
  const inset = useVvvInset(6);

  const [dims, setDims] = useState({ w: 390, h: 844 });
  useLayoutEffect(() => {
    const el = col.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      // The frame already ends above the browser's bar and the home
      // indicator, so the tray sits on its own margin. An open page fills
      // the frame: its content starts below the status bar.
      Bm.set(BOTTOM);
      Wm.set(w);
      Hm.set(h);
      Cm.set(h);
      setDims({ w, h });
      secX.set(-secRef.current * w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [Wm, Hm, Cm, Bm, secX]);

  /*
   * Behind the clock. Safari (iOS 26, in the browser) draws real page content
   * behind its status bar only while the document is scrolled; a fixed layer
   * touching the top it paints as one solid bar, and an unscrolled page shows
   * the html colour there. So on an iPhone in Safari, B runs BLEED px taller
   * than the screen and pins the document scrolled down by that much: its top
   * BLEED px sit behind the clock, and the cut (where content starts) is the
   * viewport's top. From the home screen the page already runs under the
   * status bar, and the safe-area inset says where the cut is.
   */
  const [bleed, setBleed] = useState(0);
  useLayoutEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const ios = /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;padding-top:env(safe-area-inset-top,0px)";
    document.body.appendChild(probe);
    const sat = parseFloat(getComputedStyle(probe).paddingTop) || 0;
    probe.remove();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the device
    if (ios && !nav.standalone && !matchMedia("(display-mode: standalone)").matches && sat === 0) setBleed(BLEED);
  }, []);
  // The document behind must not scroll or bounce; with a bleed it is pinned
  // at the bleed instead (scrolled, so Safari shows the page behind the clock).
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = [html.style.overflow, body.style.overflow, html.style.overscrollBehavior, history.scrollRestoration] as const;
    html.style.overscrollBehavior = "none";
    if (!bleed) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
    }
    history.scrollRestoration = "manual";
    let raf = 0;
    const pin = () => {
      raf = 0;
      if (bleed && Math.abs(window.scrollY - bleed) > 0.5) window.scrollTo({ top: bleed, left: 0, behavior: "instant" });
      if (!bleed && window.scrollY !== 0) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };
    const soon = () => {
      if (!raf) raf = requestAnimationFrame(pin);
    };
    pin();
    const late = window.setTimeout(pin, 300);
    window.addEventListener("scroll", soon, { passive: true });
    window.addEventListener("resize", soon);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(late);
      window.removeEventListener("scroll", soon);
      window.removeEventListener("resize", soon);
      [html.style.overflow, body.style.overflow, html.style.overscrollBehavior] = prev;
      history.scrollRestoration = prev[3];
    };
  }, [bleed]);

  /* ---------- geometry helpers ---------- */

  const W = () => Wm.get();
  const H = () => Hm.get();
  const visible = () => (W() - PAD + G * S) / ((W() + G) * S);
  const maxPos = (n: number) => Math.max(0, n - visible());
  /** Height of a page (the cards are pages, drawn below the status bar). */
  const C = () => Cm.get();
  const trayTop = () => H() - C() * S - Bm.get();
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
    oj.y.jump(from.top - box.top - (H() - C()));
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
      /** On a button or link: a tap is its own (the native click), not ours. */
      onControl: boolean;
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
    const travel = (fy: number) => Math.max(170, (1 - fy) * C() * (1 - S) - Bm.get());
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
        fy: zone === "tray" ? clamp((y - trayTop()) / (C() * S), 0, 1) : clamp((y - (H() - C())) / C(), 0, 1),
        atTop: !sc || sc.scrollTop <= 0,
        atEnd: !sc || sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2,
        pBase: caught ? t.p.get() : o ? t.p.get() : 0,
        oxBase: t.ox.get(),
        resume: !!o && t.p.get() < 0.999,
        stopped,
        onControl: !!tgt?.closest("a,button"),
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
          // Past the last card the finger pulls the next section in, against
          // friction; back past the first, the previous one, which shows its
          // own end. Past the mark, letting go goes there.
          const dir = v > mx && !!sections[s + 1] ? 1 : v < 0 && !!sections[s - 1] ? -1 : 0;
          const past = dir === 1 ? (v - mx) * step : dir === -1 ? -v * step : 0;
          if (dir) {
            setSideDir((d) => (d === dir ? d : dir));
            sideDirV.set(dir);
            // The previous section comes in showing its last cards: its tray waits at its end.
            if (dir === -1) {
              const pt = trays[s - 1];
              const pm = maxPos(sections[s - 1].cards.length);
              if (Math.abs(pt.posC.get() - pm) > 0.001) pt.posC.jump(pm);
            }
          }
          if (v < 0) v = -rubber(-v * step, w) / step;
          else if (v > mx) v = mx + rubber((v - mx) * step, w) / step;
          t.posC.set(v);
          const lift = endLiftOf(past);
          sideLift.set(lift);
          secX.set(-s * w - (dir || 1) * lift * 0.6);
          const armed = past >= END_COMMIT;
          if (armed !== g.armed) {
            g.armed = armed;
            setSideArmed(armed);
            if (armed) haptic.select();
          }
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
        const tap = !cancelled && !gg.stopped && !gg.onControl && dist < 10 && quick;
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
          const step = (w + G) * S;
          if (sideLift.get() > 0 || gg.armed) {
            t.run(sideLift, 0, SETTLE);
            setSideArmed(false);
            // Past the mark: on to that section, carried by the finger's speed.
            if (!cancelled && gg.armed) {
              const back = t.posC.get() < 0;
              t.run(t.posC, back ? 0 : maxPos(n), TRAY);
              haptic.complete();
              return goSection(back ? s - 1 : s + 1, back ? Math.max(vx, 0) : Math.min(vx, 0));
            }
          }
          // Momentum carries the tray (iOS's deceleration), then it lands on a card.
          const projected = t.posC.get() - (vx * GLIDE.power) / step;
          const to = clamp(Math.round(projected), 0, maxPos(n));
          if (Math.round(to) !== Math.round(gg.base)) haptic.select();
          // Momentum: the tray glides on and decelerates, then lands on a card.
          t.glide(t.posC, -vx / step, 0, maxPos(n));
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
      // A control with a gesture of its own (the like fan) keeps its finger.
      if ((e.target as HTMLElement | null)?.closest("[data-own-gesture]")) return;
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
  const [fill, setFill] = useState<FillMode>("none");
  useEffect(() => {
    /*
     * Open, a page is a frame below the status bar with the dark around it,
     * so the top (and the bottom) read as that dark. On the tray the top is
     * the cover's own top colour, and the bottom its own bottom colour.
     */
    const DARK = "rgb(12, 11, 10)";
    const PAPER = "rgb(248, 245, 238)";
    const GROUND = "rgb(241, 236, 226)";
    const read = (): { tone: string; mode: FillMode } | null => {
      if (gallery) return { tone: "rgb(0, 0, 0)", mode: "none" };
      const o = openRef.current;
      const c = col.current;
      if (!c) return null;
      // Open, the page fills the frame up to the screen's top: its photo runs
      // up under the status bar; scrolled past it, a band in the page's own
      // paper keeps the words below the cut.
      if (o) {
        const card = sections[o.sec]?.cards[o.card];
        const sc = pageEl(o.sec, o.card);
        if (!card || !sc) return null;
        if (card.type === "figures") return { tone: PAPER, mode: "none" };
        const sat = parseFloat(getComputedStyle(c).getPropertyValue("--sat-px")) || 0;
        const media = sc.querySelector<HTMLElement>("[data-media]");
        const head = sc.querySelector<HTMLElement>("[data-head]");
        const top = media?.parentElement ?? head;
        const inTop = !!top && sc.scrollTop < top.offsetTop + top.clientHeight - sat - 2;
        if (media && inTop) return { tone: topTone(media.querySelector("img")) ?? DARK, mode: "none" };
        if (inTop) return { tone: PAPER, mode: "none" };
        return { tone: GROUND, mode: "solid" };
      }
      const sd = sections[secRef.current];
      if (sd?.kind === "hoy") {
        const sky = ed.weather?.sky;
        return { tone: hexToRgb(sky?.[0] ?? "#6f6a62"), mode: "none" };
      }
      const img = c.querySelector<HTMLImageElement>(`[data-cover="${secRef.current}"] img`);
      const t = topTone(img);
      return { tone: t ? darken(t, 0.55) : DARK, mode: "none" };
    };
    let raf = 0;
    const apply = () => {
      raf = 0;
      const t = read();
      if (!t) return;
      setTone((p) => (p === t.tone ? p : t.tone));
      setFill((m) => (m === t.mode ? m : t.mode));
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
  }, [sec, open, gallery, sections, ed]);
  useEffect(() => {
    // vvt: beyond the frame (under Safari's bar, past its bottom corners) is
    // black, always. The top is inside the frame, so the status bar takes
    // the colour at the top of what shows.
    const html = document.documentElement;
    html.style.backgroundColor = "#000";
    html.style.backgroundImage = "";
    html.style.minHeight = "100%";
    document.body.style.background = "transparent";
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
      const html = document.documentElement;
      html.style.backgroundColor = "";
      html.style.backgroundImage = "";
      html.style.minHeight = "";
      document.body.style.background = "";
    },
    [],
  );

  /** Another edition: everything starts again at the front. */
  const pickEdition = (i: number) => {
    if (i === edIndex) return;
    haptic.complete();
    secRef.current = 0;
    setSec(0);
    secX.jump(0);
    trays.forEach((t) => t.settle());
    endLift.jump(0);
    sideLift.jump(0);
    setEndArmed(false);
    setSideArmed(false);
    setKeep([]);
    setOpen(null);
    setEdIndex(i);
  };

  const near = (i: number) => Math.abs(i - sec) <= 1;
  const openCard = open ? sections[open.sec].cards[open.card] : null;
  // The bookmark follows the story's topic (its storyline), from any of its pages.
  const topic = openCard && openCard.type !== "figures" ? openCard.subject : null;
  // What the open page is about: a storyline, or one of its notes.
  const openStory = openCard && openCard.type !== "figures" ? openCard : null;
  const openNote = openStory?.type === "note" ? openStory.note : undefined;
  // Opened is seen (suggested again only after the rest); a page read for
  // twenty seconds is a weak like.
  useEffect(() => {
    if (!openStory) return;
    markSeen(openStory.subject.id);
    const f = featuresOf(openStory.subject, openNote);
    const id = itemId(openStory.subject, openNote);
    const t = window.setTimeout(() => nudge(`r:${id}`, "read", true, f), 20000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openStory?.id]);
  const verdictId = openStory ? itemId(openStory.subject, openNote) : null;
  const verdict = verdictId ? verdictOf(verdictId) : null;
  const choose = (v: Verdict) => {
    if (!openStory || !verdictId) return;
    const next = verdict === v ? null : v;
    setVerdict(verdictId, next, featuresOf(openStory.subject, openNote));
    setNote((n) => ({ key: (n?.key ?? 0) + 1, text: next === "like" ? "Más como esta" : next === "dislike" ? "Menos como esta" : "Sin opinión" }));
  };
  const followed = !!topic && following.has(topic.id);
  const [note, setNote] = useState<{ key: number; text: string } | null>(null);
  // Like or dislike the open page; the fan closes with the page.
  useTaste();
  const [fan, setFan] = useState<Fan>(null);
  if (fan && !open) setFan(null);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 1600);
    return () => clearTimeout(t);
  }, [note]);
  const endY = useTransform(() => Hm.get() - endLift.get() - 44);
  const endO = useTransform(endLift, [0, 40, END_LIFT_MAX], [0, 0.6, 1]);
  // The side pill rides at the tray's middle height and slides in from the right edge.
  const sideY = useTransform(() => Hm.get() - Bm.get() - (Cm.get() * S) / 2 - 20);
  const sideX = useTransform(() => 40 * sideDirV.get() * (1 - Math.min(1, sideLift.get() / END_LIFT_MAX)));
  const sideO = useTransform(sideLift, [0, 30, END_LIFT_MAX], [0, 0.7, 1]);
  const sideNext = sections[sec + sideDir]?.name ?? null;

  return (
    <div
      ref={root}
      // Absolute, not fixed: nothing of B may be a fixed layer at the top edge
      // (Safari paints one as a solid bar over its status bar).
      className="absolute inset-x-0 top-0 overflow-hidden"
      data-app
      style={{
        height: `calc(100lvh + ${bleed}px)`,
        touchAction: "none",
        // The frame ends above the bottom bar and the home indicator: nothing inside needs their inset.
        ["--sab" as string]: "0px",
        // The cut: below the status bar, or (with a bleed) the viewport's top.
        ...(bleed ? { ["--sat" as string]: `${bleed}px` } : {}),
      }}
    >
      {/* Beyond the frame at the bottom: black, and Safari tints its bottom bar from it. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 h-[50lvh]" style={{ backgroundColor: "#000" }} />
      {/* vvt: no top curve (the phone's own corners round it), the bottom rounded above the bar. */}
      <div
        ref={col}
        data-vvv
        className="absolute inset-x-0 top-0 mx-auto w-full max-w-[520px] overflow-hidden"
        style={{
          bottom: inset.bottom,
          borderRadius: `0 0 ${FRAME_R}px ${FRAME_R}px`,
          clipPath: `inset(0 round 0 0 ${FRAME_R}px ${FRAME_R}px)`,
          WebkitClipPath: `inset(0 round 0 0 ${FRAME_R}px ${FRAME_R}px)`,
          // The frame's own surface is the top colour too, wherever Safari samples it.
          backgroundColor: tone,
          touchAction: open ? "pan-y" : "none",
          ["--sat-px" as string]: `${bleed || inset.sat}`,
        }}
      >
        {sections.map((s, i) =>
          near(i) ? (
            <SectionScreen
              key={`${editionKey(ed)}-${s.id}`}
              section={s}
              index={i}
              count={sections.length}
              edition={ed}
              tray={trays[i]}
              secX={secX}
              W={Wm}
              H={Hm}
              B={Bm}
              C={Cm}
              dims={dims}
              open={open?.sec === i ? open.card : null}
              keep={open?.sec === i ? keep : NONE}
              onPick={onPick}
              editions={editions}
              onEdition={pickEdition}
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

        {/* On past the tray's end: the next section rides in from the right; back past its start, the previous one from the left */}
        {sideNext ? (
          <motion.div
            className={`pointer-events-none absolute inset-x-0 top-0 z-30 flex px-3 ${sideDir === 1 ? "justify-end" : "justify-start"}`}
            style={{ y: sideY, x: sideX, opacity: sideO }}
          >
            <span className={`rounded-full px-4 py-2 text-[14px] italic shadow-[0_6px_18px_rgba(0,0,0,.25)] ${sideArmed ? "bg-accent text-paper" : "bg-paper text-ink"}`}>
              {sideArmed ? `Suelte: ${sideNext}` : sideDir === 1 ? `Siga a ${sideNext}` : `Vuelva a ${sideNext}`}
            </span>
          </motion.div>
        ) : null}

        {/* What the bookmark just did, briefly, above the controls */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--sab)+80px)] z-30 flex justify-end px-4">
          <AnimatePresence>
            {note && !fan ? (
              <motion.span
                key={note.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={springs.snappy}
                className="rounded-full bg-paper px-4 py-2 text-[14px] italic text-ink shadow-[0_6px_18px_rgba(0,0,0,.25)]"
              >
                {note.text}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        {/* The like fan's veil: the page dims while it is open; a tap on it closes the fan. */}
        <AnimatePresence>
          {fan ? (
            <motion.div
              key="veil"
              data-own-gesture
              aria-hidden
              className="absolute inset-0 z-[29] bg-ink/35"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setFan(null)}
            />
          ) : null}
        </AnimatePresence>

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
              {open.card + 1}/{sections[open.sec].cards.length}
            </span>
          ) : null}
          <span className="flex items-center gap-2">
            {openStory ? <LikeFan verdict={verdict} fan={fan} setFan={setFan} onChoose={choose} enabled={!!open} /> : null}
            {topic ? (
              <motion.button
                type="button"
                key={followed ? "on" : "off"}
                aria-pressed={followed}
                aria-label={followed ? `Dejar de seguir: ${topic.title}` : `Seguir el tema: ${topic.title}`}
                onClick={() => {
                  const on = following.toggle(topic.id);
                  // Following a topic is a weak like.
                  nudge(`f:${topic.id}`, "follow", on, featuresOf(topic));
                  if (on) haptic.complete();
                  else haptic.select();
                  setNote({ key: Date.now(), text: on ? "Siguiendo este tema" : "Ya no lo sigue" });
                }}
                animate={{ scale: [1, followed ? 1.14 : 0.9, 1] }}
                transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
                className={`grid h-12 w-12 place-items-center rounded-full shadow-[0_6px_18px_rgba(0,0,0,.25)] ${open ? "pointer-events-auto" : ""} ${
                  followed ? "bg-accent text-paper" : "bg-ink text-paper"
                }`}
                style={{ touchAction: "manipulation" }}
              >
                <Bookmark on={followed} size="18px" />
              </motion.button>
            ) : null}
            {openCard && openCard.type === "note" && openCard.note.source.url ? (
              <a href={openCard.note.source.url} target="_blank" rel="noreferrer" className="mono pointer-events-auto flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-paper">
                Fuente <Arrow dir="out" />
              </a>
            ) : null}
          </span>
        </motion.div>
      </div>

      <TopFill tone={tone} mode={fill} />
      {/* Fixed to the viewport, whose top is already the cut. */}
      <div style={{ ["--sat" as string]: bleed ? "0px" : "env(safe-area-inset-top, 0px)" }}>
        <AbSwitch current="b" hidden={!!open} tone="dark" />

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
  C: Cpage,
  dims,
  open,
  keep,
  onPick,
  editions,
  onEdition,
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
  C: MotionValue<number>;
  dims: { w: number; h: number };
  open: number | null;
  keep: number[];
  onPick: (noteId: string, from: DOMRect) => void;
  editions: Edition[];
  onEdition: (i: number) => void;
}) {
  const left = useTransform(() => index * W.get() + secX.get());
  // Push Pop parallax: the cover photo lags its page.
  const photoX = useTransform(() => -(index * W.get() + secX.get()) * 0.4);
  const { p, posC, cur } = tray;
  useEffect(() => tray.setCount(section.cards.length), [tray, section.cards.length]);
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


  return (
    <motion.section className="absolute inset-y-0 w-full overflow-hidden" style={{ x: left }} aria-label={section.name}>
      <Cover section={section} index={index} count={count} edition={edition} photoX={photoX} editions={editions} onEdition={onEdition} />
      <motion.div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: dim }} />
      <div className="absolute left-0 top-0" style={{ zIndex: lifted ? 10 : 1 }}>
        {section.cards.map((c, i) => {
          const heavy = (i >= win[0] && i <= win[1]) || (i >= win[2] && i <= win[3]) || i === open || keep.includes(i);
          const next = section.cards[i + 1];
          return (
            <RowCard key={c.id} tray={tray} i={i} w={dims.w} h={dims.h} W={W} H={H} C={Cpage} B={B} layer={heavy}>
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
      </div>
    </motion.section>
  );
}

/**
 * One page in the row. Its place comes from its own openness (the thread:
 * the card in focus leads, the others follow), then its override on top
 * (where it appears to be, if not its place).
 *
 * At openness v a card is at scale k = S + (1 - S)v. The focus card (cur)
 * sits where the tray put it, plus the finger's drift, and grows from the
 * grabbed point (fx); each other card keeps its place beside it at its own
 * openness, so a card still low on the thread is smaller and further down.
 */
const RowCard = memo(function RowCard({
  tray,
  i,
  w,
  h,
  W,
  H,
  C,
  B,
  layer,
  children,
}: {
  tray: Tray;
  i: number;
  w: number;
  h: number;
  W: MotionValue<number>;
  H: MotionValue<number>;
  C: MotionValue<number>;
  B: MotionValue<number>;
  /** Near the view: its own compositor layer. */
  layer: boolean;
  children: React.ReactNode;
}) {
  const o = tray.override(i);
  const v = tray.pi(i);
  const { posC, cur, ox, fx } = tray;
  const x = useTransform(() => {
    const t = v.get();
    const kk = S + (1 - S) * t;
    const ww = W.get();
    const a = cur.get();
    const left0 = PAD + (a - posC.get()) * (ww + G) * S;
    const L = (left0 + fx.get() * ww * S + ox.get() - fx.get() * ww * kk) * (1 - t);
    return L + (i - a) * (ww + G) * kk + o.x.get();
  });
  const y = useTransform(() => {
    const t = v.get();
    const kk = S + (1 - S) * t;
    // Anchored to the bottom on the tray; open, a page fills the frame.
    return H.get() - B.get() * (1 - t) - C.get() * kk + o.y.get();
  });
  const scale = useTransform(() => (S + (1 - S) * v.get()) * o.s.get());
  // The card in focus on top, then outward; an override can lift a card above.
  const zIndex = useTransform(() => 100 - Math.min(90, Math.round(Math.abs(i - cur.get()))) + o.z.get());
  // The page is clipped to its rounded frame by a clip path, always: Safari
  // does not clip a composited child (the page's scroller, the photo) to a
  // parent's border radius with overflow alone, and the square page showed.
  // Open, it fills the vvt frame: its top corners go square (the phone's
  // round them), its bottom ones are the frame's.
  const top = useTransform(() => RU * Math.min(1, (1 - v.get()) * 3));
  const radius = useTransform(() => `${top.get()}px ${top.get()}px ${RU}px ${RU}px`);
  const clipPath = useTransform(() => `inset(0px 0px ${Math.max(0, o.clip.get())}px 0px round ${radius.get()})`);
  // The frame's shadow, except while the page grows out of a row (its window is smaller).
  const boxShadow = useTransform(o.clip, (b) => (b > 0.5 ? "none" : "0 10px 40px rgba(0,0,0,.35)"));
  return (
    <motion.div
      className="absolute left-0 top-0"
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        x,
        y,
        scale,
        opacity: o.o,
        zIndex,
        originX: 0,
        originY: 0,
        boxShadow,
        willChange: layer ? "transform" : "auto",
      }}
    >
      {/* The page inside, clipped to the frame (the card keeps its shadow). */}
      <motion.div className="absolute inset-0 bg-ground" style={{ clipPath, WebkitClipPath: clipPath }}>
        {children}
      </motion.div>
    </motion.div>
  );
});
