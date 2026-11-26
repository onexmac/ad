"use client";

import { useEffect, useRef, useState } from "react";
import { useVvvInset } from "@/components/vvv/inset";
import { haptic } from "@/lib/histok/haptic";
import { DEFAULT_PAINT, PAINTS } from "@/lib/ex30/paints";
import type { Ex30, Ex30View } from "@/lib/ex30/scene";

const GUTTER = 6;
const VIEWS: [Ex30View, string][] = [["front34", "3/4"], ["front", "Frente"], ["side", "Lado"], ["rear34", "Atrás"], ["top", "Arriba"]];
const PAINT_MAP = Object.fromEntries(PAINTS.map((p) => [p.id, { color: p.color, metal: p.metal, rough: p.rough }]));

/**
 * The garage: the car on its stage, and below it the controls. The stage and the controls are two panels in a vvs
 * frame (docs/ux-playbook.md). The car is built in the browser from its traced lines (lib/ex30/model), in slices,
 * while the loader's bar fills; three.js and the model come in a script of their own, after this one.
 */
export function Garage() {
  const host = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const loader = useRef<HTMLDivElement>(null);
  const car = useRef<Ex30 | null>(null);
  const inset = useVvvInset(GUTTER);
  const [paint, setPaint] = useState(DEFAULT_PAINT);
  const [view, setView] = useState<Ex30View>("front34");
  const [lamps, setLamps] = useState(true);
  const [moved, setMoved] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let gone = false;
    const fill = (p: number) => {
      const el = bar.current;
      if (!el) return;
      el.style.animation = "none";
      el.style.transition = "transform 0.35s ease";
      el.style.transform = `translateX(${(-100 + 100 * p).toFixed(1)}%)`;
    };
    const lift = () => {
      setTimeout(() => loader.current?.classList.add("out"), 380);
      setTimeout(() => { if (loader.current) loader.current.hidden = true; }, 950);
    };
    import("@/lib/ex30/scene").then(({ mountEx30 }) => {
      if (gone || !host.current) return;
      car.current = mountEx30(host.current, {
        paint: DEFAULT_PAINT,
        paints: PAINT_MAP,
        onProgress: fill,
        onReady: (stats) => { fill(1); lift(); (window as unknown as { __ex30?: unknown }).__ex30 = stats; },
        onFail: (msg) => { setFailed(msg); lift(); },
      });
    });
    return () => { gone = true; car.current?.dispose(); car.current = null; };
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const first = () => setMoved(true);
    el.addEventListener("pointerdown", first, { once: true });
    return () => el.removeEventListener("pointerdown", first);
  }, []);

  const pickPaint = (id: string) => { if (id === paint) return; setPaint(id); car.current?.setPaint(id); haptic.select(); };
  const pickView = (v: Ex30View) => { setView(v); car.current?.setView(v); haptic.select(); };
  const toggleLamps = () => { const on = !lamps; setLamps(on); car.current?.setLamps(on); haptic.select(); };
  const name = PAINTS.find((p) => p.id === paint)?.name ?? "";

  return (
    <>
      <div className="ex-ground">
        <div className="ex-frame" style={{ top: inset.top, bottom: inset.bottom }}>
          <div ref={host} className="ex-stage">
            <p className="ex-tag"><b>EX30</b>4233 × 1836 × 1549 mm</p>
            <p className={`ex-hint${moved ? " gone" : ""}`}>Arrastrá para girar · pellizcá para acercar</p>
            {failed && <p className="ex-fail">{failed}</p>}
          </div>
          <nav className="ex-bar" aria-label="Controles">
            <div className="ex-row">
              <span className="ex-label">Pintura</span>
              <span className="ex-name">{name}</span>
            </div>
            <div className="ex-swatches">
              {PAINTS.map((p) => (
                <button key={p.id} type="button" className="ex-swatch" style={{ background: p.color }} aria-label={p.name} aria-pressed={p.id === paint} onClick={() => pickPaint(p.id)} />
              ))}
            </div>
            <div className="ex-views">
              {VIEWS.map(([v, label]) => (
                <button key={v} type="button" className="ex-key" aria-pressed={v === view} onClick={() => pickView(v)}>{label}</button>
              ))}
              <button type="button" className="ex-key lamp" aria-pressed={lamps} onClick={toggleLamps}>Luces</button>
            </div>
          </nav>
        </div>
      </div>
      <div ref={loader} className="ex-loader" role="progressbar" aria-label="Cargando">
        <div className="mark">EX30<small>TRAZANDO LA CARROCERÍA</small></div>
        <div className="track"><i ref={bar} /></div>
      </div>
    </>
  );
}
