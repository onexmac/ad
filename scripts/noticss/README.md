# Noticss editions

Two editions a day, morning and afternoon, made by `.github/workflows/noticss.yml`
(05:41 and 15:41 in Costa Rica) and committed to `main`, which deploys them.

| Step | File | What it does |
|---|---|---|
| Brief | `generate.mjs` | Researches the news with web search, then writes the brief as structured output: 5–8 storylines of the day, 8–14 more for suggestions, and the five figures. Default model `claude-opus-5-5`; the repository variable `NOTICSS_MODEL` changes it. |
| Tidy | `schema.mjs` | Unique ids, importance 1–3, no suggestion that repeats the day. A storyline keeps its id across editions, which is how a followed topic is found again. |
| Photos | `shots.mjs` | The share image (og:image) of each storyline's source page, checked to answer with an image and linked, not copied: the repository is public and would grow without end. Sites' generic share cards are dropped. |
| Sky | `weather.mjs` | Open-Meteo for Cartago (no key): temperature, rain by the hour, and the cover's five-stop sky. Null if unreachable. |
| Write | `edition.mjs` | Numbers the edition, checks it against the schema, writes `data/noticss/<date>-<slot>.json` and the manifest `data/noticss/index.ts` (the newest 14, newest first). |

Run by hand:

```bash
node scripts/noticss/edition.mjs                      # needs ANTHROPIC_API_KEY
node scripts/noticss/edition.mjs --from brief.json    # a brief written elsewhere, same shape
node scripts/noticss/edition.mjs --manifest           # rebuild the manifest only
```

Without `ANTHROPIC_API_KEY` the scheduled run changes nothing. The key goes in
the repository's Actions secrets.
