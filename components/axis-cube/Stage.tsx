"use client";

import { useEffect, useRef } from "react";
import { mountAxisCube } from "@/lib/axis-cube/scene";

type Look = "a" | "b" | "c";

/**
 * The room and its puzzles, behind a loading screen. The loader is plain markup and CSS, so it is in the page as the
 * server sends it and its bar is already filling before any script arrives; the scene finishes the bar and lifts it.
 */
export function Stage({ look = "a" }: { look?: Look }) {
  const host = useRef<HTMLDivElement>(null);
  const loader = useRef<HTMLDivElement>(null);
  useEffect(() => (host.current ? mountAxisCube(host.current, { look, loader: loader.current ?? undefined }) : undefined), [look]);
  return (
    <>
      <div ref={host} className="axis" />
      <div ref={loader} className="axis-loader" role="progressbar" aria-label="Cargando">
        <span className="bar">
          <span className="track">
            <i />
          </span>
        </span>
      </div>
    </>
  );
}
