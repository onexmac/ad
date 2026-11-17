/** The prototype's "today": data is a snapshot, so time is fixed with it. */
export const SNAPSHOT = "2026-11-17";

const DAY = 86_400_000;
const parse = (iso: string) => new Date(`${iso}T12:00:00Z`).getTime();

/** 17.11.26 */
export function dot(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
}

/** Days from the snapshot: negative is past. */
export function daysFrom(iso: string): number {
  return Math.round((parse(iso) - parse(SNAPSHOT)) / DAY);
}

/** "Today", "3D AGO", "IN 12D", "T–12D" style labels. */
export function relative(iso: string | null | undefined): string {
  if (!iso) return "Date n/a";
  const n = daysFrom(iso);
  if (n === 0) return "Today";
  if (n < 0) return `${-n}d ago`;
  return `In ${n}d`;
}

export function countdown(iso: string): string {
  const n = daysFrom(iso);
  if (n <= 0) return "Live";
  return `T–${String(n).padStart(2, "0")}D`;
}

export function pad(n: number, w = 2): string {
  return String(n).padStart(w, "0");
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function weekday(iso: string): string {
  return WEEKDAYS[new Date(parse(iso)).getUTCDay()];
}

/** ISO week number. */
export function isoWeek(iso: string): number {
  const d = new Date(parse(iso));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const diff = (d.getTime() - firstThursday.getTime()) / DAY;
  return 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

const NUMBERS = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen",
  "Nineteen", "Twenty",
];
export function spell(n: number): string {
  return NUMBERS[n] ?? String(n);
}

/** yyyy-mm-dd of a UTC date. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday (UTC) of an ISO week. */
export function isoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (week - 1) * 7);
  return monday;
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
