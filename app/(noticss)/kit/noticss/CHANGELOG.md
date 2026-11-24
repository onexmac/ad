# Noticss: changelog

Noticss lives at [/kit/noticss](https://magi0s.vercel.app/kit/noticss). It has two layouts of the same paper: B, sections of cards in the grammar of Paper, has been the main page since 0.3.9, and A, the issue in Updatr's grammar, is at [/kit/noticss/a](https://magi0s.vercel.app/kit/noticss/a).

## How versions are numbered

Every push to Vercel that changes the app gets an entry here. The first push was 0.1.0, and each version after it jumps by how big its push was:

| Jump | When |
| :--- | :--- |
| +0.0.1 | a small change |
| +0.0.2 or +0.0.3 | a bigger one |
| +0.0.5 | a big one |
| +0.1.0 | one too big for that (the last number goes back to 0) |
| +0.5.0 | only something massive |
| 1.0.0 | a milestone Marcos names |

Each entry gives the date and time in Costa Rica, the commit, and the pull request that took it to `main` (and so to magi0s). Editions are content, not changes to the app: a push that only adds an edition (the afternoon edition of 23 November in #128, or the pipeline's own "Noticss: edition …" commits) gets no version.

## 0.3.15 · 2026-11-24 07:35

- The edition pipeline's web search no longer asks for results near Cartago. The API refuses Costa Rica as a search location ("Country code CR is not supported"), so the first run of the twice-daily workflow failed at its first request and no edition came out. The prompt already places the reader in Cartago. ([#152](https://github.com/onexmac/ad/pull/152))

## 0.3.14 · 2026-11-24 00:21

- Hoy shows each section's lead storyline as a highlight: its synopsis and its most important note, then the day's figures.
  - The storyline's page says how many more notes wait in its section. The rest of its notes stay there, so nothing is shown twice and nothing is lost.
  - Política and Construcción come back, since their lead storylines no longer leave them empty.
  - Today Hoy is 13 cards, down from 36.
- Pulling back past a tray's first card brings the previous section in from the left, already at its last cards.
  - Its pill says "Vuelva a Hoy", then "Suelte: Hoy" past the mark.
  - Letting go past the mark lands there; short of it, the tray springs back. ([a2c1cff](https://github.com/onexmac/ad/commit/a2c1cff) · [#144](https://github.com/onexmac/ad/pull/144))

## 0.3.11 · 2026-11-23 23:58

- The like fan's cascade is clearer: dislike comes out 150 ms after like, up from 70 ms.
- Its labels are calmer. Their spin is softer, they fade in from 240 ms, and they are light text on a dark tag.
- The choice nearest the finger warms to red as the finger approaches, from 120 px away and fully by 72 px, so it shows red before the finger covers it: the circle, the mark and the tag. ([d76a945](https://github.com/onexmac/ad/commit/d76a945) · [#140](https://github.com/onexmac/ad/pull/140))

## 0.3.10 · 2026-11-23 23:39

- The like fan cascades: like comes out first and dislike 70 ms behind it.
- Each label rides its circle, orbiting with it, but its spin trails by 60 ms on a softer spring and it fades in from 120 ms. Going back, the labels leave first, then the circles spin in. ([835d026](https://github.com/onexmac/ad/commit/835d026) · [#137](https://github.com/onexmac/ad/pull/137))

## 0.3.9 · 2026-11-23 23:35

- Noticss opens on B. The portal's tile, /kit/noticss, shows the sections and cards, with B's own status bar and theme colour and the loading bar.
- A, the issue, moves to /kit/noticss/a.
- An old /kit/noticss/b link lands on /kit/noticss, and the A/B switch follows the new addresses. ([1a0ac4b](https://github.com/onexmac/ad/commit/1a0ac4b) · [#134](https://github.com/onexmac/ad/pull/134))

## 0.3.6 · 2026-11-23 23:31

- Hoy is the front page: the most important storyline of each section, most important first.
  - Those storylines leave their own sections.
  - A section left with nothing of its own is not shown that day.
- Pushing on past a tray's last card pulls the next section in from the right, against friction.
  - A pill arms past the mark ("Suelte: Economía").
  - Letting go there goes on to that section; short of the mark, the tray springs back. ([f7621ae](https://github.com/onexmac/ad/commit/f7621ae) · [#132](https://github.com/onexmac/ad/pull/132))

## 0.3.3 · 2026-11-23 23:21

- The like fan spins out like Path's menu: the choices and their labels come out of the button along an arc on an overshooting spring, one after the other, and spin back in.
- The heart turns into a cross while the choices are out.
- While sliding, the nearest choice leans toward the finger, more the closer it gets (up to 34 px), and is caught where that pull has drawn it. ([6af7fc0](https://github.com/onexmac/ad/commit/6af7fc0) · [#129](https://github.com/onexmac/ad/pull/129))

## 0.3.1 · 2026-11-23 21:43

- The skeleton gives way to a loading bar in Noticss's own colours, as The Cubes has.
  - The masthead sits at the centre, and a stroked bar three quarters of the way down fills as the scripts arrive, then as the page comes alive, the fonts load and the first screen's pictures come in.
  - On a slow phone network Noticss takes 9 to 10 s to come alive, so a bar that fills tells the truth about the wait. ([985f65f](https://github.com/onexmac/ad/commit/985f65f) · [#127](https://github.com/onexmac/ad/pull/127))

## 0.3.0 · 2026-11-23 21:29

- New editions twice a day, at 05:41 and 15:41, written by a pipeline that runs on its own.
  - It researches the day with web search and writes a structured brief, with a pool of suggestions beside the edition's own storylines.
  - It links each note to its outlet's photo, takes Cartago's sky from Open-Meteo, numbers the edition and keeps the newest 14 in a manifest the app reads.
- A morning and an afternoon edition can share a date: the cover and the edition switch name the slot (mañana or tarde), and the switch shows the latest three plus the one being read.
- Outlets' photos are fetched without saying where from, which some image hosts refuse otherwise.
- A model of the reader's taste, kept on the device and retrained from a log of likes, dislikes, followed topics and reading time.
- The like fan, beside the bookmark in an open page's controls.
  - A tap opens two choices above the heart, "Me gusta" and "Menos así".
  - Or press, slide onto a choice and let go to pick it.
  - Picking the same verdict again takes it back.
- About 30% of each section is suggestions, ranked by taste with room to explore, spread after the section's lead. Each is marked "Sugerida", with why: "por su interés en …" or "para explorar".
- The first edition from the pipeline followed in #128. ([934e4ac](https://github.com/onexmac/ad/commit/934e4ac) · [#124](https://github.com/onexmac/ad/pull/124))

## 0.2.32 · 2026-11-23 21:03

- A skeleton while the app loads: A's first screen in bones (the masthead between its rules, the date line, the lead picture), in Noticss's colours, springing in after 140 ms and out as the app fades in. ([ac55ba3](https://github.com/onexmac/ad/commit/ac55ba3) · [#118](https://github.com/onexmac/ad/pull/118))

## 0.2.31 · 2026-11-23 20:38

- No blur at the top. B's page now runs behind the clock itself, so the blurred band over the top of the tray goes.
- What stays is the band of paper that keeps an open page's words below the cut once it has scrolled past its photo. ([7013d9c](https://github.com/onexmac/ad/commit/7013d9c) · [#112](https://github.com/onexmac/ad/pull/112))

## 0.2.30 · 2026-11-23 20:31

- On an iPhone in Safari, B's own page runs behind the clock: the cover, the photo or the paper, whichever is at the top.
  - iOS 26 Safari draws page content behind its status bar only while the page is scrolled, and showed a white or black strip there otherwise.
  - So B is 80 px taller than the screen and holds the page scrolled down by that much, and the cut is the top of the screen.
  - Nothing of B is a fixed layer at the top edge any more.
- From the home screen and elsewhere it stays as it was. ([c3f7fc9](https://github.com/onexmac/ad/commit/c3f7fc9) · [#110](https://github.com/onexmac/ad/pull/110))

## 0.2.28 · 2026-11-23 20:03

- The top colour runs up behind Safari's status bar. Two layers sit behind the frame: the top half in the colour at the top of what shows, the bottom half black.
- An open page reads its own top again: the photo's top while the photo is there, the paper past it, with a band of paper under the status bar so the words stay below the cut. ([861f38c](https://github.com/onexmac/ad/commit/861f38c) · [#103](https://github.com/onexmac/ad/pull/103))

## 0.2.27 · 2026-11-23 19:53

- B is a tall vvv: a frame on black, from the top of the screen to just above Safari's bar or the home indicator, with its bottom corners rounded at 44 px.
- An open page fills the frame. Its top corners square off as it opens, since the phone's own corners round them, and its bottom ones are the frame's.
- The status bar takes the top colour, and beyond the frame is black. ([582ba85](https://github.com/onexmac/ad/commit/582ba85) · [#100](https://github.com/onexmac/ad/pull/100))

## 0.2.24 · 2026-11-23 14:59

- The Newsreader font comes from the repository's own dependencies instead of being fetched from Google during each build. That fetch had been failing deployments at random. ([c102d91](https://github.com/onexmac/ad/commit/c102d91) · [#79](https://github.com/onexmac/ad/pull/79))

## 0.2.23 · 2026-11-18 19:04

- In B, an open page is a card that stops 8 px above the bottom edge, its rounded bottom corners over the dark.
- While a page is open, the strip Safari leaves under its bar is that same dark, so it reads as the dark around the card. On the tray the strip keeps the cover's bottom colour. ([b7b1983](https://github.com/onexmac/ad/commit/b7b1983) · [#52](https://github.com/onexmac/ad/pull/52))

## 0.2.22 · 2026-11-18 19:01

- A probe page at /kit/noticss/probe, not listed in the portal, to find out what Safari draws in the strip under its bottom bar.
  - It paints each candidate layer in its own colour and lists every measure of the viewport, so one screenshot from the phone answers it. ([05ccb4b](https://github.com/onexmac/ad/commit/05ccb4b) · [#51](https://github.com/onexmac/ad/pull/51))

## 0.2.21 · 2026-11-18 13:06

- The whole-screen height from 0.2.20 is undone: Safari never draws a fixed surface below its bar, however tall.
- Instead, the colour Safari paints in that strip is whatever touches B's bottom edge: the cover's bottom on the tray (the sky on Hoy, the dark elsewhere), the open page's paper, the photo's dark while a story's full-bleed photo still fills its page, and black in the gallery. ([ddb6cd9](https://github.com/onexmac/ad/commit/ddb6cd9) · [#49](https://github.com/onexmac/ad/pull/49))

## 0.2.20 · 2026-11-18 09:43

- On an iPhone in Safari, B takes the whole height of the screen, so covers and pages run to the bottom edge instead of stopping above a band under the cards. The tray and the controls stay above what the browser covers. ([e740e98](https://github.com/onexmac/ad/commit/e740e98) · [#47](https://github.com/onexmac/ad/pull/47))

## 0.2.19 · 2026-11-17 20:48

- A sharp photo of the new Asamblea Legislativa building for the 4x3 story and its first note, in both editions. It replaces a low-resolution press image and is credited to Brandon131340 on Wikimedia Commons (CC BY-SA 4.0). ([91b211e](https://github.com/onexmac/ad/commit/91b211e) · [#45](https://github.com/onexmac/ad/pull/45))

## 0.2.18 · 2026-11-17 20:44

- The band below B is no longer the status bar's navy: Safari now shows the bottom colour there (the sky's bottom on Hoy, the dark elsewhere), and the status bar keeps the top one.
- In Safari, a page no longer shows square past its rounded card (on Cuatro días, for one): it is clipped to the card's rounded shape. ([4ccf64c](https://github.com/onexmac/ad/commit/4ccf64c) · [#44](https://github.com/onexmac/ad/pull/44))

## 0.2.17 · 2026-11-17 20:32

- An open article is back to a rounded frame that sits just below the status bar and scrolls within itself, with the dark around it filling the top. The blur, the band and the photo running up over an open page are taken out.
- Around B, what Safari shows under its bars and on overscroll is the top colour above and the bottom colour below: the sky's top and bottom on Hoy, the dark on the other covers and around an open page. ([962abcf](https://github.com/onexmac/ad/commit/962abcf) · [#43](https://github.com/onexmac/ad/pull/43))

## 0.2.15 · 2026-11-17 19:14

- B runs on under Safari's bottom bar, so the cover no longer stops above a navy band. The tray, the controls and the bottom of the pages stay above the bar as it shows and hides.
- The blur is only for the tray. An open page keeps its rounded frame, its photo runs up under the status bar inside it, and past its head a band in its own paper keeps the words below the cut. ([a70206d](https://github.com/onexmac/ad/commit/a70206d) · [#41](https://github.com/onexmac/ad/pull/41))

## 0.2.13 · 2026-11-17 18:45

- An open page fills the top itself: the blurred band steps aside, and the page's photo (or its paper) runs up under the status bar while the words start below it.
- Scrolled past the photo, a band in the page's own paper keeps the words below the cut.
- An open page's top corners square off as it settles. A page still travelling stays round until it arrives. ([e926ff0](https://github.com/onexmac/ad/commit/e926ff0) · [#39](https://github.com/onexmac/ad/pull/39))

## 0.2.11 · 2026-11-17 18:41

- Lifting a card brings the others up after it in a cascade: each follows its neighbour on a spring, smaller and lower the further it is.
- The bookmark in an open page's controls follows the story's topic, which carries across editions, with a short confirmation.
- Siguiendo, a last section with the followed topics.
  - Today's version comes first. A topic not in today's edition shows its latest earlier version, dated.
  - Its cover says how many are today and how many are earlier, and when empty, how to fill it.
- A fling on the tray glides on, slows as on iOS, and stops exactly on a card.
- The edition switch moves onto the Hoy cover. ([2ee3b63](https://github.com/onexmac/ad/commit/2ee3b63) · [#37](https://github.com/onexmac/ad/pull/37))

## 0.2.6 · 2026-11-17 18:30

- B runs up under the status bar: a band there blurs what is behind it, tinted with the colour at the top of what shows, and fades into the sharp content below. From the home screen B draws under a translucent status bar.
- Fixes from an independent review (46 findings):
  - every way a gesture ends puts back what its touch stopped, and a touch on a sliding section catches it;
  - a touch that only stops a motion opens nothing;
  - on iOS, the left edge is guarded from Safari's back swipe, the tray clears the home indicator, and the finger holding a picture up can't scroll the page under the gallery;
  - text stays sharp while the row scales;
  - in the gallery, the picture lifts and lands where it is really drawn, nothing flashes on close, and the strip always settles. ([c407136](https://github.com/onexmac/ad/commit/c407136) · [#36](https://github.com/onexmac/ad/pull/36))

## 0.2.1 · 2026-11-17 18:20

- Pushing on past the end of a page, the page you leave sinks back to 92% and fades out over 0.62 s, a little slower than the next one rises. ([8d304ba](https://github.com/onexmac/ad/commit/8d304ba) · [#35](https://github.com/onexmac/ad/pull/35))

## 0.2.0 · 2026-11-17 18:17

- B's cards sit closer, and their corners grow and shrink with them: 17.6 px on the tray, 44 px open.
- Lifting a card keeps the point you grabbed under the finger and grows from it, with its neighbours riding beside it.
- The cover sinks to 90% black from 80% open, so pages turn over the dark.
- Paging goes by distance or speed, with an iOS rubber band at the ends, and the tray carries momentum and lands on a card.
- A note picked from a story's page pops out of its row into place.
- Pushing on past the end of a page brings the next one up from below.
- A gallery: press and hold, or tap, a page's photo and the photo itself lifts into a gallery of the section's pictures.
  - The caption goes below it, or inside it when there is no room.
  - Swipe between pictures. Closing on another story lands on that story's page.
- Hoy carries the whole edition: every storyline with all its notes, in reading order. Pages far from view are drawn light, to keep it quick. ([bedebab](https://github.com/onexmac/ad/commit/bedebab) · [#34](https://github.com/onexmac/ad/pull/34))

## 0.1.0 · 2026-11-17 17:09

- First version: the morning brief as printed paper, in two layouts, with an A/B switch in the top-right corner of both.
- The look: Newsreader in its optical sizes, small-cap labels, a newsprint ground with a faint grain, printer's red.
- The content: Circa's two editions, of 6 and 9 September 2026, with their photos in colour. Black and white is a filter on the same picture.
- A, at /kit/noticss, in Updatr's grammar: a cover, the contents, the morning note with the rain strip, a feature spread, an inverted dossier strip, a staggered pair, the sections, figures with sparklines, briefs, an archive by section and the editions.
- B, at /kit/noticss/b, in the grammar of Paper and Push Pop Press: each section is a full-bleed cover over a tray of cards. Hoy's cover is today's sky over Cartago.
  - The cards are the stories themselves, drawn at full size and scaled down.
  - Lift or tap a card and the tray scales up under the finger until it is the page. Swipe sideways between pages, and pull down from the top to put it back.
  - Cover and tray swipe together between sections, with parallax on the photos. ([879a03a](https://github.com/onexmac/ad/commit/879a03a) · [#31](https://github.com/onexmac/ad/pull/31))
