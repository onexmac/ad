/** The bookmark: a hairline flag, filled when the entry is followed. */
export function Bookmark({ on, size = "1em", weight = 1.5 }: { on: boolean; size?: string; weight?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill={on ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      focusable="false"
      style={{ display: "inline-block", flexShrink: 0 }}
    >
      <path d="M4 2.25H12V14L8 10.75L4 14Z" />
    </svg>
  );
}
