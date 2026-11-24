import type { AxisSound } from "./sound";

/**
 * Mounts the room and its puzzles in `host`. `loader` is the loading screen already in the page: the scene finishes
 * its bar and lifts it when the room is ready, then calls `onShown`; while `hold` says so (a screen of the page's own
 * is in front), the room is built but the loader stays. Returns the function that takes the scene down.
 */
export function mountAxisCube(host: HTMLElement, opts?: { texBase?: string; look?: "a" | "b" | "c"; loader?: HTMLElement; onShown?: () => void; sound?: AxisSound; hold?: () => boolean }): () => void;
