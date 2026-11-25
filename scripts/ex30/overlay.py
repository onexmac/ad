#!/usr/bin/env python3
# overlay.py <photo> <render.png> <out.jpg> [x0 y0 x1 y1 zoom] : the model's part edges drawn over the photo (and a faint tint)
import sys, numpy as np
from PIL import Image
photo, render, out = sys.argv[1:4]
ph = Image.open(photo).convert('RGB'); rd = Image.open(render).convert('RGBA')
if rd.size != ph.size: rd = rd.resize(ph.size, Image.NEAREST)
P = np.asarray(ph).astype(np.float32); R = np.asarray(rd).astype(np.int32)
key = (R[..., 0] >> 3) * 1024 * 33 + (R[..., 1] >> 3) * 33 * 31 + (R[..., 2] >> 3) * 31 + (R[..., 3] > 128) * 7
e = np.zeros(key.shape, bool)
e[:, 1:] |= key[:, 1:] != key[:, :-1]; e[1:, :] |= key[1:, :] != key[:-1, :]
alpha = (R[..., 3:4] > 128).astype(np.float32)
tint = P * (1 - 0.22 * alpha) + R[..., :3].astype(np.float32) * 0.22 * alpha
tint[e] = [255, 255, 0]
im = Image.fromarray(np.clip(tint, 0, 255).astype(np.uint8))
if len(sys.argv) > 4:
    x0, y0, x1, y1 = map(int, sys.argv[4:8]); z = float(sys.argv[8]) if len(sys.argv) > 8 else 1
    im = im.crop((x0, y0, x1, y1)); im = im.resize((int(im.size[0] * z), int(im.size[1] * z)), Image.LANCZOS)
im.save(out, quality=88); print(out, im.size)
