"""Draw native 480×270, deterministic regional underwater scenery."""
from math import sin
from pathlib import Path
from random import Random
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets"
W, H = 480, 270
# Surface light, deep water, pale and dark bottom. Keep the mid-water fight area clear.
PAL = {
    "harbor": ((51,141,140),(15,66,84),(84,114,106),(36,69,71)),
    "cove": ((56,155,156),(22,87,105),(153,150,108),(77,108,104)),
    "reef": ((43,137,151),(11,65,98),(92,104,103),(32,65,75)),
    "current": ((49,121,155),(10,53,95),(85,111,120),(40,63,86)),
    "pool": ((72,143,128),(21,73,69),(111,119,86),(46,79,67)),
    "stream": ((66,145,133),(23,79,90),(114,123,105),(51,87,88)),
    "marsh": ((77,133,110),(26,62,59),(123,116,80),(52,73,57)),
    "cave": ((37,94,102),(12,32,54),(70,82,93),(32,44,63)),
    "canal": ((77,142,119),(26,73,73),(120,125,96),(52,83,78)),
    "backwater": ((87,143,112),(28,72,66),(130,127,87),(51,80,64)),
    "wetland": ((65,134,113),(22,65,69),(101,118,89),(45,75,66)),
}
def mix(a, b, t):
    return tuple(round(x+(y-x)*t) for x,y in zip(a,b))
