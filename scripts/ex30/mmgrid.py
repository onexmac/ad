#!/usr/bin/env python3
# mmgrid.py <img> <cam.json> <plane axis> <plane value> <x0> <y0> <x1> <y1> <zoom> <step mm> <out> [gamma]
# Crops a region of a photo, enlarges it and draws a grid in car millimetres on a plane of the car frame (y=const: grid in x,z; x=const: grid in y,z; z=const: grid in x,y).
import sys, json, numpy as np
from PIL import Image, ImageDraw, ImageFont
from cam import Cam
img, camf, axis, val = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
x0, y0, x1, y1 = map(int, sys.argv[5:9]); zoom = float(sys.argv[9]); step = int(sys.argv[10]); out = sys.argv[11]
gamma = float(sys.argv[12]) if len(sys.argv) > 12 else 1.0
cam = Cam.from_json(json.load(open(camf)))
im = Image.open(img).convert('RGB')
sc = im.size[0] / cam.W
c = im.crop((int(x0*sc), int(y0*sc), int(x1*sc), int(y1*sc)))
if gamma != 1.0:
    a = np.asarray(c).astype(np.float32) / 255.0; c = Image.fromarray((np.power(a, gamma) * 255).astype(np.uint8))
c = c.resize((int((x1-x0)*zoom), int((y1-y0)*zoom)), Image.LANCZOS)
d = ImageDraw.Draw(c, 'RGBA'); f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11)
others = [a for a in 'xyz' if a != axis]
# range of the plane coordinates seen in the crop
corners = [cam.unproject_plane(px, py, axis, val) for px in (x0, x1) for py in (y0, y1)]
lo = {a: min(p['xyz'.index(a)] for p in corners) for a in others}; hi = {a: max(p['xyz'.index(a)] for p in corners) for a in others}
def P(a_val, b_val):
    p = [0, 0, 0]; p['xyz'.index(axis)] = val; p['xyz'.index(others[0])] = a_val; p['xyz'.index(others[1])] = b_val
    q = cam.project([p])[0]; return ((q[0]-x0)*zoom, (q[1]-y0)*zoom)
cols = [(255, 255, 0), (0, 255, 255)]
for k, a in enumerate(others):
    b = others[1-k]
    v = np.ceil(lo[a]/step)*step
    while v <= hi[a]:
        pts = []
        for t in np.linspace(lo[b], hi[b], 40):
            pts.append(P(v, t) if k == 0 else P(t, v))
        major = (int(round(v)) % (step*5) == 0)
        d.line(pts, fill=cols[k] + ((170,) if major else (85,)), width=1)
        # label near the crop edge
        for t in np.linspace(lo[b], hi[b], 200):
            p = P(v, t) if k == 0 else P(t, v)
            if 14 < p[0] < c.size[0]-30 and 4 < p[1] < c.size[1]-14:
                if (k == 0 and p[1] < 40) or (k == 1 and p[0] < 60) or (k==0 and b=='z' and p[1] > c.size[1]-40):
                    d.rectangle([p[0]+1, p[1]+1, p[0]+34, p[1]+13], fill=(0, 0, 0, 170)); d.text((p[0]+2, p[1]+1), str(int(round(v))), fill=cols[k], font=f); break
        v += step
c.save(out, quality=90); print(out, c.size, {a: (round(lo[a]), round(hi[a])) for a in others})
