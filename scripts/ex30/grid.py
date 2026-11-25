#!/usr/bin/env python3
# grid.py <img> <x0> <y0> <x1> <y1> <zoom> <step> <out> : crop a region, enlarge, draw a labelled pixel grid in source coordinates
import sys
from PIL import Image, ImageDraw, ImageFont
img,x0,y0,x1,y1,zoom,step,out=sys.argv[1],*map(float,sys.argv[2:8]),sys.argv[8]
im=Image.open(img).convert('RGB')
x0,y0,x1,y1=int(x0),int(y0),int(x1),int(y1)
c=im.crop((x0,y0,x1,y1)); c=c.resize((int(c.size[0]*zoom),int(c.size[1]*zoom)),Image.LANCZOS)
d=ImageDraw.Draw(c,'RGBA')
try: f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
except Exception: f=ImageFont.load_default()
step=int(step)
gx=(x0//step+1)*step
while gx<x1:
    X=(gx-x0)*zoom; major=(gx%(step*5)==0)
    d.line([(X,0),(X,c.size[1])],fill=(255,255,0,150 if major else 70),width=1)
    d.rectangle([X+1,1,X+30,13],fill=(0,0,0,150)); d.text((X+2,1),str(gx),fill=(255,255,0),font=f)
    gx+=step
gy=(y0//step+1)*step
while gy<y1:
    Y=(gy-y0)*zoom; major=(gy%(step*5)==0)
    d.line([(0,Y),(c.size[0],Y)],fill=(0,255,255,150 if major else 70),width=1)
    d.rectangle([1,Y+1,30,Y+13],fill=(0,0,0,150)); d.text((2,Y+1),str(gy),fill=(0,255,255),font=f)
    gy+=step
c.save(out,quality=90); print(out,c.size)
