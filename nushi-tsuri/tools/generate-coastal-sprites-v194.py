"""Build crisp 64×32 pixel atlas frames for three coastal fish."""
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "assets"
COLORS = {
    "shirogisu": dict(outline="#273e4a", base="#bad1cd", light="#f0e8ca", shadow="#668e9a", fin="#8eaaac", eye="#172f43", pattern="#8baaa6"),
    "ainame": dict(outline="#2d3530", base="#6d8060", light="#b3a57d", shadow="#485b4d", fin="#596e50", eye="#19292a", pattern="#d0b68a"),
    "madai": dict(outline="#622f38", base="#db7161", light="#f4c49b", shadow="#a54d55", fin="#c24b4b", eye="#242b3b", pattern="#f5ac87"),
}


def poly(points, fill):
    return f'<polygon points="{points}" fill="{fill}"/>'


def rect(x, y, w, h, fill):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"/>'


def side(species, c, swing=0, mouth=0):
    """The first and last yaw cells retain a full-length silhouette."""
    slim = species == "shirogisu"
    stout = species == "madai"
    top, bottom = (12, 21) if slim else ((7, 27) if stout else (10, 24))
    tail_y = 16 + swing
    out = [
        poly(f"15,15 5,{tail_y-7} 9,{tail_y} 5,{tail_y+7} 15,19", c["outline"]),
        poly(f"16,15 8,{tail_y-4} 12,{tail_y} 8,{tail_y+4} 16,18", c["fin"]),
        poly(f"15,{top+2} 21,{top} 39,{top} 49,{top+2} 56,13 58,17 55,21 48,{bottom-1} 28,{bottom} 17,{bottom-2} 13,19", c["outline"]),
        poly(f"17,{top+3} 22,{top+1} 40,{top+1} 50,{top+3} 56,15 55,21 46,{bottom-2} 27,{bottom-1} 16,19", c["base"]),
        poly(f"22,{top+2} 44,{top+2} 52,14 48,16 27,16 20,17", c["light"]),
        poly(f"18,{bottom-4} 31,{bottom-2} 47,{bottom-3} 53,21 38,{bottom-1} 23,{bottom-1}", c["shadow"]),
        poly(f"20,{top+1} 23,{top-4} 27,{top-3} 30,{top-6} 33,{top-2} 40,{top-5} 44,{top+1}", c["outline"]),
        poly(f"23,{top} 27,{top-3} 29,{top-1} 34,{top-3} 41,{top}", c["fin"]),
        poly(f"26,{bottom-2} 31,{bottom+3} 35,{bottom-1} 44,{bottom-1} 42,{bottom+3} 48,{bottom-2}", c["fin"]),
        rect(49, 13, 3, 3, c["eye"]), rect(50, 13, 1, 1, "#f9ecdb"),
        rect(55, 18, 3, max(1,mouth+1), c["outline"]),
    ]
    if species == "shirogisu":
        out += [rect(24, 16, 22, 1, c["pattern"]), rect(35, 18, 8, 1, c["light"]) ]
    elif species == "ainame":
        out += [rect(23, 13, 3, 2, c["pattern"]), rect(30, 16, 2, 2, c["pattern"]),
                rect(38, 12, 3, 2, c["pattern"]),rect(44, 19, 3, 1, c["pattern"]),
                rect(21, 20, 3, 1, c["shadow"]) ]
    else:
        out += [rect(22, 14, 2, 2, c["pattern"]),rect(28, 16, 3, 2, c["pattern"]),
                rect(35, 13, 2, 2, c["pattern"]),rect(41, 17, 3, 2, c["pattern"]),
                rect(47, 21, 2, 1, c["light"]) ]
    return "".join(out)


def angled(species, c, mirrored=False):
    thick = 2 if species == "shirogisu" else 4 if species == "ainame" else 5
    out = [poly("12,15 8,9 9,16 8,23 16,18",c["outline"]),
           poly(f"14,14 25,{11-thick//3} 37,{11-thick//3} 49,13 53,16 49,21 38,{22+thick//3} 24,{22+thick//3} 12,19",c["outline"]),
           poly(f"16,14 27,{12-thick//3} 38,{12-thick//3} 49,15 49,20 37,{21+thick//3} 26,{21+thick//3} 15,18",c["base"]),
           poly("25,13 37,12 47,15 38,16 23,16",c["light"]),
           poly("21,12 27,6 35,10 43,12",c["fin"]),
           poly("29,21 33,26 37,22 43,22 42,26 47,20",c["fin"]),
           rect(43,14,3,3,c["eye"]),rect(44,14,1,1,"#f8eedb"),
           rect(50,18,3,1,c["outline"])]
    if species == "ainame": out += [rect(25,14,3,2,c["pattern"]),rect(35,19,4,2,c["pattern"])]
    if species == "madai": out += [rect(27,14,3,2,c["pattern"]),rect(37,18,3,2,c["pattern"])]
    art="".join(out)
    return f'<g transform="translate(64 0) scale(-1 1)">{art}</g>' if mirrored else art


def frontal(species,c):
    broad = 11 if species == "madai" else 9 if species == "ainame" else 6
    return "".join([
        poly(f"32,{7 if species=='madai' else 10} {32-broad},12 {32-broad},21 27,26 32,24 37,26 {32+broad},21 {32+broad},12",c["outline"]),
        poly(f"32,10 {32-broad+2},13 {32-broad+2},20 28,24 32,23 36,24 {32+broad-2},20 {32+broad-2},13",c["base"]),
        poly("30,12 32,10 34,12 34,17 30,17",c["light"]),
        rect(32-broad+2,14,3,3,c["eye"]),rect(32+broad-5,14,3,3,c["eye"]),
        rect(30,21,4,1,c["outline"]),
        poly("28,9 31,4 33,4 36,9",c["fin"]),
        poly(f"{32-broad},18 {20-broad},22 {32-broad},22",c["fin"]),
        poly(f"{32+broad},18 {44+broad},22 {32+broad},22",c["fin"]),
    ])


def atlas(species,mode):
    c=COLORS[species];frames=[]
    total={"swim":8,"turn":5,"mouth":3}[mode]
    for i in range(total):
        if mode=="turn":
            art=side(species,c) if i==0 else angled(species,c) if i==1 else frontal(species,c) if i==2 else angled(species,c,True) if i==3 else f'<g transform="translate(64 0) scale(-1 1)">{side(species,c)}</g>'
        else: art=side(species,c,(i%4-1) if mode=="swim" else 0,i if mode=="mouth" else 0)
        frames.append(f'<g transform="translate({i*64} 0)">{art}</g>')
    w=total*64
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="32" viewBox="0 0 {w} 32" shape-rendering="crispEdges">{"".join(frames)}</svg>\n'
    suffix="-turn" if mode=="turn" else "-mouth" if mode=="mouth" else ""
    (OUT/f"fish-{species}{suffix}-v194.svg").write_text(svg,encoding="utf-8")


if __name__=="__main__":
    for species in COLORS:
        for mode in ("swim","turn","mouth"): atlas(species,mode)
