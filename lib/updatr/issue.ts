import type { Franchise, Item } from "@/data/updatr/types";
import { daysFrom } from "./format";

/**
 * Lays a set of entries out as one magazine issue. Every module takes stories
 * the earlier modules haven't used, so no story appears twice in the
 * composition (the calendar and the archive are indexes, not stories).
 *
 * Pictures lead. Every entry with a picture goes to a module that shows it
 * (the cover, the feature, the dossier, the pair, Latest, a spotlight, the
 * duo, the mosaic, or the reader's own strip); briefs are only what has no
 * picture, four at most. The rest is in the archive.
 */
export type Issue = {
  cover?: Item;
  feature?: Item;
  dossier?: { franchise: Franchise; items: Item[] };
  pair: Item[];
  grid: Item[];
  /** One picture a page, with a caption panel: the most important left. */
  spotlight?: Item;
  /** Two big landscape pictures on a page. */
  duo: Item[];
  /** One tall picture and two squares. */
  mosaic: Item[];
  /** What the reader's taste picked (suggestions), on a strip of big cards. */
  forYou: Item[];
  next?: Item;
  coming: Item[];
  briefs: Item[];
  all: Item[];
};

const byNewest = (a: Item, b: Item) => (b.date ?? "").localeCompare(a.date ?? "");
const MAX_BRIEFS = 4;

export function buildIssue(items: Item[], franchises: Franchise[]): Issue {
  const all = [...items].sort(byNewest);
  const pool = all;
  const used = new Set<string>();
  const take = (i?: Item) => {
    if (i) used.add(i.id);
    return i;
  };
  const free = (pred: (i: Item) => boolean = () => true) =>
    pool.filter((i) => !used.has(i.id) && pred(i));
  const pictured = (i: Item) => !!i.image && !i.mock;
  // The week's own stories lead: a suggestion never takes the cover, the
  // feature or the dossier; suggestions get their own strip.
  const leading = (i: Item) => pictured(i) && !i.suggested;
  const own = (i: Item) => pictured(i) && !i.suggested;

  const cover = take(free(leading)[0]);

  // Dossier: the franchise with the most collabs gets a whole spread.
  const collabCount = new Map<string, number>();
  for (const i of all) if (i.kind === "collab" && !i.suggested) collabCount.set(i.franchise, (collabCount.get(i.franchise) ?? 0) + 1);
  const dossierId = [...collabCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const dossierFranchise = franchises.find((f) => f.id === dossierId);
  const dossierItems = dossierId ? free((i) => i.franchise === dossierId && leading(i)) : [];
  // A dossier of one is a spotlight, not a spread.
  const dossierOk = dossierItems.length >= 2;
  if (dossierOk) dossierItems.forEach(take);

  // Feature: the newest collab outside the dossier, else the newest story left.
  const feature = take(free((i) => i.kind === "collab" && leading(i))[0] ?? free(leading)[0]);

  // The reader's own strip: the suggestions with a picture, best first.
  const forYou = free((i) => pictured(i) && !!i.suggested).slice(0, 8);
  forYou.forEach(take);

  // Pair: a skin and a character, from different franchises when possible.
  const skin = free((i) => i.kind === "skin" && own(i))[0];
  const character = free((i) => i.kind === "character" && own(i) && i.franchise !== skin?.franchise)[0];
  const pair = [skin, character].filter(Boolean) as Item[];
  pair.forEach(take);

  // Spotlight: the most important picture left.
  const spotlight = take(
    free(own).sort((a, b) => (b.importance ?? 1) - (a.importance ?? 1))[0],
  );

  const grid = free(own).slice(0, 6);
  grid.forEach(take);

  const duo = free(own).slice(0, 2);
  if (duo.length === 2) duo.forEach(take);

  const mosaic = free(own).slice(0, 3);
  if (mosaic.length === 3) mosaic.forEach(take);

  // Anything pictured still left (suggestions past the strip, a lone one)
  // goes to the strip rather than to the briefs.
  const leftover = free(pictured);
  forYou.push(...leftover.slice(0, Math.max(0, 10 - forYou.length)));
  leftover.forEach(take);

  const coming = all
    .filter((i) => i.when && i.status !== "out")
    .sort((a, b) => (a.when ?? "").localeCompare(b.when ?? ""));
  const next = coming.find((i) => daysFrom(i.when!) > 0);

  // Briefs: only what has no picture, the most important first.
  const briefs = free((i) => !pictured(i))
    .sort((a, b) => (b.importance ?? 1) - (a.importance ?? 1))
    .slice(0, MAX_BRIEFS);

  return {
    cover,
    feature,
    dossier: dossierFranchise && dossierOk ? { franchise: dossierFranchise, items: dossierItems } : undefined,
    pair,
    grid,
    spotlight,
    duo: duo.length === 2 ? duo : [],
    mosaic: mosaic.length === 3 ? mosaic : [],
    forYou,
    next,
    coming,
    briefs,
    all,
  };
}
