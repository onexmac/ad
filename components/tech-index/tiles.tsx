"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { animate } from "motion/react";
import { useVvvScroller } from "@/components/vvv/Vvv";

/**
 * Tiles: the squares of a technical-minimalism index, and how the page comes
 * and goes.
 *
 * Coming in (on load, and when Safari brings the page back from its cache):
 * the squares in the frame spring in one by one, in a random order. Squares
 * below the fold are simply there; the scroll's Grow brings them up.
 *
 * Going out (a tap on an entry or on the way back): the squares in the frame
 * shrink and fade on a spring, one by one in a random order, and the tapped
 * one goes last. Then the page leaves: inside the index shell (/, /ad, /kit,
 * one root layout) by the router, so the next index springs in without a
 * reload; anywhere else by a plain navigation.
 *
 * A tile is hidden until its entrance plays (`[data-tile]` in tech.css), so
 * nothing shows before the page is ready to move.
 */

/** The pages that share the (index) root layout: a move between them is client-side. */
const INDEX_SHELL = new Set(["/", "/ad", "/kit"]);

// Coming in: a little overshoot on the scale, the fade quick.
const IN_SCALE = { type: "spring", stiffness: 360, damping: 21, mass: 0.9 } as const;
const IN_FADE = { duration: 0.24, ease: [0.2, 0.8, 0.3, 1] } as const;
const IN_FROM = 0.86;
const IN_STEP = 0.045; // s between squares

// Going out: shrink on a spring that dips past its mark, the fade a beat behind.
const OUT_SCALE = { type: "spring", stiffness: 420, damping: 24, mass: 0.9 } as const;
const OUT_FADE = { duration: 0.2, ease: [0.4, 0, 0.9, 0.6] } as const;
const OUT_TO = 0.78;
const OUT_FADE_LAG = 0.06; // s: the shrink reads before the fade takes it
const OUT_SPREAD = 0.28; // s over which the other squares leave
const OUT_TAPPED_PAUSE = 0.08; // s between the last of them and the tapped one

type Tile = { el: HTMLElement; group: string };
type Stage = {
  register: (el: HTMLElement, group: string) => () => void;
  leave: (group: string, href: string) => void;
  prime: (href: string) => void;
};

const StageContext = createContext<Stage | null>(null);
const GroupContext = createContext("");

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Is the square inside the frame's edges? */
function onScreen(el: HTMLElement, frame: HTMLElement | null | undefined) {
  const f = frame?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
  const r = el.getBoundingClientRect();
  return r.height > 0 && r.bottom > f.top && r.top < f.bottom;
}

/** Bring the squares in: those in the frame one by one at random, the rest at once. */
function enter(tiles: Iterable<Tile>, frame: HTMLElement | null | undefined) {
  const all = [...tiles];
  const show = (el: HTMLElement) => {
    el.dataset.tileOn = "";
    el.style.opacity = "";
    el.style.transform = "";
  };
  if (reduced()) return all.forEach((t) => show(t.el));
  const seen = shuffle(all.filter((t) => onScreen(t.el, frame)));
  all.filter((t) => !seen.includes(t)).forEach((t) => show(t.el));
  seen.forEach(({ el }, i) => {
    const delay = i * IN_STEP;
    // Inline start values hold it hidden until its turn; the attribute lets it stay once they're cleared.
    el.style.opacity = "0";
    el.style.transform = `scale(${IN_FROM})`;
    el.dataset.tileOn = "";
    animate(el, { opacity: [0, 1] }, { ...IN_FADE, delay });
    animate(el, { scale: [IN_FROM, 1] }, { ...IN_SCALE, delay }).then(() => show(el));
  });
}

function shuffle<T>(list: T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Holds the page's tiles; lives inside the vvv frame, whose edges decide which squares are on screen. */
export function TileStage({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const frame = useVvvScroller();
  const tiles = useRef(new Set<Tile>());
  const leaving = useRef(false);

  useEffect(() => {
    // Every tile has registered (children's effects run first): bring them in.
    leaving.current = false;
    enter(tiles.current, frame?.current);
    // Back from another page, Safari restores this one as it was left: emptied. Bring it in again.
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      leaving.current = false;
      enter(tiles.current, frame?.current);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [frame]);

  // Rebuilt each render: the stage renders only when the path changes, and its tiles re-register then.
  const sameShell = (href: string) => INDEX_SHELL.has(pathname) && INDEX_SHELL.has(href);
  const stage: Stage = {
    register(el, group) {
      const t = { el, group };
      tiles.current.add(t);
      return () => void tiles.current.delete(t);
    },
    prime(href) {
      if (sameShell(href)) router.prefetch(href);
    },
    leave(group, href) {
      if (leaving.current) return;
      leaving.current = true;
      const go = () => (sameShell(href) ? router.push(href) : window.location.assign(href));
      if (reduced()) return go();

      const all = [...tiles.current];
      const seen = all.filter((t) => onScreen(t.el, frame?.current));
      // Off screen: gone at once, so a bounce shows nothing behind.
      all.filter((t) => !seen.includes(t)).forEach((t) => (t.el.style.opacity = "0"));
      const tapped = seen.filter((t) => t.group === group);
      const others = shuffle(seen.filter((t) => t.group !== group));
      const step = others.length > 1 ? Math.min(0.042, Math.max(0.022, OUT_SPREAD / (others.length - 1))) : 0;
      const out = (el: HTMLElement, delay: number) => {
        animate(el, { scale: [1, OUT_TO] }, { ...OUT_SCALE, delay });
        return animate(el, { opacity: [1, 0] }, { ...OUT_FADE, delay: delay + OUT_FADE_LAG });
      };
      others.forEach((t, i) => out(t.el, i * step));
      const last = others.length ? (others.length - 1) * step + OUT_TAPPED_PAUSE : 0;
      const ends = tapped.map((t) => out(t.el, last));
      // Leave once the tapped square has faded (or at once if it wasn't on screen); never wait past a second.
      const done = ends.length ? Promise.all(ends) : new Promise((r) => setTimeout(r, (last + 0.2) * 1000));
      let went = false;
      const once = () => {
        if (went) return;
        went = true;
        go();
      };
      done.then(once);
      setTimeout(once, 1000);
    },
  };

  return <StageContext.Provider value={stage}>{children}</StageContext.Provider>;
}

/** One square. Hidden until the stage brings it in. */
export function Tile({ className, style, children }: { className?: string; style?: CSSProperties; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const stage = useContext(StageContext);
  const group = useContext(GroupContext);
  useEffect(() => {
    if (!ref.current || !stage) return;
    return stage.register(ref.current, group);
  }, [stage, group]);
  return (
    <div ref={ref} data-tile className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * A link whose tap empties the page first: every square inside it belongs to
 * its group, and goes last. Modified clicks (new tab, and so on) go straight
 * through.
 */
export function TileLink({
  href,
  group,
  className,
  children,
}: {
  href: string;
  group: string;
  className?: string;
  children: ReactNode;
}) {
  const stage = useContext(StageContext);
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!stage || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    stage.leave(group, href);
  };
  return (
    <Link href={href} prefetch={false} className={className} onClick={onClick} onPointerDown={() => stage?.prime(href)}>
      <GroupContext.Provider value={group}>{children}</GroupContext.Provider>
    </Link>
  );
}
