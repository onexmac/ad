# Updatr editions

One edition a week (Nº = ISO week), updated every day by
`.github/workflows/updatr.yml` (07:23 in Costa Rica) and committed to `main`,
which deploys it. The same system as Noticss (`scripts/noticss/`), shaped for
releases instead of storylines.

| Step | File | What it does |
|---|---|---|
| Brief | `generate.mjs` | Researches the followed franchises with web search, then writes the brief as structured output: 6–14 entries for the week and 6–10 suggestions from a wider net. Default model `claude-opus-5-5`; the repository variable `UPDATR_MODEL` changes it. |
| Tidy | `schema.mjs` | Unique, slugged ids; importance 1–3; no suggestion repeating an entry. An entry keeps its id across days and weeks, which is how a followed release is found again. Release dates only when a source gives them. |
| Merge | `edition.mjs` | Same id: the story moved on, replace it (keeping its photo). New id: add it. Suggestions keep the newest 16. |
| Photos | `edition.mjs` | The share image (og:image) of each entry's source page, via Noticss's `shareImage`, linked, not copied. Generic share cards are dropped. |
| Write | `edition.mjs` | `data/updatr/<year>-W<week>.json`, checked against the schema; the manifest `data/updatr/index.ts` (the newest 12); and `public/kit/updatr/latest.json`, which the app fetches when the reader pulls past the bottom of the issue. |

What the reader follows is `data/updatr/franchises.json` (shared with the app;
`radar` is for suggestions beyond the list).

Run by hand:

```bash
node scripts/updatr/edition.mjs                      # needs ANTHROPIC_API_KEY
node scripts/updatr/edition.mjs --from brief.json    # a brief written elsewhere, same shape
node scripts/updatr/edition.mjs --manifest           # rebuild the manifest and latest.json only
```

Without `ANTHROPIC_API_KEY` the scheduled run changes nothing. The key is the
repository's Actions secret, the same one Noticss uses.

On the reader's device (no accounts yet): follows (`lib/updatr/watch.ts`),
likes and the taste model (`lib/updatr/taste.ts`), which picks about 30% of
what the issue shows from the suggestion pool and earlier weeks.
