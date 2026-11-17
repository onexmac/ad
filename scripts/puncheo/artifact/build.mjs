// Builds Puncheo as one standalone HTML page for a Claude artifact preview:
// the app's own components bundled with esbuild and Tailwind compiled.
//
//   npm i --no-save esbuild@0.24.2      (once per session)
//   node scripts/puncheo/artifact/build.mjs <outDir>
//
// Then publish <outDir>/puncheo.html.
import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const HERE = path.join(ROOT, "scripts/puncheo/artifact");
const OUT = path.resolve(process.argv[2] ?? "puncheo-artifact");
fs.mkdirSync(OUT, { recursive: true });

const js = await esbuild.build({
  entryPoints: [path.join(HERE, "entry.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: { "@": ROOT },
  nodePaths: [path.join(ROOT, "node_modules")],
});

const cssIn = `@import "${path.join(ROOT, "app/(puncheo)/ad/puncheo/globals.css")}";`;
const css = (await postcss([tailwind({ base: ROOT })]).process(cssIn, { from: path.join(HERE, "style.css") })).css;

const page = `<title>Puncheo</title>
<meta name="theme-color" content="#ffffff">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap">
<style>
:root { color-scheme: light; }
html, body { background: #ffffff; color: #191c22; }
body { margin: 0; }
${css.replace(/<\/style/g, "<\\/style")}
:root { --font-inter: "Inter", "Helvetica Neue", Arial, sans-serif; --font-mono-face: "JetBrains Mono", ui-monospace, monospace; }
</style>
<div id="root"></div>
<script>${js.outputFiles[0].text.replace(/<\/script/g, "<\\/script")}</script>
`;
fs.writeFileSync(path.join(OUT, "puncheo.html"), page);
console.log(`ok: ${path.join(OUT, "puncheo.html")} (${Math.round(page.length / 1024)} KB)`);
