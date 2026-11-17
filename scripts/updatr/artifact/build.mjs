// Builds Updatr as one standalone HTML page for a Claude artifact preview:
// the app's own components bundled with esbuild, Tailwind compiled, press
// images downloaded and resized next to it (artifacts can't hotlink images).
//
//   npm i --no-save esbuild@0.24.2      (once per session)
//   node scripts/updatr/artifact/build.mjs <outDir>
//
// Then publish <outDir>/updatr.html with the files in <outDir>/img/.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import * as esbuild from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const HERE = path.join(ROOT, "scripts/updatr/artifact");
const OUT = path.resolve(process.argv[2] ?? "updatr-artifact");
fs.mkdirSync(path.join(OUT, "img"), { recursive: true });

// 1. Images: download every hotlinked image, resize to 1200px (needs ImageMagick or python3+Pillow).
const news = fs.readFileSync(path.join(ROOT, "data/updatr/news.ts"), "utf8");
const urls = [...news.matchAll(/image:\s*\n?\s*"([^"]+)"/g)].map((m) => m[1]);
const map = {};
urls.forEach((u, n) => {
  const file = `img/${String(n).padStart(2, "0")}.jpg`;
  try {
    execFileSync("python3", [
      "-c",
      "import sys,io,urllib.request\nfrom PIL import Image\nr=urllib.request.Request(sys.argv[1],headers={'User-Agent':'Mozilla/5.0'})\nim=Image.open(io.BytesIO(urllib.request.urlopen(r,timeout=30).read())).convert('RGB')\nim.thumbnail((1200,1200))\nim.save(sys.argv[2],quality=82)",
      u,
      path.join(OUT, file),
    ]);
    map[u] = file;
  } catch {
    console.warn("image failed:", u);
  }
});
const imagesJson = path.join(OUT, "images.json");
fs.writeFileSync(imagesJson, JSON.stringify(map));

// 2. Bundle.
const js = await esbuild.build({
  entryPoints: [path.join(HERE, "entry.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: { "next/link": path.join(HERE, "link.tsx"), "@": ROOT, "updatr-images": imagesJson },
  nodePaths: [path.join(ROOT, "node_modules")],
});

// 3. CSS.
const cssIn = `@import "${path.join(ROOT, "app/(updatr)/kit/updatr/globals.css")}";`;
const css = (await postcss([tailwind({ base: ROOT })]).process(cssIn, { from: path.join(HERE, "style.css") })).css;

// 4. Page.
const page = `<title>Updatr</title>
<meta name="theme-color" content="#edebe6">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
<style>
:root { color-scheme: light; }
html, body { background: #edebe6; color: #0b0b0b; }
body { margin: 0; }
${css.replace(/<\/style/g, "<\\/style")}
:root { --font-geist-sans: "Geist", "Helvetica Neue", Arial, sans-serif; --font-geist-mono: "Geist Mono", ui-monospace, monospace; }
</style>
<div id="root" data-app></div>
<script>${js.outputFiles[0].text.replace(/<\/script/g, "<\\/script")}</script>
`;
fs.writeFileSync(path.join(OUT, "updatr.html"), page);
console.log(`ok: ${path.join(OUT, "updatr.html")} + ${Object.keys(map).length} images`);
