/**
 * Noticss: the cover's sky, from Open-Meteo's forecast for Cartago (no key).
 *
 * The cover paints the day's weather as a five-stop gradient, top of the sky
 * to the horizon. It is worked out here from two readings, how clear the sky
 * is and whether it is morning or afternoon, so the file says which sky the
 * app will paint. If the forecast cannot be fetched the weather is null and
 * the cover goes neutral: nothing is guessed.
 */

const LAT = 9.8644;
const LON = -83.9194;
const URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  "&current=temperature_2m,weather_code,cloud_cover" +
  "&hourly=precipitation_probability" +
  "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset" +
  "&timezone=America%2FCosta_Rica&forecast_days=1";

/** WMO code: what it is called, its glyph, and how much it darkens the sky (0 clear .. 1 storm). */
function reading(code) {
  if (code === 0) return ["despejado", "sun", 0];
  if (code === 1) return ["mayormente despejado", "sun", 0.1];
  if (code === 2) return ["parcialmente nublado", "partly", 0.3];
  if (code === 3) return ["nublado", "cloud", 0.55];
  if (code === 45 || code === 48) return ["neblina", "cloud", 0.6];
  if (code >= 51 && code <= 57) return ["llovizna", "rain", 0.7];
  if (code >= 61 && code <= 67) return ["lluvia", "rain", 0.8];
  if (code >= 80 && code <= 82) return ["aguaceros", "rain", 0.85];
  if (code >= 95) return ["tormenta", "storm", 1];
  return ["variable", "partly", 0.4];
}

/* Two skies per time of day, clear and closed in; the day's sky lies between. */
const CLEAR = {
  manana: ["#2a64a8", "#5d98d2", "#9fc4e4", "#dfe7e0", "#f7e2bd"],
  tarde: ["#1f4f8c", "#4f84bf", "#93b6d6", "#e3d9c6", "#f4c99a"],
};
const CLOSED = {
  manana: ["#2b3446", "#56637a", "#8a96a6", "#bcc0c1", "#e4d6c4"],
  tarde: ["#232838", "#4a4c62", "#7c7a8c", "#b3a8a2", "#dcc2a0"],
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) =>
  "#" +
  hex(a)
    .map((v, i) => Math.round(v + (hex(b)[i] - v) * t))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");

export function skyOf(slot, gloom) {
  return CLEAR[slot].map((c, i) => mix(c, CLOSED[slot][i], Math.max(0, Math.min(1, gloom))));
}

const hhmm = (iso) => (iso ? iso.slice(11, 16) : null);
const round = (n) => (typeof n === "number" ? Math.round(n) : null);

/** Today's weather for the edition, or null when the forecast is unreachable. */
export async function weather(slot) {
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    const code = d.current?.weather_code ?? null;
    const [condition, glyph, gloom] = reading(code);
    const cloud = d.current?.cloud_cover ?? null;
    // Cloud cover nudges the sky further than the code alone says.
    const g = cloud == null ? gloom : Math.max(gloom, (cloud / 100) * 0.6);
    const hourly = d.hourly?.precipitation_probability ?? null;
    return {
      place: "Cartago",
      tempC: round(d.current?.temperature_2m),
      maxC: round(d.daily?.temperature_2m_max?.[0]),
      minC: round(d.daily?.temperature_2m_min?.[0]),
      code,
      condition,
      glyph,
      cloudCover: cloud,
      rainProb: d.daily?.precipitation_probability_max?.[0] ?? null,
      sunrise: hhmm(d.daily?.sunrise?.[0]),
      sunset: hhmm(d.daily?.sunset?.[0]),
      rainHours: Array.isArray(hourly) && hourly.length >= 24 ? hourly.slice(0, 24).map((v) => v ?? 0) : null,
      sky: skyOf(slot, g),
      source: { name: "Open-Meteo", url: "https://open-meteo.com/" },
    };
  } catch (err) {
    console.warn(`weather: ${err instanceof Error ? err.message : err}; the cover goes neutral`);
    return null;
  }
}
