// Builds Noticss (both versions) as one standalone HTML page for a Claude
// artifact: the app's own components bundled with esbuild, Tailwind compiled,
// the edition photos copied next to it (artifacts can't load site paths).
//
//   npm i --no-save esbuild@0.24.2      (once per session)
//   node scripts/noticss/artifact/build.mjs <outDir>
//
// Then publish <outDir>/noticss.html with the files in <outDir>/shots/.
import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const HERE = path.join(ROOT, "scripts/noticss/artifact");
const OUT = path.resolve(process.argv[2] ?? "noticss-artifact");
fs.mkdirSync(path.join(OUT, "shots"), { recursive: true });

// 1. Photos.
const SHOTS = path.join(ROOT, "public/kit/noticss/shots");
const files = fs.readdirSync(SHOTS).filter((f) => f.endsWith(".jpg"));
for (const f of files) fs.copyFileSync(path.join(SHOTS, f), path.join(OUT, "shots", f));

// 2. Bundle.
const js = await esbuild.build({
  entryPoints: [path.join(HERE, "entry.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  loader: { ".json": "json" },
  define: { "process.env.NODE_ENV": '"production"' },
  alias: { "next/link": path.join(HERE, "link.tsx"), "@": ROOT },
  nodePaths: [path.join(ROOT, "node_modules")],
});

// 3. CSS.
const cssIn = `@import "${path.join(ROOT, "app/(noticss)/kit/noticss/globals.css")}";`;
const css = (await postcss([tailwind({ base: ROOT })]).process(cssIn, { from: path.join(HERE, "style.css") })).css;

// 4. Page.
const page = `<title>Noticss</title>
<meta name="theme-color" content="#f1ece2">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap">
<style>
:root { color-scheme: light; --font-newsreader: "Newsreader"; }
html, body { background: #f1ece2; color: #1c1915; }
body { margin: 0; }
${css.replace(/<\/style/g, "<\\/style")}
</style>
<div id="root" data-app></div>
<script>${js.outputFiles[0].text.replace(/<\/script/g, "<\\/script")}</script>
`;
fs.writeFileSync(path.join(OUT, "noticss.html"), page);
console.log(`ok: ${path.join(OUT, "noticss.html")} + ${files.length} photos`);
