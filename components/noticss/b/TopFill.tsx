"use client";

import { alpha } from "@/lib/noticss/tone";

/**
 * How the top of the screen (under the status bar) is filled:
 * - blur: on the tray, the cover runs up into it, blurred and tinted with
 *   its own top colour, fading into the sharp cover below.
 * - solid: a page is open and scrolled past its photo: a band in the page's
 *   own paper keeps the words below the cut.
 * - none: the open page's photo (or the gallery) fills it by itself.
 */
export type FillMode = "blur" | "solid" | "none";

export function TopFill({ tone, mode }: { tone: string; mode: FillMode }) {
  const blur = mode === "blur";
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[38]"
        style={{
          height: "calc(var(--sat) + 40px)",
          opacity: blur ? 1 : 0,
          backdropFilter: "blur(22px) saturate(1.5)",
          WebkitBackdropFilter: "blur(22px) saturate(1.5)",
          background: `linear-gradient(180deg, ${alpha(tone, 0.6)} 0%, ${alpha(tone, 0.35)} calc(var(--sat) + 4px), ${alpha(tone, 0)} 100%)`,
          maskImage: "linear-gradient(180deg, #000 0%, #000 calc(var(--sat) + 6px), transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, #000 0%, #000 calc(var(--sat) + 6px), transparent 100%)",
          transition: "background 320ms ease, opacity 220ms ease",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[38]"
        style={{
          height: "var(--sat)",
          background: tone,
          opacity: mode === "solid" ? 1 : 0,
          transition: "background 240ms ease, opacity 160ms ease",
        }}
      />
    </>
  );
}
