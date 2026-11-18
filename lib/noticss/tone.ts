/**
 * The colour at the top of a picture: what the status bar should read as
 * when the picture runs up under it. Averaged from the top band of the image
 * on a tiny canvas, cached per source. Same-origin images only (ours are).
 */
const cache = new Map<string, string>();

export function topTone(img: HTMLImageElement | null | undefined): string | null {
  if (!img || !img.complete || !img.naturalWidth) return null;
  const hit = cache.get(img.src);
  if (hit) return hit;
  try {
    const c = document.createElement("canvas");
    c.width = 12;
    c.height = 3;
    const x = c.getContext("2d", { willReadFrequently: true });
    if (!x) return null;
    x.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight * 0.14, 0, 0, 12, 3);
    const d = x.getImageData(0, 0, 12, 3).data;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
    }
    const n = d.length / 4;
    const out = rgb(r / n, g / n, b / n);
    cache.set(img.src, out);
    return out;
  } catch {
    return null;
  }
}

/** Mix a colour toward black (k = 0..1), as a dark gradient over it would. */
export function darken(color: string, k: number) {
  const m = color.match(/\d+(\.\d+)?/g);
  if (!m) return color;
  const [r, g, b] = m.map(Number);
  return rgb(r * (1 - k), g * (1 - k), b * (1 - k));
}

export function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return rgb((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

const rgb = (r: number, g: number, b: number) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

/** The same colour at an alpha. */
export function alpha(color: string, a: number) {
  const m = color.match(/\d+(\.\d+)?/g);
  if (!m) return color;
  const [r, g, b] = m.map(Number);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
