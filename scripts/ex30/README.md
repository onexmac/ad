# EX30: how the body is traced

The car in `lib/ex30/model` is not modelled by eye. Its lines are measured on photographs whose cameras have been
solved, so a pixel can be read as millimetres on the car.

## The car's frame

Millimetres. `x` runs back from the front axle, `y` to the car's right, `z` up from the ground. Volvo's published
figures fix the box: 4233 long, 1836 wide (2032 with mirrors), 1549 high, 2650 between the axles, tracks 1590 / 1595.

## Solving a photograph's camera

`cam.py` is a pinhole camera in that frame (`Cam`: position, yaw, pitch, roll, focal length in pixels) with a small
Nelder-Mead fitter. A camera is solved from what is known on the car:

- **A square side view** (`cams/heico-side.json`): the two hubs and the two tyres' contact points, 2650 apart.
- **Three-quarter views** (`cams/dubai-front34.json`, `cams/dubai-rear34.json`): the bright edge of each wheel's rim,
  found as an ellipse (`ring.py`, `fitrings.py`), fitted as a circle of radius about 258 mm at hub height 340 on each
  axle. The roof line and the tailgate lettering were added as weak constraints where the rims alone left the
  height loose. Heights read from these are good to about ±2 to 3 cm.

## Reading and checking

- `mmgrid.py` draws a grid in car millimetres on a plane of the car (y = const for a flank) over a crop of the
  photograph: the profile, glass, doors and arches were read off these.
- `grid.py` draws a plain pixel grid, for picking points to cast onto the model.
- `overlay.py` lays the model's part edges, rendered from a solved camera, over the photograph. Every change to the
  body is checked this way before it ships: trace the reference, don't tune toward a likeness.

## The photographs

From Wikimedia Commons, category *Volvo EX30* (not committed here: each keeps its own licence and author):

- side, square on: *Heico EX30, EMS 2024, Essen (P1031597).jpg*. A tuned car on lowered suspension and 20-inch
  wheels: its body lines are stock, its ride height is not.
- three-quarters, stock: *Volvo EX30 Plus – f 08032025.jpg* and *Volvo EX30 Plus – h 08032025.jpg*
- front and rear, square on: *Volvo EX30 Ultra SEA Crystal White (4).jpg* and *(6).jpg*
- the 19-inch wheel: *Volvo EX30 Ultra SEA Crystal White (22).jpg* and *(23).jpg*

The scripts expect them as `ref/hi/NNN.jpg` (or wherever `EX30_REF` points), 1920 px wide.
