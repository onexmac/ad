/** The machine's letters: 5 × 7 pixels, a row a number, the left pixel the high bit. */
export const GLYPH: Record<string, number[]>;
/** A line of the letters as one SVG path in the letters' own pixels, for a viewBox of w by h (7). */
export function pixelPath(text: string): { d: string; w: number; h: number };
