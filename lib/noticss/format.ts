/** Spanish dates as Costa Rica writes them (setiembre, not septiembre). */
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];
const SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const parts = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
};

/** "Martes 9 de setiembre de 2026" */
export function longDate(iso: string) {
  const { y, m, d, wd } = parts(iso);
  const day = DAYS[wd];
  return `${day[0].toUpperCase()}${day.slice(1)} ${d} de ${MONTHS[m - 1]} de ${y}`;
}

/** "9 set" */
export function shortDate(iso: string | null) {
  if (!iso) return "s. f.";
  const { m, d } = parts(iso);
  return `${d} ${SHORT[m - 1]}`;
}

/** "Martes" */
export function weekday(iso: string) {
  const d = DAYS[parts(iso).wd];
  return `${d[0].toUpperCase()}${d.slice(1)}`;
}

/** "9 de setiembre" */
export function dayMonth(iso: string) {
  const { m, d } = parts(iso);
  return `${d} de ${MONTHS[m - 1]}`;
}

export const pad = (n: number) => String(n).padStart(2, "0");

const WORDS = ["Cero", "Una", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve", "Diez", "Once", "Doce"];
/** Spelled out up to twelve, as print does. */
export const spell = (n: number) => WORDS[n] ?? String(n);

