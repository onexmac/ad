// Writes the loading screen alone as one HTML page, to look at it without the room coming up behind it:
// the app's own stylesheet and the app's own loader markup, and no script.
//
//   node scripts/axis-cube/artifact/loader-preview.mjs <outDir>
//
// In the app the bar fills once and the scene finishes it; here it starts over every few seconds so it can be watched.
import fs from "node:fs";
import path from "node:path";
import { LOADER_HTML } from "../../../lib/axis-cube/loader.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const OUT = path.resolve(process.argv[2] ?? "axis-cube-artifact");
fs.mkdirSync(OUT, { recursive: true });
const css = fs.readFileSync(path.join(ROOT, "app/(axis-cube)/kit/axis-cube/globals.css"), "utf8");

const page = `<title>Axis Cube Loader</title>
<meta name="theme-color" content="#000000">
<style>
${css.replace(/<\/style/g, "<\\/style")}
/* preview only: one dark look whatever the viewer's theme, and the bar starts over so it can be watched */
:root { color-scheme: dark; }
.axis-loader .track i { animation: axis-load 7s cubic-bezier(0.08, 0.72, 0.12, 1) infinite; }
</style>
<div class="axis-loader" role="progressbar" aria-label="Cargando">${LOADER_HTML}</div>
`;
fs.writeFileSync(path.join(OUT, "axis-cube-loader.html"), page);
console.log(`ok: ${path.join(OUT, "axis-cube-loader.html")} (${Math.round(page.length / 1024)} KB)`);
