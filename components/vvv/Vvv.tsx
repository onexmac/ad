"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { GROW_SPRING } from "@/components/updatr/Grow";

/**
 * vvv: the vintage vignette viewport.
 *
 * The page is a rounded frame on a black screen. The document never scrolls:
 * the frame does, inside itself. It sits below the status bar and above
 * whatever the browser keeps at the bottom (Safari's bar, or the home
 * indicator), so everything beyond its edge is black and nothing of the page
 * shows there: not under either bar, not past the corners, not in the bounce.
 *
 * Beyond the frame is always black. The layout that uses it must make the
 * ground black too: `html, body` background black, `themeColor: "#000000"`,
 * `viewportFit: "cover"`. The frame's own surface (its gutters) can be any
 * colour: give it through `className`.
 *
 * Two fits:
 *   vvs (short, the default): the frame starts below the status bar, so the
 *     Dynamic Island sits in the black and is hidden in it. All four corners
 *     are rounded.
 *   vvt (tall): the frame runs up to the top of the screen, with no top curve
 *     (the phone's own corners round it), so the page shows around the Dynamic
 *     Island. The content starts below the status bar, and snap stops land
 *     there; it scrolls on up under the island.
 * Both end above Safari's bottom bar.
 *
 * How to use it, and what not to do: docs/ux-playbook.md, "vvv".
 */
export type VvvFit = "short" | "tall";

/** vvs: the short vvv (the frame starts below the status bar). */
export function Vvs(props: Omit<Parameters<typeof Vvv>[0], "fit">) {
  return <Vvv {...props} fit="short" />;
}

/** vvt: the tall vvv (the frame runs up to the screen's top; the Dynamic Island shows). */
export function Vvt(props: Omit<Parameters<typeof Vvv>[0], "fit">) {
  return <Vvv {...props} fit="tall" />;
}

export function Vvv({
  children,
  fit = "short",
  radius = 32,
  gutter = 6,
  maxWidth,
  snap = false,
  className = "",
}: {
  children: ReactNode;
  /** vvs ("short", default) or vvt ("tall"). */
  fit?: VvvFit;
  /** The frame's corner radius. Keep it ≥ the panels' radius + the padding between. */
  radius?: number;
  /** Black between the frame and the status bar, and between it and the bottom bar. */
  gutter?: number;
  /** A phone-wide column on larger screens. */
  maxWidth?: number;
  /** Mandatory snap on the frame: children mark their stops with `snap-start`. */
  snap?: boolean;
  /** On the frame's scroller: its surface colour, for one. */
  className?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const inset = useVvvInset(gutter);
  const tall = fit === "tall";
  useLockDocument();

  return (
    <div className="fixed inset-x-0 top-0 h-[100lvh] overflow-hidden" style={{ background: "#000" }}>
      <div
        ref={frame}
        data-vvv
        className={`absolute inset-x-0 mx-auto overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          snap ? "snap-y snap-mandatory" : ""
        } ${className}`}
        style={{
          top: tall ? 0 : inset.top,
          bottom: inset.bottom,
          maxWidth,
          // vvt has no top curve: the phone's own corners round the top.
          borderRadius: tall ? `0 0 ${radius}px ${radius}px` : radius,
          // A clip path as well as the radius: Safari won't clip composited
          // children (anything animating a transform) to a scroller's radius.
          clipPath: tall ? `inset(0 round 0 0 ${radius}px ${radius}px)` : `inset(0 round ${radius}px)`,
          // vvt: the content (and every snap stop) starts below the status bar.
          paddingTop: tall ? inset.sat : undefined,
          scrollPaddingTop: tall ? inset.sat : undefined,
        }}
      >
        <VvvContext.Provider value={frame}>{children}</VvvContext.Provider>
      </div>
    </div>
  );
}

const VvvContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

/** The frame's scroller: pass it as `container` to anything that reads scroll. */
export function useVvvScroller() {
  return useContext(VvvContext);
}

/**
 * Where the frame sits. Top (vvs): the status bar (safe-area top) + gutter;
 * `sat` is the status bar alone, for vvt's content. Bottom:
 * Safari's bar + gutter, where the bar is the largest of what the small and
 * dynamic viewports and the visual viewport leave out of the large one, or the
 * home indicator (safe-area bottom) when there is no bar. Re-measured on
 * resize and as the visual viewport changes.
 */
export function useVvvInset(gutter = 6) {
  const [inset, setInset] = useState({ top: gutter, bottom: gutter, sat: 0 });
  useLayoutEffect(() => {
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;" +
      "padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)";
    const lvh = document.createElement("div");
    const svh = document.createElement("div");
    const dvh = document.createElement("div");
    for (const [el, h] of [[lvh, "100lvh"], [svh, "100svh"], [dvh, "100dvh"]] as const) {
      el.style.cssText = `position:fixed;left:0;top:0;width:0;height:${h};visibility:hidden;pointer-events:none`;
      document.body.appendChild(el);
    }
    document.body.appendChild(probe);
    const measure = () => {
      const cs = getComputedStyle(probe);
      const sat = parseFloat(cs.paddingTop) || 0;
      const sab = parseFloat(cs.paddingBottom) || 0;
      const L = lvh.getBoundingClientRect().height;
      const seen = window.visualViewport?.height ?? window.innerHeight;
      const bar = Math.max(0, L - svh.getBoundingClientRect().height, L - dvh.getBoundingClientRect().height, L - seen);
      setInset({ top: Math.round(sat + gutter), bottom: Math.round(Math.max(bar, sab) + gutter), sat: Math.round(sat) });
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      for (const el of [probe, lvh, svh, dvh]) el.remove();
    };
  }, [gutter]);
  return inset;
}

/** The document behind the frame must not scroll or bounce. */
function useLockDocument() {
  useEffect(() => {
    const html = document.documentElement;
    const prev = [html.style.overflow, html.style.overscrollBehavior, document.body.style.overflow];
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    return () => {
      [html.style.overflow, html.style.overscrollBehavior, document.body.style.overflow] = prev;
    };
  }, []);
}

/**
 * Noticss A's Grow, measured against the frame instead of the window: a block
 * grows into place on a spring as it comes up from the frame's bottom, and
 * shrinks back the same way going down.
 */
export function VvvGrow({ children, className, lag = 0 }: { children: ReactNode; className?: string; lag?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const container = useVvvScroller() ?? undefined;
  const { scrollYProgress } = useScroll({
    container,
    target: ref,
    offset: ["start end", `start ${80 - lag * 4}%`],
  });
  const p = useSpring(scrollYProgress, GROW_SPRING);
  const scale = useTransform(p, [0, 1], [0.94, 1], { clamp: false });
  const y = useTransform(p, [0, 1], [18, 0], { clamp: false });
  const opacity = useTransform(p, [0, 1], [0.35, 1]);
  return (
    <motion.div ref={ref} className={className} style={{ scale, y, opacity, transformOrigin: "50% 100%" }}>
      {children}
    </motion.div>
  );
}
