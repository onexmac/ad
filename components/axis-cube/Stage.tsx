"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useVvvInset } from "@/components/vvv/inset";
import { gateUp, leaveGate, passGate, subscribeGate } from "@/lib/axis-cube/gate";
import { LOADER_HTML } from "@/lib/axis-cube/loader";
import { mountAxisCube } from "@/lib/axis-cube/scene";
import { makeSound, type AxisSound } from "@/lib/axis-cube/sound";

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
 * On a phone, in a browser, the install screen comes first (lib/axis-cube/gate.ts): its markup is in the page as the
 * server sends it, shown or not by a class the page's inline script sets before the first paint. While it is up
 * the room is not built: the scene would take the main thread, and the button has to answer at once.
 * The sounds (lib/axis-cube/sound.js) belong to the page, not to the scene: the install screen's button is heard
 * too, and its tap is what wakes the audio, so the room that follows is not silent until a second touch.
 */
export function Stage({ look = "a" }: { look?: Look }) {
  const host = useRef<HTMLDivElement>(null);
  const loader = useRef<HTMLDivElement>(null);
  const inset = useVvvInset(GUTTER);
  // on the server, and until the page has looked, the screen counts as up: nothing is built in the meantime
  const gated = useSyncExternalStore(subscribeGate, gateUp, () => true);
  const voice = useRef<AxisSound | null>(null);
  useEffect(() => {
    const made = (voice.current = makeSound());
    return () => { made.dispose(); if (voice.current === made) voice.current = null; };
  }, []);
  useEffect(() => {
    // installed from the browser's own menu while the screen was up: there is nothing left to ask
    window.addEventListener("appinstalled", leaveGate);
    return () => window.removeEventListener("appinstalled", leaveGate);
  }, []);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(WORKER, { scope: SCOPE }).catch(() => {});
    return startOverIfNewer();
  }, []);
  useEffect(
    () => (host.current && !gated ? mountAxisCube(host.current, { look, loader: loader.current ?? undefined, onShown: keepForNextTime, sound: voice.current ?? undefined }) : undefined),
    [look, gated],
  );
  return (
    <>
      <div className="axis-ground">
        <div ref={host} className="axis" style={{ top: inset.top, bottom: inset.bottom }} />
      </div>
      <div ref={loader} className="axis-loader" role="progressbar" aria-label="Cargando" dangerouslySetInnerHTML={{ __html: LOADER_HTML }} />
      <div className="axis-gate" role="dialog" aria-label="Instalar The Cubes">
        {/* eslint-disable-next-line @next/next/no-img-element -- the app's own icon, as it is on the home screen */}
        <img className="mark" src="/kit/axis-cube/icon-512.png" alt="" width={512} height={512} draggable={false} />
        <p className="how ios">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 15V3.5M8 7l4-4 4 4M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7a1.5 1.5 0 0 0-1.5-1.5H16" />
          </svg>
          <span>Compartir → Agregar a inicio</span>
        </p>
        <p className="how android">
          <span>⋮ → Agregar a pantalla principal</span>
        </p>
        <button type="button" className="ok" onClick={() => { voice.current?.wake(); voice.current?.select(); passGate(); }}>
          <span className="listo">Listo</span>
          <span className="instalar">Instalar</span>
        </button>
      </div>
    </>
  );
}
