"use client";

import { useEffect, useRef } from "react";
import { mountAxisCube } from "@/lib/axis-cube/scene";

type Look = "a" | "b" | "c";

const WORKER = "/kit/axis-cube-sw.js";
const SCOPE = "/kit/axis-cube";

/** Once the room is on screen, the service worker is told what this page loaded, so it keeps exactly that for next time. */
function keepForNextTime() {
  if (!("serviceWorker" in navigator)) return;
  const urls = [location.pathname, ...performance.getEntriesByType("resource").map((r) => r.name)];
  navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage({ type: "keep", urls })).catch(() => {});
}

/**
 * The room and its puzzles, behind a loading screen. The loader is plain markup and CSS, so it is in the page as the
 * server sends it and its bar is already filling before any script arrives; the scene finishes the bar and lifts it.
 * A service worker keeps the page, its scripts and the room's photographs on the device, so the app opens from the
 * home screen without waiting for the network.
 */
export function Stage({ look = "a" }: { look?: Look }) {
  const host = useRef<HTMLDivElement>(null);
  const loader = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register(WORKER, { scope: SCOPE }).catch(() => {});
    }
  }, []);
  useEffect(
    () => (host.current ? mountAxisCube(host.current, { look, loader: loader.current ?? undefined, onShown: keepForNextTime }) : undefined),
    [look],
  );
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
