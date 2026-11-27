export const THEME_KEY: string;
/**
 * Mounts the mixer in `root`, the page's markup (components/ps2-fiori/Inventory.tsx). `paused` says when the keys
 * should be left alone; `onReady` runs once the item is built and its first frame drawn. Returns `dispose`.
 */
export function mountMixer(root: HTMLElement, opts?: { paused?: () => boolean; onReady?: () => void }): { dispose(): void };
