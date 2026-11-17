/**
 * Hairline arrows, drawn rather than typed: arrow characters (↘ ↗) fall back
 * to colour emoji on iOS when the font lacks them. Square caps, mitred joints.
 * - turn: down, then a right angle to the right (the Scandinavian ↳).
 * - out: up and away (leaves the app).
 * - left / right: step through a strip.
 */
const PATHS = {
  turn: "M3.5 2.5V11.5H13M9.75 8.25L13 11.5L9.75 14.75",
  out: "M4 12L11.5 4.5M5.5 4H12V10.5",
  right: "M2 8H13.5M9.75 4.25L13.5 8L9.75 11.75",
  left: "M14 8H2.5M6.25 4.25L2.5 8L6.25 11.75",
} as const;

export function Arrow({
  dir,
  className,
  weight = 1.5,
}: {
  dir: keyof typeof PATHS;
  className?: string;
  weight?: number;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="0.85em"
      height="0.85em"
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      focusable="false"
      className={className}
      // Sits on the baseline like a typed glyph.
      style={{ display: "inline-block", verticalAlign: "-0.12em", flexShrink: 0 }}
    >
      <path d={PATHS[dir]} />
    </svg>
  );
}
