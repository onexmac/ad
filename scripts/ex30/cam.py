# Pinhole camera tools. Car frame (mm): x rearward from the front axle, y to the car's right, z up from the ground.
import numpy as np, json, math

def rot(yaw, pitch, roll):
    """Camera basis for a camera that, at yaw=pitch=roll=0, looks along -y with +z up (so image-right is -x: the car's front).
    yaw turns the view about z (positive: looks toward +x, the rear), pitch>0 looks down, roll about the view axis."""
    f0 = np.array([0.0, -1.0, 0.0]); u0 = np.array([0.0, 0.0, 1.0])
    cz, sz = math.cos(yaw), math.sin(yaw)
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1.0]])
    f = Rz @ f0
    r = np.cross(f, u0); r /= np.linalg.norm(r)
    # pitch: rotate f downward about r
    cp, sp = math.cos(pitch), math.sin(pitch)
    f2 = f * cp - u0 * sp
    u2 = np.cross(r, f2)
    cr, sr = math.cos(roll), math.sin(roll)
    r3 = r * cr + u2 * sr
    u3 = -r * sr + u2 * cr
    return r3, u3, f2

class Cam:
    keys = ['cx', 'cy', 'cz', 'yaw', 'pitch', 'roll', 'f']
    def __init__(self, cx, cy, cz, yaw, pitch, roll, f, W, H, px=None, py=None):
        self.p = dict(cx=cx, cy=cy, cz=cz, yaw=yaw, pitch=pitch, roll=roll, f=f)
        self.W, self.H = W, H
        self.px = W / 2 if px is None else px; self.py = H / 2 if py is None else py
    def basis(self):
        return rot(self.p['yaw'], self.p['pitch'], self.p['roll'])
    def project(self, P):
        P = np.atleast_2d(np.asarray(P, float))
        r, u, f = self.basis()
        d = P - np.array([self.p['cx'], self.p['cy'], self.p['cz']])
        zc = d @ f
        x = self.px + self.p['f'] * (d @ r) / zc
        y = self.py - self.p['f'] * (d @ u) / zc
        return np.stack([x, y, zc], 1)
    def ray(self, px, py):
        r, u, f = self.basis()
        d = f + r * (px - self.px) / self.p['f'] - u * (py - self.py) / self.p['f']
        return np.array([self.p['cx'], self.p['cy'], self.p['cz']]), d / np.linalg.norm(d)
    def unproject_plane(self, px, py, axis, value):
        o, d = self.ray(px, py); i = 'xyz'.index(axis)
        t = (value - o[i]) / d[i]
        return o + d * t
    def to_json(self):
        return dict(self.p, W=self.W, H=self.H, px=self.px, py=self.py)
    @staticmethod
    def from_json(j):
        return Cam(j['cx'], j['cy'], j['cz'], j['yaw'], j['pitch'], j['roll'], j['f'], j['W'], j['H'], j.get('px'), j.get('py'))

def nelder_mead(fn, x0, step, iters=4000, tol=1e-10):
    n = len(x0); sim = [np.array(x0, float)]
    for i in range(n):
        v = np.array(x0, float); v[i] += step[i]; sim.append(v)
    fs = [fn(v) for v in sim]
    for it in range(iters):
        o = np.argsort(fs); sim = [sim[i] for i in o]; fs = [fs[i] for i in o]
        if abs(fs[-1] - fs[0]) < tol * (abs(fs[0]) + 1e-12): break
        c = np.mean(sim[:-1], axis=0)
        xr = c + (c - sim[-1]); fr = fn(xr)
        if fr < fs[0]:
            xe = c + 2 * (c - sim[-1]); fe = fn(xe)
            if fe < fr: sim[-1], fs[-1] = xe, fe
            else: sim[-1], fs[-1] = xr, fr
        elif fr < fs[-2]: sim[-1], fs[-1] = xr, fr
        else:
            xc = c + 0.5 * (sim[-1] - c); fc = fn(xc)
            if fc < fs[-1]: sim[-1], fs[-1] = xc, fc
            else:
                for i in range(1, n + 1):
                    sim[i] = sim[0] + 0.5 * (sim[i] - sim[0]); fs[i] = fn(sim[i])
    i = int(np.argmin(fs)); return sim[i], fs[i]

def fit(cam, corr, free=('cx', 'cy', 'cz', 'yaw', 'pitch', 'roll', 'f'), priors=None, restarts=3):
    """corr: list of (P3d, (px,py), weight). priors: dict key -> (value, sigma) on camera params (in px-equivalent via 1/sigma)."""
    P = np.array([c[0] for c in corr], float); uv = np.array([c[1] for c in corr], float)
    w = np.array([c[2] if len(c) > 2 else 1.0 for c in corr])
    free = list(free); priors = priors or {}
    def cost(v):
        for k, val in zip(free, v): cam.p[k] = val
        q = cam.project(P)
        if np.any(q[:, 2] <= 0): return 1e12
        e = ((q[:, :2] - uv) ** 2).sum(1) * w
        c = e.sum()
        for k, (val, sig) in priors.items(): c += ((cam.p[k] - val) / sig) ** 2
        return c
    scale = dict(cx=300, cy=300, cz=150, yaw=0.05, pitch=0.03, roll=0.01, f=300)
    best = None
    for r in range(restarts):
        v0 = [cam.p[k] for k in free]
        v, c = nelder_mead(cost, v0, [scale[k] / (r + 1) for k in free])
        for k, val in zip(free, v): cam.p[k] = val
        best = c
    q = cam.project(P); res = np.sqrt(((q[:, :2] - uv) ** 2).sum(1))
    return best, res
