// Makes Cube OS, a font of the machine's letters (lib/axis-cube/glyph.js), for running text: the list of changes.
//
//   npm i --no-save opentype.js@1.3.4      (once per session)
//   node scripts/axis-cube/font/build.mjs  → public/kit/axis-cube/cube-os.otf
//
// A letter's pixel is a tenth of the em: 7 rows high on the baseline (g, j, p, q, y two more below it), 5 wide, and 6
// apart, so at a font size of 50/3 px a pixel is 5 of an iPhone's device pixels, whole and sharp. Each row's runs of
// lit pixels are one rectangle, reaching a hair into the row below so the rows join without a seam.
import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";
import { GLYPH } from "../../../lib/axis-cube/glyph.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const PX = 100, ROWS = 7, ADV = 6 * PX, HAIR = 2;
const glyphs = [
  new opentype.Glyph({ name: ".notdef", unicode: 0, advanceWidth: ADV, path: new opentype.Path() }),
  new opentype.Glyph({ name: "space", unicode: 32, advanceWidth: ADV, path: new opentype.Path() }),
  new opentype.Glyph({ name: "nbsp", unicode: 160, advanceWidth: ADV, path: new opentype.Path() }),
];
for (const [ch, rows] of Object.entries(GLYPH)) {
  const p = new opentype.Path();
  rows.forEach((bits, r) => {
    for (let i = 0; i < 5; i++) {
      if (!(bits & (16 >> i))) continue;
      let j = i;
      while (j + 1 < 5 && bits & (16 >> (j + 1))) j++;
      const x0 = i * PX, x1 = (j + 1) * PX, top = (ROWS - r) * PX, bot = (ROWS - r - 1) * PX - (r < rows.length - 1 ? HAIR : 0);
      p.moveTo(x0, top); p.lineTo(x0, bot); p.lineTo(x1, bot); p.lineTo(x1, top); p.close();   // counter-clockwise, as CFF wants
      i = j;
    }
  });
  glyphs.push(new opentype.Glyph({ name: "u" + ch.codePointAt(0).toString(16).padStart(4, "0"), unicode: ch.codePointAt(0), advanceWidth: ADV, path: p }));
}
const font = new opentype.Font({
  familyName: "Cube OS", styleName: "Regular", unitsPerEm: 10 * PX, ascender: 8 * PX, descender: -2 * PX,
  designer: "The Cubes", glyphs,
});
const out = path.join(ROOT, "public/kit/axis-cube/cube-os.otf");
fs.writeFileSync(out, Buffer.from(font.toArrayBuffer()));
console.log(`ok: ${out} (${glyphs.length} glyphs, ${fs.statSync(out).size} bytes)`);
