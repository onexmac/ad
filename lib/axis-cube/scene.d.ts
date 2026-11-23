/**
 * Builds the scene and its rings inside `host`; returns a function that tears it all down.
 * `texBase` is where the photo textures live (default: the portal's /kit/axis-cube/tex/).
 * `look` picks one of the three looks of the same room: "a" analogue (film and a lens, the default),
 * "b" brush (inked and painted), "c" classic (a cel-era night).
 */
export function mountAxisCube(host: HTMLElement, opts?: { texBase?: string; look?: "a" | "b" | "c"; onLook?: (look: "a" | "b" | "c") => void }): () => void;
