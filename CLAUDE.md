@AGENTS.md

# MAGI portal — working rules

- This repo is **public**. Never commit secrets, tokens, `.env` files, or content
  copied from a private repo (including `onexmac/magi`) without Marcos's explicit
  yes on the exact diff.
- All apps live in this repo under `app/<section>/<slug>/`, listed in
  `lib/apps.json`. Sections are `kit` (personal) and `ad` (Adelante). Do not
  create or suggest new repositories for apps.
- Deploys happen through Vercel's GitHub integration on push to `main`. Do not
  deploy with the Vercel CLI or a token.
- Look: forced light mode, tokens in `app/globals.css` (ground, card, ink,
  brand). Reuse them; do not add inline colours.
