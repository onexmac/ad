import type { Franchise, Item } from "./types";
import franchiseList from "./franchises.json";
import { rawEditions } from "./index";

/** What the reader follows (shared with the scripts that make the editions). */
export const franchises: Franchise[] = franchiseList;

/** The newest edition's entries (layouts A and B show only these). */
export const items: Item[] = ((rawEditions[0] as { items?: Item[] } | undefined)?.items ?? []) as Item[];
