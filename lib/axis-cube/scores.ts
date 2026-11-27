/**
 * The Cubes' high scores, one five for everybody (app/(axis-cube)/kit/axis-cube/scores/route.ts).
 *
 * They are kept in a Redis database on Upstash, connected to this Vercel project from its Storage tab, which gives
 * the project its address and key as environment variables: MAGI_KV_REST_API_URL and MAGI_KV_REST_API_TOKEN, as it
 * was connected (the unprefixed KV_ and UPSTASH_REDIS_REST_ names work too). Nothing about it is in this repo. Until
 * one is connected the route says so ({ live: false }) and the app keeps its fives on the device, as it always has.
 *
 * Each puzzle is a sorted set of its times in hundredths of a second, each member the initials, the time and a
 * random tag (so two equal entries are two entries), trimmed to its best fifty. Marcos's times from while the game
 * was made (MAC: 2 h 34 min 48 s on the 3×3, 14 min 56 s and 24 min 3 s on the 2×2) were entered here on 27 Nov 2026
 * like anyone's, and go down or out of the fives like anyone's. They were first entered as minutes, seconds and
 * hundredths (154.48 s, 14.56 s, 24.03 s); fixMacOnce() puts them right, once, the first time the fives are read.
 */

const env = (...names: string[]) => names.map((n) => process.env[n]).find(Boolean) || "";
const URL_ = env("MAGI_KV_REST_API_URL", "KV_REST_API_URL", "UPSTASH_REDIS_REST_URL");
const TOKEN = env("MAGI_KV_REST_API_TOKEN", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN");
export const live = !!(URL_ && TOKEN);

export const PUZZLES = ["axis", "cube3", "cube2", "ghost"] as const;
export type Puzzle = (typeof PUZZLES)[number];
export type Row = [number, string];                 // hundredths of a second, initials
export type Boards = Record<Puzzle, Row[]>;

// No hand solves a mix (12 to 24 turns) faster than this, on a phone: a time under it was not played.
const FLOOR: Record<Puzzle, number> = { axis: 500, cube3: 500, cube2: 200, ghost: 500 };
const CEIL = (99 * 3600 + 59 * 60 + 59) * 100 + 99;   // 99:59:59.99, the clock's last
const KEEP = 50, SHOW = 5;
const PER_MINUTE = 6;                                // entries one address may send in a minute
const setOf = (p: Puzzle) => `axis-cube:top:${p}`;

async function redis(commands: (string | number)[][]): Promise<unknown[]> {
  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  return out.map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

const rowsOf = (flat: unknown): Row[] => {
  const a = Array.isArray(flat) ? (flat as string[]) : [];
  const rows: Row[] = [];
  for (let i = 0; i + 1 < a.length; i += 2) rows.push([Math.round(Number(a[i + 1])), String(a[i]).split(":")[0]]);
  return rows;
};

// MAC's three times as first entered (in the wrong units), and as they are: hours, minutes and seconds, in hundredths
const MAC_WRONG: [Puzzle, number][] = [["cube3", 15448], ["cube2", 1456], ["cube2", 2403]];
const MAC_RIGHT: [Puzzle, number][] = [["cube3", 928800], ["cube2", 89600], ["cube2", 144300]];
const MAC_FIXED = "axis-cube:fix:mac-hms";
let macFixed = false;
async function fixMacOnce() {
  if (macFixed) return;
  const [claimed] = await redis([["SET", MAC_FIXED, "1", "NX"]]);
  macFixed = true;
  if (claimed !== "OK") return;                      // done already, by this or another instance
  try {
    const lists = await redis(PUZZLES.map((p) => ["ZRANGE", setOf(p), 0, -1]));
    const fix: (string | number)[][] = [];
    PUZZLES.forEach((p, i) => {
      for (const m of (Array.isArray(lists[i]) ? (lists[i] as string[]) : [])) {
        const [ini, cs] = String(m).split(":");
        if (ini === "MAC" && MAC_WRONG.some(([k, c]) => k === p && String(c) === cs)) fix.push(["ZREM", setOf(p), m]);
      }
    });
    for (const [k, cs] of MAC_RIGHT) fix.push(["ZADD", setOf(k), cs, `MAC:${cs}:fixed`]);
    await redis(fix);
  } catch (e) {
    await redis([["DEL", MAC_FIXED]]).catch(() => null);   // let the next read try again
    macFixed = false;
    throw e;
  }
}

export async function readBoards(): Promise<Boards> {
  await fixMacOnce();
  const got = await redis(PUZZLES.map((p) => ["ZRANGE", setOf(p), 0, SHOW - 1, "WITHSCORES"]));
  return Object.fromEntries(PUZZLES.map((p, i) => [p, rowsOf(got[i])])) as Boards;
}

export type Entry = { key: Puzzle; cs: number; ini: string };
export function checkEntry(body: unknown): Entry | null {
  if (!body || typeof body !== "object") return null;
  const { key, cs, ini } = body as Record<string, unknown>;
  if (typeof key !== "string" || !(PUZZLES as readonly string[]).includes(key)) return null;
  if (typeof cs !== "number" || !Number.isInteger(cs) || cs < FLOOR[key as Puzzle] || cs > CEIL) return null;
  if (typeof ini !== "string" || !/^[A-Z]{1,3}$/.test(ini)) return null;
  return { key: key as Puzzle, cs, ini };
}

/** Keeps an entry, unless its address has sent too many this minute (false). */
export async function addEntry(e: Entry, from: string): Promise<boolean> {
  const gate = `axis-cube:rate:${from}`;
  const [count] = await redis([["INCR", gate], ["EXPIRE", gate, 60]]);
  if (Number(count) > PER_MINUTE) return false;
  const tag = Math.random().toString(36).slice(2, 8);
  await redis([
    ["ZADD", setOf(e.key), e.cs, `${e.ini}:${e.cs}:${tag}`],
    ["ZREMRANGEBYRANK", setOf(e.key), KEEP, -1],
  ]);
  return true;
}
