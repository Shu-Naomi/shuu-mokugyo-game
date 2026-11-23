"""Draw the two 8-heading nearest-neighbour sprite sheets (Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw

DEST = Path(__file__).resolve().parent.parent / 'assets'
for kind in ('tenagaebi', 'zarigani'):
    cray = kind == 'zarigani'
    outline, shadow, mid, bright, glint = (('#382222','#713331','#ae5143','#d67553','#f6bb83') if cray else
                                          ('#2d3833','#506354','#798b64','#afab74','#e4d7a1'))
    art = Image.new('RGBA', (400,112))
    box, head = [], []
    for i, heading in enumerate((1,.84,.64,.34,-.64,-.84,-1,1)):
        frame = Image.new('RGBA', (100,56))
        d = ImageDraw.Draw(frame)
        f = lambda x,y:(round(50+(x-50)*heading), y)
        def line(points, color, width=1): d.line([f(*p) for p in points],fill=color,width=width)
        def poly(points, color, edge=None): d.polygon([f(*p) for p in points],fill=color,outline=edge)
        def dot(x,y,color): d.point(f(x,y),fill=color)
        bend = i == 7
        # Four pairs of walking legs beneath the segmented body.
        for n in range(4):
            x = 48 + n*4
            line([(x,29),(x-2,37+n%2),(x-9,42+n%2)],outline,2)
            line([(x,30),(x-2,36+n%2),(x-7,41+n%2)],mid)
        # Narrow swimmer's tail fan or broad crayfish tail fan.
        fan = [(25,23),(12,20),(7,25),(11,30),(7,35),(17,38),(29,31)] if cray else [(22,24),(8,22),(12,27),(6,30),(15,34),(26,30)]
        if bend: fan = [(x+5,y+4) for x,y in fan]
        poly(fan,shadow,outline)
        line([fan[1],fan[-1]],bright)
        tail = [(56,19),(44,20),(32,21),(22,24),(20,31),(35,33),(49,34),(58,30)] if cray else [(57,20),(45,19),(30,20),(21,22),(18,31),(27,35),(45,35),(57,31)]
        if bend: tail = [(x,y+round(max(0,42-x)*.15)) for x,y in tail]
        poly(tail,mid,outline)
        for x in (26,32,38,44,50):
            y = round(max(0,42-x)*.15) if bend else 0
            line([(x,23+y),(x-2,27+y),(x,31+y)],shadow,2)
            line([(x+1,23+y),(x,26+y)],bright)
        # Antennae and claws are drawn before the carapace.
        line([(61,23),(75,13),(89,11),(96,14)],mid)
        line([(63,25),(77,18),(94,18)],bright)
        if cray:
            for y in (18,36):
                line([(60,26),(70,y),(78,y)],outline,5)
                line([(61,26),(70,y),(78,y)],mid,3)
                poly([(74,y-4),(80,y-6),(88,y-5),(93,y-2),(84,y-1),(92,y+2),(87,y+6),(79,y+5),(74,y+3)],mid,outline)
                line([(79,y-4),(85,y-4),(89,y-2)],bright)
        else:
            for y in (20,35):
                line([(58,27),(70,y+3),(84,y),(91,y)],outline,3)
                line([(59,26),(70,y+2),(84,y-1)],bright)
                line([(86,y),(94,y-2),(91,y),(95,y+1)],mid)
        poly([(46,24),(50,18),(60,18),(65,22),(71,24),(66,26),(63,30),(53,34),(46,31)],mid,outline)
        poly([(49,24),(54,20),(60,20),(63,22),(57,23),(50,27)],bright)
        line([(49,29),(55,30),(61,28)],shadow)
        line([(63,23),(67,21)],outline,2)
        dot(67,20,glint)
        dot(71,24,bright)
        if i == 3:
            # Seeing the animal head-on shows two claws, rather than a
            # flattened side view. Keep the mouth on the center axis.
            d.rectangle((0,0,99,55), fill=(0,0,0,0))
            d.polygon([(35,23),(42,15),(58,15),(65,23),(65,34),(58,41),(42,41),(35,34)], fill=mid, outline=outline)
            d.polygon([(39,24),(46,18),(56,18),(61,24),(57,30),(42,30)], fill=bright)
            d.rectangle((46,32,54,35), fill=shadow)
            d.point((50,34), fill=glint)
            for side in (-1, 1):
                def mirror(points): return [(50+(x-50)*side,y) for x,y in points]
                d.line(mirror([(58,22),(70,10),(78,8),(90,14)]), fill=bright, width=2)
                for j in range(3):
                    d.line(mirror([(62,33+j*2),(67+j*3,38+j*2),(68+j*4,45+j)]),fill=outline,width=2)
                d.ellipse((min(50+side*12,50+side*9),22,max(50+side*12,50+side*9),25),fill=outline)
                d.line(mirror([(59,32),(71,29),(77,23)]),fill=outline,width=5 if cray else 3)
                d.polygon(mirror([(72,21),(73,14),(79,12),(86,14),(83,17),(79,18),(86,20),(84,27),(76,28)]),fill=mid,outline=outline)
                d.line(mirror([(76,14),(81,14),(83,15)]),fill=bright,width=1)
        x,y,right,bottom = frame.getbbox()
        sx, sy = i % 4 * 100, i // 4 * 56
        art.alpha_composite(frame, (sx,sy))
        box.append([sx+x,sy+y,right-x,bottom-y])
        px,py = (50,34) if i == 3 else f(65,26)
        head.append([round((px-x)/(right-x),4),round((py-y)/(bottom-y),4)])
    art.save(DEST / f'fish-{kind}.png',optimize=True)
    print(kind, box, head)
