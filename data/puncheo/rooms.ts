// The sheet walked room by room. The engineer checks a room's walls in one
// pass, so each room repeats the checks that belong to walls and openings,
// ordered by what is inspected together (panels, then alignment and plumb,
// then openings). Whole-house checks open and close the walk.
//
// Assumptions to confirm in the field:
// - Cuartos is one section for every bedroom; Sala includes kitchen-dining.
// - Techos holds the ceiling forms: modulación and prensas de cielo only
//   (the sheet's other checks are for wall panels).
// - Pre-armado has no Techos section (ceiling forms go up after the walls).
import { sheet as base, type Check, type Punch, type Sheet } from "./formaleta-n1";

/** A check as it appears in one room: its own id (room:number), the sheet's number kept as `num`. */
export type Instance = Check & { num: string; room: string; phase: string };

/** A fact from the sheet worth seeing on its own between checks (AD Visual's hairline table). */
export type Key = { title: string; rows: [string, string][] };

export type Item =
  | { kind: "check"; id: string }
  | { kind: "group"; label: string }
  | { kind: "key"; key: Key }
  /** Where a room's checks for one punch begin: its name and when it happens. */
  | { kind: "phase"; n: number; name: string; moment: string };

export type Section = { id: string; name: string; note: string; items: Item[]; ids: string[] };

export type RoomPunch = Omit<Punch, "checks"> & { checks: Instance[]; sections: Section[] };
export type RoomSheet = Omit<Sheet, "punches"> & {
  punches: RoomPunch[];
  /** The walk: one section per room, each holding its pre-armado and then its pre-chorrea checks. */
  walk: Section[];
};

const KEYS: Record<string, Key> = {
  regla: {
    title: "Regla 3/5",
    rows: [
      ["Verde", "hasta 3 mm"],
      ["Amarillo", "4 a 5 mm"],
      ["Rojo", "más de 5 mm"],
      ["Plomo", "en la altura completa del panel"],
    ],
  },
  evidencia: {
    title: "Evidencia",
    rows: [
      ["Amarillo", "pasa con nota y foto, no bloquea"],
      ["Rojo", "nota y foto; bloquea cerrar la ficha"],
      ["Control", "2 puntos al azar, ±3 mm contra el registro"],
    ],
  },
  panel: {
    title: "Paneles",
    rows: [
      ["Abolladura", "máximo 3 mm con regla sobre la cara"],
      ["Concreto", "en rieles o costra: sale antes de armar"],
    ],
  },
  separadores: {
    title: "Separadores",
    rows: [
      ["Densidad", "6 por m² de muro (referencia, por definir)"],
      ["Acero", "nunca pegado a la cara del panel"],
    ],
  },
  cunas: {
    title: "Uniones",
    rows: [
      ["Cuñas", "5 por unión de altura completa, sin excepción"],
      ["Dinteles", "según estándar Adelante"],
      ["Corbatas", "cero faltantes, largo correcto"],
    ],
  },
  tensores: {
    title: "Aplomado",
    rows: [
      ["Tensores", "cada 2,5 m y uno por muro suelto (propuesta)"],
      ["Paños", "extremos y centro de muros de más de 1,5 m"],
    ],
  },
  vanos: {
    title: "Vanos",
    rows: [
      ["Medidas", "−0 / +5 mm contra plano"],
      ["Escuadra", "diferencia de diagonales, regla 3/5"],
      ["Tapas", "escalón máximo 2 mm, todas pinadas"],
    ],
  },
  previstas: {
    title: "Previstas",
    rows: [
      ["Tacos", "calzas o negativos: firmes y a medida"],
      ["N/A", "solo si el baño no los lleva"],
    ],
  },
  cielo: {
    title: "Cielo",
    rows: [["Prensas", "posiciones del estándar (por definir)"]],
  },
  cierre: {
    title: "Antes de chorrear",
    rows: [
      ["Replomo", "cambio máximo 2 mm contra 2.6 y 2.11"],
      ["Vigía", "con nombre; sin vigía no se chorrea"],
    ],
  },
};

type Spec = { id: string; name: string; note: string; items: (string | { group: string } | { key: keyof typeof KEYS })[] };

const g = (group: string) => ({ group });
const k = (key: keyof typeof KEYS) => ({ key });

