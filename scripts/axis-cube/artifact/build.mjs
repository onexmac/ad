// Builds The Cubes as one standalone HTML page for a Claude artifact preview:
// the app's own scene module and stylesheet, bundled with three.js.
//
//   npm i --no-save esbuild@0.24.2      (once per session)
//   node scripts/axis-cube/artifact/build.mjs <outDir> [a|b|c] [sidebar]
//
// Then publish <outDir>/axis-cube.html with the files in <outDir>/tex/ (photo textures from public/).
// The second argument picks the look (a analogue, the default; b brush; c classic) and, for b and c,
// the file is axis-cube-b.html or axis-cube-c.html. Any of them also takes the look from the address: #b.
// A third argument builds a lab, a version for trying something before it reaches the app: sidebar (the screen
// close up with the initials keyboard, in amber) is axis-cube-sidebar.html, "Sidebar"; sideb, the same dressed as
// the app is, a friendly old Mac, is axis-cube-sideb.html, "Side-B".
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
const LAB = ["sidebar", "sideb"].includes(process.argv[4]) ? process.argv[4] : "";
const NAME = (LOOK === "a" ? "axis-cube" : `axis-cube-${LOOK}`) + (LAB ? `-${LAB}` : "") + ".html";
const TITLE = LAB ? { sidebar: "Sidebar", sideb: "Side-B" }[LAB] : { a: "The Cubes", b: "The Cubes B", c: "The Cubes C" }[LOOK];
// the Mac loads on paper (.mac-loader in the app's stylesheet); the Sidebar keeps its black
const LOADER_CLASS = LAB === "sidebar" ? "axis-loader" : "axis-loader mac-loader";

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
// the changelog goes into the page whole: the version shows at the bottom right, and a tap lists the changes. A lab is
// a snippet, not the app (docs/changelog.md): it carries neither.
const changelog = LAB ? "" : fs.readFileSync(path.join(ROOT, "app/(axis-cube)/kit/axis-cube/CHANGELOG.md"), "utf8");
const version = (/^## (\d+\.\d+\.\d+) ·/m.exec(changelog) || [])[1] || "";
const inPage = (v) => JSON.stringify(v).replace(/[<\u007f-\uffff]/g, (ch) => "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"));   // plain ASCII in the page, whatever its encoding is taken to be

const page = `<meta charset="utf-8">
<title>${TITLE}</title>
<meta name="theme-color" content="#000000">
<style>
${css.replace(/<\/style/g, "<\\/style")}
</style>
<div class="axis-ground"><div id="root" class="axis"></div></div>
<div class="${LOADER_CLASS}" id="loader" role="progressbar" aria-label="Cargando">${LOADER_HTML}</div>
<script>window.AXIS_LOOK = "${LOOK}"; window.AXIS_LAB = "${LAB}"; window.AXIS_VERSION = ${inPage(version)}; window.AXIS_CHANGELOG = ${inPage(changelog)};</script>
<script>${js.outputFiles[0].text.replace(/<\/script/g, "<\\/script")}</script>
`;
fs.writeFileSync(path.join(OUT, NAME), page);
console.log(`ok: ${path.join(OUT, NAME)} (${Math.round(page.length / 1024)} KB)`);
