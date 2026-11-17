"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform, type Variants } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { kindLabel, type Franchise, type Item } from "@/data/updatr/types";
import { countdown, dot, relative } from "@/lib/updatr/format";
import {
  AXIS_LOCK,
  BACK_COMMIT,
  CANCEL_SPRING,
  CLOSE_SPRING,
  OPEN_SPRING,
  findFlightSource,
  freshVelocity,
  layoutRectOf,
  openArea,
  rectOf,
  resist,
  swipeDistance,
  swipeProgress,
  unresist,
  visibleFraction,
  type Rect,
} from "@/lib/updatr/flight";
import type { Carrier } from "@/lib/updatr/carrier";

/** Asymptote for the pull-down: the sheet approaches this travel and grips. */
const PULL_MAX = 400;
const PULL_COMMIT = 110;
/** Histok's chrome spring: back button and pills arriving. */
const CHROME_SPRING = { type: "spring" as const, stiffness: 280, damping: 30, mass: 1 };
/** A swipe may start this long into the opening flight (the picture is ~95% there). */
const EARLY_GRAB_MS = 300;
/** Touches this close to the left edge are ours, not Safari's history swipe. */
const EDGE_GUARD_PX = 30;

type Stage = "opening" | "open" | "flying-home" | "leaving";
type Exit = "button" | "pull" | "swipe";

export type DetailOrigin = { rect: Rect; key?: string; carrier?: Carrier };

const cascade: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { ...springs.expanding, delay: 0.1 + i * 0.035 } }),
};

