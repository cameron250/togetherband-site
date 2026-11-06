# Builds assets/img/bands/*.png cutouts and cord/clasp masks from product photos
# extracted (with their alpha masks) from the partner deck PDFs into ./cut/.
# Mask PNGs: red channel = cord, green channel = clasp or charm.
import colorsys, sys
from PIL import Image
OUT='/home/user/togetherband-site/assets/img/bands/'
bases={'classic-polished':'lg-38','classic-gold':'lg-64','mini-gold':'lg-8','mini-polished':'lg-25','heart':'uf-224'}
for key,src in bases.items():
    im=Image.open('cut/'+src+'.png').convert('RGBA')
    px=im.load(); w,h=im.size
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if a<40: px[x,y]=(0,0,0,0)
    im=im.crop(im.getbbox())
    im.thumbnail((760,760),Image.LANCZOS)
    w,h=im.size; px=im.load()
    m=Image.new('RGB',(w,h)); mp=m.load()
    if key=='heart':
        cx=w//2; ys=[]
        for xx in (int(cx-w*0.07),int(cx+w*0.07)):
            y=int(h*0.7)
            while y<h and px[xx,y][3]<120: y+=1
            y0=y
            while y<h and px[xx,y][3]>=120: y+=1
            ys.append((y0,y))
        c0=min(a for a,b in ys); c1=max(b for a,b in ys)
        print('cord band',c0,c1,h)
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if a==0: continue
            hh,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255); hd=hh*360
            if key=='heart':
                clasp = (y>c1 and abs(x-w/2)<w*0.14) or (y>=c0-10 and abs(x-w/2)<w*0.019)
            else:
                red = (hd>330 or hd<14) and s>0.32
                darkred = v<0.35 and (hd>320 or hd<25)
                inbox = y>h*0.72 and abs(x-w*0.5)<w*0.2 if key.startswith('mini') else (y>h*0.6 and x>w*0.28 and x<w*0.68)
                clasp = inbox and not red and not darkred
            if clasp: mp[x,y]=(0,a,0)
            else: mp[x,y]=(a,0,0)
    im.save(OUT+key+'.png',optimize=True); m.save(OUT+key+'-m.png',optimize=True)
    print(key,im.size)
