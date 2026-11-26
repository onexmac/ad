export type Ex30Paint = { color: string; metal: number; rough: number };
export type Ex30View = "front34" | "front" | "side" | "rear34" | "rear" | "top";
export type Ex30 = { dispose(): void; setPaint(id: string): void; setView(view: Ex30View): void; setLamps(on: boolean): void };
/**
 * Builds the car and its studio in `host`. `onProgress` runs from 0 to 1 while it is built, `onReady` when its first
 * frame is on screen, `onFail` with a message if it cannot be shown at all. Returns the controls of what it mounted.
 */
export function mountEx30(
  host: HTMLElement,
  opts?: { paint?: string; paints?: Record<string, Ex30Paint>; onProgress?: (p: number) => void; onReady?: (stats: { ms: number; triangles: number; vertices: number }) => void; onFail?: (message: string) => void },
): Ex30;
export const VIEWS: Record<Ex30View, { az: number; el: number; d: number }>;
