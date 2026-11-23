import type { CSSProperties } from "react";

type Kept = { style: { fontFamily: string } };

/**
 * The fonts come from the repository's own dependencies (the Fontsource packages), not from Google while building:
 * that fetch failed at random and took whole deployments down with it.
 *
 * Each layout loads the latin file of a family with `next/font/local`, so it is preloaded and has a matched
 * fallback as before, and imports the family's stylesheet for every other script, which a browser fetches only
 * when a page uses a character from one.
 *
 * This writes the CSS variables a layout puts on `<html>`: the kept latin font first, then the full family, then
 * the fallback.
 */
export function fontVars(vars: Record<string, [Kept, string]>): CSSProperties {
  const out: Record<string, string> = {};
  for (const [name, [font, family]] of Object.entries(vars)) {
    const [first, ...rest] = font.style.fontFamily.split(",").map((s) => s.trim());
    out[name] = [first, `"${family}"`, ...rest].join(", ");
  }
  return out as CSSProperties;
}
