// Builds Axis Cube as one standalone HTML page for a Claude artifact preview:
// the app's own scene module and stylesheet, bundled with three.js.
//
//   npm i --no-save esbuild@0.24.2      (once per session)
//   node scripts/axis-cube/artifact/build.mjs <outDir>
//
// Then publish <outDir>/axis-cube.html with the files in <outDir>/tex/ (photo textures from public/).
import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const HERE = path.join(ROOT, "scripts/axis-cube/artifact");
const OUT = path.resolve(process.argv[2] ?? "axis-cube-artifact");
fs.mkdirSync(path.join(OUT, "tex"), { recursive: true });
const TEX = path.join(ROOT, "public/kit/axis-cube/tex");
for (const f of fs.readdirSync(TEX)) fs.copyFileSync(path.join(TEX, f), path.join(OUT, "tex", f));

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

const page = `<title>Axis Cube</title>
<meta name="theme-color" content="#0c0705">
<style>
${css.replace(/<\/style/g, "<\\/style")}
</style>
<div id="root"></div>
<script>${js.outputFiles[0].text.replace(/<\/script/g, "<\\/script")}</script>
`;
fs.writeFileSync(path.join(OUT, "axis-cube.html"), page);
console.log(`ok: ${path.join(OUT, "axis-cube.html")} (${Math.round(page.length / 1024)} KB)`);
