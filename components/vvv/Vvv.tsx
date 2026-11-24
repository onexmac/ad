"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { GROW_SPRING } from "@/components/updatr/Grow";
import { useVvvInset } from "./inset";

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
 * Corners near the frame's corners: anything that sits close to one of the
 * frame's corners (a key in a bottom bar, a card against the top) rounds that
 * one corner as the frame's own curve drawn inward by its distance from each
 * edge, like a stroke inside the frame's line: `useVvvCorner(dx, dy)`.
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
        <VvvContext.Provider value={frame}>
          <VvvRadiusContext.Provider value={radius}>{children}</VvvRadiusContext.Provider>
        </VvvContext.Provider>
      </div>
    </div>
  );
}

const VvvContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

const VvvRadiusContext = createContext<number | null>(null);

/** The frame's corner radius, or null outside a vvv frame. */
export function useVvvRadius() {
  return useContext(VvvRadiusContext);
}

/**
 * The corner for something sitting near one of the frame's corners: the frame's
 * curve drawn inward by the element's distance from the side (`dx`) and from the
 * top or bottom (`dy`), so the two lines run parallel, like a stroke inside the
 * frame's. Not the frame's radius, and not one radius for both axes: on a 28 px
 * frame, a key 12 px from the side and 8 px from the bottom gets 16 × 20.
 *
 *   const c = vvvCorner(28, 12, 8); // "16px 20px"
 *   <button style={{ borderBottomLeftRadius: c }} />
 *
 * `min` keeps the corner from going below the element's other corners.
 */
export function vvvCorner(radius: number, dx: number, dy: number, min = 0) {
  return `${Math.max(min, radius - dx)}px ${Math.max(min, radius - dy)}px`;
}

/** `vvvCorner` with the surrounding frame's radius; undefined outside a frame. */
export function useVvvCorner(dx: number, dy: number, min = 0) {
  const radius = useVvvRadius();
  return radius === null ? undefined : vvvCorner(radius, dx, dy, min);
}

/** The frame's scroller: pass it as `container` to anything that reads scroll. */
export function useVvvScroller() {
  return useContext(VvvContext);
}

// Where the frame sits is measured in ./inset (useVvvInset): a file of its own, so that a page can use the measure
// without loading this component.
export { useVvvInset };

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
