#!/usr/bin/env node
/**
 * Updatr: makes (or updates) the week's edition and hands it to the app.
 *
 *   node scripts/updatr/edition.mjs                 research and update this week's edition
 *   node scripts/updatr/edition.mjs --from b.json   use a brief written elsewhere (same shape as the model's)
 *   node scripts/updatr/edition.mjs --manifest      only rebuild the list the app loads
 *
 * Options: --date YYYY-MM-DD (default: today in Costa Rica), --days N (how far
 * back to search; default 2 when the week already has an edition, else 7).
 *
 * Steps: the brief (the model, or --from) → tidy → merge into the week's
 * file (same id: the story moved on, replace it; new id: add it) → photos
 * → data/updatr/<year>-W<week>.json, checked against the schema → the
 * manifest (data/updatr/index.ts) and public/kit/updatr/latest.json, which
 * the app checks when the reader pulls past the bottom of the issue.
 * Run daily by .github/workflows/updatr.yml.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Brief, Edition, store, tidy } from "./schema.mjs";
import { shareImage } from "../noticss/shots.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DATA = path.join(ROOT, "data/updatr");
const LATEST = path.join(ROOT, "public/kit/updatr/latest.json");
/** How many weekly editions the app carries. */
const KEEP = 12;
/** How many suggestions a week keeps (newest first). */
const POOL = 16;

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const flag = (name) => process.argv.includes(`--${name}`);

/** Costa Rica runs on UTC-6 all year. */
const crToday = () => new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10);

/** ISO week and its year for a YYYY-MM-DD. */
function isoWeek(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const year = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return { year, week };
}

const FILE = /^(\d{4})-W(\d{2})\.json$/;
const fileOf = (year, week) => `${year}-W${String(week).padStart(2, "0")}.json`;

/** Every edition on disk, newest first. */
async function onDisk() {
  const files = (await fs.readdir(DATA)).filter((f) => FILE.test(f));
  const list = await Promise.all(
    files.map(async (file) => ({ file, raw: JSON.parse(await fs.readFile(path.join(DATA, file), "utf8")) })),
  );
  return list.sort((a, b) => b.raw.year - a.raw.year || b.raw.week - a.raw.week);
}

async function writeManifest() {
  const list = (await onDisk()).slice(0, KEEP);
  const body = `// Written by scripts/updatr/edition.mjs: the editions the app carries, newest first.
// Do not edit by hand; run \`node scripts/updatr/edition.mjs --manifest\`.
${list.map((e, i) => `import e${i} from "./${e.file}";`).join("\n")}

export const rawEditions = [${list.map((_, i) => `e${i}`).join(", ")}];
`;
  await fs.writeFile(path.join(DATA, "index.ts"), body);
  if (list[0]) {
    await fs.mkdir(path.dirname(LATEST), { recursive: true });
    await fs.writeFile(LATEST, JSON.stringify(list[0].raw) + "\n");
  }
  console.log(`manifest: ${list.length} editions (${list.map((e) => e.file).join(", ")}); latest.json → ${list[0]?.file ?? "none"}`);
}

/** Runs `fn` over `items`, `n` at a time. */
async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

/**
 * A photo for each entry that has none: the share image of its source page,
 * or else of the first of its other pages (`also`) that has one. Linked, not
 * copied (the repository is public). A site's generic card (one image on three
 * or more pages, or named like a logo) is not a photo and is passed over.
 */
async function attachShots(entries) {
  const pagesOf = (e) => [e.url, ...(e.also ?? [])].filter(Boolean);
  const want = [...new Set(entries.filter((e) => !e.image).flatMap(pagesOf))];
  const found = await pool(want, 6, shareImage);
  const uses = new Map();
  for (const im of found) if (im) uses.set(im, (uses.get(im) ?? 0) + 1);
  const generic = (im) => !im || uses.get(im) >= 3 || /logo|favicon|placeholder|default[-_]?(share|image|og)/i.test(im);
  const byUrl = new Map(want.map((u, i) => [u, generic(found[i]) ? null : found[i]]));
  // A picture another entry already has is not this entry's picture (a studio's
  // news pages often share one share image): look on its other pages instead.
  const inUse = new Set(entries.map((e) => e.image).filter(Boolean));
  let fromOther = 0;
  const out = entries.map((e) => {
    if (e.image) return e;
    const pages = pagesOf(e);
    const hit = pages.find((u) => byUrl.get(u) && !inUse.has(byUrl.get(u)));
    if (!hit) return e;
    if (hit !== e.url) fromOther++;
    inUse.add(byUrl.get(hit));
    return { ...e, image: byUrl.get(hit) };
  });
  console.log(`photos: ${out.filter((e) => e.image).length} of ${entries.length} entries (${fromOther} from another page on the story), ${want.length} pages read`);
  return out;
}

