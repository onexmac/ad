import type { Franchise, Item } from "./types";
import { news } from "./news";

export const franchises: Franchise[] = [
  { id: "finals", name: "The Finals", code: "TF", studio: "Embark Studios", watching: "Seasons, arenas, cosmetics" },
  { id: "descendant", name: "The First Descendant", code: "TFD", studio: "Nexon", watching: "New descendants and skins" },
  { id: "cod", name: "Call of Duty", code: "COD", studio: "Activision", watching: "Operator skins, mostly the women" },
  { id: "stellar", name: "Stellar Blade", code: "SB", studio: "Shift Up", watching: "Collabs and outfits" },
  { id: "zzz", name: "Zenless Zone Zero", code: "ZZZ", studio: "HoYoverse", watching: "Version updates and new agents" },
  { id: "film", name: "Film", code: "FLM", studio: "—", watching: "Releases I'm waiting for" },
  { id: "books", name: "Books", code: "BKS", studio: "—", watching: "New and upcoming reads" },
  { id: "tv", name: "TV", code: "TV", studio: "—", watching: "Seasons in progress" },
];

/** Placeholder entries so the non-game categories have something to show. */
const samples: Item[] = [
  {
    id: "sample-film-1",
    franchise: "film",
    kind: "movie",
    status: "upcoming",
    title: "The Long Signal",
    dek: "Sample film entry: a release date on the calendar, a trailer, a countdown.",
    body: [
      "A placeholder for how a film reads in the feed: trailer drops, release date, where it's showing.",
      "When real data arrives this row comes from a film source instead of being written by hand.",
    ],
    date: "2026-11-10",
    when: "2026-12-18",
    source: "Sample",
    mock: true,
  },
  {
    id: "sample-book-1",
    franchise: "books",
    kind: "book",
    status: "upcoming",
    title: "Salt and Iron",
    dek: "Sample book entry: author, publisher, the day it ships.",
    body: [
      "A placeholder for a book: pre-order date, a line on why it's on the list, the publisher's note.",
    ],
    date: "2026-11-04",
    when: "2027-01-20",
    source: "Sample",
    mock: true,
  },
  {
    id: "sample-tv-1",
    franchise: "tv",
    kind: "tv",
    status: "live",
    title: "Night Shift — Season 2",
    dek: "Sample series entry: episodes out, next one Friday.",
    body: [
      "A placeholder for a show in progress: which episode is out, when the next one airs, where to watch.",
    ],
    date: "2026-11-14",
    source: "Sample",
    mock: true,
  },
];

export const items: Item[] = [...news, ...samples];
