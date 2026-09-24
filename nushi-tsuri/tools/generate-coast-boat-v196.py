"""Draw authored 64×48 coastal boat sprites: 4 directions × 2 stroke poses.

Rows: canoe/boy, canoe/girl, tarai/boy, tarai/girl; each pair is idle/rowing.
The transparent 1:1 cells are painted on the low-resolution game grid.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "assets" / "coast-boat-v196.png"
W, H = 64, 48
INK = "#292f35"
RAIL = "#77412d"
DEEP = "#462c2b"
PLANK = "#a4623b"
SUN = "#d39159"
GOLD = "#edbe79"
WATER = "#a8d9db"
SHADOW = "#244b61"


def wake(d, vertical=False, stroke=0):
    if vertical:
        for x, y, width in [(15, 12, 4), (44, 16, 4), (15, 38, 5), (43, 39, 5)]:
            d.line((x, y, x + width, y), fill=WATER, width=1)
        d.point((14, 31), fill="#5494a2")
        if stroke:
            d.line((47, 33, 52, 32), fill=WATER, width=1)
    else:
        for x, y, width in [(5, 19, 5), (15, 43, 5), (41, 43, 5), (54, 18, 5)]:
            d.line((x, y, x + width, y), fill=WATER, width=1)
        d.point((8, 41), fill="#5494a2")
        if stroke:
            d.line((47, 45, 53, 44), fill=WATER, width=1)


def canoe_side(d):
    # The hull has pointed raised ends, recessed cockpit and two visible rails.
    d.polygon([(1, 27), (7, 23), (16, 21), (46, 21), (56, 23), (63, 27),
               (58, 35), (49, 40), (17, 40), (7, 36)], fill=INK)
    d.polygon([(3, 27), (9, 24), (18, 23), (47, 23), (55, 24), (61, 27),
               (56, 34), (47, 38), (17, 38), (8, 35)], fill=RAIL)
    d.polygon([(8, 27), (18, 25), (47, 25), (56, 27), (51, 33),
               (45, 36), (19, 36), (12, 33)], fill=DEEP)
    d.polygon([(10, 28), (20, 27), (45, 27), (54, 28), (48, 33),
               (18, 34)], fill="#613927")
    d.line((8, 26, 17, 23, 46, 23, 56, 25), fill=GOLD, width=1)
    d.line((9, 35, 19, 38, 46, 38, 55, 35), fill=SUN, width=1)
    d.line((14, 34, 20, 36, 45, 36, 51, 34), fill=PLANK, width=1)
    for x in (13, 21, 40, 49):
        d.line((x, 29, x + 1, 34), fill="#8b5438", width=1)
    for x in (16, 48):
        d.point((x, 25), fill="#f0c385")
        d.point((x, 37), fill="#3a2929")
    d.line((23, 35, 37, 35), fill="#cb8050", width=1)
    d.line((26, 39, 44, 39), fill="#392f31", width=1)


def canoe_front(d):
    d.polygon([(31, 1), (37, 5), (41, 14), (42, 34), (39, 42), (33, 47),
               (29, 47), (24, 42), (21, 34), (22, 14), (26, 5)], fill=INK)
    d.polygon([(31, 3), (36, 7), (39, 15), (40, 34), (37, 42), (32, 45),
               (29, 45), (26, 41), (23, 34), (24, 15), (27, 7)], fill=RAIL)
    d.polygon([(30, 8), (34, 8), (37, 17), (38, 34), (34, 41),
               (30, 42), (26, 34), (26, 17)], fill=DEEP)
    d.polygon([(29, 11), (34, 11), (36, 18), (36, 33), (32, 38),
               (28, 34), (28, 18)], fill="#76442c")
    d.line((28, 6, 24, 16, 23, 32, 26, 40), fill=SUN, width=1)
    d.line((35, 6, 39, 16, 40, 32, 37, 41), fill=GOLD, width=1)
    d.line((29, 10, 34, 10), fill="#eeae6b", width=1)
    d.line((28, 39, 33, 43), fill=PLANK, width=1)
    for y in (13, 36):
        d.line((25, y, 38, y), fill="#aa6b42", width=1)
        d.point((24, y), fill="#f1ba74")
    for y in (17, 32, 38):
        d.point((40, y), fill="#492e2b")


def tarai_side(d):
    d.ellipse((8, 19, 57, 41), fill=INK)
    d.ellipse((10, 21, 55, 38), fill="#806246")
    d.ellipse((13, 23, 52, 36), fill="#413c36")
    d.arc((9, 18, 57, 40), 175, 356, fill="#e1bf84", width=2)
    d.arc((10, 22, 55, 42), 5, 175, fill="#b08653", width=2)
    for x in (15, 23, 42, 50):
        d.line((x, 35, x + 2, 39), fill="#544536", width=1)
    d.line((22, 36, 42, 36), fill="#b18a60", width=1)


def tarai_front(d):
    d.ellipse((19, 4, 45, 46), fill=INK)
    d.ellipse((21, 6, 43, 44), fill="#8a6b47")
    d.ellipse((24, 10, 40, 41), fill="#423a32")
    d.arc((20, 5, 44, 44), 175, 352, fill="#e5c88e", width=2)
    d.arc((20, 5, 44, 44), 10, 165, fill="#674d39", width=2)
    for y in (11, 35):
        d.line((25, y, 39, y), fill="#a78153", width=1)


def paddler_side(d, girl=False, stroke=0):
    skin, lit, hair = "#ca8d61", "#f5c995", "#663c2e" if girl else "#483932"
    shirt, shade, shine = ("#7c5274", "#4d3d61", "#ad8091") if girl else ("#3d6779", "#274757", "#6993a1")
    # Dark pants and bent legs are recessed into the boat, behind the torso.
    d.polygon([(26, 29), (42, 29), (43, 33), (37, 35), (29, 34)], fill=INK)
    d.line((28, 33, 37, 34, 40, 32), fill="#616269", width=2)
    d.polygon([(26, 19), (36, 18), (43, 24), (42, 31), (28, 30), (25, 27)], fill=INK)
    d.polygon([(27, 21), (36, 20), (41, 25), (40, 30), (28, 29), (27, 26)], fill=shirt)
    d.line((28, 22, 30, 28, 37, 29), fill=shine, width=1)
    d.line((32, 22, 40, 25, 40, 29), fill=shade, width=2)
    d.line((29, 27, 36, 28), fill="#d2a75b", width=1)  # waist strap
    d.polygon([(23, 9), (35, 8), (39, 12), (38, 20), (34, 23),
               (25, 22), (22, 17)], fill=INK)
    d.polygon([(25, 12), (35, 11), (37, 14), (36, 19), (33, 21),
               (26, 20), (24, 17)], fill=skin)
    d.line((27, 13, 34, 12), fill=lit, width=2)
    d.point((36, 16), fill=INK)
    d.point((37, 18), fill="#8e5749")
    if girl:
        d.polygon([(22, 9), (35, 7), (39, 11), (38, 16), (35, 13),
                   (26, 13), (24, 19), (21, 17)], fill=hair)
        d.polygon([(23, 16), (20, 21), (23, 24), (26, 22), (26, 17)], fill=hair)
        d.line((25, 10, 32, 9), fill="#9a6649", width=1)
        d.line((23, 24, 24, 26), fill="#d5a787", width=1)
    else:
        d.polygon([(21, 10), (26, 6), (35, 7), (39, 11), (37, 14),
                   (23, 14)], fill="#314653")
        d.line((25, 8, 34, 8), fill="#75a0a6", width=1)
        d.line((37, 13, 40, 13), fill="#182f3a", width=2)
    # Hands move a pixel across the paddle grip on the rowing frame.
    shift = stroke
    d.polygon([(24, 23), (27, 23), (32, 27 + shift),
               (29, 29 + shift), (23, 27)], fill=shade)
    d.line((28, 27 + shift, 33, 28 + shift), fill=skin, width=2)
    d.polygon([(38, 24), (41, 24), (45, 28 - shift),
               (43, 30 - shift), (37, 27)], fill=shirt)
    d.line((42, 28 - shift, 46, 29 - shift), fill=lit, width=2)


def paddler_front(d, girl=False, facing="up", stroke=0):
    skin, lit = "#d89d71", "#f1c798"
    shirt, shade = ("#815479", "#4c3f62") if girl else ("#38687a", "#294658")
    hair = "#653d36"
    d.polygon([(27, 28), (37, 28), (39, 34), (35, 36), (27, 35)], fill=INK)
    d.line((29, 32, 36, 33), fill="#6b6871", width=2)
    d.polygon([(27, 22), (35, 22), (40, 27), (38, 32), (26, 31), (24, 27)], fill=INK)
    d.polygon([(28, 23), (35, 23), (38, 27), (36, 31), (27, 29)], fill=shirt)
    d.line((28, 24, 29, 29, 34, 30), fill="#94a9a3" if not girl else "#ad7f9b", width=1)
    d.line((32, 24, 36, 28), fill=shade, width=1)
    d.polygon([(27, 13), (30, 11), (36, 13), (38, 19), (34, 23), (29, 22),
               (26, 18)], fill=INK)
    d.polygon([(29, 14), (35, 14), (36, 19), (33, 21), (29, 20)], fill=skin)
    d.line((29, 15, 33, 15), fill=lit, width=1)
    if girl:
        d.polygon([(27, 14), (29, 10), (35, 10), (38, 14), (36, 17),
                   (33, 13), (29, 14), (28, 20), (26, 20)], fill=hair)
        d.line((30, 12, 34, 12), fill="#aa7656", width=1)
        d.line((26, 19, 26, 22), fill=hair, width=2)
    else:
        d.polygon([(26, 14), (29, 10), (36, 10), (39, 15), (37, 17),
                   (27, 17)], fill="#304d5a")
        d.line((29, 12, 35, 12), fill="#86a9ab", width=1)
        d.line((27, 16, 25, 17), fill=INK, width=2)
    if facing == "down":
        d.point((30, 18), fill=INK)
        d.point((34, 18), fill=INK)
        d.line((31, 20, 33, 20), fill="#9c5648", width=1)
    d.line((27, 26, 30 - stroke, 29), fill=shirt, width=3)
    d.line((36, 26, 40 + stroke, 29), fill=shade, width=3)
    d.line((28 - stroke, 29, 31 - stroke, 29), fill=skin, width=2)
    d.line((39 + stroke, 29, 42 + stroke, 29), fill=lit, width=2)


def paddle_side(d, stroke):
    # A single-bladed paddle: a capped handle, shaded shaft, collar and blade.
    shift = 2 if stroke else 0
    d.line((46, 12 + shift, 51, 41 - shift), fill=INK, width=3)
    d.line((47, 12 + shift, 52, 37 - shift), fill="#d5a469", width=1)
    d.line((45, 12 + shift, 48, 11 + shift), fill=GOLD, width=2)
    d.line((50, 35 - shift, 53, 35 - shift), fill="#603d2f", width=2)
    d.polygon([(50, 37 - shift), (54, 37 - shift), (57, 43 - shift),
               (56, 46 - shift), (52, 45 - shift), (50, 41 - shift)], fill=INK)
    d.polygon([(52, 38 - shift), (54, 38 - shift), (56, 43 - shift),
               (54, 44 - shift), (52, 41 - shift)], fill="#c48b56")
    d.line((53, 40 - shift, 55, 43 - shift), fill=GOLD, width=1)


def paddle_front(d, stroke):
    dx = 2 if stroke else 0
    d.line((37, 16, 48 + dx, 40), fill=INK, width=3)
    d.line((38, 17, 48 + dx, 37), fill="#e0ae72", width=1)
    d.line((36, 15, 39, 14), fill=GOLD, width=2)
    d.polygon([(47 + dx, 37), (50 + dx, 36), (54 + dx, 43),
               (53 + dx, 46), (50 + dx, 46), (47 + dx, 41)], fill=INK)
    d.polygon([(49 + dx, 38), (51 + dx, 39), (53 + dx, 43),
               (51 + dx, 45), (49 + dx, 42)], fill="#c38a51")
    d.line((50 + dx, 40, 52 + dx, 43), fill=GOLD, width=1)


def cell(vehicle, girl, direction, stroke):
    img = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(img)
    vertical = direction in ("up", "down")
    wake(d, vertical, stroke)
    if vertical:
        (canoe_front if vehicle == "canoe" else tarai_front)(d)
        paddle_front(d, stroke)
        paddler_front(d, girl, "down" if direction == "down" else "up", stroke)
        # The hand stays visibly on top of the shaft.
        d.line((39 + stroke, 29, 42 + stroke, 29), fill="#f0c694", width=2)
        if direction == "down":
            img = img.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            # Rotate the craft, then flip the face back into its correct pose.
            # The main face is small enough to keep the seated silhouette stable.
    else:
        (canoe_side if vehicle == "canoe" else tarai_side)(d)
        paddle_side(d, stroke)
        paddler_side(d, girl, stroke)
        d.line((43, 28 - stroke, 46, 29 - stroke), fill="#f0c694", width=2)
        if direction == "left":
            img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return img


def main():
    atlas = Image.new("RGBA", (W * 4, H * 8))
    for boat_index, vehicle in enumerate(("canoe", "tarai")):
        for avatar_index, girl in enumerate((False, True)):
            for stroke in (0, 1):
                row = boat_index * 4 + avatar_index * 2 + stroke
                for column, direction in enumerate(("up", "right", "down", "left")):
                    atlas.paste(cell(vehicle, girl, direction, stroke), (column * W, row * H))
    atlas.save(OUT, optimize=True)


if __name__ == "__main__":
    main()
