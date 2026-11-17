// Hairline icons: square caps, mitred joins. Never typed glyphs (iOS turns
// arrows into emoji).

type P = { size?: number; className?: string; strokeWidth?: number };

const base = (size: number, sw: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: sw,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
  "aria-hidden": true,
});

export function CheckIcon({ size = 18, className, strokeWidth = 2 }: P) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function CrossIcon({ size = 18, className, strokeWidth = 2 }: P) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

/** Pass with a warning: a check carrying a bar. */
export function WarnIcon({ size = 18, className, strokeWidth = 2 }: P) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M12 5v9M12 18.5v.5" />
    </svg>
  );
}

export function NaIcon({ size = 18, className, strokeWidth = 1.6 }: P) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M6.8 17.2L17.2 6.8" />
    </svg>
  );
}

/** One chevron per step of the swipe: one is short, two is long. */
export function Chevrons({ dir, count, size = 14, className }: { dir: "left" | "right"; count: 1 | 2; size?: number; className?: string }) {
  const w = count === 2 ? size * 1.5 : size;
  const pts = dir === "right" ? ["M3 5l7 7-7 7", "M10 5l7 7-7 7"] : ["M14 5l-7 7 7 7", "M21 5l-7 7 7 7"];
  return (
    <svg
      width={w}
      height={size}
      viewBox={`0 0 ${count === 2 ? 22 : 14} 24`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden
    >
      {dir === "right" ? (
        <>
          <path d={pts[0]} />
          {count === 2 ? <path d={pts[1]} /> : null}
        </>
      ) : count === 2 ? (
        <>
          <path d={pts[0]} />
          <path d={pts[1]} />
        </>
      ) : (
        <path d="M11 5l-7 7 7 7" />
      )}
    </svg>
  );
}

export function CameraIcon({ size = 14, className }: P) {
  return (
    <svg {...base(size, 1.5)} className={className}>
      <path d="M3.5 7.5h4l1.5-2h6l1.5 2h4v11h-17z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function LockIcon({ size = 14, className }: P) {
  return (
    <svg {...base(size, 1.5)} className={className}>
      <path d="M6 11h12v8.5H6zM8.5 11V8a3.5 3.5 0 017 0v3" />
    </svg>
  );
}
