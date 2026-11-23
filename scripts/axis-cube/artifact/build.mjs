// Builds Axis Cube as one standalone HTML page for a Claude artifact preview:
// the app's own scene module and stylesheet, bundled with three.js.
//
//   npm i --no-save esbuild@0.24.2      (once per session)
//   node scripts/axis-cube/artifact/build.mjs <outDir> [a|b|c]
//
// Then publish <outDir>/axis-cube.html with the files in <outDir>/tex/ (photo textures from public/).
// The second argument picks the look (a analogue, the default; b brush; c classic) and, for b and c,
// the file is axis-cube-b.html or axis-cube-c.html. Any of them also takes the look from the address: #b.
import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";
import { LOADER_HTML } from "../../../lib/axis-cube/loader.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const HERE = path.join(ROOT, "scripts/axis-cube/artifact");
const OUT = path.resolve(process.argv[2] ?? "axis-cube-artifact");
fs.mkdirSync(path.join(OUT, "tex"), { recursive: true });
const TEX = path.join(ROOT, "public/kit/axis-cube/tex");
for (const f of fs.readdirSync(TEX)) if (f.endsWith(".jpg")) fs.copyFileSync(path.join(TEX, f), path.join(OUT, "tex", f));
const LOOK = ["a", "b", "c"].includes(process.argv[3]) ? process.argv[3] : "a";
const NAME = LOOK === "a" ? "axis-cube.html" : `axis-cube-${LOOK}.html`;
const TITLE = { a: "Axis Cube", b: "Axis Cube B", c: "Axis Cube C" }[LOOK];

const js = await esbuild.build({
  entryPoints: [path.join(HERE, "entry.js")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  resolveExtensions: [".ts", ".js"],
  nodePaths: [path.join(ROOT, "node_modules")],
});
const css = fs.readFileSync(path.join(ROOT, "app/(axis-cube)/kit/axis-cube/globals.css"), "utf8");

const page = `<title>${TITLE}</title>
<meta name="theme-color" content="#000000">
<style>
${css.replace(/<\/style/g, "<\\/style")}
</style>
<div id="root"></div>
<div class="axis-loader" id="loader" role="progressbar" aria-label="Cargando">${LOADER_HTML}</div>
<script>window.AXIS_LOOK = "${LOOK}";</script>
<script>${js.outputFiles[0].text.replace(/<\/script/g, "<\\/script")}</script>
`;
fs.writeFileSync(path.join(OUT, NAME), page);
console.log(`ok: ${path.join(OUT, NAME)} (${Math.round(page.length / 1024)} KB)`);
