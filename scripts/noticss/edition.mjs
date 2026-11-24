#!/usr/bin/env node
/**
 * Noticss: makes one edition and hands it to the app.
 *
 *   node scripts/noticss/edition.mjs                 research and write today's edition
 *   node scripts/noticss/edition.mjs --from b.json   use a brief written elsewhere (same shape as the model's)
 *   node scripts/noticss/edition.mjs --manifest      only rebuild the list the app loads
 *
 * Options: --slot manana|tarde (default: by the hour in Costa Rica), --date YYYY-MM-DD.
 *
 * Steps: the brief (the model, or --from) → tidy → photos → the sky → number
 * → data/noticss/<date>-<slot>.json, checked against the schema → the
 * manifest (data/noticss/index.ts), which lists the newest editions for the app.
 * Run twice a day by .github/workflows/noticss.yml.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Brief, Edition, INDICATORS, SLOTS, tidy } from "./schema.mjs";
import { attachShots } from "./shots.mjs";
import { weather } from "./weather.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DATA = path.join(ROOT, "data/noticss");
/** How many editions the app carries (a week, twice a day). */
const KEEP = 14;

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const flag = (name) => process.argv.includes(`--${name}`);

/** Costa Rica runs on UTC-6 all year. */
function crNow() {
  const d = new Date(Date.now() - 6 * 3600 * 1000);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}

const FILE = /^(\d{4}-\d{2}-\d{2})(?:-(manana|tarde))?\.json$/;
const order = (slot) => (slot === "tarde" ? 2 : slot === "manana" ? 1 : 0);

/** Every edition on disk, oldest first, with the number each one carries or is given. */
async function onDisk() {
  const files = (await fs.readdir(DATA)).filter((f) => FILE.test(f));
  const list = await Promise.all(
    files.map(async (file) => {
      const [, date, slot] = file.match(FILE);
      const raw = JSON.parse(await fs.readFile(path.join(DATA, file), "utf8"));
      return { file, date, slot: slot ?? null, raw };
    }),
  );
  list.sort((a, b) => a.date.localeCompare(b.date) || order(a.slot) - order(b.slot));
  let n = 0;
  for (const e of list) e.number = n = typeof e.raw.number === "number" ? e.raw.number : n + 1;
  return list;
}

async function writeManifest() {
  const list = (await onDisk()).reverse().slice(0, KEEP);
  const lines = list.map((e, i) => `import e${i} from "./${e.file}";`);
  const body = `// Written by scripts/noticss/edition.mjs: the editions the app carries, newest first.
// Do not edit by hand; run \`node scripts/noticss/edition.mjs --manifest\`.
${lines.join("\n")}

export const rawEditions = [
${list.map((e, i) => `  { raw: e${i}, slot: ${JSON.stringify(e.slot)}, number: ${e.number} },`).join("\n")}
];
`;
  await fs.writeFile(path.join(DATA, "index.ts"), body);
  console.log(`manifest: ${list.length} editions (${list.map((e) => e.file).join(", ")})`);
}

async function main() {
  if (flag("manifest")) return writeManifest();

  const now = crNow();
  const date = arg("date") || now.date;
  const slot = arg("slot") || (now.hour < 12 ? "manana" : "tarde");
  if (!SLOTS.includes(slot)) throw new Error(`slot must be one of ${SLOTS.join(", ")}`);
  const file = `${date}-${slot}.json`;

  const before = await onDisk();
  const last = [...before].reverse().find((e) => e.file !== file);
  const previous = last
    ? {
        label: `${last.date}${last.slot ? ` ${last.slot === "manana" ? "mañana" : "tarde"}` : ""}`,
        titles: last.raw.subjects.map((s) => ({ id: s.id, title: s.title })),
      }
    : null;

  let brief;
  const from = arg("from");
  if (from) {
    brief = Brief.parse(JSON.parse(await fs.readFile(path.resolve(from), "utf8")));
  } else {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      console.log("No ANTHROPIC_API_KEY: the editions already published stay as they are.");
      return;
    }
    const { generate } = await import("./generate.mjs");
    brief = await generate({ date, slot, previous });
  }

  const { brief: clean, problems } = tidy(brief);
  if (problems.length) console.warn(`brief: ${problems.join("; ")}`);
  if (clean.subjects.length < 3) throw new Error("fewer than three storylines: not publishing");

  const all = await attachShots([...clean.subjects, ...clean.suggestions]);
  const subjects = all.slice(0, clean.subjects.length);
  const suggestions = all.slice(clean.subjects.length);

  // The figures always come in the same order, sourced or null.
  const indicators = INDICATORS.map(
    (i) => clean.indicators.find((x) => x.id === i.id) ?? { ...i, value: null, delta: null, series: null, seriesNote: null },
  );

  const existing = before.find((e) => e.file === file);
  const number = existing?.number ?? (before.length ? before[before.length - 1].number + 1 : 1);

  const edition = Edition.parse({
    schemaVersion: 6,
    date,
    slot,
    number,
    generatedAt: new Date().toISOString(),
    isSample: false,
    weather: await weather(slot),
    indicators,
    subjects,
    suggestions,
  });
  await fs.writeFile(path.join(DATA, file), JSON.stringify(edition, null, 2) + "\n");
  const notes = (list) => list.reduce((n, s) => n + s.snippets.length, 0);
  console.log(
    `wrote ${file}: Nº ${number}, ${subjects.length} storylines (${notes(subjects)} notes), ` +
      `${suggestions.length} suggestions (${notes(suggestions)} notes), ` +
      `${indicators.filter((i) => i.value !== null).length}/${indicators.length} figures`,
  );
  await writeManifest();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
});
