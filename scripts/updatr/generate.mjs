/**
 * Updatr: the model's part of an update. Two calls, as in Noticss:
 *
 *   1. research: web search, returns prose notes organised by story;
 *   2. structure: turns those notes into the brief (structured output).
 *
 * Keeping them apart keeps the search tool and the constrained output from
 * interacting, and the second call is cheap and deterministic. Nothing is
 * guessed: a date the sources do not give is null.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { Brief, FRANCHISES, KINDS } from "./schema.mjs";

/** The model, overridable with the repository variable UPDATR_MODEL. */
const MODEL = process.env.UPDATR_MODEL || "claude-opus-5-5";
const BETAS = ["server-side-fallback-2026-07-01"];

const followed = FRANCHISES.filter((f) => f.id !== "radar");

const RESEARCH = ({ date, label, days, known, bare = [] }) => `Today is ${date}. You are updating ${label} of Updatr, a magazine-style tracker for one reader. It follows these, each for something specific:
${followed.map((f) => `- ${f.name}${f.studio !== "—" ? ` (${f.studio})` : ""}: ${f.watching}.`).join("\n")}

Film, Books and TV are categories: there, look for notable releases close to the reader's games (science fiction, action, anime, video game adaptations), not everything that came out.

Search the last ${days} days. Prefer official sources (patch notes, studio and publisher blogs, official channels and store pages), then reputable games press. For each game: new or upcoming updates and seasons, collabs, skins and outfits, new characters or agents, events, and every release or start date you can source. Say explicitly when a game had nothing new.

${known.length ? `Already in the tracker (id, title, date):\n${known.map((k) => `- [${k.id}] ${k.title}${k.when ? ` (${k.when})` : ""}`).join("\n")}\nBring one of these back only if something changed (a new date, a reveal, a release), and say what changed.\n\n` : ""}Organise the notes BY STORY: one concrete thing (a season, a collab, a skin bundle, a release). For each: a specific working title, the franchise, the facts with their dates, the release or start date if any, the source (name and URL), the source's publish date, and up to three OTHER pages about the same story (other outlets, the official post, the store or video page): the magazine shows a picture for every story, taken from these pages, so prefer pages that carry the story's key art or a screenshot.

${bare.length ? `These stories are in the tracker without a picture (their page has none). For each, find up to three other pages about the same story (the official post, other outlets, the store or video page) that carry its key art or a screenshot:\n${bare.map((b) => `- [${b.id}] ${b.title} (${b.url})`).join("\n")}\n\n` : ""}Separately, a WIDER NET of 6 to 10 stories for suggestions: games, collabs and releases this reader would likely follow, given the list (live-service shooters, character-action and gacha action games, their collabs and outfits, game adaptations on screen). Each sourced the same way.

Rules: only what the sources support; every story needs the URL of the page it comes from (a story without one is not published); never estimate a date; if a value is missing, say so. Separate fact from opinion. Return prose notes, organised by story. No JSON.`;

const STRUCTURE = ({ date, label, notes, known, bare = [] }) => `Turn these notes into ${label} of Updatr, as of ${date}.

NOTES:
${notes}

Rules:
- "items": 6 to 14 stories for the followed franchises. ONE ITEM IS ONE STORY.
- "suggestions": 6 to 10 stories from the wider net, same format. None repeats an item. Use franchise "radar" when it is not one of the followed ones.
- "id": short, lowercase, hyphenated, prefixed with the franchise's code in lowercase (for example "tf-season-9", "zzz-2-5-agents").${known.length ? ` If a story continues one already in the tracker, use exactly its id: ${known.map((k) => k.id).join(", ")}.` : ""}
- "franchise": one of ${FRANCHISES.map((f) => f.id).join(", ")}.
- "kind": one of ${KINDS.join(", ")}.
- "status": "upcoming" if it starts after ${date}, "live" if it is running now, "out" if released.
- "title": specific and short, never the franchise's name alone.
- "dek": one line, at most 140 characters: what it is and why it matters to this reader.
- "body": 2 or 3 short paragraphs (at most 600 characters each): the facts, the dates, what to watch.
- "date": the source's publish date (YYYY-MM-DD) or null. "when": the release or start date (YYYY-MM-DD) only if a source gives it, else null.
- "importance": 3 if it changes what the reader does this week (a release, a limited event), 2 worth knowing, 1 context.
- "tags": 1 to 3, lowercase.
- "source": the outlet or channel's name. "url": the exact page the facts come from. REQUIRED: a story without a URL is dropped, so leave out any story you cannot link to a page.
- "also": up to 3 other pages from the notes about the same story (exact URLs, never invented), [] if none. The picture is looked for there when the source page has none.
- "image": always null (photos are found later).
- "pictures": ${bare.length ? `for each of these ids that the notes found other pages for (${bare.map((b) => b.id).join(", ")}), {"id", "also": up to 3 exact URLs from the notes}` : "[]"}. Never invent a URL.
- English, plain register.`;

const text = (message) =>
  message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

function check(message, label) {
  if (message.stop_reason === "refusal") throw new Error(`${label}: refused (${message.stop_details?.category ?? "no category"})`);
  if (message.stop_reason === "max_tokens") throw new Error(`${label}: ran out of tokens`);
  // Server-tool errors arrive as results, not throws.
  const failed = message.content
    .filter((b) => b.type === "web_search_tool_result" && !Array.isArray(b.content))
    .map((b) => b.content?.error_code ?? "unknown");
  if (failed.length) console.warn(`${label}: web search reported ${failed.join(", ")}`);
}

async function research(client, ctx) {
  const tools = [{ type: "web_search_20260209", name: "web_search", max_uses: 24 }];
  let messages = [{ role: "user", content: RESEARCH(ctx) }];
  // The server's search loop can pause; resume it as it is, a few times at most.
  for (let turn = 0; turn < 5; turn++) {
    const message = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 64000,
        betas: BETAS,
        fallbacks: "default",
        output_config: { effort: "high" },
        tools,
        messages,
      })
      .finalMessage();
    check(message, "research");
    if (message.stop_reason !== "pause_turn") {
      const notes = text(message);
      if (!notes) throw new Error("research: no text returned");
      return notes;
    }
    messages = [messages[0], { role: "assistant", content: message.content }];
  }
  throw new Error("research: still paused after 5 turns");
}

async function structure(client, ctx, notes) {
  const message = await client.beta.messages
    .stream({
      model: MODEL,
      max_tokens: 64000,
      betas: BETAS,
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(Brief) },
      messages: [{ role: "user", content: STRUCTURE({ ...ctx, notes }) }],
    })
    .finalMessage();
  check(message, "structure");
  return Brief.parse(JSON.parse(text(message)));
}

/** Researches and writes the brief: { items, suggestions }. */
export async function generate(ctx) {
  const client = new Anthropic();
  console.log(`researching ${ctx.label} (${ctx.date}, last ${ctx.days} days) with ${MODEL}…`);
  const notes = await research(client, ctx);
  console.log(`notes: ${notes.length} chars; structuring…`);
  return structure(client, ctx, notes);
}
