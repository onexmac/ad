"use client";

import type { PortalApp, PortalSection } from "@/lib/apps";
import { AdelanteMark, GLYPH, TechIndex } from "./TechIndex";

/** The portal's front page (/): its sections as entries, in technical minimalism, in a vvs. */
export function PortalHome({ sections }: { sections: PortalSection[] }) {
  const entries: PortalApp[] = sections.map((s) => ({
    slug: s.slug,
    name: s.name,
    description: s.tagline,
    apps: s.apps,
  }));
  return (
    <TechIndex
      apps={entries}
      base=""
      label={["MAGI", "PORTAL", "ÍNDICE"]}
      id="MAGI-0S"
      mode="PORTAL"
      motto="Todo vive acá."
      mark={<span className="font-tech text-[30px] font-bold leading-none tracking-[0.04em] text-signal">MAGI</span>}
      strip={["MAGI-2611", "MAGI-PORTAL"]}
      poster="MAGI"
      kind="dir"
      glyph={(app) => <Glyph slug={app.slug} />}
      colophon={["MAGI × AD Visual.", "Kit: mío. AD: la obra."]}
      stamp={["índice /", "magi0s"]}
    />
  );
}

function Glyph({ slug }: { slug: string }) {
  if (slug === "ad") return <AdelanteMark className="w-[20px]" />;
  // Kit: a toolbox, a handle on a case.
  return (
    <svg {...GLYPH} aria-hidden>
      <path d="M6 5V3h4v2" strokeWidth={1.6} />
      <rect x="1.5" y="5" width="13" height="9" rx="2" strokeWidth={1.6} />
      <path d="M1.5 9h13" strokeWidth={1.6} />
    </svg>
  );
}
