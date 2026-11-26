# EX30: changelog

EX30 lives at [/kit/ex30](https://magi0s.vercel.app/kit/ex30): Marcos's Volvo EX30 in 3D, traced from photographs, as
the base for designing a livery for it. How the body is traced: `scripts/ex30/README.md`.

## How versions are numbered

Every push to Vercel that changes the app gets an entry here. The first push was 0.1.0, and each version after it
jumps by how big its push was:

| Jump | When |
| :--- | :--- |
| +0.0.1 | a small change |
| +0.0.2 or +0.0.3 | a bigger one |
| +0.0.5 | a big one |
| +0.1.0 | one too big for that (the last number goes back to 0) |
| +0.5.0 | only something massive |
| 1.0.0 | a milestone Marcos names |

Each entry gives the date and time in Costa Rica and what changed. An entry that fixes a bug Marcos reported starts
with it: his words, the cause, and what not to do.

## Bugs Marcos reported

None yet.

Open (seen in QA, not reported):

- A short jagged edge where the gloss black of the A-pillar meets the paint at the windscreen's foot.
- A faint ripple in the reflections on the front wing just above the arch, where the arch's flare fades out.
- The rear tyres show a dark sliver where they meet the floor's soft shadow at some angles.
- Wheels: the 19-inch five-spoke is built; which wheel Marcos's car has is still to come (he will send a photo).
- Ride height comes from the published figures and stock photographs, not from Marcos's own car.

## 0.1.0 · 2026-11-25 14:46

- **The car.** A Volvo EX30 (standard body, not the Cross Country), built in the browser from traced lines, about
  450,000 triangles:
  - The body is one solid: the sides, the top (bonnet, windscreen, roof), the nose, the tail and the floor, each a
    surface traced from photographs, meeting in rounded edges. Its box is Volvo's: 4233 × 1836 × 1549 mm, 2650
    between the axles.
  - The skin is cut into its parts along traced outlines: paint, the gloss-black roof, pillars and mirror caps, the
    glass (windscreen, door glass with the quarter light's bar, rear window), the black cladding (sills, arch lips,
    lower nose and tail), the lamp lenses, the gloss band across the nose and the black lines either side of the
    tailgate's body-colour panel.
  - Panel lines: the doors, the bonnet's edge with its step down the wing, the bumpers, the tailgate, the charging
    flap on the left rear wing.
  - Bolted on: the roof spoiler over the rear window, the mirrors, the flush door handles, the iron mark on the nose,
    the lettering on the tailgate, blank Costa Rican-size plates, wheel-arch liners.
  - Lamps: the "Thor's hammer" daytime lights (the blade's bar in segments and the stack down the corner), the tail
    lamps (the bars up the pillars beside the rear window and round the lower corners), each behind a lens over a
    dark housing.
  - The 19-inch five-spoke aero wheel and its 245/45 R19 tyre: bright paddles, gloss-black blades, the pockets
    behind them, the hub cap, the brake disc behind.
  - A plain cabin seen through the glass: dashboard, the tall centre screen, steering wheel on the left, seats,
    console, load cover.
- **How it was traced.** Three photographs' cameras were solved against the car's known dimensions (one square side
  view from its hubs, two three-quarter views from the ellipses of their wheel rims), so lines could be read off them
  in millimetres; the model was then laid back over each photograph to check its outlines.
- **The viewer.** The car in a studio, in a vvs frame (technical minimalism): the stage on top, the controls below.
  - Drag to turn the car, pinch or scroll to come closer, two fingers to slide; a double tap goes back to the opening
    view.
  - Paint: the six factory colours, Onyx Black by default (Marcos's). Matched by eye to photographs, not Volvo's own
    values.
  - Views: 3/4, front, side, rear three-quarters, top, each flown to round the car. A key turns the lamps on and off.
  - A loading screen whose bar follows the build.