def draw(theme, colors):
    rng = Random(theme + '-water')
    top, deep, pale, dark = colors
    im = Image.new('RGB',(W,H))
    d = ImageDraw.Draw(im)
    def rock(x,y,w,h,gray=None):
        col=gray or pale
        shade=mix(col,dark,.63)
        points=[(x,y),(x+w//9,y-h*2//3),(x+w*4//9,y-h),(x+w*7//9,y-h*4//5),(x+w,y-h//3),(x+w*8//9,y),(x+w//4,y+2)]
        d.polygon(points,fill=shade)
        d.polygon(points[1:5]+[(x+w*6//9,y-h//3),(x+w//3,y-h//4)],fill=col)
        d.line(points[1:4],fill=mix(col,top,.3),width=1)
        d.line([(x+w*4//9,y-h),(x+w*6//9,y-h//3),(x+w*5//9,y-2)],fill=mix(col,dark,.34),width=1)
        for _ in range(max(2,w*h//42)):
            xx=rng.randrange(x+3,x+w-2); yy=rng.randrange(y-h+2,y)
            if 0<=xx<W and 0<=yy<H and im.getpixel((xx,yy)) in (shade,col):
                d.line((xx,yy,xx+rng.randint(0,2),yy), fill=mix(col,dark,rng.choice((.18,.3,.46,.74))),width=1)
    def plant(x,y,h,flip=1,kind='reed'):
        green=mix((58,105,62),top,.25)
        leaf=mix(green,deep,.19)
        for stem in range(3):
            tips=[(x+stem*3+round(sin(i/6+stem)*i*.11)*flip, y-i) for i in range(0,h-stem*5,3)]
            if not tips: continue
            d.line(tips,fill=mix(leaf,dark,stem*.2),width=1 if stem else 2)
            for i in range(3,len(tips),3):
                xx,yy=tips[i];side=(-1 if i%2 else 1)*flip;length=rng.randint(5,10)
                if kind=='round':
                    d.ellipse((xx-4+side*4,yy-5,xx+4+side*4,yy),fill=green)
                else:
                    d.polygon([(xx,yy),(xx+side*length,yy-7),(xx+side*(length-2),yy-3)], fill=green)
    for y in range(0,H,2):
        t=min(1,y/212)**.75
        d.rectangle((0,y,W,y+1),fill=mix(top,deep,t))
    # Layered distant silhouettes and faint, sparse refracted traces.
    for i in range(6):
        x=round(i*(W+60)/5)-22
        if theme not in ('cave','harbor'):
            d.polygon([(x,0),(x+13,0),(x+81,143),(x+76,143)],fill=mix(top,deep,.38))
    for _ in range(97):
        x=rng.randrange(W);y=rng.randrange(2,204)
        c=im.getpixel((x,y))
        d.line((x,y,x+rng.randint(0,6),y),fill=mix(c,top if y>25 else (141,193,170),rng.choice((.12,.16,.22))))
    far=[(x,round(204+6*sin(x/44)+3*sin(x/17))) for x in range(0,W+8,8)]
    d.polygon(far+[(W,H),(0,H)],fill=mix(deep,dark,.64))
    for x in range(-10,W+20,17):
        y=rng.randint(211,232)
        rock(x,y,rng.randint(13,29),rng.randint(5,12),mix(pale,deep,.45))
    front=[(x,round(232+7*sin(x/61)+4*sin(x/29))) for x in range(0,W+8,8)]
    d.polygon(front+[(W,H),(0,H)],fill=dark)
    for _ in range(420):
        x=rng.randrange(W);y=rng.randrange(236,H)
        d.line((x,y,x+rng.randrange(1,7),y),fill=mix(dark,pale,rng.choice((.10,.23,.41,.62))))
    if theme=='harbor':
        for x,w,h in [(14,23,221),(76,12,181),(421,19,212),(452,27,228)]:
            wood=mix((111,91,59),deep,.42)
            d.polygon([(x,0),(x+w,0),(x+w,h-4),(x+w-5,h),(x+2,h)],fill=wood)
            d.rectangle((x+2,0,x+4,h-5),fill=mix(wood,top,.26))
            for y in (13,16,36,39):
                d.line((x,y,x+w,y),fill=mix(wood,deep,.51),width=2)
            for i in range(26):
                xx=rng.randrange(x+4,x+w);yy=rng.randrange(h-7)
                d.line((xx,yy,xx,yy+4),fill=mix(wood,deep,.35))
            rock(x+w-8,h+8,17,8)
    elif theme=='cave':
        for x,h,w in [(0,128,45),(59,54,26),(110,35,22),(372,44,33),(433,153,49)]:
            d.polygon([(x,0),(x+w,0),(x+w-4,h//2),(x+w//3,h),(x+3,h*2//3)],fill=dark)
            d.line([(x+w-1,0),(x+w-5,h//2),(x+w//3,h)],fill=mix(top,dark,.52))
        for x,y,w,h in [(-10,253,69,74),(32,252,57,43),(421,251,52,58),(452,257,55,84)]:
            rock(x,y,w,h)
        for x,y in [(8,224),(45,229),(444,216),(458,234)]:
            d.polygon([(x,y),(x+2,y-7),(x+5,y-10),(x+8,y-4),(x+5,y+2)],fill=(103,148,150))
    elif theme in ('reef','current'):
        for x,y,w,h in [(-12,243,76,76),(38,247,60,40),(402,252,63,76),(449,259,52,103)]:
            rock(x,y,w,h)
            if theme=='reef':
                for k in range(9):
                    xx=x+w//4+rng.randrange(max(5,w//2));yy=y-h*2//3+rng.randrange(max(5,h//2))
                    color=rng.choice([(105,85,86),(126,100,94),(108,112,76)])
                    d.polygon([(xx-3,yy),(xx-3,yy-2),(xx,yy-4),(xx+4,yy-2),(xx+4,yy+1),(xx,yy+2)],fill=color)
        if theme=='current':
            for i in range(13):
                y=32+i*12;x=(i*97)%W
                d.line((x,y,x+29+i%4*4,y), fill=mix(top,deep,.44+i*.03))
    elif theme=='canal':
        for side in (0,1):
            for row in range(6):
                size=max(14,46-row*4);base=round(254-row*22)
                for i in range(3):
                    x=i*size-row*5-24
                    if side:x=W-x-size
                    rock(x,base,size-2,17,mix(pale,deep,row*.045))
    elif theme in ('pool','marsh','backwater','wetland'):
        for x in [9,16,33,48,62,85,386,405,429,446,463,477]:
            plant(x,rng.randrange(237,265),rng.randint(37,92),1 if x<200 else -1,'round' if theme=='wetland' else 'reed')
        if theme in ('marsh','backwater'):
            for x in [23,39,63,412,438,462]:
                y=rng.randrange(18,42)
                d.line((x,2,x-3,y,x+5,y+22),fill=mix(deep,dark,.67))
        if theme=='pool':
            for x,y,w,h in [(-6,243,51,32),(398,257,39,27),(442,253,51,41)]:
                rock(x,y,w,h)
    else:
        for x in [-6,22,46,65,385,411,437,457,476]:
            y=rng.randrange(232,260)
            rock(x,y,rng.randint(18,40),rng.randint(9,27))
            if theme=='stream' or x%3==0: plant(x+4,y-4,rng.randint(18,57))
    for _ in range(29):
        x=rng.randrange(2,W-8);y=rng.randrange(240,268)
        rock(x,y,rng.randint(9,20),4)
    return im

if __name__ == "__main__":
    for theme,palette in PAL.items():
        draw(theme,palette).save(OUT / f"underwater-region-{theme}.webp", lossless=True)
