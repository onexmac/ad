"use client";

import { useEffect, useRef } from "react";
import { useVvvInset } from "@/components/vvv/inset";
import { LOADER_HTML } from "@/lib/axis-cube/loader";
import { mountAxisCube } from "@/lib/axis-cube/scene";

type Look = "a" | "b" | "c";

/** Black between the frame and the phone's bars: the vvv gutter, as --vvv-gutter in the app's stylesheet. */
const GUTTER = 6;
const WORKER = "/kit/axis-cube-sw.js";
const SCOPE = "/kit/axis-cube";

/** Once the room is on screen, the service worker is told what this page loaded, so it keeps exactly that for next time. */
function keepForNextTime() {
  if (!("serviceWorker" in navigator)) return;
  const urls = [location.pathname, ...performance.getEntriesByType("resource").map((r) => r.name)];
  navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage({ type: "keep", urls })).catch(() => {});
}

/**
 * On a slow network the service worker shows the kept copy of the page at once and fetches the current one behind
 * it. If that turns out to be a newer version, the worker says so, and the page starts over on it, but only in
 * its first seconds and only if nobody has touched it yet: never under the fingers of someone already playing.
 * It asks as well as listens, because the worker's word can come before this is listening.
 */
function startOverIfNewer() {
  if (!("serviceWorker" in navigator)) return () => {};
  const opened = Date.now() - performance.now();
  let touched = false;
  const touch = () => { touched = true; };
  const heard = (e: MessageEvent) => {
    if (e.data?.type !== "fresh" || e.data.path !== location.pathname) return;
    if (touched || Date.now() - opened > 12000) return;
    try {
      const last = Number(sessionStorage.getItem("axis-fresh") || 0);
      if (Date.now() - last < 30000) return;               // once, not round and round
      sessionStorage.setItem("axis-fresh", String(Date.now()));
    } catch { /* no storage: the worker answers "same" after one reload anyway */ }
    location.reload();
  };
  const ask = () => navigator.serviceWorker.controller?.postMessage({ type: "fresh?", path: location.pathname, since: opened });
  window.addEventListener("pointerdown", touch, { capture: true, once: true });
  navigator.serviceWorker.addEventListener("message", heard);
  navigator.serviceWorker.startMessages();
  ask();
  const timers = [1500, 4000, 8000].map((ms) => setTimeout(ask, ms));
  return () => {
    window.removeEventListener("pointerdown", touch, { capture: true });
    navigator.serviceWorker.removeEventListener("message", heard);
    timers.forEach(clearTimeout);
  };
}

/**
 * The room and its puzzles, behind a loading screen. The loader is plain markup and CSS, so it is in the page as the
 * server sends it, its cube already flipping and its bar already filling before any script arrives; the scene
 * finishes the bar and lifts it. Its markup is a string the scene later reaches into, so React is told to leave
 * what is inside alone.
 * A service worker keeps the page, its scripts and the room's photographs on the device, so the app opens from the
 * home screen without waiting for the network.
 * The room is a vvv (docs/ux-playbook.md): a rounded frame on a black ground, clear of the status bar and of
 * whatever the browser keeps at the bottom: the short fit, vvs. It is a canvas and not a scrolling page, so the
 * frame is the app's own (its stylesheet) and where it sits is the Vvv component's own measuring.
 */
export function Stage({ look = "a" }: { look?: Look }) {
  const host = useRef<HTMLDivElement>(null);
  const loader = useRef<HTMLDivElement>(null);
  const inset = useVvvInset(GUTTER);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(WORKER, { scope: SCOPE }).catch(() => {});
    return startOverIfNewer();
  }, []);
  useEffect(
    () => (host.current ? mountAxisCube(host.current, { look, loader: loader.current ?? undefined, onShown: keepForNextTime }) : undefined),
    [look],
  );
  return (
    <>
      <div className="axis-ground">
        <div ref={host} className="axis" style={{ top: inset.top, bottom: inset.bottom }} />
      </div>
      <div ref={loader} className="axis-loader" role="progressbar" aria-label="Cargando" dangerouslySetInnerHTML={{ __html: LOADER_HTML }} />
    </>
  );
}
