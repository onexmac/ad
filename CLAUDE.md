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
- Every app or prototype Marcos asks for ships to `main` as soon as there is
  something to look at (branch → PR → merge, without waiting to be asked), and
  every iteration after that. Give him the portal link,
  `https://magi0s.vercel.app/<section>/<slug>`. Never a Vercel branch preview
  (it sits behind a Vercel login), an artifact, or screenshots instead. The only
  stop is the first rule above: secrets or private-repo content.
- Look: forced light mode, tokens in `app/globals.css` (ground, card, ink,
  brand). Reuse them; do not add inline colours.
