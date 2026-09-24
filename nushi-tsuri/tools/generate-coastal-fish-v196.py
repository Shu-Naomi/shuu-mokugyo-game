"""Draw original 64×32 coastal fish art, with matching swim/turn/mouth poses.

Pixels, scales, fin rays and outline are authored at the actual game resolution.
The 8 swim cells move the tail and fins, instead of translating a static body.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "assets"
W, H = 64, 32
PALETTE = {
    "shirogisu": dict(ink="#263a49", edge="#597785", top="#91b8ba",
                       base="#c5d3bd", light="#f7ebcb", belly="#e8e6d2",
                       fin="#a6b9a9", dark="#648b96", spots="#99b5ab"),
    "ainame": dict(ink="#2a3632", edge="#4b624d", top="#566e52",
                   base="#84906a", light="#c2b88a", belly="#b3a77b",
                   fin="#829669", dark="#425a49", spots="#dbc497"),
    "madai": dict(ink="#5e353d", edge="#914b4f", top="#b85862",
                  base="#dc786a", light="#ffd1a1", belly="#f0a881",
                  fin="#d45f61", dark="#ad4b55", spots="#f5bd94"),
}


def poly(d, points, fill):
    d.polygon(points, fill=fill)


def tail(d, species, c, swing):
    y = 16 + swing
    if species == "shirogisu":
        poly(d, [(16, 15), (10, 14), (4, 9 + swing), (5, y),
                 (3, 23 + swing), (11, 19), (17, 18)], c["ink"])
        poly(d, [(15, 16), (10, 15), (6, 11 + swing), (8, y),
                 (5, 21 + swing), (12, 18)], c["fin"])
    elif species == "ainame":
        poly(d, [(18, 13), (12, 12), (5, 10 + swing), (4, 16 + swing),
                 (6, 22 + swing), (13, 21), (18, 19)], c["ink"])
        poly(d, [(17, 15), (11, 14), (7, 12 + swing), (6, 17 + swing),
                 (8, 20 + swing), (13, 19)], c["fin"])
    else:
        poly(d, [(17, 13), (11, 12), (4, 5 + swing), (7, 16 + swing),
                 (3, 27 + swing), (12, 21), (18, 19)], c["ink"])
        poly(d, [(16, 14), (10, 13), (6, 8 + swing), (9, 16 + swing),
                 (5, 24 + swing), (12, 19)], c["fin"])
    for x in (8, 11, 14):
        d.line((x, y, 5 if x == 8 else x - 5, y - (6 if x == 8 else 4)), fill=c["light"] if x == 14 else c["edge"])
        d.line((x, y + 1, 5 if x == 8 else x - 5, y + (6 if x == 8 else 4)), fill=c["edge"])
    d.line((14, y - 2, 18, 14), fill=c["dark"])


def fins(d, species, c, swim):
    flick = (1, 0, -1, 0, 1, 0, -1, 0)[swim]
    if species == "shirogisu":
        poly(d, [(20, 12), (23, 8), (25, 10), (29, 7), (32, 10),
                 (35, 11), (39, 10), (43, 12)], c["ink"])
        poly(d, [(22, 11), (24, 9), (26, 11), (29, 9), (32, 11),
                 (39, 11)], c["fin"])
        poly(d, [(28, 20), (34, 25 + flick), (37, 21),
                 (45, 19), (43, 23), (48, 19)], c["ink"])
        poly(d, [(33, 21), (35, 23 + flick), (39, 20), (44, 21)], c["fin"])
    elif species == "ainame":
        poly(d, [(18, 12), (19, 6), (22, 8), (24, 5), (27, 8),
                 (30, 4), (34, 7), (37, 5), (40, 8), (44, 6),
                 (48, 11)], c["ink"])
        poly(d, [(20, 11), (21, 8), (24, 9), (27, 7), (30, 9),
                 (33, 7), (37, 9), (42, 8), (46, 11)], c["fin"])
        poly(d, [(25, 23), (29, 27), (33, 25), (40, 24),
                 (44, 27 + flick), (48, 21)], c["ink"])
        poly(d, [(28, 23), (32, 25), (38, 23), (44, 25 + flick)], c["fin"])
    else:
        poly(d, [(20, 10), (20, 3), (23, 7), (25, 2), (28, 7),
                 (31, 2), (35, 7), (38, 3), (43, 7), (46, 10)], c["ink"])
        poly(d, [(22, 9), (22, 5), (25, 8), (27, 5), (30, 9),
                 (32, 5), (36, 9), (39, 6), (44, 10)], c["fin"])
        poly(d, [(22, 23), (27, 29), (31, 26), (38, 28 + flick),
                 (42, 24), (46, 23)], c["ink"])
        poly(d, [(26, 24), (29, 27), (32, 25), (38, 26 + flick)], c["fin"])
    for x in (22, 27, 32, 37, 42):
        d.line((x, 8 if species != "shirogisu" else 10, x + 1, 12), fill=c["edge"])


def body_shape(species):
    if species == "shirogisu":
        return [(13, 16), (18, 13), (27, 12), (40, 12), (49, 13),
                (54, 15), (59, 17), (58, 19), (53, 21), (40, 22),
                (26, 21), (18, 20)]
    if species == "ainame":
        return [(14, 15), (18, 11), (26, 9), (39, 9), (48, 11),
                (54, 13), (59, 17), (58, 21), (53, 24), (43, 25),
                (27, 24), (18, 21)]
    return [(14, 16), (18, 10), (23, 7), (36, 7), (45, 9),
            (53, 12), (59, 17), (57, 21), (50, 24), (42, 27),
            (27, 27), (20, 24)]


def scales(img, species, c):
    d = ImageDraw.Draw(img)
    mask = Image.new("1", (W, H)); m = ImageDraw.Draw(mask)
    m.polygon(body_shape(species), fill=1)
    if species == "shirogisu":
        d.line((19, 15, 45, 15), fill=c["light"])
        d.line((20, 18, 46, 18), fill=c["dark"])
        for x in range(24, 49, 4):
            y = 14 + ((x // 4) % 2)
            if mask.getpixel((x, y)):
                d.point((x, y), fill=c["spots"])
    else:
        y_start, y_stop, dx, dy = (12, 24, 4, 3) if species == "ainame" else (11, 26, 4, 3)
        for y in range(y_start, y_stop, dy):
            for x in range(20 + (y % 2) * 2, 50, dx):
                if mask.getpixel((x, y)):
                    d.point((x, y), fill=c["spots"] if (x + y) % 3 else c["dark"])
                if mask.getpixel((x + 1, y + 1)):
                    d.point((x + 1, y + 1), fill=c["light"] if species == "madai" else c["edge"])
        if species == "madai":
            d.line((19, 15, 34, 14), fill="#f6b587")
        else:
            for x, y in [(23, 12), (30, 17), (38, 13), (44, 20), (27, 21)]:
                d.rectangle((x, y, x + 2, y + 1), fill=c["dark"])
                d.point((x + 1, y), fill=c["spots"])


def face(d, species, c, mouth=0, flutter=0):
    # Gill and pectoral fin stay behind the bright eye and the moving lips.
    gx = 49 if species == "shirogisu" else 47
    d.line((gx, 13, gx - 1, 16, gx, 20, gx + 1, 21), fill=c["edge"])
    d.point((gx + 1, 15), fill=c["light"])
    if species == "shirogisu":
        poly(d, [(43, 18), (39, 22 + flutter), (47, 20), (48, 17)], c["edge"])
        d.line((43, 19, 40, 21 + flutter), fill=c["fin"])
    elif species == "ainame":
        poly(d, [(44, 19), (39, 24 + flutter), (49, 22), (48, 17)], c["ink"])
        poly(d, [(44, 20), (41, 23 + flutter), (48, 21)], c["fin"])
        d.line((44, 20, 42, 23 + flutter), fill=c["light"])
    else:
        poly(d, [(44, 17), (37, 25 + flutter), (48, 20), (48, 16)], c["ink"])
        poly(d, [(44, 18), (39, 23 + flutter), (47, 19)], c["fin"])
        d.line((44, 19, 40, 22 + flutter), fill=c["light"])
    eye_y = 15 if species == "shirogisu" else 14 if species == "ainame" else 13
    d.rectangle((51, eye_y, 54, eye_y + 3), fill=c["ink"])
    d.rectangle((52, eye_y, 53, eye_y + 1), fill="#272e35")
    d.point((52, eye_y), fill="#fff1d4")
    if species == "madai":
        d.line((50, eye_y - 1, 54, eye_y - 1), fill=c["light"])
    d.line((56, 17, 59, 17), fill=c["ink"])
    if mouth:
        d.line((57, 18, 60, 18), fill=c["light"])
        d.rectangle((58, 19, 59, 19 + mouth), fill=c["ink"])
        d.line((57, 20 + mouth, 60, 20 + mouth), fill=c["light"])
    else:
        d.line((58, 19, 60, 19), fill=c["edge"])


def side(species, swim=0, mouth=0):
    c = PALETTE[species]; img = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(img)
    swing = (0, -1, -2, -1, 0, 1, 2, 1)[swim]
    tail(d, species, c, swing)
    fins(d, species, c, swim)
    poly(d, body_shape(species), c["ink"])
    inner = [(x, y + (1 if y < 18 else -1)) for x, y in body_shape(species)[1:-1]]
    poly(d, [(16, 16), *inner, (18, 19)], c["base"])
    if species == "shirogisu":
        poly(d, [(19, 14), (40, 13), (50, 14), (56, 16),
                 (45, 16), (25, 16)], c["light"])
        d.line((18, 20, 40, 21, 53, 20), fill=c["belly"], width=1)
    elif species == "ainame":
        poly(d, [(20, 12), (28, 10), (41, 11), (49, 13),
                 (43, 15), (28, 15)], c["top"])
        poly(d, [(21, 21), (34, 22), (50, 21), (53, 23),
                 (40, 24), (26, 23)], c["belly"])
        d.line((22, 13, 38, 12), fill=c["light"])
    else:
        poly(d, [(21, 11), (27, 9), (36, 9), (47, 11),
                 (53, 14), (40, 13), (28, 14)], c["top"])
        poly(d, [(21, 21), (31, 24), (43, 24), (52, 21),
                 (48, 24), (40, 26), (29, 25)], c["belly"])
        d.line((25, 10, 37, 9, 46, 11), fill=c["light"])
    scales(img, species, c)
    face(d, species, c, mouth, (swim % 4 == 2) - (swim % 4 == 0))
    return img


def three_quarter(species, mirrored=False):
    c = PALETTE[species]; img = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(img)
    broad = 3 if species == "shirogisu" else 5 if species == "ainame" else 7
    poly(d, [(16, 15), (9, 10), (11, 17), (9, 22), (18, 18)], c["ink"])
    poly(d, [(15, 15), (11, 13), (13, 17), (11, 20), (19, 18)], c["fin"])
    poly(d, [(18, 15), (24, 12 - broad // 2), (37, 11 - broad // 2),
             (47, 13), (54, 16), (50, 22), (38, 22 + broad // 2),
             (26, 21 + broad // 2), (17, 18)], c["ink"])
    poly(d, [(20, 15), (26, 13 - broad // 2), (37, 12 - broad // 2),
             (47, 15), (51, 17), (49, 21), (37, 21 + broad // 2),
             (26, 20 + broad // 2)], c["base"])
    poly(d, [(23, 14), (31, 12), (40, 13), (46, 15), (38, 16)], c["light"])
    poly(d, [(23, 11), (27, 6), (34, 9), (40, 7), (45, 13)], c["fin"])
    d.line((40, 18, 35, 25), fill=c["fin"], width=2)
    for x, y in [(29, 17), (36, 18), (43, 17)]:
        d.point((x, y), fill=c["spots"])
    d.line((46, 15, 46, 19), fill=c["edge"])
    d.rectangle((45, 14, 47, 16), fill=c["ink"])
    d.point((46, 14), fill="#ffe8c6")
    d.point((52, 18), fill=c["ink"])
    return img.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if mirrored else img


def front(species):
    c = PALETTE[species]; img = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(img)
    broad = 6 if species == "shirogisu" else 10 if species == "ainame" else 12
    top = 11 if species == "shirogisu" else 8 if species == "ainame" else 6
    poly(d, [(32, top - 3), (28, top - 4), (25, top + 1),
             (32 - broad, top + 3), (32 - broad, 20), (25, 24),
             (32, 26), (39, 24), (32 + broad, 20),
             (32 + broad, top + 3), (39, top + 1), (36, top - 4)], c["ink"])
    poly(d, [(32, top), (27, top), (33 - broad, top + 5),
             (34 - broad, 19), (28, 23), (32, 24), (36, 23),
             (30 + broad, 19), (30 + broad, top + 5), (37, top)], c["base"])
    poly(d, [(29, top + 1), (32, top - 1), (35, top + 1),
             (34, 17), (30, 17)], c["light"])
    for x in (32 - broad + 2, 32 + broad - 4):
        d.rectangle((x, 14, x + 2, 16), fill=c["ink"])
        d.point((x + 1, 14), fill="#fff1d5")
    d.polygon([(31, 20), (33, 20), (34, 22), (30, 22)], fill=c["ink"])
    poly(d, [(29, top), (31, top - 6), (33, top - 6),
             (35, top), (34, top + 2), (30, top + 2)], c["fin"])
    d.line((31, top - 4, 33, top - 4), fill=c["light"])
    d.line((32 - broad + 3, 18, 32 - broad + 5, 21), fill=c["edge"])
    d.line((32 + broad - 4, 18, 32 + broad - 6, 21), fill=c["edge"])
    d.line((30, 23, 34, 23), fill=c["belly"])
    d.polygon([(32 - broad, 18), (17 - broad // 2, 23), (29, 23)], fill=c["fin"])
    d.polygon([(32 + broad, 18), (47 + broad // 2, 23), (35, 23)], fill=c["fin"])
    d.line((28, 25, 26, 28), fill=c["dark"])
    d.line((36, 25, 38, 28), fill=c["dark"])
    return img


def write(species, mode):
    count = {"swim": 8, "turn": 5, "mouth": 3}[mode]
    atlas = Image.new("RGBA", (W * count, H))
    for i in range(count):
        if mode == "turn":
            cell = [lambda: side(species), lambda: three_quarter(species),
                    lambda: front(species), lambda: three_quarter(species, True),
                    lambda: side(species).transpose(Image.Transpose.FLIP_LEFT_RIGHT)][i]()
        else:
            cell = side(species, i if mode == "swim" else 0,
                        i if mode == "mouth" else 0)
        atlas.paste(cell, (i * W, 0))
    suffix = "" if mode == "swim" else f"-{mode}"
    atlas.save(OUT / f"fish-{species}{suffix}-v196.png", optimize=True)


if __name__ == "__main__":
    for fish in PALETTE:
        for pose in ("swim", "turn", "mouth"):
            write(fish, pose)
