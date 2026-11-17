export type Kind = "game" | "collab" | "skin" | "character" | "movie" | "book" | "tv";

export type Status = "out" | "live" | "upcoming";

export type Franchise = {
  id: string;
  name: string;
  /** Short code for mono labels, e.g. "ZZZ". */
  code: string;
  studio: string;
  /** What I watch it for, one line. */
  watching: string;
};

export type Item = {
  id: string;
  franchise: string;
  kind: Kind;
  status: Status;
  title: string;
  /** One-line dek for lists. */
  dek: string;
  /** Paragraphs for the detail view. */
  body: string[];
  /** Publish date of the source, ISO yyyy-mm-dd, or null when unknown. */
  date: string | null;
  /** Release or start date for upcoming items, ISO, when the source gives one. */
  when?: string;
  source: string;
  url?: string;
  image?: string;
  /** True for placeholder entries invented for the prototype. */
  mock?: boolean;
};

export const kindLabel: Record<Kind, string> = {
  game: "Games",
  collab: "Collabs",
  skin: "Skins",
  character: "Characters",
  movie: "Movies",
  book: "Books",
  tv: "TV",
};

export const kindOrder: Kind[] = ["game", "collab", "skin", "character", "movie", "book", "tv"];
