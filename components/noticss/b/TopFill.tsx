"use client";

import { alpha } from "@/lib/noticss/tone";

/**
 * The top of the screen, under the status bar: the content runs up into it,
 * blurred, so there is no band and no cut-out corner (the open page's round
 * top corners melt into it too). Tinted with the colour at the top of what is
 * showing, and fading out into the sharp content below.
 */
export function TopFill({ tone, hidden = false }: { tone: string; hidden?: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[38] transition-opacity duration-300"
      style={{
        height: "calc(var(--sat) + 40px)",
        opacity: hidden ? 0 : 1,
        backdropFilter: "blur(22px) saturate(1.5)",
        WebkitBackdropFilter: "blur(22px) saturate(1.5)",
        background: `linear-gradient(180deg, ${alpha(tone, 0.6)} 0%, ${alpha(tone, 0.35)} calc(var(--sat) + 4px), ${alpha(tone, 0)} 100%)`,
        maskImage: "linear-gradient(180deg, #000 0%, #000 calc(var(--sat) + 6px), transparent 100%)",
        WebkitMaskImage: "linear-gradient(180deg, #000 0%, #000 calc(var(--sat) + 6px), transparent 100%)",
        transition: "background 320ms ease, opacity 300ms ease",
      }}
    />
  );
}
