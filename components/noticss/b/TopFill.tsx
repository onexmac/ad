"use client";

/**
 * How the top of the screen (behind the status bar) is filled:
 * - none: the page itself runs up behind it (the cover on the tray, an open
 *   page's photo, the gallery).
 * - solid: a page is open and scrolled past its photo: a band in the page's
 *   own paper keeps the words below the cut.
 */
export type FillMode = "solid" | "none";

export function TopFill({ tone, mode }: { tone: string; mode: FillMode }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-[38]"
      style={{
        height: "var(--sat)",
        background: tone,
        opacity: mode === "solid" ? 1 : 0,
        transition: "background 240ms ease, opacity 160ms ease",
      }}
    />
  );
}
