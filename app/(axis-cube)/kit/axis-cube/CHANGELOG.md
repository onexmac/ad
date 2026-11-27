# The Cubes: changelog

The Cubes lives at [/kit/axis-cube](https://magi0s.vercel.app/kit/axis-cube). It was called Axis Cube until 0.6.5.

## How versions are numbered

Every push to Vercel that changes the app gets an entry here. The first push was 0.1.0, and each version after it jumps by how big its push was:

| Jump | When |
| :--- | :--- |
| +0.0.1 | a small change |
| +0.0.2 or +0.0.3 | a bigger one |
| +0.0.5 | a big one |
| +0.1.0 | one too big for that (the last number goes back to 0) |
| +0.5.0 | only something massive |
| 1.0.0 | a milestone: the stopwatch and the leaderboard |

The second and third numbers are single digits and roll over like an odometer: 1.0.9 and a small change make 1.1.0, and 1.0.8 and a bigger one (+0.0.3) make 1.1.1. Only the first number can go past 9 (10.0.0). The versions before 1.0.0 were numbered before this was set, and go past 9; they are kept as they shipped.

Each entry gives the date and time in Costa Rica, the commit, and the pull request that took it to `main` (and so to magi0s). An entry that fixes a bug Marcos reported starts with it. Versions 0.1.0 to 0.3.7 came before the app first reached `main`: they were seen as artifacts and branch builds, and reached magi0s together in #64.

## Bugs Marcos reported

The bugs Marcos reported come first in the version that fixed them: his words, the cause, and what not to do. In short:

- **0.1.6** Don't push an effect past what real light does.
- **0.1.16** Nothing rests on something soft without sinking in.
- **0.2.2** A new control doesn't take away a gesture that worked.
- **0.2.9** A swipe control's hit area runs the length of its swipe.
- **0.3.3** Controls follow the puzzle in hand.
- **0.3.6** A gesture that undoes something isn't reachable by an ordinary one; blacks stay black.
- **0.3.7** A portal link doesn't work before `main`; say so.
- **0.3.12** A puzzle turns about its own axes.
- **0.3.14** Dust shows only in the light, and is tiny.
- **0.4.10** Printed matter is real images, not drawn in code.
- **0.4.12** Focus goes where the eye should go, not by depth alone.
- **0.4.15** Line detail falls off with distance; a painted look comes from materials, not a filter.
- **0.5.0** Never resize a canvas between drawing and showing; check Safari's smoothness after each effect.
- **0.5.5** Bokeh near the lens stays small.
- **0.5.15** When an ask reads two ways, show both.
- **0.5.16** Look at every corner of an icon enlarged.
- **0.5.19** A kept copy mustn't hide a new version; test a cold first opening.
- **0.5.20** One animation per element, on its own wrapper.
- **0.6.7** No heavy sound on a frequent event.
- **0.6.10** No pitch slides; vary repeated sounds.
- **0.6.18** On iOS, no sound before a touch.
- **0.6.27** A known object's form isn't built from boxes.
- **0.6.30** Real objects are modelled from photographs, not memory.
- **0.6.35** Nothing on a loading screen waits for the app's scripts or a long task.
- **0.6.38** A real puzzle's geometry comes from photographs of it, not memory.
- **0.6.40** Match a defining trait in degree, not just in kind.
- **0.6.45** Don't tune a model to resemble a reference: trace the reference's lines and overlay the model on it.
- **0.6.49** A thumb's slide bends: read its way over more travel, and lean towards the way that is harder to draw. (The lean reversed by Marcos in 0.7.46: the way is split by an X, 45° each side.)
- **0.6.55** A number in an ask can count the pieces, not the pixels; and add no colour or detail that wasn't asked for.
- **0.6.58** A close-up keeps the thing in its place: frame it in what holds it, never cut it out of the scene.
- **0.6.62** A new tap answers in every state a touch can start in; check each mode, not only the one it was built in.
- **0.6.66** Glare is light from something in the room, rendered on a surface shaped to catch it; never painted on.
- **0.6.78** A long history is read in chunks, with its beginning a few taps away; never one undivided scroll. (Reversed by Marcos in 0.7.16: one long list, nothing folded.)
- **0.6.87** Read an ask for motion against the whole flow: what moves, from where to where, and at which moment.
- **0.6.93** A moment counts when it is seen and heard at its real length; nothing cuts in before it ends, and sound in something that plays by itself waits for a touch.
- **0.7.10** A screen's new colour goes all the way: the page under it and the phone's bars too; check it on the phone's whole screen.
- **0.7.12** Scrolled content never ends on its own background: a line marks every cut, and it slides under it.
- **0.7.13** A fix is the fix asked for: an extra change of my own is offered in words, not shipped with it.
- **0.7.32** A motion that demonstrates a gesture plays its whole path, slowly enough to read; never a twitch.
- **0.7.37** Something that has gone elsewhere is hidden at once; it never fades out back where it began.
- **0.7.46** A slide's way is split by the two diagonals, an X: each way gets 45° either side, and none is favoured.
- **1.0.1** A slide's speed is read by its events' own times, never by when the page handled them; all of its travel counts; and one that clearly means to turn, turns.
- **1.0.3** Before changing a motion by its name, measure frame by frame what actually moves on the screen.
- **1.1.3** A version's second and third numbers are single digits: past 9 they roll over (1.0.9 then 1.1.0); only the first can pass 9.
- **1.1.4** On an iPhone, make and wake the sound only at the end of a touch, and play into it there; and never let the app's own power saving put the sound to sleep just before it is wanted.
- **1.2.8** A sound goes only on an audio clock that moves: an iPhone's can stand still for seconds after it wakes, and whatever is put on it then plays late, all at once. Better dropped than late; and something that plays by itself waits for the clock, not only for the touch.

Open:

- Lines over the room. Marcos, 24 Nov 00:24: "There's like a set of lines overlaying the room." Not found yet: it needs a screenshot.

## 1.3.8 · 2026-11-27 09:34

**Claude:** The chip tune now hums along while you solve, barely above a whisper, like a radio left on in the next room. Put the cube down and the lo-fi picks up right where the song was.

Asked by Marcos, 27 Nov 09:34: "Let's have the chiptune sound very faintly while inserted like at 20% of the volume"

- While a puzzle is held, the song keeps playing as the chip tune, at a fifth of the lobby's level (the high scores' screen plays it at four fifths).
- It is the same song all along: picking a puzzle up turns the lo-fi into the chip tune, and putting it down turns it back, without starting over.
- Cubed, after a solve, still plays in its place, at its own level. ([#PRNUM](https://github.com/onexmac/ad/pull/PRNUM))

## 1.3.7 · 2026-11-27 09:32

**Claude:** READY is a button now. Tap it and the cube in your hand does the same little hop and wiggle the ottoman's cubes do for INSERT CUBE. It does not make it any more ready. It just likes the attention.

Asked by Marcos, 27 Nov 09:29: "While Inserted, Tapping ready should jiggle the cube, the same way it happens while tapping insert on the ottoman"

- READY, at the top right while a puzzle is held up and not yet started, can be tapped: the puzzle jiggles as the ones on the ottoman do for INSERT CUBE, with the same tick, a little hop and a wiggle side to side dying away in about half a second. ([#238](https://github.com/onexmac/ad/pull/238))

## 1.3.6 · 2026-11-27 09:28

**Claude:** Locked cubes now have opinions. Poke one and it shakes its head at you and lets out the wub-wub bass we retired from the turns back in 0.6.7. It found a better job.

Asked by Marcos, 27 Nov 08:48: "Remember the first sound you made after the clack clack of the flip? The dubstep one i didn't like?lets use it here when the user tries to do anything to the cube, lets have that sound and the cube shakes as complain"

- Anything tried on a locked puzzle held up (a touch anywhere but its card) plays the bass note whose filter opens and closes twice, the one 0.6.0 put under every turn and 0.6.7 took away, and the puzzle shakes its head: a twist about the upright, quick and dying away in half a second. On a phone that can, it buzzes too.
- One complaint at a time: a fist on the screen is not twenty of them. ([#237](https://github.com/onexmac/ad/pull/237))

## 1.3.5 · 2026-11-27 09:28

**Claude:** Three of the four cubes are now under lock and key. Finish the 2×2 and the 3×3 opens; finish that and the Axis Cube follows; the Ghost Cube waits for all three. Until then they sit in the dark, and only the corner of their colours peeks out when you hold one up.

Asked by Marcos, 27 Nov 08:30: "darken (like by a shadow all the cubes but the 2x2), almost black, when tapped it should go up and have a small diagonal line of light on the upper right corner to hint at the cube itself and below the hint box should read (with an ok button that brings it down again)". Then, 08:55 to 09:17: "more like a diagonal triangle a better hint"; "the light hint should bring up the colors (only while inserted)"; "The cubes in the ottoman darker, light on the edges but coming form the upper side losing strength"; "The in between edges rim light has to be more obvious inserted than while in the ottoman. But never obvious"; and "Let move this to main game".

- The 2×2 is open from the start. Each puzzle finished by hand opens the next: the 3×3 after the first, the Axis Cube after two, the Ghost Cube after three. Different puzzles count, not the same one again.
- What is finished is kept on the device, so a puzzle once opened stays open. Every device starts with only the 2×2 open, the ones that played before too.
- A locked puzzle sits on the ottoman as black plastic: its colour all but gone, and a little light along its upper edges that loses strength down it, not enough to read its shape by.
- A tap lifts it into the light, where it looks like glossy black plastic catching the light along its edges, a little more than on the ottoman. The line at the top right says LOCKED. In its upper right corner, a triangle of light cut off by a diagonal brings its own colours up: the 3×3's blue and yellow, the Axis Cube's yellow and orange, the Ghost Cube's white outlines. The corner is found from the puzzle's own shape as it is turned, so it lands on each of them.
- Under it, a card in the first-time hint's paper: "Finish The First Cube To Unlock." on the 3×3, "Finish 2 More Cubes To Unlock." on the Axis Cube, "Finish 3 Cubes To Unlock." on the Ghost Cube; after a puzzle is finished, "Finish 1 More Cube…" and "Finish 2 More Cubes…". OK puts it back.
- Once a puzzle opens, the dark lifts from it over a second and a half, the next time the ottoman is in view.
- Tried first in the Sidebar lab, which keeps nothing. ([#237](https://github.com/onexmac/ad/pull/237))

## 1.3.0 · 2026-11-27 08:23

**Claude:** Musical chairs on the ottoman. The 2×2 got promoted to the front row, and the Axis Cube took its seat on the left without a fuss.

Asked by Marcos, 27 Nov 08:22: "Can you switch the cube at the front with the 2x2"

- The 2×2 now sits at the front of the diamond, and the Axis Cube where the 2×2 was, on the left; the 3×3 and the Ghost Cube stay where they were.
- Each keeps its own size and the way it is turned, and its weight mark goes with it.
- 1.2.9 and a small change make 1.3.0: the third number rolls over. ([#230](https://github.com/onexmac/ad/pull/230))

## 1.2.9 · 2026-11-27 08:13

**Claude:** Cubed got a volume knob and we turned it up a notch. A victory song should never be shouted down by the high-score screen's chiptune.

Asked by Marcos, 27 Nov 08:02, in the same message: "Also raise like 20% Cubed so it sounds higher than the rest of the music right now the chiptune sounds louder than the victory song."

- Cubed plays 20% louder than before (×1.2, about +1.6 dB), over the lobby's song and the chip tune; nothing else in the music changes.
- Its loudest moments stay under the limiter on the way out, so all of the 20% is heard.
- Measured in what a phone's speaker plays (300 Hz to 8 kHz, weighted the way the ear hears), Cubed was already about 7 dB over the chip tune and level with the lobby's song; now it is about 1.5 dB over the lobby's song. If the chip still sounds louder on the phone, it is its brightness (square waves, open to 9 kHz, where Cubed's top is rolled off at 3 kHz), not its level. ([#229](https://github.com/onexmac/ad/pull/229))

## 1.2.8 · 2026-11-27 08:13

**Claude:** Found a gremlin in the iPhone's audio clock: it says "running" and then just stands there, sometimes for seconds, while every sound we hand it piles up at the door. Now nothing is handed over until the clock is actually ticking.

- **Bug fix.** Marcos, 27 Nov 08:02: "Ok something happens on iOS the artifact of side b doesn't sound until way way late im already at the initials screen when the lololip and then the cubed wav start to sound like late. I'm concern it will happen in game as well."
  - Cause: on an iPhone the audio can say it is running while its clock has not started yet. Every sound is put on that clock, so the turns of the solve, the cheer and Cubed all waited for it, and played together, late, when it finally moved: by then the initials were up. Side-B started its solve 1.2 s after the touch, whether the clock had moved or not. In the game, the app put its own sound to sleep after 20 s of silence, and the first sounds of the next pick could have come late the same way.
  - Don't: never put a sound on a clock without checking that it moves; never let something that plays by itself start on the touch alone; and don't put the sound to sleep while the page is on screen.
- The clock is watched a few times a second. A sound is made only while it moves; one asked for as the audio wakes (the touch that woke it) waits for it a quarter of a second at most, and is then dropped rather than played late.
- The music waits for the clock the same way, and starts from the top when it moves.
- Side-B waits for the clock to move before it solves the cube, six seconds at most, so the solve, the cheer and Cubed are heard as they are seen.
- The sound no longer goes to sleep after 20 s of silence: it sleeps only when the page is out of sight, and wakes with the first touch back.
- Checked with an iPhone's stall imitated (the clock standing still for 3 s after the first touch): before, 30 sounds were put on the still clock and the cheer and Cubed were among them; now none are, and the solve starts when the clock moves. Without a stall nothing changes: the solve at 1.2 s, Cubed at 1.6 s, the initials at 3.7 s, and a sound asked for in the very touch that makes the audio plays 1 ms later. On a real iPhone it is still to be heard. ([#229](https://github.com/onexmac/ad/pull/229))

## 1.2.6 · 2026-11-26 22:14

**Claude:** The ottoman got assigned seating: eight places, three, two and three, like a box of chocolates. Four are taken. The other four are kept warm for the cubes still on their way.

Asked by Marcos, 26 Nov 22:02, in the same message: "Let's make it 8 cubes (the space, and let's render the weight marks each one makes on the ottoman, but don't show the ones with empty cubes, we will add them when we add each"

- The cushion now has eight seats, in three rows square to the ottoman: three behind, two in the middle, three in front.
- The four puzzles sit in the middle four, a diamond round the cushion's button: the Ghost Cube behind, the 2×2 and the 3×3 either side, the Axis Cube in front. The four corners are free.
- Each puzzle presses its weight mark into the leather, which rises again when it is picked up; an empty seat leaves no mark, and gets one when a puzzle comes to sit in it.
- Checked on screen: the eight seats all fall on the cushion, with the four empty ones clear of the puzzles. ([#228](https://github.com/onexmac/ad/pull/228))

## 1.2.4 · 2026-11-26 22:14

**Claude:** Buttons that used to click in silence now sing the same little bolololip as picking up a cube. Even saying NO sounds friendly now.

Asked by Marcos, 26 Nov 22:02, in the same message: "You have a sound when the player selects a cube have that same sound when we press the ok button or any button that doesn't have a sound atm"

- The buttons that made no sound now play the bolololip a puzzle makes when it is chosen, on the piano: OK at the foot of the changes, and NO on the card that asks to save the initials (and a tap beside that card, which is a no too).
- The others already had theirs, and keep them: the version (a swish as the changes open), the keys (a tick), YES (the swoosh of the time flying into the screen), BACK (the swish of the camera), INSERT CUBE (the ticks of the cubes shaking), OK on the first-time hint (a swish). ([#228](https://github.com/onexmac/ad/pull/228))

## 1.2.3 · 2026-11-26 22:00

**Claude:** The ottoman just got roomier. The cubes scooted together and shrank a little, the camera leaned in a touch, and there is now a cube-sized seat free at each front corner. Two new friends can move in.

Asked by Marcos, 26 Nov 21:56, in the same message: "Can we have the smaller cubes and slightly zoomed in approach as before I need the couch to accommodate st least two more cubes"

- The puzzles at rest are 20% smaller than they were, and drawn in toward the middle by as much (the way of 0.6.5, taken further): to 0.68 of the size they were first drawn, where they were at 0.85.
- The camera over the ottoman comes in a little, 8% closer, so on screen they are about 13% smaller and the ottoman is bigger around them.
- That leaves room for at least two more: a puzzle-sized spot at each front corner of the cushion, either side of the Axis Cube, both well inside the ottoman.
- In the hand they are the size they always were, and a tap on each picks it up as before. ([#227](https://github.com/onexmac/ad/pull/227))

## 1.2.1 · 2026-11-26 22:00

**Claude:** The changes list now closes with a friendly OK instead of a stern CLOSE. Same button, same size, fewer letters.

Asked by Marcos, 26 Nov 21:56: "Changelog button should read: ok ; instead of close. Same size"

- The button at the foot of the list of changes reads OK, in the middle of a button kept as wide and as tall as it was with CLOSE: 110 by 42. ([#227](https://github.com/onexmac/ad/pull/227))

## 1.2.0 · 2026-11-26 21:54

**Claude:** Solve a cube and you get a theme song now. Cubed kicks in right after the cheer and follows you all the way to the high-score machine, and only steps aside once you have signed your name.

Asked by Marcos, 26 Nov 21:52: "Cubed should sound after the lololip sound we have after you complete a cube. And should stay even when you go to the screen. On until the player press ok on his initials."

- Cubed, the song sketched as a WAV, is now the victory song: it starts half a second after the cheer of a solve by hand (bi-li-li-li-lo-lu-li-lup), in place of anything else playing.
- It stays on as the camera goes to the high scores' screen and while the initials are typed, where the chip tune would play otherwise; pressing YES on them ends it, and the screen's chip tune takes over.
- With no entry to make (a time that does not make the five), it plays on until the puzzle is put down or mixed again; and leaving the screen without initials ends it too.
- The song: 120 to the minute, eight upbeat bars in D with the hook TA-te ta-ta TA-te to-ta-to-ta-te TAAA four times (whistled, the marimba under it), then four chill bars, darker and at half time, and the run li li lo lu lo lu lo lu lo LOOP back into the hook. Twenty-four seconds round.
- Checked on a 2×2 solved by hand: the song starts after the cheer, plays through the screen and the initials, and gives way to the chip tune on YES. ([#226](https://github.com/onexmac/ad/pull/226))

## 1.1.7 · 2026-11-26 21:38

**Claude:** Walk up to the arcade machine and the band hands the song to the machine: same tune, same beat, now in glorious 8-bit. Walk away and the band takes it back without missing a step.

Asked by Marcos, 26 Nov 21:33: "Can you have the same song but as chiptune when we visit the highscore screen?"

- Whenever the high scores' screen is up close (from the ottoman, or after a solve, when it was silent before), Bounce plays as an old 8-bit machine would: the tune on a pulse wave, the chords as a quick arpeggio on a thinner one, the bass on a triangle, a dropping triangle for the kick and noise for the snare and the hats, and the score's 8-bit run as its fill. No tape and no record, just the machine, a little crushed, as a cheap converter makes it.
- It is the same song at the same moment: the two versions play in step, and as the screen comes up the lo-fi one fades into the chip one in about a third of a second, and back as it goes.
- It is about as loud as the lo-fi version, and its tune stays on top: rendered, every one of its 58 notes is the loudest thing in its range. ([#222](https://github.com/onexmac/ad/pull/222))

## 1.1.5 · 2026-11-26 21:31

**Claude:** Changed your mind halfway through a mix? Pull it back down. The cube finishes shuffling on its way home, so it lands properly mixed, never half-baked.

Asked by Marcos, 26 Nov 21:14, in the same message: "Also while mixing I should be able to long swipe to go back (mixing should finish, not half way, no cancel)."

- While a puzzle mixes itself up, the long pull straight down now puts it back on the ottoman, as it does at any other time: on the puzzle, or beside it (where a slide still looks round the room, unless it is that pull).
- The mix is not cancelled: it goes on to its last turn as the puzzle goes down, and the puzzle rests mixed, ready to be played next time. Its wobble and thump end it as usual, under the lobby's music coming back.
- Checked: a mix of 24 turns, pulled down after 3, ended with all 24 done, on the ottoman; the same beside the puzzle (23 of 23). ([#221](https://github.com/onexmac/ad/pull/221))

## 1.1.4 · 2026-11-26 21:31

**Claude:** The lobby band now starts playing when you walk in, instead of waiting for you to leave and come back.

- **Bug fix.** Marcos, 26 Nov 21:14: "After the startup loading screen why the lobby song doesn't start? I have to insert a cube and go back down again."
  - Cause: on an iPhone, sound is let out only by the end of a touch. The app's sound listened for the start of a touch too, so on the welcome's Start it could make its sound there, at the start, where an iPhone keeps it silent; the welcome's own tap then only asked it to resume, without the silent note an iPhone needs to really wake it. And the app puts its sound to sleep after twenty seconds of silence, which a long loading after Start could reach just before the lobby. Either way the sound stayed asleep until the next touch, and the next touch is usually picking a cube up, which is where the lobby music stops; it was heard only on coming back down.
  - Don't: make or wake the sound at the start of a touch, or wake it without playing something into it inside the touch; and don't let the power saving put to sleep what is about to be wanted.

- The sound is now made only at the end of a touch, and every touch that finds it asleep wakes it and plays a silent sample into it, the welcome's Start too.
- It is not put to sleep before the lobby has had its first chance to play, nor ever while the lobby's music is wanted; and if the music is wanted while the sound is asleep, the app wakes it itself, which a browser allows once the page has been touched.
- Checked as an iPhone from the home screen would open it: welcome, Start, the room, and the lobby's music playing half a second after the room came in. I cannot run a real iPhone here: if it still waits for a touch, tell me. ([#221](https://github.com/onexmac/ad/pull/221))

## 1.1.3 · 2026-11-26 20:50

**Claude:** New single just dropped: Bounce. Same studio, more coffee, and this time somebody whistles the hook. The old track, Dusk, is in the vault, not the bin. And the version numbers learned to count to nine.

- **Bug fix.** Marcos, 26 Nov 21:09: "Wait what? 1.0.10? That shouldn't exist. From 1.0.9 goes 1.1.0 fix all that you had with the same double digit mistake. Just the first version can have more than two digits like 10.0.0 but we aren't there yet"
  - Cause: the jumps were added to the last number as if it could grow without end, so 1.0.8 and +0.0.2 made 1.0.10, and 1.0.10 and +0.0.3 made 1.0.13. The second and third numbers are single digits: past 9 they roll over into the number before them.
  - Don't: let the second or third number of a version pass 9. Add a jump as on an odometer: 1.0.8 + 0.0.2 is 1.1.0, 1.1.0 + 0.0.3 is 1.1.3.
- This version and the one before it shipped as 1.0.13 and 1.0.10; they are 1.1.3 and 1.1.0.

Asked by Marcos, 26 Nov 20:46: "Save this one. But let's have it a bit more upbeat. Still missing the catchy melody."

- Dusk, the loop of 1.1.0, is kept as it is, under its own name, and can be put back on with one word in the code (TRACK).
- What plays on the picker now is Bounce: 96 to the minute instead of 64, a lighter shuffle, in G major (Gmaj7, Em7, Cmaj7, D7), twelve bars, still thirty seconds a loop.
- Its tune is built to stick:
  - one rhythm, ta-ta-TAA ta-ta-TAA, comes eight times in the first eight bars;
  - the call climbs (B D E, B D G), the answer comes down (G E D, E D B), and the third call reaches up to A before the line rests;
  - then four bars of longer notes climb a step at a time (Am7, Bm7, Cmaj7, D7) and lead back into the call;
  - never wider than B4 to A5.
- It is whistled: a new sine voice with a breath of air at its pitch and a slow vibrato on the long notes, the cube's own instrument doubling it underneath (kalimba, marimba, glass, piano, one per loop). A plucked note died away before the tune was heard; a whistle holds it.
- Bouncier under it: the piano stabs every off-beat after its chord, the bass walks (root, octave, fifth, a step into the next chord), and the kick pushes ahead now and then.
- Rendered: the tune is the loudest pitch in its range at all 58 of its notes, and the loop sits under the other sounds, about 0.7 as loud as a turn and a third as loud as a pick. ([#218](https://github.com/onexmac/ad/pull/218))

## 1.1.0 · 2026-11-26 20:43

**Claude:** The beat learned a tune. Eight bars, thirty seconds, and a hook that should be stuck in your head by the second time round. Sorry in advance.

Asked by Marcos, 26 Nov 20:40: "Music, around 30s / Try to find a catchy tune that one can whistle from memory"

- The loop is now eight bars at 64 to the minute: thirty seconds, then round again.
- Over it, a tune of its own, the same every time round, written to be whistled. One hook (ba-DAA-da-da-DAAA: B, E, D, E and a leap) comes three times, reaching higher each time, to G, then A, then B. After the first two comes the same answer, which falls home to E the first time and is left hanging on F sharp the second. In the middle, a contrast walks down from the top. The end falls to D sharp, which leads back into the hook. It stays within an octave, B4 to B5, in E minor like the cubes' notes.
- The chords under it changed to fit: Em9, Cmaj7, Am9 and B7, a bar each, twice, voiced lower so the tune sits clear above them. The tune is louder and the chords softer than before. Rendered, the tune is the loudest pitch in its range at every one of its 35 notes.
- Who plays it changes each time round: kalimba, glass, marimba (rolling its long notes, as a marimba player does), then the electric piano. The drums, the bass, the fills, the tape wobble and the crackle stay as they were.
- The random phrases of 1.0.8 are gone from the loop. ([#217](https://github.com/onexmac/ad/pull/217))

## 1.0.8 · 2026-11-26 20:38

**Claude:** The ottoman got a soundtrack. Every sound the cubes ever made walked into a studio, put on headphones, and came out as a lo-fi beat to pick cubes to.

Asked by Marcos, 26 Nov 20:31: "Ok can you take all the sounds we have created so far a make a looped lo-fi sound for the cube picker screen?"

- While the puzzles sit on the ottoman to be chosen, a lo-fi loop plays, built only from the app's own sounds, made on the spot like the rest:
  - the chords: the electric piano of the Axis Cube, Cmaj9, Bm7, Am9 and Em9, a bar each, struck on the one and stabbed after;
  - the bass: the scramble's growling bass, played as notes;
  - the drums: a landing's thump for the kick, a turn's plastic clack with a brush of air for the snare, a spin's tick for the hats, swung;
  - the melody: the puzzles' own phrases, a bolololip, a lolip, the run coming down and a lolop to close, in a different puzzle's instrument each time round (kalimba, marimba, glass, piano);
  - the fills: every other time round, air rising into the bo-lup or into the score's 8-bit run.
- What makes it lo-fi: a tape's slow wobble (a few cents of pitch), the top rolled off above 2.5 kHz, and a record's crackle under it. 74 to the minute, four bars, and it never plays quite the same twice: the phrases, the hats and the touch are drawn fresh each time.
- It fades in on the picker, fades out as a puzzle is picked up (and stops 2.5 s later), and comes back when it is put down. With the high scores' screen up close it plays softer, at a third.
- It sits under the other sounds: rendered, it is about 0.6 as loud as a turn's notes and 0.3 as loud as a pick. Like every sound here, it needs a first touch to start (a browser's rule), and on an iPhone it follows the silent switch. ([#216](https://github.com/onexmac/ad/pull/216))

## 1.0.3 · 2026-11-26 19:59

**Claude:** A swipe now moves the cube and nothing else. The camera sits still and enjoys the show, and the cube stopped flinching when you touch it.

- **Bug fix.** Marcos, 26 Nov 20:03: "The camera still moves when I swipe the whole cube. What did you do?"
  - Cause: what moved was not the camera. Touching the puzzle starts a hold (hold still and it scrambles), and the hold's press shrank the puzzle 3% under the finger at once; a swipe then cancels the hold, and the puzzle sprang back to full size just as it set off, which reads as the camera jumping. Changing the camera's lean, as 1.0.2 did, left that jump where it was.
  - Don't: change a motion by the name it is given. Measure frame by frame what actually moves on the screen first: the camera, the puzzle's place, its size.

Asked by Marcos, 26 Nov 19:58: "Mmm let's try removing the camera movement"

- A swipe that flips the puzzle no longer moves the camera: no lean into the flip, early or late. The delay from 1.0.2 goes with it.
- The press now shows only once the finger has rested on the puzzle for 0.12 s, when a hold's growl starts too. A swipe moves before that, so it no longer makes the puzzle shrink and spring back as it sets off.
- Measured on a touch that rests 90 ms and then flicks: the camera stays where it is, and the puzzle keeps its size (109.5 px across its radius, where it shrank to 106.1 and sprang back before). A finger resting on it still presses it, from 0.12 s on.
- A tap that turns a face to the front still leans the camera a little. On a swipe the puzzle still gets its small knock back as it lands (about 3 cm, and back), and floats slowly, as it always does.
- This version shipped in three steps, as 1.0.3 (the lean waiting for the lift), 1.0.4 and 1.0.5; at Marcos's ask, 26 Nov 20:27, they are one entry, the one where the camera movement went. ([#212](https://github.com/onexmac/ad/pull/212), [#213](https://github.com/onexmac/ad/pull/213), [#214](https://github.com/onexmac/ad/pull/214))

## 1.0.2 · 2026-11-26 19:44

**Claude:** The camera now waits for the good part. It leans into a flip once the cube is halfway round, like a fan who only cheers when the shot is going in.

Asked by Marcos, 26 Nov 19:42: "Let's try something, on cube swipe the camera jerk happens closer to the end (same duration), but midway through the rotation not at the beginning"

- On a swipe, the camera's lean into the flip now comes 0.22 s later, as the puzzle is halfway round: the same lean, as strong and as long, moved later in the flip.
- Measured on a quick flick: the lean used to start 82 ms in, with the puzzle 17% of the way round, and now starts at 316 ms, 49% of the way round. It peaks at 72% of the way round (it was 64%) and still lasts 750 ms.
- A tap that turns a face to the front leans as before. ([#211](https://github.com/onexmac/ad/pull/211))

## 1.0.1 · 2026-11-26 19:30

**Claude:** Fixed the half-hearted turns. A slide that means it now follows through, even when the phone hiccups a frame at the wrong moment.

- **Bug fix.** Marcos, 26 Nov 19:24: "Dunno why but sometimes the slide doesn't work, it jerks the cube in the right direction but it doesn't commit enough to rotate"
  - Cause: three things together. The finger's speed at letting go was read by when the page got round to the events, not when they happened: a slow frame between the finger's last move and its lift made a flick look as if it had stopped, so its speed was thrown away and the turn sprang back. On the whole puzzle, the first 14 pixels of a slide were never applied. And anything short of halfway went back, however clearly it was meant.
  - Don't: time a gesture by when its events are handled. Use the times the events carry, and count all the travel since the touch.

- The finger's speed as it lifts is now read from the events' own times, over its last 60 ms, so a slow frame no longer cancels a flick. A finger that rests for 80 ms before lifting still lets go with no speed.
- A slide on the puzzle counts all its travel from the touch, including the first pixels it takes to tell which way it goes.
- A turn let go more than 30% of the way to the next quarter, and not on its way back, goes on to it: about 32 pixels on a ring, 45 on the puzzle. A smaller slide, or one that comes back, still springs back.
- Checked on the old and the new version: a flick whose lift reaches the page 110 ms late (28 px on a ring, 40 on the puzzle) went back before and turns now; slow slides of 36 px on a ring and 52 on the puzzle, rested and lifted, went back before and turn now; slides of 22 and 30 px, and one taken to 45 px and brought back to 20, still go back. ([#209](https://github.com/onexmac/ad/pull/209))
- It shipped as 0.7.49 and became 1.0.1 when Marcos named the version before it 1.0.0.

## 1.0.0 · 2026-11-26 19:24

**Claude:** The high-score table found its database. It was looking for it under the wrong name tag.

Asked by Marcos, 26 Nov 19:21: "Is it working? What else do I need?"

- 1.0.0, the milestone: the stopwatch and the leaderboard, now one leaderboard for everybody. It shipped as 0.7.47; Marcos named it 1.0.0 afterwards, 26 Nov 19:33: "Re-arrange the changelog, so the last fix becomes 1.0.1 ; the database merge should've been 1.0.0"
- Marcos connected the Upstash database to the portal's Vercel project, which gave its address and key the names MAGI_KV_REST_API_URL and MAGI_KV_REST_API_TOKEN. The scores route now reads those names first (the unprefixed ones still work), so the fives are everybody's from this version on. ([#208](https://github.com/onexmac/ad/pull/208))

## 0.7.46 · 2026-11-26 17:22

**Claude:** Up and down got their fair share of the compass back. A slide that drifts half diagonal now goes the way it mostly goes.

- **Bug fix.** Marcos, 26 Nov 17:20: "Sliding up or down se siente buggy. No está considerando swipes medio diagonales (this has to be an x for the swipe detection so it can account non strictly vertical swipes as vertical swipes nonetheless)"
  - Cause: since 0.6.49 a slide counted as sideways up to about 55° from level, to help sideways slides that bend. That left up and down only 35° either side of upright, so a slide 35° to 45° off upright, meant up or down, turned sideways.
  - Don't: tilt the split toward one way. Split it by the two diagonals, an X, so up and down get as much room as sideways.

- Which way a slide goes is now split by an X: within 45° of upright it is up or down, within 45° of level it is sideways. It holds on the rings, on the puzzle and beside the grid.
- The way is still read after the same travel, 12 pixels on a ring and 14 on the puzzle.
- Checked with slides at 10°, 30°, 40°, 44°, 46°, 50°, 60° and 80° from upright, to each side, on a ring and on the puzzle: up to 44° they go up or down, from 46° sideways. ([#207](https://github.com/onexmac/ad/pull/207))

## 0.7.45 · 2026-11-26 17:05

**Claude:** The high scores went online. Your five is now everybody's five: one table per puzzle, the same on every phone in the world. MAC's times still guard the top, until someone takes them down.

Asked by Marcos, 26 Nov 16:22, in the same message: "I need the highscore to live in my GitHub/vercel side of things so it's global"

- Each puzzle's five is now one for everybody, kept on the portal's side: the app fetches the fives as it opens and each time the screen comes up, and sends a new entry as its row goes in. The five that comes back goes up on the screen once the row has merged.
- Marcos's times on the 3×3 and the 2×2 stay among them, until five faster times push them out.
- The fives live in a Redis database (Upstash), connected to the portal's Vercel project from its Storage tab; its address and key are the project's, never in this repo. Until it is connected, each device keeps its own fives, as before, and the entries made meanwhile wait on the device and are sent once it is.
- Offline, the app shows the last fives it saw, and an entry made then is sent the next time the app reaches the portal.
- The portal checks every entry: a puzzle it knows, a time between a floor no hand beats on a phone (2 s on the 2×2, 5 s on the others) and 99:59:99, and one to three capital letters. It takes at most six entries a minute from one address, and keeps each puzzle's best fifty.
- The labs never send an entry. ([#206](https://github.com/onexmac/ad/pull/206))

## 0.7.40 · 2026-11-26 17:05

**Claude:** The rings don't just get brighter any more, they light up: a white-hot line, a glow inside, a halo round it. Twice, like a neon sign coming on.

Asked by Marcos, 26 Nov 16:22: "Make the dots control glow look like the dots are really glowing, and make them glow twice (it's not a stronger glow, but a better one)"

- Half a second after a mix ends, the rings light up twice in 1.8 s. Each pulse comes up quickly and dies away slower, as a lamp does.
- At each peak the ring's line goes white-hot, a soft light fills it from the inside, and the light spills out round it: a bright edge close in and a wide, faint halo further out. The dark edge that keeps a ring readable on a light background fades while it is lit.
- They swell only a little, 6% (it was 22%): the light does the work, not the size. With reduced motion they glow and don't swell. ([#206](https://github.com/onexmac/ad/pull/206))

## 0.7.38 · 2026-11-26 16:20

**Claude:** Colour tune-up: orange got a little brighter, green a little calmer, so the two stop arguing on the cube.

Asked by Marcos, 26 Nov 16:18: "Have the orange a tad lighter still saturated. I'm color blind and the green a bit less saturated and a tiny tidbit lighter, just a wink."

- The cubes' orange is a tad lighter at the same saturation: #ff641f to #ff7b3d, the same hue and fully saturated, its lightness from 56% to 62%.
- The green is a bit less saturated and a wink lighter: #19c96a to #2ac672, the same hue, its saturation from 78% to 65% and its lightness from 44% to 47%.
- It shows on every puzzle that has those faces. ([#205](https://github.com/onexmac/ad/pull/205))

## 0.7.37 · 2026-11-26 16:16

**Claude:** Squashed a ghost: the big box with your score no longer flickers back over the screen after it merges in. The score goes in once and stays in.

- **Bug fix.** Marcos, 26 Nov 16:15: "There's like a glitch the shows a bigger rectangle with the player score it's getting merged"
  - Cause: when the merge ended, the entry's line went back to its first state, the paper field with the time and the initials, full size in the middle of the screen. It then faded out over 0.3 s from there, so for a moment a box wider than the screen showed again over the table.
  - Don't: let something that has gone away come back to fade out from where it began. Once it is somewhere else, hide it at once.

- When the row has merged into the screen, the entry's line is gone at once, with no fade. ([#204](https://github.com/onexmac/ad/pull/204))

## 0.7.36 · 2026-11-26 15:25

**Claude:** Lost? Tap INSERT CUBE and the cubes on the ottoman wiggle one after another, left to right, like kids raising their hands: pick me, pick me.

Asked by Marcos, 26 Nov 15:23, in the same message: "Touching the insert cube should make the cubes shake so the user knows that's where they need to go, have them happened in a cascade timeline"

- INSERT CUBE, at the top right while no puzzle is held, can now be tapped. The puzzles on the ottoman shake in a cascade, from left to right as seen, each 0.11 s after the one before.
- Each shake is a little hop and a wiggle from side to side that dies away in about half a second, with a tick as it starts. ([#203](https://github.com/onexmac/ad/pull/203))

## 0.7.34 · 2026-11-26 15:25

**Claude:** The camera now rides along on the hint's little trip home, sinking with the cube, so you feel it heading back to the ottoman instead of just watching it go.

Asked by Marcos, 26 Nov 15:23: "The swipe hint is perfect but have the camera coming down with the hint when it's happening, it gotta feel like it's going down"

- While the first-time hint is up, the camera goes down with the puzzle as it sinks toward the ottoman: lower and tilted a little down, by as much as the dip. It comes back up as the puzzle rises, and after OK. ([#203](https://github.com/onexmac/ad/pull/203))

## 0.7.33 · 2026-11-26 15:22

**Claude:** Once the cube is mixed, the dots take a little bow: they glow up together for a moment, as if to say "start here", then settle back.

Asked by Marcos, 26 Nov 15:16: "After half a second after the mixed up is complete have the dots control glow the dots up so the user notice them then back to normal"

- Half a second after a mix is done, the grid of dots glows up once and settles back over about a second: the rings grow a little, light up with a soft halo and a fill, then return to normal.
- It plays after every mix. Under reduced motion they only light up, without growing. ([#202](https://github.com/onexmac/ad/pull/202))

## 0.7.32 · 2026-11-26 14:37

**Claude:** The cube now really acts it out: it sinks slowly, most of the way home to the ottoman, thinks about it, and floats back up. Method acting, in 3D.

- **Bug fix.** Marcos, 26 Nov 14:30, of 0.7.27: "No the swipe hint has to be longer as if almost going back to the ottoman. Slower more intentional the motion."
  - Cause: "bounce down as if trying to go back" was read as the swipe's own small pull, a quick dip of 0.3 s. The motion was meant to show where the swipe takes the cube, all the way down to the ottoman, at a pace you can follow.
  - Don't: show a gesture by a twitch. A motion that demonstrates a gesture plays its whole path, slowly enough to read.

- While the hint is up, the puzzle repeats a 3.6 s cycle:
  - It rests, then sinks over 1.4 s most of the way back toward its hollow on the ottoman, turning toward its resting pose and growing smaller as it goes.
  - It waits a breath, then rises again over 1.2 s.
- OK still makes it hop up and mix. ([#200](https://github.com/onexmac/ad/pull/200))

## 0.7.30 · 2026-11-26 14:37

**Claude:** New words on the tip, said the old-fashioned way: A Strong Swipe Down Keeps The Cubes Away.

Asked by Marcos, 26 Nov 14:30, in the same message: "And lets change the text. A Strong Swipe Down Keeps The Cubes Away."

- The hint now reads "A Strong Swipe Down" on one line and "Keeps The Cubes Away." on the next. ([#200](https://github.com/onexmac/ad/pull/200))

## 0.7.29 · 2026-11-26 14:37

**Claude:** The tip moved up a shelf.

Asked by Marcos, 26 Nov 14:30, in the same message: "Let's have the hint box a bit higher is too low."

- The hint box sits higher, its middle at 72% of the frame's height where it was at the dots' 81.5%. The dots still step aside while it is up. ([#200](https://github.com/onexmac/ad/pull/200))

## 0.7.28 · 2026-11-26 14:29

**Claude:** The tip moved in where the controls live, so the first thing you look at to play is the first thing that teaches you.

Asked by Marcos, 26 Nov 14:24: "Put the hint box where the dots control are"

- The first-time hint now sits centred where the grid of dots is, not at the bottom. The dots step aside while it is up and come back after OK. ([#199](https://github.com/onexmac/ad/pull/199))

## 0.7.27 · 2026-11-26 14:23

**Claude:** First-timers now get a friendly tip: the cube itself acts out how to put it back, ducking toward the ottoman until you press OK. Then it springs back up and gets to mixing.

Asked by Marcos, 26 Nov 14:17: "If it is the first time the user opens a cube have a hint box that says: Strong Swipe Down To Sit Back The Cube (with an Ok). When it's there have the cube bounce down as if trying to go back and when the user press ok it bounce up again and starts mixing up"

- The first time a puzzle is picked up on a device, a box comes up at the bottom: "Strong Swipe Down To Sit Back The Cube", in Cube OS, with OK filled as the button to press.
- While the box is up:
  - The puzzle waits to mix (the line at the top right says READY).
  - Every 1.6 s it dips toward the ottoman, as a strong swipe down would pull it, and springs back.
  - Touches go to the box.
- OK: the box goes, the puzzle hops back up, and a moment later it mixes itself up as usual.
- It shows once: after OK it is not asked again on that device. It never shows in the labs. ([#198](https://github.com/onexmac/ad/pull/198))

## 0.7.25 · 2026-11-26 14:14

**Claude:** The icon flipped to night mode: a cream cube on dark blue-grey. It stands out on the home screen and still looks like the Mac's.

Asked by Marcos, 26 Nov 14:14, of 0.7.19: "Let's invert the colors, light icon in dark bluegray rectangle. For the homescreen"

- The home-screen icon is now the cube in paper on the Mac's ink, a dark blue-grey, the other way round from 0.7.19. The cube keeps its place and pose, in all three sizes.
- A phone that already has the app keeps its icon until it is added to the home screen again. ([#197](https://github.com/onexmac/ad/pull/197))

## 0.7.24 · 2026-11-26 14:07

**Claude:** Each version now gets a blank line before the next one, so the history reads as separate entries, not one long breath.

Asked by Marcos, 26 Nov 14:07, in the same message: "And line break after each changelog submission"

- In the list of changes, every version ends with a blank line (a line of the text's own height) before the dashed rule and the next version. ([#196](https://github.com/onexmac/ad/pull/196))

## 0.7.23 · 2026-11-26 14:07

**Claude:** Your words stand on their own now, no quotation marks needed. You said what you said.

Asked by Marcos, 26 Nov 14:07: "Input doesn't have to be quote on quote"

- In the list of changes, what Marcos said shows under INPUT as it is, without the quotation marks round it. ([#196](https://github.com/onexmac/ad/pull/196))

## 0.7.22 · 2026-11-26 14:02

**Claude:** The little version number at the bottom right now dresses for the occasion: dark box, light letters, like every version in the list it opens.

Asked by Marcos, 26 Nov 13:59, in the same message: "On the changelog let's add some formatting. The changelog number itself lets have it filled dark with light text"

- The version at the bottom right of the cube picker, which opens the list of changes, is filled ink with its number in paper, the same box as the clock. In the list itself, each version's number was already on an ink bar (0.7.18). ([#195](https://github.com/onexmac/ad/pull/195))

## 0.7.21 · 2026-11-26 14:02

**Claude:** The high-score tables have been wiped clean for a fresh season. Two names already on the board: MAC on the 3×3 and twice on the 2×2. Everywhere else, the dashes await you.

Asked by Marcos, 26 Nov 13:59, in the same message: "Let's have all the high scores empty like this --:--:-- --- Except in the classic 3x3 let's put first: 02:34:48 MAC ... Oh sorry. The 2x2: 00:24:03 and 00:14:56"

- Each puzzle's five starts empty: --:--:-- --- in every place, and any time beats an empty place.
  - The 3×3 starts with 1. 02:34:48 MAC.
  - The 2×2 starts with 1. 00:14:56 MAC and 2. 00:24:03 MAC, fastest first.
  - The Axis and the Ghost start empty, and an empty five lights no row.
- Times in the table are written as the clock writes them: minutes, seconds and hundredths, 02:34:48. A row is a letter wider, and its bar, the flying row and the merge are all a letter wider with it.
- The fives kept on a device in the old way start over from these. ([#195](https://github.com/onexmac/ad/pull/195))

## 0.7.19 · 2026-11-26 14:02

**Claude:** New home-screen icon: same cube, same tilt, now dark ink on cream paper, so the app looks like itself before you even open it.

Asked by Marcos, 26 Nov 13:59: "Let's change the home icon. Same position but with the style of the side-b"

- The home-screen icon keeps its cube in the same place and pose, now in the Mac's colours: charcoal ink on cream paper, where it was white on black. All three sizes changed (the iPhone's and the two the app installs with).
- A phone that already has the app keeps the old icon until it is added to the home screen again. ([#195](https://github.com/onexmac/ad/pull/195))

## 0.7.18 · 2026-11-26 13:58

**Claude:** The release notes now speak the machine's own language: Cube OS, our pixel letters, now with lowercase, Spanish accents and proper descenders. One ink, one paper, no gray area.

Asked by Marcos, 26 Nov 13:51, in the same message: "make it mono. Text similar to the cube os (our Macintosh version)."

- The list is set in Cube OS, the machine's 5×7 letters made into a font (`public/kit/axis-cube/cube-os.otf`, built from `lib/axis-cube/glyph.js` by `scripts/axis-cube/font/build.mjs`).
  - The letters gained what running text needs: lowercase, with two rows below the baseline for g, j, p, q and y; á, é, í, ó, ú, ü, ñ, ¿ and ¡; and punctuation and signs (quotes, brackets, × · … → and the rest).
  - It is set so a letter's pixel is 5 of an iPhone's device pixels, so the letters stay sharp.
- The list is one colour, ink on paper: no grey, no italics, no bold.
  - Each version's number sits on an ink bar, as the lit row does on the screen.
  - Points are marked with a dash in the margin.
- The artifact carries the font inside the page. ([#194](https://github.com/onexmac/ad/pull/194))

## 0.7.16 · 2026-11-26 13:58

**Claude:** No more folders: every version, every detail, one long scroll from today back to the very first build. Bring snacks.

Asked by Marcos, 26 Nov 13:51: "Do not collapse the changelog. One long list"

- The list of changes no longer groups versions by era or folds them. It is one long list, newest first, every version with its input, its output and all its details; MORE is gone.
- This reverses 0.6.78's chunking, at Marcos's word. ([#194](https://github.com/onexmac/ad/pull/194))

## 0.7.15 · 2026-11-26 13:50

**Claude:** The release notes can breathe now: more air between lines, between entries, and under the title bar. Same words, less elbowing.

Asked by Marcos, 26 Nov 13:48, in the same message: "lets make the header roomier, and in general let's have a tad more breathing room in the changelog text"

- The CHANGES title bar is taller, with its stripes clear of the sheet's rounded corners and more space under it. Its line now stands for the first era's, so there is no second rule right under it.
- The text has more breathing room:
  - lines a little further apart;
  - more space between versions and under each version's heading;
  - more space between the input, the output and MORE, and between the details' points. ([#193](https://github.com/onexmac/ad/pull/193))

## 0.7.14 · 2026-11-26 13:50

**Claude:** New labels on the release notes: INPUT for what was asked, OUTPUT for what came back. Very cybernetic.

Asked by Marcos, 26 Nov 13:48: "Remove the Marcos said. Claude said. Let's call it: input ; output"

- In the list of changes, what Marcos said is now under INPUT (INPUT (BUG) for a bug report), and Claude's line is under OUTPUT. The changelog file itself is unchanged. ([#193](https://github.com/onexmac/ad/pull/193))

## 0.7.13 · 2026-11-26 13:44

**Claude:** The title bar is back to scrolling with the rest of the list. It had overstayed its welcome.

- **Bug fix.** Marcos, 26 Nov 13:43, of 0.7.12: "No the header should scroll. I don't like your solution."
  - Cause: the ask was a line where the list is cut above CLOSE. 0.7.12 also kept the CHANGES title bar fixed at the top, which nobody had asked for.
  - Don't: add a change of your own to a fix. Do the one that was asked, and offer anything more in words first.

- The CHANGES title bar scrolls with the list again. The line above CLOSE stays: the list scrolls under it. ([#192](https://github.com/onexmac/ad/pull/192))

## 0.7.12 · 2026-11-26 13:42

**Claude:** The list of changes now has edges: words slide under a line on their way out instead of evaporating into thin paper.

- **Bug fix.** Marcos, 26 Nov 13:40, with a screenshot of the list of changes: "Add a line that cut the content halfway so it doesn't indent into the same background (visually). The line doesn't have to go all the way to the borders. Add this to your memory or Claude.md because I never like the content to visually disappear into the nothing (there has to be some suggestion visually of how the content gets sucked out while scrolled)."
  - Cause: the list scrolled straight into the paper above CLOSE, the same ground as itself, so its last lines just stopped in mid-air. At the top, the CHANGES title bar scrolled away with the list.
  - Don't: let scrolled content end on its own background. Wherever a scroll is cut, a line marks the cut, so the content reads as sliding under it (now in `CLAUDE.md` and the UX playbook, for every app).

- The CHANGES title bar stays at the top of the sheet, and the list scrolls under its line (undone in 0.7.13).
- CLOSE sits under a line drawn across the text's width, not to the edges, and the list scrolls under that line too. ([#191](https://github.com/onexmac/ad/pull/191))

## 0.7.11 · 2026-11-26 13:28

**Claude:** YES now looks like the answer we hope you pick: filled in, bold, unmissable.

Asked by Marcos, 26 Nov 13:27: "The yes on the confirm on highscore should be filled dark, with light text."

- In the SAVE? dialog, YES is filled ink with paper letters, as END is on the keyboard, and keeps the ring of the button to press. Pressed, it turns paper with ink letters. NO stays paper. ([#190](https://github.com/onexmac/ad/pull/190))

## 0.7.10 · 2026-11-26 13:26

**Claude:** The welcome screen got the memo: paper from top to bottom, THE CUBES on a striped title bar, and a START button that sits on its lip like it means business.

- **Bug fix.** Marcos, 26 Nov 13:22, of 0.7.5, with a screenshot of the welcome on iOS: "This looks awful on iOS, color has to go all the way down, the cubes let's try the text and the button more inline with the Macintosh style we develop."
  - Cause: 0.7.0 put the loader on paper, but the page under it and the phone's bars stayed black (the page's background and its theme colour), so the bottom of the screen was black under the paper. The welcome's name and button still used the old colours, white letters and a black pill, and those were made for a black screen.
  - Don't: give a screen a new colour without the page under it and the phone's bars. Check the first screen on a phone's whole screen, bars and bottom edge included.

- While the loader is up, the page itself and the phone's bars are paper, all the way to the bottom. Once the room is in, they are black again, beyond its frame.
- The name is THE CUBES in the machine's letters, three times their size, on a title bar of stripes as the Mac's windows have.
- START (and LISTO or INSTALAR when the app asks to be installed) is a Mac button.
  - It has paper with an ink line, rounded corners and an ink lip, plus the ring of the button to press, in the machine's letters.
  - Pressed, it turns ink with paper letters and still springs.
- Asking to install looks the same: the loading cube shows through in the middle, and the icon is no longer drawn over it.
- The machine's letters are in their own file now (`lib/axis-cube/glyph.js`), shared by the scene and the page. ([#189](https://github.com/onexmac/ad/pull/189))

## 0.7.8 · 2026-11-26 13:20

**Claude:** New trick unlocked: tap the dots, then slide, and two layers turn as one. Speedcubers call it a wide move; we call it a double helping.

Asked by Marcos, 26 Nov 13:14, in the same message: "New trick, double tap and slide in the dots control should drag the axis closest to the tap and the center one."

- On the grid of dots, a tap and then, quickly and in about the same place, a touch that slides turns two layers together.
  - The two layers are the row or column under the finger and the middle one; both light up.
  - From the middle row or column, the other layer is the outer one on the finger's side.
  - A 2×2 has no middle, so there it turns the one layer.
- The puzzle's own history folds turns about one axis past each other. A two-layer turn and its undoing leave it as it was, so the solve that replays it back stays short.
- A plain slide still turns one layer. ([#188](https://github.com/onexmac/ad/pull/188))

## 0.7.6 · 2026-11-26 13:20

**Claude:** Double tap anywhere now flips the cube, not just on it. Your thumb no longer has to aim; it only has to mean it.

Asked by Marcos, 26 Nov 13:14: "Mmm double tap on anywhere but the dots control should do the same as in the cube (flip it)."

- Two quick taps anywhere off the grid of dots and off the puzzle flip it round, as two taps on it do. It turns half a turn about the upright, toward the side tapped.
- One tap there still does nothing, and a tap on the Mac still opens its screen. ([#188](https://github.com/onexmac/ad/pull/188))

## 0.7.5 · 2026-11-26 12:10

**Claude:** High scores are real now. Solve a puzzle by hand fast enough and the Mac asks for your initials. Every puzzle keeps its own top five, and the machine remembers them. No coins required.

Asked by Marcos, 26 Nov 11:32: "I love the side B. Let's implement it into The Cubes"

- The high-score screen comes to the app. It is no longer only in the labs.
- A solve by hand that makes the puzzle's top five, while its clock runs, plays out like this:
  - The happy cube celebrates and settles.
  - After a beat, the screen comes up with the keyboard: initials, END, SAVE?, YES.
  - The row flies in and merges, and the pixel cube solves.
- Each puzzle has its own five: 3X3, 2X2, AXIS and GHOST.
  - The screen shows the puzzle in hand's five, or the last one held, with its name beside the pixel cube.
  - They start as the machine's own: the 3×3's sample times, the others scaled to how long each takes.
  - They are kept on the device, so they survive a reload.
- A slower solve celebrates and stays in hand.
- Leaving the screen before END drops the entry. A tap on the Mac with no new time shows the five, with BACK.
- Close to the screen, the camera frames it as the labs did: square on and a tenth closer, with the screen higher while the keyboard is up. ([#187](https://github.com/onexmac/ad/pull/187))

## 0.7.0 · 2026-11-26 12:10

**Claude:** The Cubes is in its Sunday best: cream paper, charcoal ink, striped title bars, and keys you can really press. The amber has retired to the Sidebar lab, where it still glows.

Asked by Marcos, 26 Nov 11:32, in the same message: "I love the side B. Let's implement it into The Cubes"

- The app wears Side-B's look, a friendly old Mac:
  - The iMac's screen is a window on a dark desktop. Its title bar has stripes, a close box and THE CUBES.
  - The line at the top right and the version are paper boxes with an ink line, rounded corners and an ink lip. The clock is the same box inverted.
  - The keyboard is a window titled INITIALS, with keys that press down onto their lip.
  - END asks in a SAVE? dialog, with YES as the default.
  - The list of changes is a sheet of paper with CHANGES in its title bar and CLOSE on a lip.
  - The rings on the puzzle are paper, and the app loads on paper. ([#187](https://github.com/onexmac/ad/pull/187))

## 0.6.95 · 2026-11-26 10:26

**Claude:** The little pixel cube now waits for your score to land before it solves itself, like a crowd holding its applause for the right moment.

Asked by Marcos, 26 Nov 10:24: "Once the player time drops into the screen run the pixel cube animation"

- With a new entry, the pixel cube on the screen stays mixed while the row flies in and merges. It starts its solve once the row is in the screen (BACK at the top right): a beat of 0.25 s, then its middle row, then its middle column, square by square.
- Opening the screen without a new entry is as before: the pixel cube solves as the camera goes in. ([#184](https://github.com/onexmac/ad/pull/184))

## 0.6.94 · 2026-11-26 10:09

**Claude:** Your score now slides home in one go: it arrives, and melts into the screen while it is still landing. Less boing, more zing.

Asked by Marcos, 26 Nov 10:06: "Make the merge happen faster so it feels like one single motion, don't make the player time bounce that much."

- The flying row arrives in about a third of a second and goes past its mark by 1% (it was 9.5%, with a wobble to wait out). The hop on the way is half as high, and the squash where it lands is about a third of what it was.
- The merge begins as the row arrives, not once it has stopped. It takes 0.3 s instead of 0.45 s, so the row is the screen's own about 0.6 s after YES, where it took about 1.4 s.
- The 8-bit run starts on bo-lup's second note, and its blips are a little closer together. ([#183](https://github.com/onexmac/ad/pull/183))

## 0.6.93 · 2026-11-26 09:39

**Claude:** The happy cube now gets its full moment: a crouch, a big jump with a whole turn in the air, a squash on landing, two little bounces and a wag, all to its tune. The high-score screen waits politely until the cube has finished showing off.

- **Bug fix.** Marcos, 26 Nov 09:28, of 0.6.91: "Dude don't jump into the score screen yet. Where's my happy cube celebration? With sounds? After that then jump into the highscore"
  - Cause: the Sidebar's opening played the last turn before the page had been touched, and a browser plays no sound until then, so the tune was silent. The happy turn reused the quick flip spring: a whole turn in about a third of a second and a small bob, over before it read. And the screen came 2 s after the solve whatever the cube was doing.
  - Don't: count a moment as delivered because the code runs it. Check that it is seen and heard at its real length, and let nothing cut in before it ends. A sound in something that plays by itself needs a touch first.

- The celebration is now its own scripted moment, about 1.8 s:
  - A crouch with a squash, then a jump about two thirds of the cube's height, stretching as it leaves.
  - A whole turn about the upright in the air, left or right by chance.
  - A squash as it lands, then two bounces, each smaller.
  - A wag from side to side that dies away.
  - Bi-li-li-li-lo-lu-li in the air, timed so that the -lup lands with it.
- The Sidebar's opening waits for a first touch, so the tune can be heard. With the cube in hand, one turn away and the clock running, you can make the last turn yourself; or touch anywhere, and it plays itself 1.2 s later.
- The screen comes only once the cube has settled, after a beat of 0.5 s. ([#182](https://github.com/onexmac/ad/pull/182))

## 0.6.91 · 2026-11-26 09:21

**Claude:** Solve a cube by hand and it is now visibly thrilled: it hops, spins a whole turn, wobbles, and sings bi-li-li-li-lo-lu-li-lup. We could not stop it. We did not try.

Asked by Marcos, 26 Nov 09:05, in the same message: "Once the user finishes the cube have it spring bounce and rotate as a happy cube with a melodic bilililolulilup"

- The turn by hand that solves a puzzle while its clock runs now makes it happy:
  - A hop on a spring.
  - A whole turn about the upright, left or right by chance, that overshoots and settles, with a happy wobble.
  - Bi-li-li-li-lo-lu-li-lup: eight notes in the puzzle's own voice, up, a dip, and up to the top. The flip's own landing sound stays out of it.
- In the Sidebar, the opening plays it after the last turn, and goes to the screen 2 s later instead of 1.6 s, once the cube has settled. ([#181](https://github.com/onexmac/ad/pull/181))

## 0.6.89 · 2026-11-26 09:21

**Claude:** Your score no longer just parks on the screen: it dissolves into it pixel by pixel, the way the old cabinets did it, to an 8-bit zip. The phosphors have accepted you.

Asked by Marcos, 26 Nov 09:05: "Have the user time merge more seamless into the screen. Add an electronic 8bit merging sound."

- Once the flying row has settled on its place, it passes into the screen pixel by pixel instead of being swapped at once:
  - Its bar is the screen's own grid of 111 × 13 pixels, and each pixel has its own moment, in a fixed scatter.
  - Over 0.45 s each pixel goes out of the flying row and comes on in the screen at the same moment, so the row is never doubled or missing as the crisp bar turns into the glowing one.
  - CONGRATS!! becomes BACK when it is done.
- The merge has its own sound: eight square-wave blips climbing a C arpeggio, one step back on the way, 38 ms apart, through a soft low-pass. ([#181](https://github.com/onexmac/ad/pull/181))

## 0.6.87 · 2026-11-26 08:15

**Claude:** Hit YES and your score goes home: the Mac comes back into focus, the camera leans in, and your row drops into its spot in the table with a swoosh and a bo-lup, while the little logo solves itself in celebration.

- **Bug fix.** Marcos, 26 Nov 08:07, of 0.6.84: "No. The zoom in on text is to place it into the Mac , swoosh bolup. The initial zoom that brings the keyboard gotta be fast, and not coming from the congrats. Reread the og instruction with this new understanding."
  - Cause: "move into the screen at the same time the camera zooms in" was read as the clock flying out of the top right during the first zoom. The motion he meant is the end of the entry: the time and initials, once typed, going into the Mac as the camera goes in. And the mark's solve belonged to that zoom too.
  - Don't: place a motion at the first moment it could fit. Read an ask for motion against the whole flow: what moves, from where to where, and at which moment.

Shipped in the same push as 0.6.85. This is the Sidebar lab's part.

- YES now sends the entry into the Mac:
  - The keyboard goes, the Mac comes back into focus, and the camera goes in to the screen, square on and a tenth closer.
  - As it goes, the line becomes its row of the table (rank, time, initials, dark on a bar of light) and flies onto that row on the screen, following it as the camera moves. It goes on a spring with some weight, a little hop, an overshoot and a squash where it lands.
  - A swoosh as it leaves; bo-lup as it lands. Once it is still, the screen takes it over: the row is in the table, lit, and the line at the top right says BACK.
- The mark on the screen waits mixed while the initials are typed, and solves itself as the camera goes in after YES. ([#180](https://github.com/onexmac/ad/pull/180))

## 0.6.85 · 2026-11-26 08:15

**Claude:** The trip to the high-score screen is snappy now: one quick swoop and the keyboard is waiting. The time no longer hitches a ride from the corner.

Asked by Marcos, 26 Nov 08:07, in the same message: "The initial zoom that brings the keyboard gotta be fast, and not coming from the congrats."

- When the Sidebar goes to the screen for a new entry, the camera gets there about three times as fast, and the Mac goes soft with the keyboard, the time and the places for initials coming at once (0.15 s behind it), where 0.6.84 waited for the mark to solve.
- The time is in the line from the start; it no longer flies in from the top right, and CONGRATS!! is there from the start. ([#180](https://github.com/onexmac/ad/pull/180))

## 0.6.84 · 2026-11-26 08:00

**Claude:** In the Sidebar, your time now leaps out of the corner and lands on the iMac's screen as the camera dives in: a swoosh on the way, a satisfying bo-lup when it lands, with a little bounce. (It has been working out.)

Asked by Marcos, 26 Nov 07:48: "Can you put the player timer on a filled rectangle and have it move  act into the screen as the same time the camera zooms in, have it enter the screen with a swoosh bolup sound a bit springy so it feels it has weight, also the cube animation should happen when the zoom starts"

Shipped in the same push as 0.6.80 and 0.6.81. This is the Sidebar lab's part.

- When the camera sets off for the screen after a solve, the clock's bar leaves the top right and flies into the screen, on the line where the initials will go.
  - It goes in an arc on a spring, heavy enough to overshoot a little, and it squashes and springs back where it lands.
  - A long, falling swoosh as it leaves; bo-lup, low then up, with a soft thump, as it lands.
  - It grows on the way, from the top right's size to the line's.
- The top right is empty while the bar leaves it; CONGRATS!! comes in once it is on its way.
- The Mac goes out of focus and the keyboard and the places for initials come only after the bar has landed and the mark on the screen has solved itself. So the flight and the solve are seen sharp. ([#179](https://github.com/onexmac/ad/pull/179))

## 0.6.81 · 2026-11-26 08:00

**Claude:** The little logo on the iMac's screen now solves itself as the camera starts moving in, so the show is already on by the time you arrive.

Asked by Marcos, 26 Nov 07:48, in the same message: "also the cube animation should happen when the zoom starts"

- The mark on the screen starts its two turns the moment the camera sets off for the screen, a quarter of a second in, where it used to wait until the screen was close. The turns keep their pace: the row from 0.25 s to 0.83 s, the column from 1.55 s to 2.13 s. ([#179](https://github.com/onexmac/ad/pull/179))

## 0.6.80 · 2026-11-26 08:00

**Claude:** The clock got a proper badge: dark digits on a lit yellow bar, like a scoreboard that means business.

Asked by Marcos, 26 Nov 07:48, in the same message: "Can you put the player timer on a filled rectangle"

- The clock at the top right is a bar of light with dark figures, the way the first row of the top five is lit. The words there (INSERT CUBE, READY, BACK…) stay lit letters. ([#179](https://github.com/onexmac/ad/pull/179))

## 0.6.79 · 2026-11-25 23:06

**Claude:** The Sidebar lab now opens mid-victory: a 3×3 in hand, one turn from home and the clock past a minute. Then the last turn clicks in, the clock stops, and the camera heads for the high-score screen. It's just called Sidebar now.

Asked by Marcos, 25 Nov 22:59, in the same message: "The sidebar artifact should start as if the user just finished the cube so we can see the transition from cube to screen. Call it just sidebar"

Shipped in the same push as 0.6.78.

- The Sidebar opens on the 3×3 already in hand, one turn of its top layer from solved, its clock running past a minute.
- A moment after the room comes in, the last turn goes home and the clock stops on 01:06:84, a time for third place. A beat later the camera goes to the iMac's screen: CONGRATS!!, the Mac out of focus, the keyboard.
- Put the puzzle down, or take another, and the opening stops there; the room is the hands' again.
- The artifact is called just Sidebar. ([#178](https://github.com/onexmac/ad/pull/178))

## 0.6.78 · 2026-11-25 23:06

**Claude:** The changelog now reads like proper release notes: what Marcos said, what Claude did, the nitty-gritty behind MORE, versions bundled by era. Every last version is in here, all the way back to the first floating cube.

- **Bug fix.** Marcos, 25 Nov 22:59: "The changelog should have all the versions, user should be able scrolled to the beggining. And it should read like Marcos said or Claude. More like early gamedev release notes (sometimes they added funny tidbits). The changelog. Chunk it so it's more readable."
  - Cause: the list was one long scroll of every version and every detail, hundreds of points, with the first version at the very bottom. And its scroll box never said it could shrink inside the sheet, which some browsers need before they will scroll it.
  - Don't: put a long history in one undivided scroll. Chunk it, and keep its beginning a few taps away.

- Every version is in the list, from 0.1.0 to now, 78 of them.
- Each version shows what Marcos said (his ask, or his bug report, marked as one) and Claude's line. The details open with MORE: the points, and a bug's cause and don't.
  - What Marcos said shows four lines and opens in full with MORE.
- Versions are grouped by era (0.6, 0.5 … 0.1), newest first. The newest era is open and the others fold; a tap on an era opens it, so the very first version is two taps and a short scroll away.
- Every entry in this file now opens with Claude's line, in the voice of early game-developer release notes, now and then with a joke. It is part of the entry format for every app (docs/changelog.md).
- The scroll box can shrink inside the sheet and scrolls only up and down. ([#178](https://github.com/onexmac/ad/pull/178))

## 0.6.76 · 2026-11-25 22:58

**Claude:** Over in the Sidebar lab, a new high score now gets a CONGRATS!!, the Mac drifts out of focus, and END asks SAVE? before your initials go up in lights. A real keyboard can type them too.

Asked by Marcos, 25 Nov 22:52, with a picture of an old game's YOU DIED / RESPAWN? card: "The status text (upper right) should say: back; when the camera goes to the screen. Except when the user has a highscore there it should say: congrats!! ; now in the type you initials after the highscore we should blur the Mac itself so the text should float beyond it but just the keyboard and the line, not placed yet of the users time and the ___ the end should be inverted filled and when the player press it it should pop up a confirmation card."

Shipped in the same push as 0.6.74. This is the Sidebar lab's part.

- While initials are typed for a new entry, the line at the top right says CONGRATS!!.
- The Mac goes out of focus (a 10 px blur, a little darker). Over it float only the keyboard and the entry itself, not yet in the table: its time and the three places for initials, the one being typed blinking. The table on the screen stays as it was until the entry is kept.
- END is filled: a yellow key with dark letters.
- END brings up a card in the screen's letters, after the old game's: a frame; the initials and the time, dark on a bar of light; SAVE?; and YES, boxed, beside NO, underlined.
  - YES keeps the entry: it takes its place in the table, lit up, the Mac comes back into focus, and the line says BACK.
  - NO, or a tap beside the card, goes back to typing.
- A computer's keyboard types the initials too: letters, Backspace, Enter for END and again for YES, Escape for NO. ([#177](https://github.com/onexmac/ad/pull/177))

## 0.6.74 · 2026-11-25 22:58

**Claude:** Close up on the iMac's screen, the corner now says BACK, and a tap on it takes you back to the room. The clock keeps running underneath.

Asked by Marcos, 25 Nov 22:52, in the same message: "The status text (upper right) should say: back; when the camera goes to the screen."

- With the iMac's screen close up, the line at the top right says BACK, and a tap on it is the way back to the room. The tap area reaches a little past the letters. The clock goes on underneath and shows again on the way back. ([#177](https://github.com/onexmac/ad/pull/177))

## 0.6.73 · 2026-11-25 22:37

**Claude:** You can now see which version you're playing, bottom right on the puzzle picker, and tap it to read this very list. (Yes, you're using the feature right now.)

Asked by Marcos, 25 Nov 22:33: "Guarda en Claude.md o donde veas conveniente el sistema de changelog. Quiero que todas las apps lo tengan de ahora en adelante. Que cuando la sesión de code empiece con Eva jale esté lógica también. En este caso agrega la versión en el home (cube picker en la parte de abajo a la derecha. Y si se selecciona que habrá una pantalla con la lista de todos los cambios. Ahora estos últimos cambios tienes que agregarlos cómo diferentes ya que hemos enviado muchos mensajes y no hemos hecho push"

- The version shows at the bottom right while a puzzle is chosen, in the machine's yellow pixel letters (V0.6.73). It goes while a puzzle is in hand.
- A tap on it opens the list of every change: this changelog, newest first, in a sheet that rises over the room. Version and date head each entry, in the screen's yellow.
  - It closes with CLOSE at its foot, a pull down from its top, a slide to the right, a push on past its end, or Escape.
  - The app reads its changelog when the site is built (`/kit/axis-cube/changelog`), and fetches it only when the list is opened. The artifact carries it in the page.
- The system is now the portal's for every app (docs/changelog.md): each app keeps its CHANGELOG.md, shows its version, and opens the list from it.
- 0.6.70 shipped three asks of one message in one push; they are now logged apart, as 0.6.66, 0.6.68 and 0.6.70. ([#176](https://github.com/onexmac/ad/pull/176))

## 0.6.70 · 2026-11-25 22:32

**Claude:** The Sidebar becomes a test bench for the iMac's screen: an old-school keyboard under it, three blinking blanks for your initials, and a sample time to practise with if you haven't earned a real one.

Asked by Marcos, 25 Nov 22:18: "The other artifact that we had duped. Can we change the name so it says sidebar. On it let's have the screen mode. Once we nail this we move it to the main app. So I want the camera to focus the screen a bit higher I want outside the screen a pixel keyboard for the user to tap his initials if he reaches the top 5. Very old school, with the _ blinking on the active one. Just three letters available ___"

Shipped in the same push as 0.6.66 and 0.6.68, one message with three asks; they are logged apart.

- **The Sidebar**, the copy of the artifact, is now a lab of its own, "The Cubes Sidebar", for the screen close up. What is nailed there moves to the app later.
  - The camera frames the screen higher, about a third of the way down.
  - Under it is a keyboard in the screen's letters: A to Z, DEL and END, square keys, a pressed one lit up.
  - Opening the screen offers a new entry in the top five, once. It takes the time of a puzzle just solved by hand if it is fast enough, else a sample time (1:07.42, third), so the keyboard can be tried.
  - The new row is lit up, with three places for initials, the one being typed blinking. END keeps the initials, and the row stays lit.
  - While initials are typed, a stray tap beside the keys doesn't close the screen; a pull down or a slide to the right still does.
  - The build takes a third argument for it: `node scripts/axis-cube/artifact/build.mjs <outDir> a sidebar`. ([#175](https://github.com/onexmac/ad/pull/175))

## 0.6.68 · 2026-11-25 22:32

**Claude:** The machine talks now: INSERT CUBE, MIXING..., READY, then a clock from your first layer turn that pauses when you put the puzzle down. Let a hold solve it for you and it says GAME OVER. (It's not wrong.)

Asked by Marcos, 25 Nov 22:18: "Also on the upper right it should say insert cube. Once a cube is selected, it says: mixing. Then: ready ; and when the player does the first flip (not camera but cube squares) in the upper right same pixel text as the screen. The timer starts 00:00:00. If the user leaves the cube or the app the timer stops until he flips the cube again. If the user press and holds the cube to solve it it says: game over ; while it does it. Once it finishes it says: Mix it ; once it starts mixing it says again: mixing..."

Shipped in the same push as 0.6.66 and 0.6.70.

- **The machine's line, at the top right**, in the screen's yellow pixel letters:
  - INSERT CUBE with no puzzle in hand.
  - MIXING... from the moment a puzzle is picked, while it mixes itself.
  - READY once it is mixed.
  - Then a clock, minutes, seconds and hundredths (00:00:00), from the first turn of a layer. A turn of the whole puzzle doesn't start it.
  - The clock stops when the puzzle is put down or the app is left, and goes on at the next turn of a layer. A puzzle picked up again shows where its clock stopped.
  - A hold that solves the puzzle shows GAME OVER while it solves, then MIX IT. A hold that mixes it shows MIXING... again, then READY.
  - Solved by hand, the clock stops on its time.
- A puzzle solved by hand along another way than back now counts as solved, so a hold mixes it. ([#175](https://github.com/onexmac/ad/pull/175))

## 0.6.66 · 2026-11-25 22:32

**Claude:** Fixed the glare on the iMac's screen, which looked painted on. The glass now curves like a real tube and catches the arc lamp's orange globe as a soft, bright blob.

- **Bug fix.** Marcos, 25 Nov 22:18, of 0.6.65's glare: "The curved flared looks forced it shouldn't be a line I think more like a blob, try to render it not 2d paint it"
  - Cause: the glare was a streak painted on a picture and laid over the glass, the same in every light. Nothing in the room made it, so it read as drawn on.
  - Don't: paint a light effect. Find the light in the room that would make it, and give the surface the shape that catches it.

Shipped in the same push as 0.6.68 and 0.6.70.

- The glare is now the arc lamp itself:
  - The tube's face is a cap of a sphere 42 cm round, so curved that from in front it reflects the orange globe of the lamp to the right as a bright blob, right of the middle.
  - The glass reflects the room only, sharp, a little fainter than before (0.3).
  - The painted streak is gone.
- The tube sits in the opening as a tube does. Its corners are 5 cm in and its middle 1.4 cm. A dark funnel runs from the opening's light grey edge down to its rim, where a flat plate used to be.
  - The lens focuses through half the depth of the curve, and opens a little less close up (1.8 times), so the whole screen stays sharp. ([#175](https://github.com/onexmac/ad/pull/175))

## 0.6.65 · 2026-11-25 22:17

**Claude:** The iMac's screen now glows like a real one, so the room around it falls darker, and its glass bulges a little like an old tube. The reflection is sharper, and the lettering under the screen is gone.

Asked by Marcos, 25 Nov 22:06: "Is the screen room reflection right? Also the screen should have some light (which by contrast would make its sorroindings darker just like when a camera focuses on a screen). May be some glare as well to make it feel real see the rim light that you have on the cubes sometime. That'll do. Have it more crtv like not flat the 3d model and remove where it says iMac"

- The reflection: it was right in what it showed, the room as seen from the screen, caught from just in front of the glass. It had two faults. It was blurred by a rough glass. And the lamps made pin-pricks of light on it, which on so curved a glass looked like specks of dust. The glass now reflects the room only, sharp: the leather of the ottoman and the chair low down, the shelves to the right. It no longer reflects the lamps one by one. Until the screen is first opened it shows the room as the puzzle sees it.
- The screen gives light, as a screen does when a camera looks at it. Close up it is brighter (2.4 where it was 1.6), and the camera's exposure comes down to 0.58 of the look's. The screen glows and blooms, and the room round it falls darker by contrast. The dark round the Mac is lighter to make up for it (0.45 at most, where it was 0.6).
- A glare on the glass, as a lamp to the upper right would put on it: a bright streak round the upper right of its rim, bright enough to bloom as the cubes' rim light does, and a faint broad sheen. It slides a little as the camera moves, as a reflection does, and it shows from the room too.
- The tube's face is a cushion, not a plane: its middle 2 cm proud of its edges, down to the dark surround all round. The picture swells a little at the middle (6%), darkens toward its edges, and its corners are rounded off softly into the dark.
  - The lens focuses through the depth of that cushion, and opens a little less close up (2.2 times, where it was 3.2), so the whole screen is sharp and the room still melts.
- The "iMac" under the screen is gone. ([#174](https://github.com/onexmac/ad/pull/174))

## 0.6.62 · 2026-11-25 21:51

**Claude:** The iMac was ignoring taps while a puzzle mixed itself up; fixed. The little cube on its screen also solves itself more slowly now, a square at a time, so you can watch it happen.

- **Bug fix.** Marcos, 25 Nov 21:50: "Ok a couple of things I should be able to press it while the cube is mixing up ok start. Also on the pixel cube, the two moves happen two fast and hollow then one by one so it feels like they are moving"
  - Cause: a tap on the iMac was only checked for a touch that started beside the rings. While a puzzle is mixing itself up, the rings are off, so a touch beside the puzzle counts as looking round the room. That kind of touch never asked whether it had landed on the iMac. The puzzle mixes itself every time it is picked up (0.6.50), so for the first seconds the iMac did nothing.
  - Don't: build a new tap in one state of the controls and stop there. Check every mode a touch can start in, above all the ones a sequence puts the controls in.
- A tap on the iMac now opens its screen while the puzzle is still mixing itself up. The mixing goes on behind it.
- The mark's solve is slower, and it moves:
  - Each turn first empties its line, then fills it again a square at a time, about a fifth of a second apart.
  - The middle row empties at 0.7 s and fills again from the left by 1.3 s. After a pause, the middle column empties at 2.0 s and fills from the top. At 2.6 s every square is filled. It used to be two turns at once, at 0.45 s and 1.0 s. ([#173](https://github.com/onexmac/ad/pull/173))

## 0.6.60 · 2026-11-25 21:46

**Claude:** Close up, the room now melts into a soft blur round the Mac instead of going black, and the cube on its screen solves itself as you arrive. The iMac also scooted out of the turntable's lid.

Asked by Marcos, 25 Nov 21:40: "Lower the black of the vignette so we still see some of the room, use the blur bokeh. And for the pixel cube have it with the squares be 2 moves from getting solved so when the screen zooms in they flipped into a full square, you don't 3d move the squares just turn them filled or hollow"

- Close up, the room round the Mac shows again. The dark round it is lighter: at most 0.6 of black, where it was all black. The lens opens up as the camera reaches the screen, to about three times its usual aperture. The screen and the Mac's face stay sharp, and the room round them melts into bokeh: the blinds, the sideboard, the turntable.
- The mark on the screen solves itself:
  - It now stands two turns from solved: filled, outline, filled in each row, with the middle row the other way round (the middle row and the middle column each turned once).
  - Once the screen is close, the middle row turns, about half a second in: its three squares swap, filled for outline. Half a second later the middle column turns, and every square is filled.
  - Nothing moves in 3D; the squares only change between filled and outline.
  - When the screen closes it is mixed again, ready to solve the next time.
- The iMac stands 6 cm further left. Turned to the room in 0.6.55, its right front corner had gone a centimetre and a half into the turntable's lid, which showed close up as a white slab beside the speaker. It now keeps about 4 cm from the lid. ([#172](https://github.com/onexmac/ad/pull/172))

## 0.6.58 · 2026-11-25 21:39

**Claude:** Cleaned the stray dots out of the screen's cube and fixed the close-up that cut the screen out of its Mac. It now sits inside the Mac, reflects the room, and reads yellow on black with room to breathe.

- **Bug fix.** Marcos, 25 Nov 21:22, of 0.6.55's screen: "The squares of the pixel cube have like dots inside. Remove those. Now the screen should have a reflection of the room and it actually has to be inside the Mac, I see what you are trying to do with the separate faded in flat screen but it doesn't look right. Put it inside, also add more breathing room for the elements of the screen, it looks to crowded. Have the first player highlighted. And for the pixel cube some cubes are filled the others are stokes. Make the screen monochromed with yellow text"
  - Cause, the dots: each block of the mark had a rivet hole in every corner, a detail carried over from the first version that nobody asked for. Where four blocks met, the holes read as dots inside the cube.
  - Cause, the flat screen: close up, everything but the screen was cut away to black along the screen's own outline. Seen alone, the screen lost the Mac round it, and the glass reflected next to nothing (a fifth of a dark, rough reflection). It looked like a flat picture faded in, not a tube inside a Mac.
  - Don't: cut an object out of its scene for a close-up. Frame it in what holds it, and let the scene fall off softly round it. And don't keep details from an earlier version once the ask has changed shape.
- Close up, the screen is inside the Mac:
  - The camera stops further back, with the screen four fifths of the frame across. The black surround, the light grey edge of the opening, the ice bezel, the "iMac" under it and the CD tray all show round it.
  - The dark round it is now a soft ellipse, clear over the screen and its bezel, falling to black across the Mac's face and beyond.
  - The puzzle in hand steps aside, up and to the right, while the screen is close, so the camera no longer flies through it. It comes back when the screen closes.
- The glass reflects the room. The first time the screen is opened, the room is caught as the screen sees it, from just in front of the glass. The glass adds that reflection over the screen: smooth, and strong enough to show the shelves and the warm light to the right. Until then it reflects the room as the puzzle sees it.
- The screen is in one colour, yellow on black:
  - The mark is 3 × 3 squares of 9 × 9 pixels, two pixels apart, with no holes. Five are filled and four are only an outline, mixed.
  - Beside it: THE CUBES, TOP 5, PLAYERS.
  - The first player is lit up: dark letters on a yellow bar.
  - More air everywhere: the screen has more pixels (160 × 120) for the same letters, with 12 pixels from one row to the next and wider margins. Each pixel is drawn whole, so shapes are solid, with the tube's lines across them.
  - It is still now: no glint, no mixing.
- The screen's light on the room is yellow too, in every look. ([#171](https://github.com/onexmac/ad/pull/171))

## 0.6.55 · 2026-11-25 20:32

**Claude:** Our mistake on the screen's logo: it was one block where there should have been nine. It's now a three-by-three in one colour, and the iMac turns toward the room for a shorter trip in.

- **Bug fix.** Marcos, 25 Nov 20:26, of 0.6.53's screen: "La iMac para el zoom sea más sencillo gurala un poco que más bien este 33 grados para el otro lado cómo más viendo hacia el viewer, más bien desviado al otro lado. The cubes / Top 5 / Players. And for the icon is single color and 3x3 (9 blocks) not one."
  - Cause: his first ask, "un icono pixel art tipo los blocks de Mario pero solo 9x9", was read as one block nine pixels across. He meant nine blocks, 3 × 3, a cube's face made of them. The mark also got a cube's face in six colours in its middle, which he never asked for.
  - Don't: take a number in an ask as pixels when it can count the pieces; when it reads both ways, show both. Add no colour or detail that wasn't asked for.
- The mark is now 3 × 3 blocks, in one colour: each a plate of 9 × 9 pixels with its corners rounded and a rivet hole in each, a pixel between blocks. Close up the gold still glints.
- The heading is three lines beside the mark: THE CUBES in amber, then TOP 5 and PLAYERS in blue. The line at the bottom is gone, and the five rows have a little more room between them.
- The iMac is turned 33° toward the middle of the room, where it was turned 16° away. Its face now looks past the camera, a little to the right, so the way to its screen close up is shorter and straighter.
  - Turned so, it is a hair deeper than the sideboard: it stands 2 cm further back, just clear of the wall, and one front corner is over the edge by about a centimetre. ([#170](https://github.com/onexmac/ad/pull/170))

## 0.6.53 · 2026-11-25 20:25

**Claude:** Tap the iMac and the camera flies right into its screen, now an arcade high-score table. Until there's a stopwatch, the top five are the machine's own. (We're coming for you, AXS.)

Asked by Marcos, 25 Nov 20:00, with two photographs of an arcade machine's high-score screen: "Cuando uno haga tap en la Mac debe hacerse zoom a la pantalla dark alrededor y mostrar solo la pantalla, la pantalla tiene que tener un icono pixel art tipo los blocks de Mario pero solo 9x9 y con top 5 players. Algo así."

- A tap on the iMac, with a puzzle in hand, takes the camera to its screen, square on, filling the frame across. On the way the room round the screen goes dark until only the screen is left.
  - The iMac is in view only from the puzzle in hand; from above the ottoman it is out of the picture.
  - The dark is cut to the screen's own outline, rounded at the corners, every frame, so it follows the screen as the camera flies.
  - The lens focuses on the screen, and the screen is a little less bright close up, so the letters stay sharp with a glow round them.
  - The rings step aside while it is open.
- Back to the room: a tap, a pull down or a slide to the right. The pull and the slide draw the room back with the finger first, and a short one springs back. Escape too.
- The screen is now an arcade machine's high-score table, in its own coarse pixels (128 × 96), each one a dot of light with a tube's glow and its lines:
  - The game's mark at the top: a block of 9 × 9 pixels, drawn at three times their size. It is gold, with a light edge along its top and left, a shaded one along its bottom and right, and a rivet in each corner. In the middle is a cube's face, mixed up.
  - Close up, the gold glints and the face mixes itself again every 0.64 s.
  - Under it "TOP 5 PLAYERS", then five rows of rank, time and initials, in amber and orange, and "THE CUBES" in blue.
  - The letters are a 5 × 7 pixel font drawn for it.
  - Until the stopwatch (1.0.0) there are no real times. As on any arcade, the five are the machine's own: AXS, GST, CUB, TWO and MIX, from 0:48.52 to 1:58.06.
- The screen's light on the room is a little warm now, as amber on black would give. ([#169](https://github.com/onexmac/ad/pull/169))

## 0.6.50 · 2026-11-25 19:59

**Claude:** Pick up a solved puzzle and it now mixes itself before you start, the same shuffle a press and hold does. Put one down half done and it waits for you exactly as you left it.

Asked by Marcos, 25 Nov 19:57: "Cuando uno escoge el cube debería comenzar la animación de mixed up igual al de press n hold para que empiece mezclado siempre."

- A puzzle picked up solved now mixes itself up as soon as it is in front of you, about 0.8 s after the tap. It is the same sequence a press and hold plays: it opens, scrambles quickly (20 to 24 turns on a 3×3, 12 to 16 on the 2×2) and closes.
- A puzzle put down half solved keeps its turns: picked up again, it is as it was left, and a hold still solves it.
- One that was solved by hand, by other turns than the way back, counts as solved and mixes itself up too.
- Put down before it is in front, it doesn't mix. ([#168](https://github.com/onexmac/ad/pull/168))

## 0.6.49 · 2026-11-25 19:58

**Claude:** Sideways slides kept coming out as up or down when a thumb drifted diagonal; that's fixed. The puzzle now gives sideways the benefit of the doubt, on the puzzle, beside it and on the rings.

- **Bug fix.** Marcos, 25 Nov 19:52: "Ok el slide tiene que considerar un poco las diagonales, a veces cuesta un poco hacer para los lados, el dedo sin querer hace algo de diagonal."
  - Cause: which way a slide went was read at exactly 45°, from its first 8 or 9 pixels. A thumb drawn sideways pivots from the wrist and bends into a diagonal, so a slide meant sideways often came out a little more up than across, and turned the puzzle or a column up or down.
  - Don't: split a thumb's slide at 45° from its first few pixels. Read it over a little more travel, and lean towards the way that is harder to draw.
- A slide now counts as sideways unless it is clearly up or down: up to about 55° from level, where before it was 45°. A slide steeper than that is still up or down, and a long pull straight down still puts the puzzle back.
  - It holds for every slide: on the puzzle, beside the grid and on the rings.
- The way is read a little later: after 14 pixels for the whole puzzle (it was 9) and 12 for a ring (it was 8).
- Checked with slides at 20°, 40°, 50°, 60° and 75° from level in each of the three places: up to 50° they go sideways, from 60° up or down. ([#167](https://github.com/onexmac/ad/pull/167))

## 0.6.48 · 2026-11-25 19:47

**Claude:** The rings huddle a little closer, leaving more room at the sides, where a slide now turns the whole puzzle. Double-tap the puzzle to flip it and bring the back face round to the front.

Asked by Marcos, 25 Nov 19:35, in a comment on the artifact: "Let's make the controls a little bit tighter. Same dot size but closer c just a bit, so we can have more room on the sides. Sliding outside the controls moves the cube faces, double tapping the cube flips it so the opposite face from the current one goes front."

- The rings sit closer together and keep their size. The space between them is about an eighth less (8.3% of the screen's height instead of 9.5%), and on the 2×2 too.
- The grid now answers only within its rings, and a little past the outer ones by most of the space between two rings. Before, a row reached the screen's edges.
- Outside the grid, a slide turns the whole puzzle round, as a slide on the puzzle does:
  - sideways about the upright, up or down about the line across;
  - a tap there does nothing;
  - a long pull straight down still puts the puzzle back.
  - It used to move the camera.
- Two quick taps on the puzzle, in about the same place, turn it half round, so the face at the back comes to the front.
  - It turns the way of the side tapped.
  - A single tap still brings the tapped face to the front, now after a quarter of a second, in case a second tap follows. ([#166](https://github.com/onexmac/ad/pull/166))

## 0.6.45 · 2026-11-24 22:47

**Claude:** Fixed the Ghost Cube's seams, which ran in straight lines the real one doesn't have. It's rebuilt from the photograph, broken seams and all, and springs back into a cube when you solve it.

- **Bug fix.** Marcos, 24 Nov 22:24, with the photograph again: "That photo is clear, follow the lines it isn't straight diagonal lines."
  - Cause: the Ghost Cube was still a cube cut by flat planes right through, so every seam ran straight across its face. On the real one the seams break. Its three layers along one axis are each turned by its own angle about that axis, so the cuts across the layers do not run on from one layer to the next. The two versions before this one were tuned to look like the photograph instead of being measured from it.
  - Don't: tune a model until it resembles a reference. Trace the reference's own lines, find the structure that explains them, and lay the model over the reference before shipping.
- The Ghost Cube is rebuilt from measurements of the photograph.
  - Its three faces in view were squared up, and the seams traced on each.
  - They fit a 3×3 with one axis close to the cube's long diagonal and, in the solved cube, the outer layers along it turned about 27° either way from the middle one.
  - The axis, its place in the cube and each layer's turn were fitted until the model's seams lay on the photograph's: the long six-sided piece, the X that breaks at its centre, the rhombus, the bars on top.
- It plays as the real one does.
  - Solved, its layers stand turned out of line and it is a cube.
  - A turn of those layers themselves works at once. Any other turn first brings the layers into line, quickly, and it is then no cube.
  - When the last piece is home again, the layers spring back out of line and it is a cube once more.
- Its stickers are measured from the photograph too: a white frame 0.078 of a half-side wide, 0.04 in from the piece's edge.
- At rest on the ottoman it is turned to show the faces it is known by. ([#163](https://github.com/onexmac/ad/pull/163))

## 0.6.40 · 2026-11-24 16:28

**Claude:** The Ghost Cube was too even, and that's fixed: its insides now sit much further off centre, so its pieces vary far more in size, closer to the lopsided real thing.

- **Bug fix.** Marcos, 24 Nov 16:16, of 0.6.38's Ghost Cube: "It's more asymmetric than you thought."
  - Cause: its cuts sat only about a sixth of a layer off the cube's centre, too near symmetric. Its layers came out of nearly even thickness, so the pieces were of nearly even size. On the real one the layers are of very different thicknesses: a huge piece beside long thin bars and small triangles.
  - Don't: stop at the first version that has a thing's defining trait. Match the trait in degree, until it reads at a glance as it does on the real one.
- The Ghost Cube's mechanism sits half a layer off the cube's centre (0.33, 0.25, 0.29), three times as far as before. The tilt is the same.
  - Found by a search for the most uneven spread of piece sizes that still shows every one of the 26 pieces with few slivers, then compared with the photograph.
  - The spread of piece sizes grew by a fifth: the largest face of a piece is now a third of a face of the cube, up from a quarter. ([#162](https://github.com/onexmac/ad/pull/162))

## 0.6.38 · 2026-11-24 16:10

**Claude:** Fixed the Ghost Cube, which had been built from a guess. Its cuts now tilt every which way, so diagonal seams cross every face, and each sticker is a white outline on black, as on the real one.

- **Bug fix.** Marcos, 24 Nov 15:28, with a photograph of the real one: "The black and white cube isn't right, look carefully at the image."
  - Cause: the Ghost Cube was built from a guess. Its cuts were turned about the upright axis only, so its sides showed a straight grid of rectangles and only its top a cross. On the real one the turning axes are tilted every way inside the cube and the cuts sit off its centre, so every face is crossed by diagonal cuts. Its pieces come in every shape: long six-sided "coffins", triangles, slanted bars.
  - Don't: build a real puzzle's geometry from memory. Work from photographs of it, and compare the renders with them face by face.
- The Ghost Cube's mechanism is tilted every way inside its cube: 45° about one of the cube's axes, 30° about the next, 10° about the third. Like before, it sits off the cube's centre.
  - The published descriptions say only that the axes are turned inside the cube so no two pieces are alike, with no angles.
  - So the tilt and the offset were found by a search: cuts crossing every face on the diagonal, with about nine large pieces a face and few slivers. Then they were checked against the photograph.
  - The Axis Cube's own tilt was tried first. It broke every face into small triangles.
- Its stickers are as on the real one: each is a white frame round black, the shape of its face. The frame is 0.1 of a layer wide, close to the piece's edge, with crisp corners.
- Like the Axis Cube, it floats with its mechanism square to the screen, so the rings turn the layers you see. At rest on the ottoman it sits square to its cube, which shows the diagonal cuts. ([#161](https://github.com/onexmac/ad/pull/161))

## 0.6.35 · 2026-11-24 09:25

**Claude:** Start wasn't answering while the room loaded, and that's fixed. It springs under your finger from the first moment now, and the room builds in small bites so your tap is answered at once.

- **Bug fix.** Marcos, 24 Nov 08:37: "For some reason the start button is not responding on press."
  - Causes:
    - The button was React's, so a tap did nothing until the app's scripts had arrived and React had taken over the page.
    - Behind the welcome, the room was built in one piece.
    - The first frame then compiled every one of the GPU's shader programs at once, and swapped in photographs that made it compile some of them again.
    - A tap waited for all of that. Measured here on a CPU slowed fourfold, it waited 8.8 s.
  - Don't: let a button on a loading screen wait for the app's scripts, or let anything block the page for more than a moment while it is up. Answer the button from the page's first script, build in slices, and wait for each shader program on its own before the first frame.
- Start springs. It presses in under the finger and, let go, springs back past its size (4%) and settles. The page's first script answers it, so it works from the first paint.
- After Start, the bar starts empty and runs all the way, at least 0.85 s from the press, however ready the room already was. If the room was waiting, the run starts the moment the welcome goes.
- The audio is started by the page's first script inside the tap, which is the only place an iPhone allows it, and the app takes it up from there.
- Loading hands the page back every few milliseconds, so a tap is answered at once:
  - The room is built in slices.
  - Before the first frame, the textures are sent up to the GPU one by one. Its programs are made one at a time, each waited for on its own, and the first capture for the reflections is made then too.
  - Each photograph is sent up to the GPU as it arrives, in its own turn.
  - Each photograph has a slot in its material from the start, holding a single texel that changes nothing. So a photograph only swaps a texture and never makes the GPU rebuild a program.
  - The reflections start with a blank of the same kind, so the materials that reflect are made once.
  - The scene (three.js and the room) comes in a script of its own, after the page's.
- Measured here on a CPU slowed fourfold, a tap during loading now waits 0.13 s at the median and 0.6 s at most. The first frame's drawing isn't in that figure: it is slow here, where the GPU is software, and it takes milliseconds on a phone. ([#157](https://github.com/onexmac/ad/pull/157))

## 0.6.30 · 2026-11-24 08:03

**Claude:** Our iMac didn't look like an iMac, and that's fixed. Rebuilt from photographs: frosted ice above and below, Bondi blue in between, the handle, the vents, the CD tray and the teal speakers.

- **Bug fix.** Marcos, 24 Nov 07:18: "Something is off it doesn't look like an iMac."
  - Cause: it was modelled from memory: all blue, with a white frame on the front. On the real one the white is a hood and a skirt, and the blue is only between them.
  - Don't: model a real object from memory. Work from photographs, front, side and back, and compare the renders with them side by side.
- The iMac is rebuilt from photographs of the real one, laid out as its plastics are:
  - a hood of frosted ice over the face and the front of the top;
  - a skirt of the same ice all the way round the bottom;
  - the blue only between them, over the sides and the round back. Before, it was all blue with a white frame on the front.
- Its side is a rounded wedge, as on the original:
  - the face leans back a little;
  - the top runs back almost level, then falls in one long curve to a back that is deepest low down;
  - the line between the blue and the skirt climbs from the face to the back.
  - Seen from above, the sides still draw in toward the back.
- The face is the original's:
  - a large 4:3 screen in a grey-white frame, with "iMac" under it;
  - on the skirt below, the two teal speakers at the corners, the CD tray in the middle and the power button.
  - The blue band that used to sit under the screen is gone.
- On the shell:
  - The blue is greener at its front edge, where the real plastic is thick.
  - On the fall of the back are three vents, and the handle: a loop of ice round a dark hollow, with the grip across it.
  - On the right side of the skirt is the door, with its blue latch.
  - Underneath are the foot that folds out and four small feet.
- Inside, the tube shows through the blue, square at the face and drawing in to its neck. The flat panels that used to show through, and the corner of the tube's mask that poked out of the shell, are gone.
- The screen's light is now a wide spot just off the glass, pointing into the room. It lights what is in front of the screen, but no longer the iMac's own face or glass, which had glowed under the screen. ([#154](https://github.com/onexmac/ad/pull/154))

## 0.6.27 · 2026-11-24 07:02

**Claude:** Fixed the iMac's boxy shell: it now has the original's egg curves, rounding in to a narrow back, with a lip that rolls over its face.

- **Bug fix.** Marcos, 24 Nov 06:57: "The model have to match the iMac egg curves."
  - Cause: the shell was a box tapering back.
  - Don't: build a known object's form out of boxes.
- The iMac has the original's egg curves. It is built from superellipses instead of a box tapering back.
  - Seen from above, its sides curve in from the face to a narrow, round back.
  - Seen from the side, its top runs back level and then down in one long arc to a round end, and its bottom lifts toward the back.
  - The shell rolls over the edge of the face as a lip.
- The face and the band of speakers under it are cushions: rounded at the edges, a little domed.
- The handle sits lower on the shell. ([#150](https://github.com/onexmac/ad/pull/150))

## 0.6.25 · 2026-11-24 06:54

**Claude:** A Bondi-blue iMac takes the mushroom lamp's spot on the sideboard, its screen showing an empty TOP SCORES table. The turntable scoots over, and the ashtray has left the building.

- The first iMac (1998), in Bondi blue, takes the glass mushroom lamp's place on the sideboard under the window.
  - A frosted ice-white face holds the screen, with a blue band and the speakers at its foot.
  - Behind it, the translucent blue shell tapers back, with the tube and the chassis showing through and a handle at the top.
  - It stands to the left of a puzzle in hand, turned three-quarters to the camera.
- Its screen is white on black: TOP SCORES, with empty rows for now, waiting for the score system.
- The screen gives off a little cool light in place of the lamp's warm one. The arc lamp over the chair stays, since it is what lights the puzzles.
- To make room, the turntable moves along the sideboard and the ashtray goes.
- Under the hood: a test can set its own camera to look at something in the room. ([#149](https://github.com/onexmac/ad/pull/149))

## 0.6.20 · 2026-11-24 00:31

**Claude:** One word changed, and it's the important one: the welcome's button now says Start.

- The welcome's button says Start. ([66f3ed7](https://github.com/onexmac/ad/commit/66f3ed7) · [#145](https://github.com/onexmac/ad/pull/145))

## 0.6.19 · 2026-11-23 23:48

**Claude:** The welcome and the loading screen are now one: the little cube is already turning when you arrive, and Start makes way for the loading bar. It keeps turning while the room builds behind it.

- The welcome is the loading screen itself.
  - The loading cube is already turning in the middle from the first paint.
  - The app's name and Start sit where the bar will be, and the bar waits out of sight.
  - On Start, the name and the button fade, the bar comes up in their place and runs out to the room.
- The cube keeps turning while the room is built behind it. ([8e6fd47](https://github.com/onexmac/ad/commit/8e6fd47) · [#139](https://github.com/onexmac/ad/pull/139))

## 0.6.18 · 2026-11-23 23:36

**Claude:** Fixed the end-of-loading jingle going silent on iPhone, which allows no sound before a touch. A welcome with an OK button now gives it that touch, and the room builds while you read it.

- **Bug fix.** Marcos, 23 Nov 21:33: "You didn't add a bolololipipob when the startup loading bar finishes."
  - Cause: it was there, but an iPhone lets a page make sound only after a touch. Opening from the home screen has none, so it played in silence.
  - Don't: count on a sound before the first touch on iOS. Give it a tap first.
- A welcome on iPhone and iPad whenever the install screen isn't shown: from the home screen, in Safari after the first visit, and inside the browsers of social apps.
  - It has the cube of the icon, the app's name and an OK.
  - An iPhone only lets a page make sound after a touch, so without it the notes at the end of loading could not be heard. Its tap is that touch.
- The room is built behind the welcome and the install screen instead of after them.
  - The loader waits for the screen to go.
  - Once the room is ready it stops drawing, to save battery.
  - After the tap the bar runs out at once and the room comes in to its bolololipipob.
- If the room is already waiting, the tap's own bolololip is skipped, since the longer phrase answers it a moment later.
- No welcome on Android: an installed app may play there without a touch. ([4485b43](https://github.com/onexmac/ad/commit/4485b43) · [#136](https://github.com/onexmac/ad/pull/136))

## 0.6.15 · 2026-11-23 21:31

**Claude:** Every finished turn now tells you how you're doing: a bright lolip if it brought you closer to solved, a softer lolop if it didn't. (The 2×2 knows all 3,674,160 of its states. No pressure.)

- After the clack of a finished turn comes the lolip if the turn brought the puzzle closer to solved, or a lower, softer lolop if it didn't.
- The 2×2 is judged exactly.
  - All its 3,674,160 states are known, none more than 11 turns from solved.
  - The table is built in the background the first time the 2×2 is picked up. After that, a turn is two lookups.
- The 3×3, the Axis Cube and the Ghost Cube are judged by the layer method, in its order: the cross, the first corners, the middle edges, the last layer's edges turned up, its corners turned up, its corners in place, its edges in place.
  - On the two shape mods, the centres turned right are a last step.
  - Progress is counted from whichever face is furthest along.
- Undoing the last turn also counts as closer.
- A judgement takes about 20 µs, so the app doesn't slow down. ([d29c2e3](https://github.com/onexmac/ad/commit/d29c2e3) · [#125](https://github.com/onexmac/ad/pull/125))

## 0.6.10 · 2026-11-23 21:09

**Claude:** Sorted out the notes that sounded like water drops and kept repeating. Each puzzle now plays its own instrument, piano, marimba, kalimba or glass, and never the same phrase twice in a row.

- **Bug fix.** Marcos, 23 Nov 21:04: "It sounds like a water drop", and it was repetitive.
  - Cause: each note slid up into its pitch, which is the sound of a drop, and the same phrase played every time.
  - Don't: slide a note into its pitch. Vary any sound that repeats.
- Notes are struck instead of sliding up into their pitch. The slide made them sound like drops of water. They are also brighter, through a more open filter.
- Each puzzle plays its own instrument: an electric piano for the Axis Cube, a marimba for the 3×3, a kalimba for the 2×2 and glass for the Ghost Cube. The install screen and the end of loading use the piano.
- Each phrase is drawn from a few figures in E minor pentatonic, never the one just played, and is a little loose in time and touch. ([2b14eb3](https://github.com/onexmac/ad/commit/2b14eb3) · [#115](https://github.com/onexmac/ad/pull/115))

## 0.6.7 · 2026-11-23 20:51

**Claude:** Fixed the heavy synth bass that thumped under every finished turn. Now it's a clack and a two-note lolip, and loading ends with a cheerful bolololipipob.

- **Bug fix.** Marcos, 23 Nov 20:45: "There's like synth bass sound when we finish flipping an axis."
  - Cause: every landed turn played a wobbling bass note under its clack.
  - Don't: put a heavy sound on an event that happens dozens of times a minute.
- A finished turn no longer plays the synth bass note. It keeps its clack and gets a lolip: two notes starting at the turned face's pitch, so turning the puzzle plays a line.
- A bolololipipob when the loading ends: the four notes, a brighter one above them, and a round one that comes back down. ([92ea820](https://github.com/onexmac/ad/commit/92ea820) · [#115](https://github.com/onexmac/ad/pull/115))

## 0.6.5 · 2026-11-23 20:44

**Claude:** Axis Cube is now The Cubes, a name with room to grow, and your saved links still work. The ottoman also gets roomier around the puzzles, with space for more of them.

- Renamed The Cubes: page title, home-screen name, manifest, portal entry and install screen. The address stays /kit/axis-cube, so installed copies and shared links keep working. "Axis Cube" remains the name of one of the four puzzles.
- The puzzles at rest are 15% smaller and closer together, and the camera over the ottoman comes in by the same amount.
  - On screen they keep their size and place, within 3 px.
  - The ottoman looks 18% bigger around them, with room for more puzzles.
  - In the hand, a puzzle is the size it always was. ([6b0d78d](https://github.com/onexmac/ad/commit/6b0d78d) · [#115](https://github.com/onexmac/ad/pull/115))

## 0.6.2 · 2026-11-23 20:31

**Claude:** Choosing something now earns a bolololip, four soft notes running up, and the camera's trip to a puzzle gets a low, muffled swoosh. The install screen's tap wakes the sound right away.

- A bolololip when something is chosen: a puzzle picked up, or the install screen's button. It is four soft notes running up, the last one short and bright, with a little echo.
- The camera's move to a puzzle is a low, muffled swoosh, like a whoosh slowed down. The way back, when the puzzle is put down, falls the same way before the thump.
- The install screen's tap now wakes the sound, so the room isn't silent until a second touch. ([7597b5d](https://github.com/onexmac/ad/commit/7597b5d) · [#107](https://github.com/onexmac/ad/pull/107))

## 0.6.0 · 2026-11-23 20:27

**Claude:** The room learns to make noise: whooshes, clacks, ticks, wind and a growl while you hold a puzzle, all made on the spot without a single audio file. It naps after twenty quiet seconds.

- Sound, all synthesised on the spot, with no audio files:
  - a rising whoosh when a puzzle is picked up, and a falling one when it is put down, then a thump as it lands;
  - a clack when a layer lands on its quarter turn, with a bass note that wobbles (each face its own note);
  - a tick for each quarter a free spin passes, and wind for fast spins;
  - a growl that rises while a finger is held on the puzzle;
  - a wobble bass that speeds up while the puzzle scrambles or solves itself.
- The bass is shaped so a phone speaker can play it.
- Sound starts with the first touch and sleeps after 20 s of silence. On iPhone it follows the silent switch and mixes with whatever else is playing. ([2fabeca](https://github.com/onexmac/ad/commit/2fabeca) · [#107](https://github.com/onexmac/ad/pull/107))

## 0.5.30 · 2026-11-23 20:09

**Claude:** The first time you open the app in a phone's browser, a friendly screen shows how to put it on your home screen. On Android it can install it for you.

- An install screen the first time the app opens in a phone's browser.
  - It has the cube of the icon, how to put the app on the home screen, and a button.
  - On iPhone, the steps are Share, then Add to Home Screen, and the button says Listo.
  - On Android, once Chrome offers to install, the button becomes Instalar and opens Chrome's own dialog. Chrome's own banner is always declined.
- Not shown from the home screen, on a desktop, or inside social apps' browsers. Once past it, it doesn't come back in that browser.
- The three icon files lose faint hairlines beside the cube. ([27fbc4a](https://github.com/onexmac/ad/commit/27fbc4a) · [#106](https://github.com/onexmac/ad/pull/106))

## 0.5.25 · 2026-11-23 19:47

**Claude:** The room now sits in a rounded frame on a black screen, tucked between the phone's status bar and Safari's, with black all around.

- The room is a rounded frame on a black screen (the short vvv fit).
  - The frame sits below the status bar and above Safari's bar, with black beyond.
  - On a wider screen it keeps a gutter at the sides too.
- The scene measures itself and every touch against the frame rather than the window, and follows the frame as the browser's bars move. ([75a47dd](https://github.com/onexmac/ad/commit/75a47dd) · [#98](https://github.com/onexmac/ad/pull/98))

## 0.5.20 · 2026-11-23 19:04

**Claude:** The loading cube froze while the room was being built; fixed. It now keeps turning the whole time, even with Reduce Motion on, since a still cube just looks stuck.

- **Bug fix.** Marcos, 23 Nov 18:53: "The loading cube doesn't roll."
  - Cause: each piece ran two animations on the same property, the opening and then the loop. The browser runs that on the main thread, which was busy building the scene, so the cube showed about one picture a second. Reduce Motion also stopped it.
  - Don't: put two animations on one element's transform. Give each its own nested wrapper, so the compositor runs it, and test the loader while the scene is being built.
- The loading cube keeps turning while the room is being built. It used to freeze, showing about one picture a second.
- It also turns under Reduce Motion, since a still cube reads as a stalled app.
- The solved cube rests a little less before its first turn. ([8acd7c6](https://github.com/onexmac/ad/commit/8acd7c6) · [#87](https://github.com/onexmac/ad/pull/87))

## 0.5.19 · 2026-11-23 18:04

**Claude:** Fixed new versions showing up one opening late on phones, which is why the loading cube seemed to be missing. The app now picks up the newer copy on its first opening, even on a slow network.

- **Bug fix.** Marcos, 23 Nov 17:59: "Vercel doesn't have the loading cube."
  - Cause: Vercel had it. The app waited half a second for the network and otherwise opened the copy kept on the phone, so a phone opening cold always saw each version one opening late.
  - Don't: let a kept copy hide a new version. Test the first opening after a deploy, cold, on a slow network.
- A new version shows the first time the app is opened, even on a slow network.
  - Before, a phone opening the app cold saw each new version one opening late, which is why the loading cube didn't appear on it.
  - Now the page starts over once on the newer copy: only in its first seconds, and only if nobody has touched it yet. ([82f7923](https://github.com/onexmac/ad/commit/82f7923) · [#85](https://github.com/onexmac/ad/pull/85))

## 0.5.17 · 2026-11-23 15:10

**Claude:** The icon's turning corner is now rounded instead of cut, to match the tiles. (At icon size, every corner is a headline.)

- Icon: the turning side's corner is rounded instead of cut, in keeping with the rounded tiles. ([6a6154f](https://github.com/onexmac/ad/commit/6a6154f) · [#82](https://github.com/onexmac/ad/pull/82))

## 0.5.16 · 2026-11-23 15:07

**Claude:** Fixed the black spike poking out at the icon's corner, and swept away the faint grey hairlines along its seams. The cube in the icon is now mixed and caught mid-turn.

- **Bug fix.** Marcos, 23 Nov 15:03: "hay un pico negro en el vértice."
  - Cause: the turning layer's corner poked out over the white tile beside it.
  - Don't: ship an icon without looking at every corner enlarged.
- Icon: the frame that was picked, with the cube mixed and its right side 24° into a turn.
  - The black spike at the turning side's corner is cut at 45°.
  - The faint grey hairlines along the black pieces' seams are taken out. ([825d732](https://github.com/onexmac/ad/commit/825d732) · [#81](https://github.com/onexmac/ad/pull/81))

## 0.5.15 · 2026-11-23 15:02

**Claude:** Fixed the icon's turn, which an earlier version had read backwards, turning it less instead of more. The side now swings well up, so the face underneath opens into whole tiles.

- **Bug fix.** Marcos, 23 Nov 15:01: "Flip it more."
  - Cause: in 0.5.13 his "a little bit more up" was read backwards, and the side was turned less (36°) instead of more.
  - Don't: guess a direction. When an ask can be read two ways, show both before shipping.
- Icon: the turning side is caught going up, 64° into its turn, so the face coming round underneath opens into whole tiles. ([0660a60](https://github.com/onexmac/ad/commit/0660a60) · [#80](https://github.com/onexmac/ad/pull/80))

## 0.5.14 · 2026-11-23 14:58

**Claude:** Behind the scenes: the app's fonts now come with it instead of being fetched on every build, which had been making updates fail at random.

- Fonts now come from the repository's own dependencies instead of being fetched from Google during each build. That fetch had been failing deployments at random. ([f5f6634](https://github.com/onexmac/ad/commit/f5f6634) · [#79](https://github.com/onexmac/ad/pull/79))

## 0.5.13 · 2026-11-23 14:50

**Claude:** Icon tweak: the turning layer is caught a little earlier in its turn, so its underside reads as tiles instead of a flat sliver.

- Icon: the turning layer is caught at 36° instead of 45°, so its lower face opens into tiles instead of reading as a flat sliver. ([5bb11b7](https://github.com/onexmac/ad/commit/5bb11b7) · [#79](https://github.com/onexmac/ad/pull/79))

## 0.5.12 · 2026-11-23 14:47

**Claude:** A new icon moment, picked from the loading loop: every face in view is a mix of white and black tiles.

- Icon: a moment from the loop, where every face in view mixes white and black tiles. ([b3207aa](https://github.com/onexmac/ad/commit/b3207aa) · [#78](https://github.com/onexmac/ad/pull/78))

## 0.5.11 · 2026-11-23 14:44

**Claude:** The home-screen icon is now the loading screen's little 2×2, mid-turn on black, instead of a crop of the room. Its tile edges are bolder so they hold up at icon size.

- The home-screen icon is the loading screen's flat 2×2 on black, halfway through a turn, instead of a crop of the room.
- It is rendered from the loader's own markup, with bolder tile edges so they hold at icon size. ([e003768](https://github.com/onexmac/ad/commit/e003768) · [#77](https://github.com/onexmac/ad/pull/77))

## 0.5.9 · 2026-11-23 14:39

**Claude:** The loading cube never lands solved anymore: it mixes itself in four turns, then loops with every face scrambled and no visible seam. (It has no plans to solve itself for you.)

- The loading cube is never solved again once it starts. An opening of four turns mixes it, then a loop of ten turns keeps every face in view mixed at every rest, with no pause or jump at the join. ([70f02a0](https://github.com/onexmac/ad/commit/70f02a0) · [#76](https://github.com/onexmac/ad/pull/76))

## 0.5.8 · 2026-11-23 14:32

**Claude:** Now the loading cube's turns follow the rhythm of a real solve: the right side up or down, then the top row across, taking turns.

- The loading cube's turns follow the shape of a solving algorithm: the right side up or down, then the top row across, strictly in turn. ([873b647](https://github.com/onexmac/ad/commit/873b647) · [#76](https://github.com/onexmac/ad/pull/76))

## 0.5.7 · 2026-11-23 14:30

**Claude:** No more tumbling as one lump: the loading cube turns a layer at a time, like a puzzle being worked, and it's quicker on its feet, too.

- The loading cube no longer tumbles whole. It is eight corner pieces, turned a layer at a time as when solving.
- It is faster: 0.4 s from one turn to the next, down from 0.75 s. ([7071f7a](https://github.com/onexmac/ad/commit/7071f7a) · [#76](https://github.com/onexmac/ad/pull/76))

## 0.5.5 · 2026-11-23 14:22

**Claude:** Reworked the dust: more layers float at different distances, and the blurry specks nearest the lens are half the size, so they stop looking like a smudge on the glass.

- **Bug fix.** Marcos, 23 Nov 14:18: more sheets of dust, further away; the blur up close was too big.
  - Cause: there were three sheets, and the wide out-of-focus discs near the lens read as a smudge on the glass.
  - Don't: let bokeh near the lens grow big. It looks like dirt on the glass.
- Five sheets of dust at five distances. The furthest are many slow points; each nearer sheet is larger, sparser and a little faster.
- The out-of-focus discs nearest the lens are half the size, since a wide blur read as a smear on the glass. ([8cae56f](https://github.com/onexmac/ad/commit/8cae56f) · [#75](https://github.com/onexmac/ad/pull/75))

## 0.5.4 · 2026-11-23 14:18

**Claude:** The loading screen gets a mascot: a flat 2×2 cube in the middle, flipping a quarter turn at a time. The bar steps down to make room.

- A flat 2×2 cube at the centre of the loading screen: white or black tiles with white edges, flipping a quarter turn at a time in a seamless loop.
- The bar moves to three quarters of the way down. ([78c5a31](https://github.com/onexmac/ad/commit/78c5a31) · [#76](https://github.com/onexmac/ad/pull/76))

## 0.5.1 · 2026-11-23 14:11

**Claude:** A newer version now only moves in once all of it is safely stored, so the app always opens, network or no network.

- A newer page only replaces the one kept on the device once its scripts are kept too, so the app always opens with no network. ([8ca7af5](https://github.com/onexmac/ad/commit/8ca7af5) · [#74](https://github.com/onexmac/ad/pull/74))

## 0.5.0 · 2026-11-23 14:05

**Claude:** Fixed the stutter in Safari, the occasional flicker and the dust that had stopped floating. The app also lives on your phone now, opening from the home screen without waiting for the network.

- **Bug fix.** Marcos, 23 Nov 13:49: Safari was "not as smooth as before", there was "a flicker sometimes", and "the dust stopped floating".
  - Causes:
    - the effects ran at full cost on every frame;
    - when the app lowered its resolution on a slow device, it resized the canvas after drawing, which leaves one blank frame;
    - the dust drifted at 2 to 4 px a second, which reads as still.
  - Don't: resize a canvas between drawing a frame and showing it. Check Safari's smoothness after adding an effect, and make anything meant to move move visibly.
- Kept on the device.
  - The page, the loading screen, the scripts and the room's photographs are stored, so the app opens from the home screen without waiting for the network.
  - It also gets a manifest and icons.
- Lighter to draw in Safari:
  - the light in the air is drawn at half resolution;
  - the depth of field takes 16 samples instead of 24;
  - colour fringing is only worked out toward the corners;
  - shadows are redrawn only while a puzzle moves.
- The occasional blank frame (a flicker) is gone.
- Dust floats again, as drifting sheets of specks instead of 14,000 particles. It shows only inside the beam. ([dcb63d2](https://github.com/onexmac/ad/commit/dcb63d2) · [#74](https://github.com/onexmac/ad/pull/74))

## 0.4.25 · 2026-11-23 13:47

**Claude:** A loading screen arrives: black, with one rounded bar filling in white until the room is ready. The look picker bows out, and the film look is the one that stays.

- A loading screen: black, with one bar with rounded ends filling in white.
  - It is in the page before any script arrives and keeps filling while the scene is built.
  - It lifts when the room has been drawn and every photograph is in.
- The A/B/C picker comes out and the app is look A. B and C stay at their addresses, unlisted. ([aca781b](https://github.com/onexmac/ad/commit/aca781b) · [#73](https://github.com/onexmac/ad/pull/73))

## 0.4.20 · 2026-11-23 11:29

**Claude:** A Ghost Cube joins the lineup: no two pieces alike and every sticker the same white outline, so you solve it by shape alone. (Good luck. We mean it.)

- A Ghost Cube rests behind the V, in its own hollow.
  - It is a 3×3 whose cuts are turned and set off centre, so no two pieces are alike.
  - Every sticker is the same white outline on black, so it is solved by shape alone.
  - It is picked up, turned, scrambled and put down like the others. ([73624e0](https://github.com/onexmac/ad/commit/73624e0) · [#72](https://github.com/onexmac/ad/pull/72))

## 0.4.15 · 2026-11-23 11:16

**Claude:** Fixed the painted looks that came off cheap and the fussy lines on faraway things. They're now true flat-colour cels, distant shelves read as simple shapes, and a picker switches looks.

- **Bug fix.** Marcos, 23 Nov 10:48: far away the lines were drawn "between the dent on far objects", and the anime look "looks like a cheap render".
  - Cause: lines were drawn at one threshold at every distance, and B and C were the photographic render under a filter.
  - Don't: draw the same line detail near and far, and don't make a painted look with a filter. It comes from flat materials.
- A look picker (A, B, C) as a pill at the bottom, only while choosing a puzzle. Changing the look keeps the puzzles and the camera as they were.
- B and C are painted as cels instead of filtered photographs.
  - Each surface is one flat colour with a single hard shadow tone tinted by the ambient light.
  - The sun comes through the blinds as one clean shape.
- The ink lines simplify with distance: far away a shelf of books is one shape, and creases are drawn only up close. ([bb59d11](https://github.com/onexmac/ad/commit/bb59d11) · [#71](https://github.com/onexmac/ad/pull/71))

## 0.4.12 · 2026-11-23 10:42

**Claude:** The focus had wandered off to the lounge chair's arm; fixed. The lens now stays on your puzzle and softens toward the sides, the way an old lens does.

- **Bug fix.** Marcos, 23 Nov 10:31, on the artifact: "This arm rest looks too sharp. Focus should be on the cube."
  - Cause: the lens blurred by depth alone, and the armrest was as far from the camera as the puzzle.
  - Don't: aim focus by depth alone. It goes where the eye should go.
- The lens stays on the puzzle. The focus also softens to its sides, as an old lens does away from its centre, so the lounge chair's arm at the edge no longer competes. ([e260d95](https://github.com/onexmac/ad/commit/e260d95) · [#70](https://github.com/onexmac/ad/pull/70))

## 0.4.10 · 2026-11-23 08:43

**Claude:** Fixed the made-up posters and covers that made the room feel cheap. The walls and shelves now carry real public-domain paintings, photographs and old magazine covers, all credited.

- **Bug fix.** Marcos, 23 Nov 07:20: the covers and posters drawn in code made the room "feel cheap".
  - Cause: generated art reads as fake, most of all on what faces the camera.
  - Don't: draw printed matter in code. Use real images, public domain and credited.
- Real printed matter instead of covers drawn in code. All of it is public domain or museum open access, and credited in `public/kit/axis-cube/tex/CREDITS.md`:
  - a WPA Federal Art Project poster behind a mat;
  - paintings by Hartley, Kandinsky, Mondrian and Freundlich;
  - photographs by Toni Frissell and William P. Gottlieb;
  - four magazine covers from 1894 to 1926.
- Under the hood: tests can run the motion without drawing it. ([b6e5e55](https://github.com/onexmac/ad/commit/b6e5e55) · [#69](https://github.com/onexmac/ad/pull/69))

## 0.4.7 · 2026-11-23 08:21

**Claude:** Three looks for the same room, each at its own address: a film photograph, an inked-and-painted one, and a cool night with an old print's specks.

- Three looks of the same room, each at its own address:
  - **A, analogue:** a film photograph, with depth of field on the puzzle in hand, halation, a trace of colour fringing, split toning and grain.
  - **B, brush:** inked and painted.
  - **C, classic:** night, with cool shadows against the warm lamps, more contrast, glow and an old print's specks. ([a7afda8](https://github.com/onexmac/ad/commit/a7afda8) · [#69](https://github.com/onexmac/ad/pull/69))

## 0.4.2 · 2026-11-22 22:52

**Claude:** The app's description catches up with the move: it now talks about the library and the ottoman, not the bed. (The bed had moved out; the paperwork hadn't heard.)

- The description, the screen-reader label and the portal entry speak of the library and the ottoman instead of the bed. ([7c569d7](https://github.com/onexmac/ad/commit/7c569d7) · [#68](https://github.com/onexmac/ad/pull/68))

## 0.4.1 · 2026-11-22 22:33

**Claude:** A little tidying: the plant steps out in front of the CD tower, and the Discman and its discs now sit where you can see them.

- The plant stands forward of the CD tower, and the Discman and discs sit inside the view from above. ([d5b0de3](https://github.com/onexmac/ad/commit/d5b0de3) · [#68](https://github.com/onexmac/ad/pull/68))

## 0.4.0 · 2026-11-22 22:13

**Claude:** Moving day: the bedroom becomes a mid-century home library in the nineties, with walnut shelves, a cognac lounge chair and an arc lamp. The puzzles now rest on the ottoman, denting its leather.

- The room becomes a mid-century home library in the nineties:
  - walnut shelving with books, records and compact discs;
  - a sideboard with the hi-fi under the window;
  - a cognac lounge chair and its ottoman;
  - an arc lamp and a glass mushroom lamp as the main lights, with a low, dim sun through the blinds.
- The puzzles rest on the ottoman's leather cushion, which dents under each one and rises again when a puzzle is picked up. ([3b7e30b](https://github.com/onexmac/ad/commit/3b7e30b) · [#68](https://github.com/onexmac/ad/pull/68))

## 0.3.14 · 2026-11-22 21:35

**Claude:** Fixed the dust that sparkled like fairy dust. It now hides until the sun catches it, then shows as tiny specks drifting on slow air, the way real dust does.

- **Bug fix.** Marcos, 22 Nov 21:22: the "dust cannot feel like fairy dust".
  - Cause: the specks were big, showed everywhere and glittered.
  - Don't: show dust outside the light. Real dust is a pixel or two, seen only where the sun crosses it.
- Dust that looks like dust instead of fairy dust.
  - It is invisible until the sun catches it, then specks of a pixel or two, brightest when the light comes toward the eye.
  - It hangs in uneven clouds and drifts on slow air, with a few flakes that turn and glint softly.
  - Specks near the lens are faint out-of-focus discs. ([70a4404](https://github.com/onexmac/ad/commit/70a4404) · [#68](https://github.com/onexmac/ad/pull/68))

## 0.3.12 · 2026-11-22 21:16

**Claude:** Flips felt random, and that's fixed: the puzzle now turns about its own axes, picked by the way you swipe, and lands on the next quarter turn with a little tick.

- **Bug fix.** Marcos, 22 Nov 20:52: "Flipping the cube should behave a little bit into its axis. Right now it feels too random."
  - Cause: it spun about whatever axis the finger drew, then snapped to the nearest square pose, so a slanted swipe landed on a face no one could predict.
  - Don't: spin a puzzle about a free axis. It turns about its own axes, picked by the swipe's first pixels.
- Flipping the puzzle turns it about its own axes. The swipe's first pixels pick the axis: sideways for the upright one, up or down for the one across.
- It follows the finger, coasts, ticks at each quarter and lands on the next quarter turn. The cross direction only wobbles and springs back.
- A tap is told from a hold on the hold's own clock, so a slow frame can't swallow a tap. ([d988a82](https://github.com/onexmac/ad/commit/d988a82) · [#67](https://github.com/onexmac/ad/pull/67))

## 0.3.10 · 2026-11-22 20:25

**Claude:** The TV is switched off, its blue flicker gone, leaving a dead grey-green tube under the glass. The VCR still blinks 12:00, because of course it does.

- The TV is off: a dead grey-green tube under reflective glass. The flickering blue light of the static is gone, and the VCR clock still blinks 12:00. ([08847ac](https://github.com/onexmac/ad/commit/08847ac) · [#66](https://github.com/onexmac/ad/pull/66))

## 0.3.9 · 2026-11-22 19:44

**Claude:** Tap a face of the puzzle in your hand and it turns to face you. Tap the one already in front and it just gives a little nudge.

- A tap on a face of the puzzle in hand turns that face to the front: of the 24 square poses, the one that turns it most toward you.
- Tapping the face already in front only nudges the puzzle. ([42f5ba0](https://github.com/onexmac/ad/commit/42f5ba0) · [#65](https://github.com/onexmac/ad/pull/65))

## 0.3.7 · 2026-11-22 19:31

**Claude:** Fixed the link that led nowhere: the app simply wasn't out yet. This is the version where it first went live, everything so far arriving at once.

- **Bug fix.** Marcos, 21 Nov 09:38: the magi0s link gave "404".
  - Cause: the app was still only on its branch (sim), and the portal serves `main`.
  - Don't: leave a portal link to be tried before the app is on `main`. Say up front where to look meanwhile.
- First on magi0s: everything up to here reaches `main`.
- No web font. The app shows no text that needs one, and fetching it at build time had failed several builds. ([6802c7e](https://github.com/onexmac/ad/commit/6802c7e) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.3.6 · 2026-11-21 19:53

**Claude:** Fixed putting the puzzle down by accident: it now takes a deliberate pull straight down. The washed-out blacks are fixed too, so the room is darker and its shadows truly dark.

- **Bug fix.** Marcos, 21 Nov 19:11: "Sliding down has to be more intentional", and the room needed "better blacks".
  - Cause: a fifth of the screen, even at a slant, put the puzzle down, so an ordinary spin could do it. And a faded-film veil lifted every black.
  - Don't: let a gesture that undoes something be reached by an ordinary one. And don't lift the blacks for a film look.
- Putting a puzzle down is deliberate: a pull straight down, across a third of the screen.
  - The first stretch is free, so an ordinary downward spin never starts it.
  - After that the puzzle sinks toward the bed, and letting go past the mark puts it down.
- A hold is a finger that stays put. Any drag cancels it and spins the puzzle instead.
- A darker room with real blacks:
  - less ambient light and a dimmer room lamp;
  - a black point and an S-curve on brightness only;
  - no grain in the shadows. ([30d901e](https://github.com/onexmac/ad/commit/30d901e) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.3.3 · 2026-11-21 16:22

**Claude:** Fixed the controls to match the puzzle in hand: nine rings in a grid for the bigger puzzles, four for the 2×2. The ring you touch lights up, then its whole row or column.

- **Bug fix.** Marcos, 21 Nov 16:09: "Two by two should have four dots. The others should have a 3x3 grid."
  - Cause: every puzzle got the same cross of rings, and the 2×2 only lost its middle one.
  - Don't: give every puzzle one layout. The controls follow the face of the puzzle in hand.
- The rings are a grid laid out like the puzzle's face: nine for the Axis Cube and the 3×3, four for the 2×2.
  - A sideways swipe turns the row it starts in; up or down turns the column.
  - The ring under the finger lights on touch, then its whole row or column lights while it turns.
- The grid sits lower, clear of the puzzles resting on the bed. ([b3fcf7c](https://github.com/onexmac/ad/commit/b3fcf7c) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.3.0 · 2026-11-21 13:35

**Claude:** Now there's a choice: three puzzles rest on the bed in a shallow V. Tap one to lift it into the light, and swipe straight down to put it back.

- Three puzzles rest on the bed in a shallow V: a 2×2, the Axis Cube and a classic 3×3. Each presses its own hollow in the duvet.
- A tap picks one up: it floats into the light, the camera drops to face it, and the rings fade in.
- A long swipe straight down puts it back, and the camera rises to choose again.
- The rings become a cross of five, and the 2×2 has no middle ring. ([a71e966](https://github.com/onexmac/ad/commit/a71e966) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.2.10 · 2026-11-21 11:44

**Claude:** The bed steps away from the wall, and sneakers, comics on the floor and a model plane move in. (Every room needs a model plane.)

- The bed stands off the wall, clear of the sill. Sneakers, comics on the floor and a model plane come in. ([87a270d](https://github.com/onexmac/ad/commit/87a270d) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.2.9 · 2026-11-21 11:31

**Claude:** Fixed the rings that had to be hit right on the dot. Each one now owns its whole row or column, so a swipe can start well away from the ring and still catch it.

- **Bug fix.** Marcos, 21 Nov 11:25: the rings had to be hit on the dot; "it's easier to start dragging from afar from the point".
  - Cause: each ring answered only in a small circle around it.
  - Don't: size a swipe control's hit area by its drawing. It runs the length of its swipe, generously.
- Each ring's reach runs along the way it is swiped. A layer ring owns its whole row, edge to edge, and a slice ring owns a tall column, so a swipe can start far from the ring.
- Where a row crosses a column, the first pixels of the swipe decide. ([fd97821](https://github.com/onexmac/ad/commit/fd97821) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.2.7 · 2026-11-21 11:25

**Claude:** The room is rebuilt at real size, smaller and fuller: a single bed under the window, records, a desk, a dresser and a backpack. It runs lighter, too, and the camera stays inside the walls.

- The room rebuilt at real scale: a 3.6 × 4.2 m bedroom with a 2.6 m ceiling, smaller and fuller.
  - A single bed under the window, a nightstand with the lava lamp, a taller shelf with LPs, a desk with drawers, a dresser.
  - A chair with a denim jacket, a crate of records, a backpack, sneakers and boxes under the bed.
- Draw calls drop from 339 to 106.
- The cube sits higher on a phone screen, and the camera stays inside the walls. ([3dd2d84](https://github.com/onexmac/ad/commit/3dd2d84) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.2.2 · 2026-11-21 11:24

**Claude:** Swiping on the cube spins it again; the rings had swallowed that gesture, and that's fixed. It coasts and settles square to the screen.

- **Bug fix.** Marcos, 21 Nov 11:17: "I should be able to rotate the cube by swiping in it just like before."
  - Cause: the ring controls of 0.2.0 took over the touch, and the swipe on the cube was lost with them.
  - Don't: let a new control take away a gesture that already worked. Retest the old gestures after every change to input.
- A swipe on the cube spins it. It follows the finger, coasts, and settles on the nearest of the 24 poses square to the screen.
- The camera leans a little into the spin. ([f9a77b7](https://github.com/onexmac/ad/commit/f9a77b7) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.2.0 · 2026-11-21 10:56

**Claude:** Out go the buttons, in come the rings: drag one to turn a layer, and it snaps to a quarter turn with a spring. Hold the cube to scramble or solve it in one go.

- Ring controls replace the buttons: six stroked rings, one column turning the horizontal layers and one row turning the vertical slices.
  - A turn follows the finger, keeps its momentum and snaps onto the nearest quarter turn with a spring.
  - A strong flick can travel several quarters.
- Holding the cube opens it, then scrambles or solves it in one go.
- The cube faces the camera square, so the rings' layers are the ones you see. ([cd7c74c](https://github.com/onexmac/ad/commit/cd7c74c) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.16 · 2026-11-21 10:42

**Claude:** Fixed the floating pillow. The bed is now soft cloth, a quilted duvet in folds, and whatever rests on it sinks in a little, the record and its sleeve included.

- **Bug fix.** Marcos, 21 Nov 10:35: "la almohada parece que flota", and things set on the bed should press it down.
  - Cause: the bed was hard shapes, and things were set on top of them with no contact.
  - Don't: rest anything on something soft without sinking it in. Check every contact up close.
- The bed is rebuilt as cloth: one quilted duvet that wraps the mattress, hangs in folds and is turned back at the head.
- Things set on it press it down: the record and its sleeve settle into hollows, and the pillow no longer floats.
- The hanging plant by the window is gone. ([9a432c7](https://github.com/onexmac/ad/commit/9a432c7) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.14 · 2026-11-21 10:28

**Claude:** The room gets lived in: cream walls, old floorboards, sun striping through half-open blinds, plants, a record on the bed and a skateboard on the wall.

- A lived-in room, from new references.
  - Cream plaster walls and an old board floor.
  - Half-open venetian blinds let the sun in striped, with a soft tree outside.
- Things lying around: plants, album sleeves and a record on the bed, a skateboard on the wall, snapshots above the desk, headphones on the chair. ([26626fe](https://github.com/onexmac/ad/commit/26626fe) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.11 · 2026-11-21 10:15

**Claude:** It's always dusk now; the daytime look and its switch are gone. More little things turn up too: cassettes, a notebook and pencils, a braided rug.

- Dusk only: the day look and its toggle are gone.
- More of the room is modelled: a real pillow, finials on the headboard, cloth-bound books, cassettes, a notebook and pencils, a light switch, a braided rag rug. ([699df0f](https://github.com/onexmac/ad/commit/699df0f) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.9 · 2026-11-21 10:07

**Claude:** Real wood, wool, cotton and carpet from photographs, plus softer furniture edges, a blanket that falls in folds and a TV with a bulging glass face.

- Photo textures (Poly Haven, CC0): cedar, mahogany, wool, cotton and carpet.
- Finer modelling: chamfered furniture, a blanket that falls in folds, and a CRT with a bulging glass face. ([1a07eab](https://github.com/onexmac/ad/commit/1a07eab) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.6 · 2026-11-21 09:57

**Claude:** Toned down the sunbeam, which was too strong and too magical, and the dust in it sparkles a lot less.

- **Bug fix.** Marcos, 21 Nov 09:55: "Muy mágico se siente el rayo de sol, muy fuerte."
  - Cause: the shafts of light were dense, and the dust glittered in them.
  - Don't: push an effect past what real light does. Light in the air is faint, and dust doesn't sparkle.
- A quieter sunbeam, and fewer sparkles in the dust. ([b9a2993](https://github.com/onexmac/ad/commit/b9a2993) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.5 · 2026-11-20 21:46

**Claude:** The room fills up: wood paneling, a shelf of VHS tapes, a TV on a VCR, a lava lamp, a boombox and posters, all in the glow of a warm lamp.

- A fuller, more realistic room:
  - varnished paneling and crown moulding;
  - a shelf of VHS tapes with a globe;
  - a desk with the TV on a VCR, the lava lamp and a boombox;
  - posters and a polaroid.
- A warm lamp with shadows, ambient occlusion, and a warm grade. ([423b3e2](https://github.com/onexmac/ad/commit/423b3e2) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.0 · 2026-11-20 21:30

**Claude:** Where it all began: a single Axis Cube floating in a room at dusk, the scene Marcos sent, given a home in the portal.

- First version, as Axis Cube: a floating Axis Cube in a dusk room. It is the scene Marcos sent, moved into the portal at /kit/axis-cube. ([7cef55c](https://github.com/onexmac/ad/commit/7cef55c) · [#64](https://github.com/onexmac/ad/pull/64))
