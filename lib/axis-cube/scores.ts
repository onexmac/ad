/**
 * The Cubes' high scores, one five for everybody (app/(axis-cube)/kit/axis-cube/scores/route.ts).
 *
 * They are kept in a Redis database on Upstash, connected to this Vercel project from its Storage tab, which gives
 * the project its address and key as environment variables: MAGI_KV_REST_API_URL and MAGI_KV_REST_API_TOKEN, as it
 * was connected (the unprefixed KV_ and UPSTASH_REDIS_REST_ names work too). Nothing about it is in this repo. Until
 * one is connected the route says so ({ live: false }) and the app keeps its fives on the device, as it always has.
 *
 * Each puzzle is a sorted set of its times in hundredths of a second, each member the initials, the time and a
 * random tag (so two equal entries are two entries), trimmed to its best fifty.
 */

const env = (...names: string[]) => names.map((n) => process.env[n]).find(Boolean) || "";
const URL_ = env("MAGI_KV_REST_API_URL", "KV_REST_API_URL", "UPSTASH_REDIS_REST_URL");
const TOKEN = env("MAGI_KV_REST_API_TOKEN", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN");
export const live = !!(URL_ && TOKEN);

export const PUZZLES = ["axis", "cube3", "cube2", "ghost", "puppet", "cube4", "crazy", "sq1"] as const;
export type Puzzle = (typeof PUZZLES)[number];
export type Row = [number, string];                 // hundredths of a second, initials
export type Boards = Record<Puzzle, Row[]>;

// No hand solves a mix (12 to 24 turns) faster than this, on a phone: a time under it was not played.
const FLOOR: Record<Puzzle, number> = { axis: 500, cube3: 500, cube2: 200, ghost: 500, puppet: 300, cube4: 1000, crazy: 500, sq1: 500 };
const CEIL = (99 * 3600 + 59 * 60 + 59) * 100 + 99;   // 99:59:59.99, the clock's last
const KEEP = 50, SHOW = 10;                          // the top ten go out: the screen shows them in two pages of five
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

// The house's own times, as on any arcade (MAC), were kept to the second; they get their hundredths, as every other
// entry has. Done once, by whichever request claims it first.
const HOUSE: [Puzzle, number, number][] = [["cube3", 928800, 928837], ["cube2", 89600, 89641], ["cube2", 144300, 144319]];
const HOUSE_DONE = "axis-cube:fix:house-cc";
let houseDone = false;
async function houseOnce() {
  if (houseDone) return;
  houseDone = true;
  try {
    const [claimed] = await redis([["SET", HOUSE_DONE, "1", "NX"]]);
    if (claimed !== "OK") return;
    const found = await redis(HOUSE.map(([p, was]) => ["ZRANGEBYSCORE", setOf(p), was, was]));
    const cmds: (string | number)[][] = [];
    HOUSE.forEach(([p, was, now], i) => {
      const m = (Array.isArray(found[i]) ? (found[i] as string[]) : []).find((x) => x.startsWith("MAC:"));
      if (m) cmds.push(["ZREM", setOf(p), m], ["ZADD", setOf(p), now, `MAC:${now}:${m.split(":")[2] || "h"}`]);
    });
    if (cmds.length) await redis(cmds);
  } catch {
    houseDone = false;
    await redis([["DEL", HOUSE_DONE]]).catch(() => null);   // not done: the next request tries again
  }
}

export async function readBoards(): Promise<Boards> {
  await houseOnce();
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