function Cascade({ i, children, className }: { i: number; children: ReactNode; className?: string }) {
  return (
    <motion.div custom={i} variants={cascade} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

function Row({ k, v, accent }: { k: string; v: ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-t border-rule-soft py-[10px]">
      <span className="mono text-ink-soft">{k}</span>
      <span className={`text-right text-[14px] leading-snug ${accent ? "text-accent" : ""}`}>{v}</span>
    </div>
  );
}

/** Square press with Histok's halo ring. */
function Halo({
  onPress,
  label,
  children,
  className,
  style,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
  className?: string;
  style?: React.ComponentProps<typeof motion.button>["style"];
}) {
  const [down, setDown] = useState(false);
  return (
    <motion.button
      type="button"
      aria-label={label}
      onPointerDown={() => {
        setDown(true);
        haptic.select();
      }}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      onPointerCancel={() => setDown(false)}
      onClick={onPress}
      animate={{ scale: down ? 0.94 : 1 }}
      transition={down ? springs.snappy : springs.popping}
      className={`pointer-events-auto relative ${className ?? ""}`}
      style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation", ...style }}
    >
      {children}
      <span
        aria-hidden
        className="absolute -inset-[6px] border-[6px] border-accent"
        style={{
          opacity: down ? 1 : 0,
          transition: down ? "opacity 80ms ease-out" : "opacity 180ms ease-out 120ms",
          pointerEvents: "none",
        }}
      />
    </motion.button>
  );
}

const vw = () => (typeof window === "undefined" ? 400 : window.innerWidth || 400);

/**
 * The open article. Its picture is the tile's own image element, carried here
 * and dropped into the hero slot (one image, never a copy). It leaves three
 * ways, all spring-driven from wherever the finger let go:
 * - Back (floating, bottom left) or Escape.
 * - Swipe right from anywhere (Histok's back-swipe): the sheet slides and shrinks.
 * - Pull down while at the top: the sheet follows with growing resistance.
 * When the picture and its tile are on screen, the picture flies home into the
 * tile, draining back to black and white; otherwise the sheet is flung away.
 */
export function Detail({
  item,
  franchise,
  variant,
  position,
  origin,
  onRelease,
  onClosed,
}: {
  item: Item;
  franchise: Franchise;
  variant: "a" | "b";
  position: string;
  origin?: DetailOrigin;
  /** The tile may go back to black and white: the picture is heading home. */
  onRelease?: () => void;
  /** Exit finished: unmount. */
  onClosed: () => void;
}) {
  const [carried] = useState<Carrier | undefined>(() => origin?.carrier);
  const [failed, setFailed] = useState(false);
  const ownImage = !carried && !!item.image && !failed;
  const [stage, setStageState] = useState<Stage>(carried ? "opening" : "open");
  const stageRef = useRef<Stage>(stage);
  const setStage = (s: Stage) => {
    stageRef.current = s;
    setStageState(s);
  };

  const chrome = useMotionValue(0);
  const controlsIn = useMotionValue(0);
  const pullY = useMotionValue(0);
  const swipeX = useMotionValue(0);

  const sheet = useRef<HTMLDivElement>(null);
  const heroSlot = useRef<HTMLDivElement>(null);
  const openedAt = useRef(0);
  const callbacks = useRef({ onClosed, onRelease });
  useEffect(() => {
    callbacks.current = { onClosed, onRelease };
  });
  // Exits finish on springs; one that ends after this article was replaced
  // (a new tap during the fly-home) must not close the next one.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // One gesture channel feeds scale, corners and how much of the page shows through.
  const gesture = useTransform(() => Math.max(Math.min(pullY.get() / 380, 1), Math.min(swipeX.get() / vw(), 1)));
  const sheetScale = useTransform(
    () => 1 - Math.min(pullY.get() / PULL_MAX, 1) * 0.18 - Math.min(swipeX.get() / vw(), 1) * 0.08,
  );
  const sheetRadius = useTransform(
    () => Math.max(Math.min(pullY.get() / 90, 1), Math.min(swipeX.get() / (vw() * 0.25), 1)) * 28,
  );
  const backdrop = useTransform(() => Math.max(0, Math.min(1, chrome.get())) * (1 - gesture.get()));
  const sheetBg = useTransform(
    chrome,
    (v) => `color-mix(in srgb, var(--ground) ${Math.round(Math.max(0, Math.min(1, v)) * 100)}%, transparent)`,
  );
  const contentOpacity = useTransform(chrome, [0, 1], [0, 1], { clamp: true });
  // Floating controls: rise in on Histok's chrome spring; Back rides the swipe 1:1.
  const ctrlY = useTransform(controlsIn, [0, 1], [110, 0]);
  const ctrlOpacity = useTransform(() => Math.max(0, Math.min(1, controlsIn.get())) * (1 - Math.min(pullY.get() / 140, 1)));
  const sideOpacity = useTransform(() => 1 - Math.min(swipeX.get() / (vw() * 0.3), 1));
  // The band behind the controls leaves with the sheet on a swipe, too.
  const bandOpacity = useTransform(() => ctrlOpacity.get() * sideOpacity.get());

  // Arrive: the page fades in, the controls rise, the picture flies to the hero.
  // Leaving (unmount) never strands the picture: it goes home. Under StrictMode
  // React runs this cleanup once and the effect again, so the effect re-lifts
  // a picture that was sent home and flies it all the same.
  useLayoutEffect(() => {
    openedAt.current = performance.now();
    animate(chrome, 1, { duration: 0.28, ease: [0.2, 0, 0, 1] });
    const c = animate(controlsIn, 1, { ...CHROME_SPRING, delay: 0.22 });
    const slot = heroSlot.current;
    if (!carried || !slot) return () => c.stop();
    if (!carried.flying && !slot.contains(carried.piece)) carried.lift(carried.rect);
    carried.fly(
      rectOf(slot),
      OPEN_SPRING,
      () => {
        carried.land(slot);
        setStage("open");
      },
      // A tile half under the bottom bar comes out from under it.
      { clip: { from: openArea(), to: null } },
    );
    return () => {
      c.stop();
      carried.stop();
      if (!carried.atHome) carried.goHome();
    };
    // Mount-only: the arrival plays once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Body scroll lock, released the moment an exit starts so the page under a
  // closing article already scrolls.
  const lockPrev = useRef<string | null>(null);
  const unlock = () => {
    if (lockPrev.current === null) return;
    document.body.style.overflow = lockPrev.current;
    lockPrev.current = null;
  };

  const close = (how: Exit) => {
    const s = stageRef.current;
    if (s === "flying-home" || s === "leaving") return;
    if (how === "button") haptic.select();
    unlock();
    animate(controlsIn, 0, { duration: 0.18, ease: "easeIn" });
    const src = findFlightSource(origin?.key);
    // Only what shows counts: a tile under the bottom bar is not on screen.
    const area = openArea();
    const home = src ? layoutRectOf(src) : null;

    if (carried && src && home && visibleFraction(home, area) > 0.05) {
      const from = carried.flying ? carried.bake() : heroSlot.current ? rectOf(heroSlot.current) : null;
      if (from && visibleFraction(from) > 0.15) {
        // The picture flies home from exactly where it is now (pull and swipe
        // included), tracking the tile if the page moves under it, and slides
        // under the bottom bar rather than over it.
        if (!carried.flying) carried.lift(from);
        setStage("flying-home");
        callbacks.current.onRelease?.();
        animate(chrome, 0, { duration: 0.24, ease: "easeOut" });
        carried.fly(
          () => layoutRectOf(src),
          CLOSE_SPRING,
          () => {
            carried.goHome();
            if (alive.current) callbacks.current.onClosed();
          },
          { opacity: carried.homeOpacity(), clip: { from: null, to: area } },
        );
        return;
      }
    }

    setStage("leaving");
    // A picture that won't be seen leaving goes home at once, so its tile is
    // never an empty hole; one still showing in the hero leaves with the sheet.
    const heroShows =
      !!carried && !carried.flying && !!heroSlot.current && visibleFraction(rectOf(heroSlot.current)) > 0;
    if (carried && !heroShows) carried.goHome();
    callbacks.current.onRelease?.();
    const done = () => {
      if (carried && !carried.atHome) carried.goHome();
      if (alive.current) callbacks.current.onClosed();
    };
    if (how === "pull") {
      animate(chrome, 0, { duration: 0.35 });
      animate(pullY, window.innerHeight * 1.1, { ...CLOSE_SPRING, onComplete: done });
    } else if (how === "swipe") {
      animate(chrome, 0, { duration: 0.35 });
      animate(swipeX, vw() * 1.1, { ...CLOSE_SPRING, onComplete: done });
    } else {
      animate(pullY, 60, { duration: 0.24, ease: "easeIn" });
      animate(chrome, 0, { duration: 0.24, ease: "easeIn", onComplete: done });
    }
  };
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  // Body scroll lock + Escape.
  useEffect(() => {
    lockPrev.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current("button");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Histok's guard: a touch at the very left edge is our back-swipe, not
  // Safari's history swipe (which would leave Updatr). Buttons and links there
  // still take their taps.
  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || t.clientX > EDGE_GUARD_PX || !e.cancelable) return;
      const target = e.target as Element | null;
      if (target?.closest?.("a,button")) return;
      e.preventDefault();
    };
    document.addEventListener("touchstart", onStart, { passive: false });
    return () => document.removeEventListener("touchstart", onStart);
  }, []);

  // Swipe-right and pull-down. Hand-rolled on touch events so the first move can
  // be claimed (preventDefault) before iOS commits to its own scroll or bounce;
  // vertical moves that aren't a pull stay native scrolling. Mouse mirrors it.
  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    let mode: "idle" | "pending" | "pull" | "swipe" | "native" = "idle";
    let sx = 0;
    let sy = 0;
    let atTop = false;
    let last = { x: 0, y: 0, t: 0 };
    let vx = 0;
    let vy = 0;
    let dragged = false;
    // Finger travel already "in" the sheet when it is grabbed mid-spring, so
    // the drag picks up from where the sheet is instead of jumping.
    let baseX = 0;
    let baseY = 0;

    const begin = (x: number, y: number) => {
      const st = stageRef.current;
      if (st !== "open" && st !== "opening") {
        mode = "idle";
        return;
      }
      sx = x;
      sy = y;
      atTop = el.scrollTop <= 0;
      mode = "pending";
      last = { x, y, t: performance.now() };
      vx = 0;
      vy = 0;
      dragged = false;
    };

    const offset = () => pullY.get() !== 0 || swipeX.get() !== 0;
    const settle = () => {
      animate(pullY, 0, CANCEL_SPRING);
      animate(swipeX, 0, CANCEL_SPRING);
    };

    /** The article is still arriving: finish it now (if nearly there) so the gesture can take it. */
    const takeOver = () => {
      if (stageRef.current === "open") return true;
      const slot = heroSlot.current;
      if (stageRef.current !== "opening" || !carried || !slot) return false;
      if (performance.now() - openedAt.current < EARLY_GRAB_MS) return false;
      carried.land(slot);
      setStage("open");
      return true;
    };

    const move = (x: number, y: number, cancelable: boolean, prevent: () => void) => {
      if (mode === "idle" || mode === "native") return;
      const dx = x - sx;
      const dy = y - sy;
      if (mode === "pending") {
        if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) {
          // A downward start at the top may become a pull: keep it ours.
          if (atTop && dy > 0 && cancelable) prevent();
          return;
        }
        if (Math.abs(dx) > Math.abs(dy) && dx > 0) mode = "swipe";
        else if (atTop && dy > 0 && Math.abs(dy) >= Math.abs(dx)) mode = "pull";
        else {
          mode = "native";
          if (offset()) settle();
          return;
        }
        if (!cancelable || !takeOver()) {
          // iOS already started scrolling (or the article is still arriving):
          // leave it to the browser.
          mode = "native";
          if (offset()) settle();
          return;
        }
        // Grab the sheet where it is (it may still be springing back).
        pullY.stop();
        swipeX.stop();
        baseX = swipeDistance(swipeX.get() / vw(), vw());
        baseY = unresist(pullY.get(), PULL_MAX);
        if (mode === "swipe") pullY.set(0);
        else swipeX.set(0);
        dragged = true;
        if (mode === "swipe") haptic.select();
        else haptic.drag();
      }
      if (!cancelable) {
        mode = "native";
        settle();
        return;
      }
      prevent();
      const now = performance.now();
      const dt = Math.max(1, now - last.t);
      vx = ((x - last.x) / dt) * 1000;
      vy = ((y - last.y) / dt) * 1000;
      last = { x, y, t: now };
      if (mode === "swipe") swipeX.set(swipeProgress(dx + baseX, vw()) * vw());
      else pullY.set(resist(Math.max(0, dy + baseY), PULL_MAX));
    };

    const end = () => {
      const m = mode;
      mode = "idle";
      // A finger that rested before letting go has no fling left in it.
      const now = performance.now();
      const rvx = freshVelocity(vx, last.t, now);
      const rvy = freshVelocity(vy, last.t, now);
      if (m === "swipe") {
        const p = swipeX.get() / vw();
        if (p > BACK_COMMIT || (p > 0.1 && rvx > 520)) closeRef.current("swipe");
        else animate(swipeX, 0, { ...CANCEL_SPRING, velocity: rvx });
      } else if (m === "pull") {
        const d = pullY.get();
        if (d > PULL_COMMIT || (d > 24 && rvy > 700)) closeRef.current("pull");
        else animate(pullY, 0, { ...CANCEL_SPRING, velocity: rvy });
      } else if (stageRef.current === "open" && offset()) {
        settle();
      }
    };

    /** The system took the touch (an edge swipe, a call): never a release. */
    const cancel = () => {
      mode = "idle";
      if (stageRef.current === "open" && offset()) settle();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        if (mode === "pull" || mode === "swipe") settle();
        mode = "native";
        return;
      }
      begin(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      move(e.touches[0].clientX, e.touches[0].clientY, e.cancelable, () => e.preventDefault());
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      begin(e.clientX, e.clientY);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      move(e.clientX, e.clientY, true, () => e.preventDefault());
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "mouse") end();
    };
    // A drag that ends over a link or button must not also click it.
    const onClick = (e: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      e.preventDefault();
      e.stopPropagation();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", cancel);
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("click", onClick, true);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", cancel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("click", onClick, true);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pullY, swipeX]);

  const meta = `${franchise.code} — ${kindLabel[item.kind]} — ${dot(item.date)}`;
  const status = item.status === "upcoming" ? "Upcoming" : item.status === "live" ? "Live now" : "Out";
  const source = item.url && !item.mock ? item.url : null;

  const heroBox = (
    <div style={{ position: "relative", aspectRatio: variant === "a" ? "1 / 1" : "4 / 5" }}>
      {carried ? (
        // The tile's own picture lands here. React renders this empty on purpose.
        <div ref={heroSlot} className="absolute inset-0 overflow-hidden" style={{ containerType: "inline-size" }} />
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springs.expanding}
          className="absolute inset-0 overflow-hidden bg-ink"
        >
          {ownImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.title}
              draggable={false}
              referrerPolicy="no-referrer"
              onError={() => setFailed(true)}
              className="block h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-end bg-accent p-6 text-[40px] font-bold uppercase leading-[0.92] tracking-[-0.03em] text-paper">
              {item.title}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );

  return (
    <div
      // Once it is leaving, the page underneath is live again (scroll, taps).
      className={`fixed inset-0 z-50 ${stage === "flying-home" || stage === "leaving" ? "pointer-events-none" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <motion.div className="absolute inset-0 bg-ground" style={{ opacity: backdrop }} />
      <motion.div
        ref={sheet}
        className={`absolute inset-0 overscroll-none [scrollbar-gutter:stable] ${stage === "open" ? "overflow-y-auto" : "overflow-hidden"}`}
        style={{
          x: swipeX,
          y: pullY,
          scale: sheetScale,
          borderRadius: sheetRadius,
          background: sheetBg,
          transformOrigin: "50% 30%",
          touchAction: "pan-y",
        }}
      >
        <div className="mx-auto w-full max-w-[520px] pb-[calc(110px+var(--sab))]">
          {/* Grabber: says "pull me down". */}
          <motion.div className="flex justify-center pb-3 pt-[calc(10px+var(--sat))]" style={{ opacity: contentOpacity }} aria-hidden>
            <span className="block h-[5px] w-10 rounded-full bg-ink/20" />
          </motion.div>

          {variant === "a" ? (
            <>
              <div className="border-y border-rule">{heroBox}</div>
              <motion.div className="px-5" style={{ opacity: contentOpacity }}>
                <Cascade i={1} className="mono mt-6 text-ink-soft">
                  {meta}
                </Cascade>
                <Cascade i={2}>
                  <h2 className="mt-3 text-[34px] font-medium leading-[1.02] tracking-[-0.035em]">{item.title}</h2>
                </Cascade>
                <Cascade i={3}>
                  <p className="mt-5 text-[19px] leading-[1.35] tracking-[-0.01em]">{item.dek}</p>
                </Cascade>
                <Cascade i={4} className="mt-8 border-b border-rule-soft">
                  <Row k="Franchise" v={franchise.name} />
                  <Row k="Studio" v={franchise.studio} />
                  <Row k="Type" v={kindLabel[item.kind]} />
                  <Row k="Status" v={status} />
                  <Row k="Published" v={`${dot(item.date)} · ${relative(item.date)}`} />
                  {item.when ? <Row k="Starts" v={`${dot(item.when)} · ${countdown(item.when)}`} accent /> : null}
                  <Row k="Source" v={item.source} />
                </Cascade>
                {item.body.map((para, i) => (
                  <Cascade key={i} i={5 + i}>
                    <p className="mt-6 max-w-[60ch] text-[16px] leading-[1.55] text-ink/85">{para}</p>
                  </Cascade>
                ))}
                <Cascade i={6 + item.body.length}>
                  <SourceLink item={item} />
                </Cascade>
              </motion.div>
            </>
          ) : (
            <div className="px-5">
              <div className="overflow-hidden">{heroBox}</div>
              <motion.div style={{ opacity: contentOpacity }}>
                <Cascade i={1} className="bg-ink px-6 pb-10 pt-6 text-paper">
                  <div className="mono mb-8 flex justify-between text-paper/60">
                    <span>{franchise.code}</span>
                    <span>{item.when ? countdown(item.when) : relative(item.date)}</span>
                  </div>
                  <h2 className="text-[40px] font-bold uppercase leading-[0.9] tracking-[-0.04em]">{item.title}</h2>
                </Cascade>
                <Cascade i={2}>
                  <p className="mt-7 text-[13px] font-medium uppercase tracking-[0.02em]">
                    {franchise.name} — {franchise.studio}
                  </p>
                </Cascade>
                <Cascade i={3} className="mt-5 grid grid-cols-[96px_1fr] gap-x-4 gap-y-[6px] text-[14px] leading-snug">
                  <span className="text-ink-soft">Type</span>
                  <span>{kindLabel[item.kind]}</span>
                  <span className="text-ink-soft">Status</span>
                  <span>{status}</span>
                  <span className="mt-3 text-ink-soft">Published</span>
                  <span className="mt-3">{dot(item.date)}</span>
                  {item.when ? (
                    <>
                      <span className="text-ink-soft">Starts</span>
                      <span className="text-accent">{dot(item.when)}</span>
                    </>
                  ) : null}
                  <span className="mt-3 text-ink-soft">Source</span>
                  <span className="mt-3">{item.source}</span>
                  <span className="text-ink-soft">Reference</span>
                  <span className="font-mono text-[13px]">UPD-{franchise.code}-{item.id.slice(-4).toUpperCase()}</span>
                </Cascade>
                <Cascade i={4}>
                  <p className="mt-9 text-[20px] leading-[1.3] tracking-[-0.015em]">{item.dek}</p>
                </Cascade>
                {item.body.map((para, i) => (
                  <Cascade key={i} i={5 + i}>
                    <p className="mt-5 max-w-[60ch] text-[16px] leading-[1.55] text-ink/85">{para}</p>
                  </Cascade>
                ))}
                <Cascade i={6 + item.body.length}>
                  <SourceLink item={item} />
                </Cascade>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Floating controls under the thumb (Histok's bottom chrome, squared). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <motion.div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[calc(120px+var(--sab))] bg-gradient-to-t from-ground via-ground/80 to-transparent"
          style={{ opacity: bandOpacity }}
        />
        <motion.div
          className="relative mx-auto flex max-w-[520px] items-center justify-between gap-3 px-4 pb-[calc(var(--sab)+16px)]"
          style={{ y: ctrlY, opacity: ctrlOpacity }}
        >
          <Halo
            label="Back"
            onPress={() => close("button")}
            className="grid h-12 w-12 place-items-center bg-ink text-paper"
            style={{ x: swipeX }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M12.5 4l-6 6 6 6" stroke="currentColor" strokeWidth="2.25" strokeLinecap="square" />
            </svg>
          </Halo>
          <motion.span
            className="mono bg-ground/85 px-3 py-2 text-ink backdrop-blur-md"
            style={{ opacity: sideOpacity }}
          >
            {position}
          </motion.span>
          <motion.div style={{ opacity: sideOpacity }}>
            {source ? (
              <a
                href={source}
                target="_blank"
                rel="noreferrer"
                className="mono pointer-events-auto flex h-12 items-center gap-2 bg-ink px-4 text-paper"
              >
                Source <span aria-hidden>↗</span>
              </a>
            ) : (
              <span className="mono flex h-12 items-center px-4 text-ink-faint">Sample</span>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function SourceLink({ item }: { item: Item }) {
  if (item.mock) {
    return <p className="mono mt-10 border-t border-rule pt-4 text-ink-soft">Sample entry — no source yet</p>;
  }
  if (!item.url) return null;
  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      whileTap={{ scale: 0.98 }}
      transition={springs.popping}
      className="mt-10 flex items-center justify-between border-y border-rule py-4 text-[17px] font-medium"
    >
      <span>Read at {item.source}</span>
      <span aria-hidden>↗</span>
    </motion.a>
  );
}
