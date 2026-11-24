# MAGI portal

One site, one link. The root screen has two doors:

- `/kit` — personal apps
- `/ad` — Adelante apps

Every app lives at `/<section>/<app>`, for example `/ad/kpi`.

## Add an app

1. Add an entry to `lib/apps.json` under its section (`slug`, `name`, optional `description`).
2. Put the app's code in `app/<section>/<slug>/`.
   An app that needs its own look (dark ground, its own fonts, icon or
   `themeColor`) goes in its own route group with its own root layout, like
   Histok in `app/(histok)/kit/histok/`. The portal's own pages (`/`, `/ad`, `/kit`) live in
   `app/(index)/`, in technical minimalism (`components/tech-index/`).

An app that still lives in its own deployment can be listed first with an
`external` URL. Its portal path then redirects there, so the link you share
does not change when the code later moves into this repo. Remove `external`
once the code is here.

## Run

```bash
npm install
```

```bash
npm run dev
```

## Deploy

Vercel builds and deploys on every push to `main`. No tokens are used.

This repository is public. Do not commit secrets, private data, or anything
copied from a private repository without checking it first.
