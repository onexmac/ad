import numpy as np, json, math, sys
from cam import Cam, nelder_mead
import ring as R
from PIL import Image
import os
S = os.environ.get('EX30_REF', 'ref')  # the folder that holds hi/NNN.jpg: the photographs listed in README.md
def ringpts(img, cx, cy, rx, ry, **kw):
    g=np.asarray(Image.open(img).convert('L')).astype(np.float32); pts=[]
    rmin=kw.get('rmin',0.75); rmax=kw.get('rmax',1.18)
    for k in range(360):
        t=k*np.pi/180; c,s=np.cos(t),np.sin(t); rr=np.linspace(rmin,rmax,160)
        xs=cx+rx*rr*c; ys=cy+ry*rr*s
        xi=np.clip(xs.round().astype(int),0,g.shape[1]-1); yi=np.clip(ys.round().astype(int),0,g.shape[0]-1); v=g[yi,xi]
        if v.max()-v.min()<40: continue
        idx=np.where(v>(v.min()+v.max())/2)[0]
        if len(idx)==0 or idx[-1]==len(v)-1: continue
        pts.append((xs[idx[-1]],ys[idx[-1]]))
    pts=np.array(pts)
    for it in range(3):
        ex,ey,a,b,th,co=R.fit_ellipse(pts); A,B,C,Dd,E,F,mx,my=co; x=pts[:,0]-mx; y=pts[:,1]-my
        r=np.abs(A*x*x+B*x*y+C*y*y+Dd*x+E*y+F); pts=pts[r<np.percentile(r,85)]
    return pts
def circle(xw, yw, zh, r, n=240):
    t=np.linspace(0,2*np.pi,n,endpoint=False); return np.stack([xw+r*np.cos(t), np.full(n,yw), zh+r*np.sin(t)],1)
def fitcam(name, W, H, rings, init, extra=None, zh=340, rr=258.5, fs=(2200,3000,4200)):
    best=None
    def cost_for(cam):
        c=0
        for pts,(xw,yw) in rings:
            q=cam.project(circle(xw,yw,zh,rr))
            if np.any(q[:,2]<=0): return 1e12
            d=((pts[:,None,:]-q[None,:,:2])**2).sum(2).min(1); c+=d.sum()
        if extra:
            for P,uv,w in extra:
                q=cam.project([P])[0]; c+=w*((q[0]-uv[0])**2+(q[1]-uv[1])**2)
        c+=(cam.p['roll']/0.03)**2
        return c
    keys=['cx','cy','cz','yaw','pitch','roll','f']
    for f0 in fs:
        for sc in (0.8,1.0,1.3):
            cam=Cam(1325+(init[0]-1325)*sc, init[1]*sc, init[2], init[3], 0.1, 0.0, f0*sc, W, H)
            def fn(v):
                for k,val in zip(keys,v): cam.p[k]=val
                return cost_for(cam)
            v=[cam.p[k] for k in keys]
            for rs in range(5):
                v,c=nelder_mead(fn,v,[300/(rs+1),300/(rs+1),150/(rs+1),0.05/(rs+1),0.03/(rs+1),0.01/(rs+1),300/(rs+1)])
            if best is None or c<best[0]: best=(c,dict(zip(keys,[float(x) for x in v])))
    n=sum(len(p) for p,_ in rings)
    cam=Cam(W=W,H=H,**best[1])
    print(name,'rms px',round(math.sqrt(best[0]/n),2),{k:round(v,4) for k,v in best[1].items()})
    json.dump(cam.to_json(),open('cam%s.json'%name,'w')); return cam