/** New entries over old ones by id (a photo already found is kept), newest first. */
function merge(old, fresh, cap = Infinity) {
  const prev = new Map(old.map((e) => [e.id, e]));
  const ids = new Set(fresh.map((e) => e.id));
  const merged = fresh.map((e) => ({ ...e, image: e.image ?? prev.get(e.id)?.image ?? null }));
  return [...merged, ...old.filter((e) => !ids.has(e.id))].slice(0, cap);
}

async function main() {
  if (flag("manifest")) return writeManifest();

  const date = arg("date") || crToday();
  const { year, week } = isoWeek(date);
  const file = fileOf(year, week);
  const label = `issue Nº${week} (${year})`;

  const before = await onDisk();
  const current = before.find((e) => e.file === file)?.raw ?? null;
  const previous = before.find((e) => e.file !== file)?.raw ?? null;
  const days = Number(arg("days") || (current ? 2 : 7));
  // What the tracker already carries, so a continuing story keeps its id.
  const known = [...(current?.items ?? []), ...(previous?.items ?? [])]
    .filter((e) => !e.mock)
    .filter((e, i, all) => all.findIndex((x) => x.id === e.id) === i)
    .slice(0, 40)
    .map((e) => ({ id: e.id, title: e.title, when: e.when ?? null }));
  // This week's entries still without a picture: the research looks for other pages on them.
  const bare = [...(current?.items ?? []), ...(current?.suggestions ?? [])]
    .filter((e) => !e.image && !e.mock && e.url)
    .slice(0, 12)
    .map((e) => ({ id: e.id, title: e.title, url: e.url }));

  let brief;
  const from = arg("from");
  if (from) {
    const raw = JSON.parse(await fs.readFile(path.resolve(from), "utf8"));
    // Briefs written before these fields existed.
    raw.pictures ??= [];
    for (const e of [...raw.items, ...raw.suggestions]) e.also ??= [];
    brief = Brief.parse(raw);
  } else {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      console.log("No ANTHROPIC_API_KEY: the editions already published stay as they are.");
      return;
    }
    const { generate } = await import("./generate.mjs");
    brief = await generate({ date, label, days, known, bare });
  }

  const { brief: clean, problems } = tidy(brief);
  if (problems.length) console.warn(`brief: ${problems.join("; ")}`);
  if (!clean.items.length && !current) throw new Error("no entries: not publishing");

  // A story that continues from an earlier week keeps the photo it had.
  const earlier = new Map((previous?.items ?? []).map((e) => [e.id, e]));
  const withOld = (list) => list.map((e) => ({ ...e, image: e.image ?? earlier.get(e.id)?.image ?? null }));

  // Other pages found for an entry that had no picture: its picture is looked for there.
  const morePages = new Map(clean.pictures.map((p) => [p.id, p.also]));
  const withPages = (list) => list.map((e) => (!e.image && morePages.has(e.id) ? { ...e, also: [...(e.also ?? []), ...morePages.get(e.id)] } : e));
  const items = withPages(merge(current?.items ?? [], withOld(clean.items).map(store)));
  const itemIds = new Set(items.map((e) => e.id));
  const suggestions = withPages(merge(current?.suggestions ?? [], withOld(clean.suggestions).map(store), POOL).filter((e) => !itemIds.has(e.id)));
  const shot = await attachShots([...items, ...suggestions]);

  const edition = Edition.parse({
    schemaVersion: 1,
    year,
    week,
    date,
    updatedAt: new Date().toISOString(),
    isSample: false,
    items: shot.slice(0, items.length).map(store),
    suggestions: shot.slice(items.length).map(store),
  });
  await fs.writeFile(path.join(DATA, file), JSON.stringify(edition, null, 2) + "\n");
  console.log(
    `wrote ${file}: Nº${week}, ${edition.items.length} entries (${clean.items.length} new or updated), ` +
      `${edition.suggestions.length} suggestions`,
  );
  await writeManifest();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
});
