import type { AxisSound } from "./sound";

/**
 * Mounts the room and its puzzles in `host`. `loader` is the loading screen already in the page: the scene finishes
 * its bar and lifts it when the room is ready, then calls `onShown`; while `hold` says so (a screen of the page's own
 * is in front), the room is built but the loader stays. `version` shows at the bottom right while a puzzle is chosen;
 * a tap opens the list of changes, `changelog`: the changelog's text, or the address of the app's changelog page.
 * `lab` builds a lab (`sidebar`). Returns the function that takes the scene down.
 */
export function mountAxisCube(host: HTMLElement, opts?: { texBase?: string; look?: "a" | "b" | "c"; lab?: string; version?: string; changelog?: string; scores?: string; loader?: HTMLElement; onShown?: () => void; sound?: AxisSound; hold?: () => boolean }): () => void;