const P1: Spec[] = [
  { id: "casa", name: "Casa", note: "Losa, perímetro y paneles", items: [k("evidencia"), "1.1", "1.3", "1.4", k("panel"), "1.7", "1.8", "1.10"] },
  { id: "sala", name: "Sala", note: "Sala, comedor y cocina", items: [k("regla"), "1.2", "1.5", k("separadores"), "1.6", "1.9"] },
  { id: "cuartos", name: "Cuartos", note: "Todos los dormitorios", items: ["1.2", "1.5", "1.6", "1.9"] },
  { id: "banos", name: "Baños", note: "Con sus previstas", items: ["1.2", "1.5", "1.6", "1.9"] },
];

const room = (keys: { paneles?: keyof typeof KEYS; plomo?: keyof typeof KEYS; vanos?: keyof typeof KEYS; previstas?: keyof typeof KEYS }) => [
  g("Paneles"),
  ...(keys.paneles ? [k(keys.paneles)] : []),
  "2.1",
  "2.2",
  "2.3",
  "2.13",
  g("Alineación y plomo"),
  ...(keys.plomo ? [k(keys.plomo)] : []),
  "2.4",
  "2.5",
  "2.6",
  "2.7",
  g("Vanos"),
  ...(keys.vanos ? [k(keys.vanos)] : []),
  "2.8",
  "2.9",
  "2.10",
  "2.11",
  "2.12",
  g("Previstas"),
  ...(keys.previstas ? [k(keys.previstas)] : []),
  "2.14",
];

const P2: Spec[] = [
  { id: "sala", name: "Sala", note: "Sala, comedor y cocina", items: room({ paneles: "cunas", plomo: "regla" }) },
  { id: "cuartos", name: "Cuartos", note: "Todos los dormitorios", items: room({ plomo: "tensores", vanos: "vanos" }) },
  { id: "banos", name: "Baños", note: "Con sus previstas", items: room({ previstas: "previstas" }) },
  { id: "techos", name: "Techos", note: "Formaleta de cielo", items: [k("cielo"), "2.1", "2.15"] },
  { id: "cierre", name: "Cierre", note: "Toda la casa, justo antes de chorrear", items: [k("cierre"), "2.16", "2.17"] },
];

function build(p: Punch, specs: Spec[]): RoomPunch {
  const byNum = new Map(p.checks.map((c) => [c.id, c]));
  const checks: Instance[] = [];
  const sections: Section[] = specs.map((sp) => {
    const ids: string[] = [];
    const items: Item[] = sp.items.map((it) => {
      if (typeof it === "string") {
        const c = byNum.get(it)!;
        const id = `${sp.id}:${it}`;
        checks.push({ ...c, id, num: it, room: sp.name, phase: p.name });
        ids.push(id);
        return { kind: "check", id };
      }
      if ("group" in it) return { kind: "group", label: it.group };
      return { kind: "key", key: KEYS[it.key] };
    });
    return { id: sp.id, name: sp.name, note: sp.note, items, ids };
  });
  return { ...p, checks, sections };
}

const ROOMS: { id: string; name: string; note: string }[] = [
  { id: "casa", name: "Casa", note: "Losa, perímetro y paneles" },
  { id: "sala", name: "Sala", note: "Sala, comedor y cocina" },
  { id: "cuartos", name: "Cuartos", note: "Todos los dormitorios" },
  { id: "banos", name: "Baños", note: "Con sus previstas" },
  { id: "techos", name: "Techos", note: "Formaleta de cielo" },
  { id: "cierre", name: "Cierre", note: "Toda la casa, antes de chorrear" },
];

/** Rooms are the sections; inside each, the pre-armado checks come first, then the pre-chorrea ones. */
function walkOf(punches: RoomPunch[]): Section[] {
  return ROOMS.map((room) => {
    const items: Item[] = [];
    const ids: string[] = [];
    for (const p of punches) {
      const sec = p.sections.find((x) => x.id === room.id);
      if (!sec) continue;
      items.push({ kind: "phase", n: p.n, name: p.name, moment: p.moment });
      items.push(...sec.items);
      ids.push(...sec.ids);
    }
    return { ...room, items, ids };
  }).filter((x) => x.ids.length);
}

const punches = [build(base.punches[0], P1), build(base.punches[1], P2)];

export const roomSheet: RoomSheet = {
  ...base,
  punches,
  walk: walkOf(punches),
};
