"use client";

import { useEffect, useRef } from "react";
import { useVvvInset } from "@/components/vvv/inset";
import { gateUp, leaveGate, onGate } from "@/lib/axis-cube/gate";
import { LOADER_HTML } from "@/lib/axis-cube/loader";
import { pixelPath } from "@/lib/axis-cube/glyph";
import { makeSound, type AxisSound } from "@/lib/axis-cube/sound";

type Look = "a" | "b" | "c";

/** Black between the frame and the phone's bars: the vvv gutter, as --vvv-gutter in the app's stylesheet. */
const GUTTER = 6;
const WORKER = "/kit/axis-cube-sw.js";
/** The phone's bars: the loader's paper while it is up, then the black beyond the room's frame (--load-ground and
 *  --vvv-ground in the app's stylesheet; the layout starts them on paper). */
const BARS_ROOM = "#000000";

/** A line of the machine's letters, each of its pixels `scale` px, in the colour of the text round it. */
function Pixels({ text, scale, label }: { text: string; scale: number; label: string }) {
  const { d, w, h } = pixelPath(text);
  return (
    <svg className="px" role="img" aria-label={label} width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} fill="currentColor">
      <path d={d} />
    </svg>
  );
}
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
 * On a phone a screen can come first (lib/axis-cube/gate.ts): the install screen in a browser the first time, the
 * welcome on iOS every other time. Its markup is in the page as the server sends it, shown or not by a class the
 * page's inline script sets before the first paint. The room is built behind it all the same and the loader waits
 * for it to go, so after the tap the bar runs out quickly and the room comes in to its notes.
 * The sounds (lib/axis-cube/sound.js) belong to the page, not to the scene: the install screen's button is heard
 * too, and its tap is what wakes the audio, so the room that follows is not silent until a second touch.
 * The screen's button is not React's: the page's first script answers it (lib/axis-cube/gate.ts), so it springs
 * and works from the first paint, before this has arrived and while the room is being built. This only hears of it.
 * The scene (three.js and the room) comes in a script of its own, after this one, so that this one is small and
 * quick to take over the page.
 * The version (from the changelog, read when the site is built) shows at the bottom right while a puzzle is being
 * chosen; the list of changes it opens is fetched from the app's changelog page only when it is asked for, with the
 * version in its address so that the service worker lets it through to the network and never shows an older list.
 */
export function Stage({ look = "a", version = "" }: { look?: Look; version?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const loader = useRef<HTMLDivElement>(null);
  const inset = useVvvInset(GUTTER);
  const voice = useRef<AxisSound | null>(null);
  useEffect(() => {
    const made = (voice.current = makeSound());
    try { if (localStorage.getItem("axis-cube-muted") === "1") made.mute(true); } catch { /* sound on */ }   // turned off at the couch's lower left last time: off from the welcome on
    return () => { made.dispose(); if (voice.current === made) voice.current = null; };
  }, []);
  // The screen's button was pressed. Its tap is the touch that lets the page make sound (the page's first script
  // started the audio inside it; this takes it up). If the room is ready behind it, it comes in at once and its
  // notes at the end of loading are the answer to the tap; if not, the tap gets a bolololip of its own and the end
  // of loading its notes when it comes.
  useEffect(
    () => onGate(() => {
      voice.current?.wake();
      if (host.current?.dataset.room !== "ready") voice.current?.select();
    }),
    [],
  );
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
  useEffect(() => {
    let stop: (() => void) | undefined, gone = false;
    import("@/lib/axis-cube/scene").then(({ mountAxisCube }) => {
      if (gone || !host.current) return;
      stop = mountAxisCube(host.current, { look, version, changelog: `${SCOPE}/changelog?v=${version}`, scores: `${SCOPE}/scores`, loader: loader.current ?? undefined, onShown: () => { keepForNextTime(); document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BARS_ROOM); }, sound: voice.current ?? undefined, hold: gateUp });
    });
    return () => { gone = true; stop?.(); };
  }, [look, version]);
  return (
    <>
      <div className="axis-ground">
        <div ref={host} className="axis" style={{ top: inset.top, bottom: inset.bottom }} />
      </div>
      <div ref={loader} className="axis-loader" role="progressbar" aria-label="Cargando" dangerouslySetInnerHTML={{ __html: LOADER_HTML }} />
      <div className="axis-gate" role="dialog" aria-label="The Cubes">
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
        <p className="how hello"><span><Pixels text="THE CUBES" scale={3} label="The Cubes" /></span></p>
        <button type="button" className="ok">
          <span className="listo"><Pixels text="LISTO" scale={2} label="Listo" /></span>
          <span className="instalar"><Pixels text="INSTALAR" scale={2} label="Instalar" /></span>
          <span className="hola"><Pixels text="START" scale={2} label="Start" /></span>
        </button>
      </div>
    </>
  );
}
