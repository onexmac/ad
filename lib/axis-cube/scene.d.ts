/**
 * Builds the scene and its HUD inside `host`; returns a function that tears it all down.
 * `texBase` is where the photo textures live (default: the portal's /kit/axis-cube/tex/).
 */
export function mountAxisCube(host: HTMLElement, opts?: { texBase?: string }): () => void;
