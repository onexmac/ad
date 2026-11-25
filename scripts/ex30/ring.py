# Finds a wheel's bright rim ring in a photo: rays out from a guessed centre, the outermost bright pixel on each, an ellipse through them.
import numpy as np, sys, json
from PIL import Image, ImageDraw
def fit_ellipse(pts):
    x=pts[:,0]; y=pts[:,1]; mx,my=x.mean(),y.mean(); x=x-mx; y=y-my
    D=np.stack([x*x,x*y,y*y,x,y,np.ones_like(x)],1)
    _,_,Vt=np.linalg.svd(D,full_matrices=False); a=Vt[-1]
    A,B,C,Dd,E,F=a
    den=B*B-4*A*C
    cx=(2*C*Dd-B*E)/den; cy=(2*A*E-B*Dd)/den
    num=2*(A*E*E+C*Dd*Dd-B*Dd*E+den*F)
    s=np.sqrt((A-C)**2+B*B)
    a1=-np.sqrt(num*(A+C+s))/den; a2=-np.sqrt(num*(A+C-s))/den
    th=0.5*np.arctan2(-B, C-A)
    return cx+mx, cy+my, max(a1,a2), min(a1,a2), th, (A,B,C,Dd,E,F,mx,my)
def ring(img, cx, cy, rx, ry, thr=None, out=None, rmin=0.75, rmax=1.18, inner=False):
    g=np.asarray(Image.open(img).convert('L')).astype(np.float32)
    pts=[]
    for k in range(360):
        t=k*np.pi/180; c,s=np.cos(t),np.sin(t)
        rr=np.linspace(rmin,rmax,160)
        xs=cx+rx*rr*c; ys=cy+ry*rr*s
        xi=np.clip(xs.round().astype(int),0,g.shape[1]-1); yi=np.clip(ys.round().astype(int),0,g.shape[0]-1)
        v=g[yi,xi]
        th_=thr if thr is not None else (v.min()+v.max())/2
        if v.max()-v.min()<40: continue
        idx=np.where(v>th_)[0]
        if len(idx)==0: continue
        i=idx[0] if inner else idx[-1]
        if (i==len(v)-1 and not inner) or (i==0 and inner): continue
        pts.append((xs[i],ys[i]))
    pts=np.array(pts)
    for it in range(3):
        ex,ey,a,b,th,co=fit_ellipse(pts)
        # reject outliers by algebraic residual
        A,B,C,Dd,E,F,mx,my=co; x=pts[:,0]-mx; y=pts[:,1]-my
        r=np.abs(A*x*x+B*x*y+C*y*y+Dd*x+E*y+F); keep=r<np.percentile(r,85)
        if keep.sum()<30: break
        pts=pts[keep]
    ex,ey,a,b,th,co=fit_ellipse(pts)
    if out:
        im=Image.open(img).convert('RGB'); d=ImageDraw.Draw(im)
        for p in pts: d.point((p[0],p[1]),fill=(255,0,0))
        e=[(ex+a*np.cos(t)*np.cos(th)-b*np.sin(t)*np.sin(th), ey+a*np.cos(t)*np.sin(th)+b*np.sin(t)*np.cos(th)) for t in np.linspace(0,2*np.pi,200)]
        d.line(e,fill=(0,255,0),width=1)
        m=int(max(rx,ry)*1.5); im=im.crop((int(cx-m),int(cy-m),int(cx+m),int(cy+m))); im=im.resize((im.size[0]*2,im.size[1]*2),Image.LANCZOS); im.save(out,quality=88)
    return dict(cx=float(ex),cy=float(ey),a=float(a),b=float(b),th=float(th),n=int(len(pts)))
