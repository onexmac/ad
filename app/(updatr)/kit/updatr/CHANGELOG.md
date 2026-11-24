# Updatr: changelog

Updatr lives at [/kit/updatr](https://magi0s.vercel.app/kit/updatr). The magazine, one issue a week, has been the main page since 0.2.0; the two layouts before it, A (grid) and B (index), are at [/kit/updatr/a](https://magi0s.vercel.app/kit/updatr/a) and [/kit/updatr/b](https://magi0s.vercel.app/kit/updatr/b).

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

Each entry gives the date and time in Costa Rica, the commit, and the pull request that took it to `main` (and so to magi0s). Editions are content, not changes to the app: a push that only adds or updates an edition (the pipeline's own "Updatr: edition …" commits, the first of them edition 2026-W48 on 24 November) gets no version.

## 0.4.8 · 2026-11-24 07:50

- Briefs: a long press (0.42 s) pops the like fan where the finger is, the same fan as in the article, kept on screen near the edges.
  - Slide onto More or Less and let go to pick it. Or let go first and tap one; a tap anywhere else, the centre key or Escape folds it away.
  - Picking the verdict already given takes it back. A brief with a verdict says so in its top line: "More" in the accent, "Less" faint.
  - A tap still opens the brief, and a drag before the press fires still scrolls.
- Pictures: a hold that lasts 1.6 s from the first touch locks the picture up.
  - While it charges, a hairline under the hint fills ("Slide up to open · Hold to keep"). Let go before, and it drops back into place as before.
  - Locked, the verdict keys sit at the bottom corners of where it rests, Less on the left and More on the right, fixed above it.
  - Slide it sideways, the way a card is swiped. It tilts as it goes, the key it is pushed toward grows, warms to the accent and shows its tag, and the other key fades. Past a third of its width (or flung), letting go gives that verdict and the picture goes back into place.
  - The finger that held it can carry on into the swipe without letting go.
  - Slide it down, tap beside it, or press Escape: back into place. Tap it, or slide it up: its article opens.
  - Tap a key: that verdict (tapped again, it is taken back), and the picture stays up. The hint shows the verdict for a moment.
  - Every picture tied to an entry works this way: the magazine, the archive rows, and layouts A and B.
- The click a browser sends when a long press ends no longer lands on whatever is under the finger (the fan's centre key, a verdict key, the page beside a locked picture).
- Every verdict teaches the taste model that picks about 30% of each issue. ([#PR](https://github.com/onexmac/ad/pull/PR))

## 0.4.3 · 2026-11-24 06:51

- An entry without a source page is never published. The edition pipeline drops any entry or suggestion without an http(s) link before it merges the day's brief, so an earlier, sourced version of the same story stays, and the prompt now asks for the page each story comes from.
- This week's edition, Nº48, is repaired. That morning's first automated run had written two Call of Duty entries and a Stellar Blade note without a source page.
  - The Call of Duty entries are back to their sourced versions, and the Stellar Blade note is gone.
  - Nº48 now has 15 entries and 8 suggestions, all sourced. ([80ef4f5](https://github.com/onexmac/ad/commit/80ef4f5) · [#148](https://github.com/onexmac/ad/pull/148))

## 0.4.2 · 2026-11-24 00:18

- The like fan takes Noticss's fixes, in Updatr's square, mono look:
  - "Less" comes out 150 ms after "More", a clear beat behind.
  - Each label rides its key, but its spin trails by 60 ms on a softer spring and it fades in from 240 ms. Going back, the labels leave first, then the keys spin in.
  - The labels are light text on a dark tag.
  - The choice nearest the finger warms to red as the finger approaches, from 120 px away and fully by 72 px, so it shows red before the finger covers it. ([a7ed742](https://github.com/onexmac/ad/commit/a7ed742) · [#142](https://github.com/onexmac/ad/pull/142))

## 0.4.0 · 2026-11-24 00:07

- Updatr gets a backend, the same system as Noticss's, shaped for releases: one issue a week, numbered by its ISO week, updated every day at 07:23 by a pipeline that runs on its own.
  - It researches the followed franchises with web search, then writes a structured brief: the week's entries and a pool of suggestions from a wider net, including a radar beyond the list.
  - A story that moves on keeps its id, so a followed release is found again across days and weeks.
  - Each entry is linked to its source page's share picture, not copied.
  - It checks the edition against a schema and builds the app before it pushes to `main`.
- The app reads the editions:
  - "Today" is the newest edition's date.
  - The calendar shows the weeks that really have an edition.
  - Watching finds followed entries across weeks.
  - Pulling past the bottom of the issue asks the server for a newer edition. A newer one comes in without a reload; otherwise the fetch screen says "Up to date" and slides back down.
- A model of the reader's taste, kept on the device, the same as Noticss's with Updatr's features. Likes and dislikes, follows and reading teach it.
  - It fills about 30% of the issue from the week's suggestion pool and earlier weeks, chosen once per visit.
  - Each is marked "Suggested", with the franchise or kind that brought it in when there is one.
  - Suggestions never take the cover, the feature or the dossier.
- The like fan, next to the bookmark in an open article: Noticss's fan in Updatr's square, mono look.
  - A tap opens two choices above the heart, "More like this" and "Less like this".
  - Or press, slide onto a choice and let go to pick it.
- The week 47 snapshot becomes the first edition, and this push also brought edition Nº48 (24 November): 13 entries and 8 suggestions, researched with web search and sourced, 18 of the 21 with their source's picture. ([4f1ae74](https://github.com/onexmac/ad/commit/4f1ae74) · [#141](https://github.com/onexmac/ad/pull/141))

## 0.3.30 · 2026-11-23 21:43

- The skeleton gives way to a loading bar in Updatr's own colours, as The Cubes has.
  - The wordmark sits at the centre, and a stroked bar three quarters of the way down fills as the scripts arrive, then as the page comes alive, the fonts load and the first screen's pictures come in.
  - On a slow phone network Updatr takes 9 to 10 s to come alive, so a bar that fills tells the truth about the wait. ([985f65f](https://github.com/onexmac/ad/commit/985f65f) · [#127](https://github.com/onexmac/ad/pull/127))

## 0.3.29 · 2026-11-23 21:03

- A skeleton while the magazine loads: its first screen in bones (the issue line, the masthead, the cover and its caption), in Updatr's colours, springing in after 140 ms and out as the app fades in. ([ac55ba3](https://github.com/onexmac/ad/commit/ac55ba3) · [#118](https://github.com/onexmac/ad/pull/118))

## 0.3.28 · 2026-11-23 14:59

- Geist and Geist Mono come from the repository's own dependencies instead of being fetched from Google during each build. That fetch had been failing deployments at random. ([c102d91](https://github.com/onexmac/ad/commit/c102d91) · [#79](https://github.com/onexmac/ad/pull/79))

## 0.3.27 · 2026-11-17 11:46

- A bookmark in an open article's floating controls, between the position and Source. Tapping it follows the entry for updates: it fills with ink, with a pop and a haptic, and a short note confirms it ("Watching · 20.11 · T–03D"). Tap again to stop.
- Watching, a new section (P.29), with a Watch tab in the home bar and a line in the contents: the followed entries, date first.
  - The day and month are set large, with the weekday and year under them and the countdown in accent, then the title, the franchise and the kind.
  - Upcoming entries come first, soonest on top. Entries whose date has passed, and undated ones, follow, faint.
  - A row opens its article, and the bookmark at its end stops following it (the row slides out). Empty, the section explains the bookmark.
- Follows are kept on the device for now and sync across tabs. Two upcoming releases are followed on a first visit. ([22f746e](https://github.com/onexmac/ad/commit/22f746e) · [#16](https://github.com/onexmac/ad/pull/16))

## 0.3.24 · 2026-11-17 09:47

- At the top of the issue, a fresh pull down lifts the page against friction ("Pull for past editions", then "Release for the calendar"), and letting go there drops a calendar of past editions in from the top. A scroll that only arrives at the top doesn't count; wheel and trackpad work the same.
- The calendar is roomy, technical and minimal: the editions, the year and the issue count, then "In view" with Nº47 large, its dates and its entry count, then one block per month, newest first.
  - Each row is an ISO week, which is one edition: the issue number in the gutter, mono weekday heads, the days and the entry count.
  - The issue in view is in ink, the latest carries the accent mark, today's date has an accent dot, and weeks without an edition are faint. The list ends at the first edition.
- Picking a week sends the calendar up and away, runs the fetch screen for that issue and opens on its cover.
- The calendar closes with its Close button, Escape, a right swipe, or a push past its end. ([b64c186](https://github.com/onexmac/ad/commit/b64c186) · [#15](https://github.com/onexmac/ad/pull/15))

## 0.3.19 · 2026-11-17 09:32

- The drawn arrow on Note, Continue, Now and Read is a diagonal ↘ with a right-angle head, as on Scandinavian signs, in place of the turn arrow. ([eb1b43c](https://github.com/onexmac/ad/commit/eb1b43c) · [#14](https://github.com/onexmac/ad/pull/14))

## 0.3.18 · 2026-11-17 08:46

- The page keeps its own bounce but no longer hands it on to a page around it. Inside the Claude app, the frame's white container had bounced along at the top. ([bc66cb3](https://github.com/onexmac/ad/commit/bc66cb3) · [#13](https://github.com/onexmac/ad/pull/13))

## 0.3.17 · 2026-11-17 08:44

- No white band at the screen's edge on iOS. Safari tints its toolbar from what is fixed at the edge, and three transparent fixed layers sat there and could show as a white band while the bar collapsed and expanded on scroll:
  - the pull-to-fetch readout, a full-width strip at the bottom, is there only while the page is lifted, in the ground colour;
  - of the bottom bar, only its 60 px square is fixed now, on the column's right edge, not a full-width wrapper;
  - the layer pictures fly in, which stayed after the first flight, leaves once its last flight lands. ([de692c4](https://github.com/onexmac/ad/commit/de692c4) · [#12](https://github.com/onexmac/ad/pull/12))

## 0.3.16 · 2026-11-17 08:28

- The wordmark loses its marks: the © on the magazine's cover and on B, and the ® on A. ([1a6ebc1](https://github.com/onexmac/ad/commit/1a6ebc1) · [#11](https://github.com/onexmac/ad/pull/11))

## 0.3.15 · 2026-11-17 08:25

- At the bottom of the issue, a fresh push up lifts the page against friction. It shows "End of issue 47" over a hairline that fills to the mark, then "Release to fetch issue 48". A scroll that only arrives at the bottom doesn't count; wheel and trackpad work the same.
- The fetch screen rises from the bottom, technical and minimal: a three-digit percentage, a hairline, the server's steps logging in (request, sources, entries, images, layout), the seconds gone and a blinking status square.
  - Sliding it down, scrolling up or pressing Escape cancels the fetch and leaves you where you were.
  - When the issue is ready, the screen lifts away over its new cover.
- The server is a stand-in for now: it takes 3 s and composes the next issue from a rotated pool of the same entries, so the cover and the modules change and the number goes up.
- The home square steps aside while fetching. ([222e677](https://github.com/onexmac/ad/commit/222e677) · [#10](https://github.com/onexmac/ad/pull/10))

## 0.3.10 · 2026-11-17 08:12

- At the end of an article, a fresh push up keeps going against friction: the sheet shrinks up toward the top and a "Back to the issue" sign-off appears below it.
  - Past the mark the sign-off turns accent and reads "Release to go back", and letting go there sends the sheet out the top.
  - A scroll that only arrives at the end never counts. Wheel and trackpad work the same, with a fresh wheel run at the end.
- The rubber band at the top and bottom of the page, until now the magazine's, runs on layouts A and B too.
- A picture's flight starts on the next frame, so a heavy render (an article mounting, the blurred peek) no longer makes its first frame skip ahead. ([6fd41fc](https://github.com/onexmac/ad/commit/6fd41fc) · [#9](https://github.com/onexmac/ad/pull/9))

## 0.3.7 · 2026-11-17 05:04

- Blocks coming up from the bottom of the screen grow slightly into place on a spring, and shrink back when scrolled out the same way. Before, they played a one-off reveal.
- It applies to the text blocks, the six squares (staggered by column), the briefs and the archive rows. The wardrobe and feature rises are spring-smoothed too. ([b4e9419](https://github.com/onexmac/ad/commit/b4e9419) · [#8](https://github.com/onexmac/ad/pull/8))

## 0.3.5 · 2026-11-17 04:49

- The bottom bar folds into a square in the bottom-right corner. Its ink grows from the corner as you read, and the current page's folio sits at its top left.
  - A tap opens it into the home bar, which folds back when you pick a section, tap elsewhere, scroll, press Escape, or drag it down or right.
  - The tabs take taps only once they are fully in, so a double tap on the square no longer jumps to the Archive.
  - A tap outside only closes the bar, as with iOS menus; it no longer also opens the tile under it. An upward swipe on the bar scrolls the page and folds it.
  - One finger drives the open bar: a second can't leave it half open, and a cancelled drag settles.
  - Choosing a section moves the paper block there at once, then folds the bar.
  - The folded square keeps a gutter of ground around its ink, so it stays readable over dark photos and the dossier. It steps aside while an article is open.
  - On a keyboard, Enter focuses a tab and Escape returns focus to the square.
- Arrows are drawn as hairline SVG, sitting on the text's baseline, because iOS showed the arrow characters as colour emoji. Note, Now, Continue and Read use a 90-degree turn arrow. ([cb127c3](https://github.com/onexmac/ad/commit/cb127c3) · [#7](https://github.com/onexmac/ad/pull/7))

## 0.3.0 · 2026-11-17 01:39

- One image element per picture. Black and white is a filter on it, and opening, lifting and closing carry that same element instead of cross-fading a second copy, so a change of size never glitches.
- A floating bottom bar on the magazine, under the thumb, with four tabs: Issue, Latest, Dates and Archive. The active tab names the section you are in, and an accent line along it fills as you read. An open article's controls float under the thumb too.
- Articles close by a right swipe from anywhere, a pull down at the top, Back or Escape.
  - The picture flies home from wherever the finger let go, following its tile if the page has moved, and slides under the bar instead of over it.
  - A sheet caught mid-spring carries on from where it is, interrupted gestures settle, and a resting finger is not a fling.
  - Histok's left-edge guard keeps Safari's back swipe out.
- Taps open on the native click, so a touch that stops a fling opens nothing.
- The horizontal strips swipe across the whole screen width, the space past the last card included. They land on a card after any interrupted gesture and follow one finger.
- A rubber band at the very top and bottom of the magazine, as in Histok: the native bounce keeps its momentum, and the page scales a little toward the edge you push against.
- Fixes: the tab and filter indicators no longer take taps, dimmed cards keep their opacity in flight, the desktop layout no longer shifts with the scrollbar, and the fallback title keeps its size in the hero. ([3399f72](https://github.com/onexmac/ad/commit/3399f72) · [#6](https://github.com/onexmac/ad/pull/6))

## 0.2.5 · 2026-11-16 23:08

- Press and hold a picture: it turns to colour and lifts out of the layout into the centre of the screen at its own proportions, over the dimmed page, with its caption (franchise, kind, date and title) under it.
  - Let go and it springs back into place.
  - Slide up and let go to open it from there.
- An open article closes by a pull down from anywhere while it is at its top. The sheet follows the finger with growing resistance, shrinks, rounds its corners and lets the page show through; past the mark it closes and the picture springs back into its place.
- In the magazine, the feature and the wardrobe pair grow from smaller as they scroll into view, and the cards in the dossier and Coming strips are full size at their snap point and smaller off it.
- The magazine's colophon has the same switch as A and B, in place of two text links.
- A build script turns the same code into a single page that can be shown as a Claude artifact. ([bcb35b2](https://github.com/onexmac/ad/commit/bcb35b2) · [#5](https://github.com/onexmac/ad/pull/5))

## 0.2.0 · 2026-11-16 22:59

- A third layout, the magazine, becomes the main page at /kit/updatr: the week's entries laid out as one issue, Nº47, numbered by its ISO week. A, the grid, moves to /kit/updatr/a, and the switch on A and B has a third choice, Issue.
- The issue, in order:
  - a running header with its number, and the cover, a 4:5 picture under the wordmark;
  - the contents with page numbers, and an editor's note;
  - the feature, an asymmetric spread;
  - Latest, six squares;
  - the dossier, an inverted horizontal strip for the franchise with the most collabs;
  - a countdown to the next date, and a strip of tickets for what is coming;
  - the wardrobe, a skin and a character in staggered columns;
  - briefs, text only in two columns;
  - the archive, an index that filters, and the colophon.
- No story appears twice in an issue. The countdown, the tickets and the archive are indexes, not stories. ([fbfc202](https://github.com/onexmac/ad/commit/fbfc202) · [#4](https://github.com/onexmac/ad/pull/4))

## 0.1.2 · 2026-11-16 22:53

- Real articles for the five games, a snapshot of 17 November 2026: three each for The Finals, The First Descendant, Call of Duty, Stellar Blade and Zenless Zone Zero, with their sources and the outlets' own pictures. Film, books and TV keep their sample entry.
- In B, a long franchise name no longer pushes its count off the line. ([b0dfcf9](https://github.com/onexmac/ad/commit/b0dfcf9) · [#2](https://github.com/onexmac/ad/pull/2))

## 0.1.0 · 2026-11-16 22:50

- First version: a prototype feed of what its reader follows in five games (The Finals, The First Descendant, Call of Duty, Stellar Blade and Zenless Zone Zero) and in film, books and TV: releases, collabs, skins and characters. Two layouts, with a switch between them.
- The look: technical minimalism. Geist and Geist Mono, one warm grey ground, one ink, hairlines and one accent, a red-orange.
- A, the grid, at /kit/updatr: a statement of what moved since last week, six squares of the latest pictures, a list that filters by kind, a calendar of dates with their countdowns, and what is followed.
- B, the index, at /kit/updatr/b: the wordmark set large, the latest line, an index of the games and categories followed (tap a line to filter), what is coming, then a section for each with its entries.
- Pictures are in black and white. Press and hold one for colour; tap it to open its entry, the picture growing into the article. Pull the article down or press Escape to close it.
- The content was one sample entry each for film, books and TV; the games' real articles came in 0.1.2. ([a298ccd](https://github.com/onexmac/ad/commit/a298ccd) · [#1](https://github.com/onexmac/ad/pull/1))
