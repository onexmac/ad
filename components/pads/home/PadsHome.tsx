"use client";

import type { PortalApp } from "@/lib/apps";
import { AdelanteMark, GLYPH, TechIndex } from "@/components/tech-index/TechIndex";

/**
 * The Pads index: technical minimalism in a vvs (components/tech-index, the
 * look first made here). Each pad's badge draws its gesture.
 */
export function PadsHome({ apps }: { apps: PortalApp[] }) {
  return (
    <TechIndex
      apps={apps}
      base="/ad/pads"
      label={["AD", "PADS", "ÍNDICE"]}
      id="AD-PADS"
      mode="PROTOTIPO"
      motto="Probado en la mano. No en la nube."
      mark={<AdelanteMark className="w-[64px] text-signal" />}
      strip={["AD-2611", "PADS-BANCO"]}
      poster="Banco de prueba"
      kind="pad"
      glyph={(app) => <Glyph slug={app.slug} />}
      colophon={["Losa Flotante × AD Visual.", "Cada pad es un gesto, no una app."]}
      stamp={["estudio visual /", "grid & patrones"]}
      back={{ href: "/", label: "MAGI", path: "/" }}
    />
  );
}

/** Each pad's gesture, drawn small: the +, the slider, the pressed squircle, the bars. */
function Glyph({ slug }: { slug: string }) {
  if (slug === "pad01")
    return (
      <svg {...GLYPH} aria-hidden>
        <path d="M8 2v12M2 8h12" />
      </svg>
    );
  if (slug === "pad02")
    return (
      <svg {...GLYPH} aria-hidden>
        <path d="M1.5 8h13" strokeWidth={1.4} />
        <rect x="8" y="4.5" width="6" height="7" rx="2" fill="currentColor" stroke="none" />
      </svg>
    );
  if (slug === "pad03")
    return (
      <svg {...GLYPH} aria-hidden>
        <rect x="4" y="4" width="8" height="8" rx="2.6" fill="currentColor" stroke="none" />
        <rect x="1.5" y="1.5" width="13" height="13" rx="4.5" strokeWidth={1.2} />
      </svg>
    );
  return (
    <svg {...GLYPH} aria-hidden>
      <path d="M3 14V9M8 14V3M13 14V6" />
    </svg>
  );
}
