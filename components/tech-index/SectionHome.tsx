"use client";

import type { PortalApp, PortalSection } from "@/lib/apps";
import { AdelanteMark, GLYPH, TechIndex } from "./TechIndex";

/** A portal section's index (/ad, /kit) in technical minimalism, in a vvs. */
export function SectionHome({ section }: { section: PortalSection }) {
  const ad = section.slug === "ad";
  const code = section.slug.toUpperCase();
  return (
    <TechIndex
      apps={section.apps}
      base={`/${section.slug}`}
      label={["MAGI", code, "ÍNDICE"]}
      id={`MAGI-${code}`}
      mode={ad ? "OPERACIÓN" : "ESTUDIO"}
      motto={ad ? "Hecho para la obra." : "Lo que leo, juego y sigo."}
      mark={
        ad ? (
          <AdelanteMark className="w-[64px] text-signal" />
        ) : (
          <span className="font-tech text-[34px] font-bold leading-none tracking-[0.04em] text-signal">{code}</span>
        )
      }
      strip={[`${code}-2611`, `${code}-${section.tagline.toUpperCase()}`]}
      poster={section.tagline}
      kind="app"
      glyph={(app) => <Glyph app={app} />}
      colophon={["MAGI × AD Visual.", ad ? "Cada app sale de la obra." : "Herramientas de uso propio."]}
      stamp={["índice /", `magi0s/${section.slug}`]}
      back={{ href: "/", label: "MAGI", path: "/" }}
    />
  );
}

/** Each app drawn small, in the pads' manner. */
function Glyph({ app }: { app: PortalApp }) {
  switch (app.slug) {
    case "puncheo": // a punch: the crosshair on a mark
      return (
        <svg {...GLYPH} aria-hidden>
          <circle cx="8" cy="8" r="5" strokeWidth={1.6} />
          <path d="M8 1v3M8 12v3M1 8h3M12 8h3" strokeWidth={1.6} />
        </svg>
      );
    case "pad01": // the green + that opens into Nuevo usuario
      return (
        <svg {...GLYPH} aria-hidden>
          <path d="M8 2v12M2 8h12" />
        </svg>
      );
    case "pad02": // the slider, ready to slide
      return (
        <svg {...GLYPH} aria-hidden>
          <path d="M1.5 8h13" strokeWidth={1.4} />
          <rect x="8" y="4.5" width="6" height="7" rx="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "pad03": // the pressed squircle
      return (
        <svg {...GLYPH} aria-hidden>
          <rect x="4" y="4" width="8" height="8" rx="2.6" fill="currentColor" stroke="none" />
          <rect x="1.5" y="1.5" width="13" height="13" rx="4.5" strokeWidth={1.2} />
        </svg>
      );
    case "kpi": // the bars
      return (
        <svg {...GLYPH} aria-hidden>
          <path d="M3 14V9M8 14V3M13 14V6" />
        </svg>
      );
    case "histok": // history: an hourglass
      return (
        <svg {...GLYPH} aria-hidden>
          <path d="M3.5 2h9M3.5 14h9M4.5 2c0 4 7 4 7 12M11.5 2c0 4-7 4-7 12" strokeWidth={1.6} />
        </svg>
      );
    case "updatr": // what's new: the reload loop
      return (
        <svg {...GLYPH} aria-hidden>
          <path d="M13 8a5 5 0 1 1-1.5-3.5" strokeWidth={1.8} />
          <path d="M12 1.5v3.5H8.5" strokeWidth={1.8} />
        </svg>
      );
    case "noticss": // the paper: a headline and columns
      return (
        <svg {...GLYPH} aria-hidden>
          <path d="M2 3h12" strokeWidth={2.4} />
          <path d="M2 7.5h5M2 10.5h5M2 13.5h5M9 7.5h5M9 10.5h5M9 13.5h5" strokeWidth={1.3} />
        </svg>
      );
    case "axis-cube": // a cube, drawn iso
      return (
        <svg {...GLYPH} aria-hidden>
          <path d="M8 1.5l5.5 3.2v6.6L8 14.5l-5.5-3.2V4.7z" strokeWidth={1.5} strokeLinejoin="round" />
          <path d="M2.5 4.7L8 8l5.5-3.3M8 8v6.5" strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
      );
    default: // an arrow out
      return (
        <svg {...GLYPH} aria-hidden>
          <path d="M3 13L13 3M6 3h7v7" />
        </svg>
      );
  }
}
