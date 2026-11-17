import type { Franchise, Item } from "@/data/updatr/types";
import { daysFrom } from "./format";

/**
 * Lays a set of entries out as one magazine issue. Every module takes stories
 * the earlier modules haven't used, so no story appears twice in the
 * composition (the calendar and the archive are indexes, not stories).
 */
export type Issue = {
  cover?: Item;
  feature?: Item;
  dossier?: { franchise: Franchise; items: Item[] };
  pair: Item[];
  grid: Item[];
  next?: Item;
  coming: Item[];
  briefs: Item[];
  all: Item[];
};

const byNewest = (a: Item, b: Item) => (b.date ?? "").localeCompare(a.date ?? "");

export function buildIssue(items: Item[], franchises: Franchise[]): Issue {
  const all = [...items].sort(byNewest);
  const used = new Set<string>();
  const take = (i?: Item) => {
    if (i) used.add(i.id);
    return i;
  };
  const free = (pred: (i: Item) => boolean = () => true) =>
    all.filter((i) => !used.has(i.id) && pred(i));
  const pictured = (i: Item) => !!i.image && !i.mock;

  const cover = take(free(pictured)[0]);

  // Dossier: the franchise with the most collabs gets a whole spread.
  const collabCount = new Map<string, number>();
  for (const i of all) if (i.kind === "collab") collabCount.set(i.franchise, (collabCount.get(i.franchise) ?? 0) + 1);
  const dossierId = [...collabCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const dossierFranchise = franchises.find((f) => f.id === dossierId);
  const dossierItems = dossierId ? free((i) => i.franchise === dossierId && pictured(i)) : [];
  dossierItems.forEach(take);

  // Feature: the newest collab outside the dossier, else the newest story left.
  const feature = take(free((i) => i.kind === "collab" && pictured(i))[0] ?? free(pictured)[0]);

  // Pair: a skin and a character, from different franchises when possible.
  const skin = free((i) => i.kind === "skin" && pictured(i))[0];
  const character = free((i) => i.kind === "character" && pictured(i) && i.franchise !== skin?.franchise)[0];
  const pair = [skin, character].filter(Boolean) as Item[];
  pair.forEach(take);

  const grid = free(pictured).slice(0, 6);
  grid.forEach(take);

  const coming = all
    .filter((i) => i.when && i.status !== "out")
    .sort((a, b) => (a.when ?? "").localeCompare(b.when ?? ""));
  const next = coming.find((i) => daysFrom(i.when!) > 0);

  const briefs = free();

  return {
    cover,
    feature,
    dossier: dossierFranchise && dossierItems.length ? { franchise: dossierFranchise, items: dossierItems } : undefined,
    pair,
    grid,
    next,
    coming,
    briefs,
    all,
  };
}
