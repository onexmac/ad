import { addEntry, checkEntry, live, readBoards } from "@/lib/axis-cube/scores";

// The Cubes' fives, one for everybody (lib/axis-cube/scores.ts). GET: every puzzle's five. POST { key, cs, ini }: a
// new entry, answered with the fives as they are now. With no database connected: { live: false }, and the app keeps
// its fives on the device.
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  if (!live) return json({ live: false });
  try {
    return json({ live: true, boards: await readBoards() });
  } catch {
    return json({ live: false }, 503);
  }
}

export async function POST(request: Request) {
  if (!live) return json({ live: false });
  const entry = checkEntry(await request.json().catch(() => null));
  if (!entry) return json({ live: true, error: "bad entry" }, 400);
  const from = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  try {
    if (!(await addEntry(entry, from))) return json({ live: true, error: "slow down" }, 429);
    return json({ live: true, boards: await readBoards() });
  } catch {
    return json({ live: false }, 503);
  }
}
