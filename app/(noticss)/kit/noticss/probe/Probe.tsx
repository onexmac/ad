"use client";

import { useEffect, useState } from "react";

/*
 * A test page for the strip under Safari's bottom bar: which layers Safari
 * draws there, and what every viewport measure says. Each layer has its own
 * colour, so one screenshot answers it.
 * - Page background (html): magenta.
 * - Fixed, inset 0: blue.
 * - Fixed, 100lvh: green, drawn under the blue (shows only if taller).
 * - Fixed, bottom -120px, 120px tall (below the bottom edge): yellow.
 * - In the page flow, after a 100lvh block: orange (shows if the page
 *   itself runs under the bar).
 */
export function Probe() {
  const [m, setM] = useState<Record<string, string | number>>({});
  const [flow, setFlow] = useState(false);
  useEffect(() => {
    const read = () => {
      const probe = document.getElementById("probe-env")!;
      const cs = getComputedStyle(probe);
      const lvh = document.getElementById("probe-lvh")!.getBoundingClientRect().height;
      const svh = document.getElementById("probe-svh")!.getBoundingClientRect().height;
      const dvh = document.getElementById("probe-dvh")!.getBoundingClientRect().height;
      setM({
        innerHeight: window.innerHeight,
        visualViewport: Math.round(window.visualViewport?.height ?? 0),
        screen: window.screen.height,
        "100lvh": Math.round(lvh),
        "100svh": Math.round(svh),
        "100dvh": Math.round(dvh),
        "clientHeight (html)": document.documentElement.clientHeight,
        "safe top": cs.paddingTop,
        "safe bottom": cs.paddingBottom,
        standalone: String((navigator as Navigator & { standalone?: boolean }).standalone ?? false),
      });
    };
    read();
    window.addEventListener("resize", read);
    window.visualViewport?.addEventListener("resize", read);
    return () => {
      window.removeEventListener("resize", read);
      window.visualViewport?.removeEventListener("resize", read);
    };
  }, []);
  useEffect(() => {
    const html = document.documentElement;
    html.style.background = "#ff00aa";
    document.body.style.background = "transparent";
    html.style.overflow = flow ? "" : "hidden";
    document.body.style.overflow = flow ? "" : "hidden";
  }, [flow]);

  return (
    <>
      <div id="probe-env" style={{ position: "fixed", left: 0, top: 0, width: 0, height: 0, visibility: "hidden", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }} />
      <div id="probe-lvh" style={{ position: "fixed", left: 0, top: 0, width: 0, height: "100lvh", visibility: "hidden" }} />
      <div id="probe-svh" style={{ position: "fixed", left: 0, top: 0, width: 0, height: "100svh", visibility: "hidden" }} />
      <div id="probe-dvh" style={{ position: "fixed", left: 0, top: 0, width: 0, height: "100dvh", visibility: "hidden" }} />
      {/* Layers, back to front */}
      <div style={{ position: "fixed", left: 0, right: 0, top: 0, height: "100lvh", background: "#00b050" }} />
      <div style={{ position: "fixed", inset: 0, background: "#1e5aff" }} />
      <div style={{ position: "fixed", left: 0, right: 0, bottom: -120, height: 120, background: "#ffd400" }} />
      {flow ? (
        <div>
          <div style={{ height: "100lvh" }} />
          <div style={{ height: 400, background: "#ff7a00" }} />
        </div>
      ) : null}
      <div style={{ position: "fixed", left: 16, right: 16, top: "calc(env(safe-area-inset-top) + 16px)", color: "#fff", font: "15px/1.45 ui-monospace, Menlo, monospace" }}>
        <p style={{ fontWeight: 700, marginBottom: 8 }}>Noticss · bottom strip probe</p>
        {Object.entries(m).map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{k}</span>
            <span>{v}</span>
          </div>
        ))}
        <p style={{ marginTop: 12, opacity: 0.85 }}>
          magenta = page background · blue = fixed inset 0 · green = fixed 100lvh · yellow = fixed below the edge · orange = page flow
        </p>
        <button
          type="button"
          onClick={() => setFlow((f) => !f)}
          style={{ marginTop: 12, padding: "10px 14px", borderRadius: 999, background: "#fff", color: "#000", font: "inherit" }}
        >
          {flow ? "Page flow: on (scroll to the bottom)" : "Turn on page flow"}
        </button>
      </div>
    </>
  );
}
