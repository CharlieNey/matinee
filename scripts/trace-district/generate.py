#!/usr/bin/env python3
"""Trace OSM geometry into src/lib/districtGeometry.ts.

Projection: equirectangular meters -> rotate so the numbered streets run
horizontal -> per-axis scale into the existing 1000x1150 viewBox (the x axis
stretches ~1.5x for legibility, subway-map style; relative positions are
traced). Theater footprints keep their true shape (uniform scale about their
own centroid) so buildings don't smear.
"""
import json, math, re
from collections import defaultdict

LAT0, LON0 = 40.759, -73.987
M_PER_LAT = 110_540.0
M_PER_LON = 111_320.0 * math.cos(math.radians(LAT0))

def to_m(lat, lon):
    return ((lon - LON0) * M_PER_LON, (lat - LAT0) * M_PER_LAT)

streets_raw = json.load(open("streets.json"))["elements"]
matched = json.load(open("matched.json"))

def way_points(e):
    return [to_m(g["lat"], g["lon"]) for g in e["geometry"]]

# ---- rotation angle: weighted mean bearing of the mid-district streets ----
sx = sy = 0.0
for e in streets_raw:
    name = e["tags"].get("name", "")
    if re.match(r"^West 4[4-8]", name):
        pts = way_points(e)
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            dx, dy = x2 - x1, y2 - y1
            if dx < 0:
                dx, dy = -dx, -dy  # normalize west->east
            sx += dx
            sy += dy
theta = math.atan2(sy, sx)  # rotate by -theta to make streets horizontal
print(f"street bearing: {math.degrees(theta):.2f} deg from east")
ct, st = math.cos(-theta), math.sin(-theta)

def rot(p):
    x, y = p
    return (x * ct - y * st, x * st + y * ct)

# ---- collect rotated geometry ----
street_pts = defaultdict(list)   # street number -> [(rx, ry)]
avenue_pts = defaultdict(list)   # '6'|'7'|'8' -> pts
broadway_pts = []
for e in streets_raw:
    name = e["tags"]["name"]
    pts = [rot(p) for p in way_points(e)]
    m = re.match(r"^West (\d+)", name)
    if m:
        street_pts[int(m.group(1))].extend(pts)
    elif name == "Broadway":
        if e["tags"].get("highway") != "cycleway":  # parallel bike lane skews the centerline
            broadway_pts.extend(pts)
    elif "7th" in name or "Seventh" in name:
        avenue_pts["7th Ave"].extend(pts)
    elif "8th" in name or "Eighth" in name:
        avenue_pts["8th Ave"].extend(pts)
    else:
        avenue_pts["6th Ave"].extend(pts)

def fit_line(pts, horizontal):
    """Least-squares fit; returns (slope, intercept) of y(x) or x(y)."""
    if horizontal:
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    else:
        xs = [p[1] for p in pts]; ys = [p[0] for p in pts]
    n = len(xs)
    mx = sum(xs) / n; my = sum(ys) / n
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    den = sum((x - mx) ** 2 for x in xs) or 1e-9
    b = num / den
    return b, my - b * mx

# anchor scales: W54..W41 mean ry -> y 60..1060; 8th..6th mean rx -> x 110..930
street_my = {s: sum(p[1] for p in v) / len(v) for s, v in street_pts.items()}
ave_mx = {a: sum(p[0] for p in v) / len(v) for a, v in avenue_pts.items()}
Y_TOP, Y_BOT = 60.0, 1060.0
X_W, X_E = 118.0, 930.0
# ry grows northward; W54 north (max ry) -> Y_TOP
ry54, ry41 = street_my[54], street_my[41]
yscale = (Y_BOT - Y_TOP) / (ry41 - ry54)  # negative: flips north-up
xscale = (X_E - X_W) / (ave_mx["6th Ave"] - ave_mx["8th Ave"])
print(f"xscale={xscale:.4f} yscale={yscale:.4f} units/m (x stretch {abs(xscale/yscale):.2f}x)")

def sx0(rx): return X_W + (rx - ave_mx["8th Ave"]) * xscale
def sy_(ry): return Y_TOP + (ry - ry54) * yscale

# content-fit pass: the Hirschfeld sits west of 8th Ave; fit
# [westernmost theater, 6th Ave] into [95, 940] so nothing collides
# with the street labels at the left edge.
content_x = [sx0(rot(to_m(m["lat"], m["lon"]))[0]) for m in matched.values()
             if m.get("osm") != "node/12861369759"]  # skip off-grid Beaumont
content_x.append(sx0(ave_mx["6th Ave"]))
content_x.append(sx0(ave_mx["8th Ave"]))
cmin, cmax = min(content_x), max(content_x)
A = (940.0 - 95.0) / (cmax - cmin)
B = 95.0 - A * cmin
xscale *= A
print(f"content fit: A={A:.4f} -> x stretch {abs(xscale / yscale):.2f}x")

def sx_(rx): return A * sx0(rx) + B
def sv(p): return (sx_(p[0]), sy_(p[1]))

r1 = lambda v: round(v, 1)

# ---- streets: fitted lines evaluated across the drawable width ----
LEFT_X, RIGHT_X = 64.0, 950.0
streets_out = []
for s in sorted(street_pts):
    pts = [sv(p) for p in street_pts[s]]
    b, a = fit_line(pts, horizontal=True)
    streets_out.append({"street": s,
                        "from": (r1(LEFT_X), r1(a + b * LEFT_X)),
                        "to": (r1(RIGHT_X), r1(a + b * RIGHT_X))})

# ---- avenues: fitted x(y) evaluated over the drawable height ----
TOP_Y, BOT_Y = 30.0, 1085.0
avenues_out = []
for name in ("8th Ave", "7th Ave", "6th Ave"):
    pts = [sv(p) for p in avenue_pts[name]]
    b, a = fit_line(pts, horizontal=False)
    avenues_out.append({"name": name,
                        "from": (r1(a + b * TOP_Y), r1(TOP_Y)),
                        "to": (r1(a + b * BOT_Y), r1(BOT_Y))})

# ---- Broadway: bin by y, average x, simplify ----
bpts = sorted((sv(p) for p in broadway_pts), key=lambda p: p[1])
bins = defaultdict(list)
for x, y in bpts:
    if TOP_Y - 40 <= y <= BOT_Y + 40:
        bins[int(y // 12)].append((x, y))
centers = []
for k in sorted(bins):
    xs = [p[0] for p in bins[k]]; ys = [p[1] for p in bins[k]]
    centers.append((sum(xs) / len(xs), sum(ys) / len(ys)))
# 3-tap moving average smooths dual-carriageway/plaza noise near Times Square
centers = [centers[0]] + [
    ((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3)
    for a, b, c in zip(centers, centers[1:], centers[2:])
] + [centers[-1]]

def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dmax, idx = 0.0, 0
    L = math.hypot(x2 - x1, y2 - y1) or 1e-9
    for i in range(1, len(pts) - 1):
        x0, y0 = pts[i]
        d = abs((x2 - x1) * (y1 - y0) - (x1 - x0) * (y2 - y1)) / L
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        return rdp(pts[: idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]

bway = [(x, y) for x, y in rdp(centers, 3.0) if TOP_Y <= y <= BOT_Y]
# extend the end segments to the full drawable band, like the avenues
(x0, y0), (x1, y1) = bway[0], bway[1]
bway[0] = (x0 + (x1 - x0) * (TOP_Y - y0) / (y1 - y0), TOP_Y)
(x0, y0), (x1, y1) = bway[-2], bway[-1]
bway[-1] = (x0 + (x1 - x0) * (BOT_Y - y0) / (y1 - y0), BOT_Y)
bway = [(r1(x), r1(y)) for x, y in bway]
print(f"broadway: {len(centers)} bins -> {len(bway)} pts")

# ---- theaters & TKTS booth ----
theaters_out = {}
for name, m in matched.items():
    rx, ry = rot(to_m(m["lat"], m["lon"]))
    x, y = sx_(rx), sy_(ry)
    entry = {"x": r1(x), "y": r1(y), "osm": m["osm"]}
    if "footprint" in m:
        fp = [rot(to_m(la, lo)) for la, lo in m["footprint"]]
        crx = sum(p[0] for p in fp) / len(fp)
        cry = sum(p[1] for p in fp) / len(fp)
        u = abs(yscale)  # uniform: keep true building shape (north up -> flip y)
        pts = [(r1(x + (px - crx) * u), r1(y - (py - cry) * u)) for px, py in fp]
        d = "M" + "L".join(f"{px} {py}" for px, py in pts) + "Z"
        entry["footprint"] = d
    theaters_out[name] = entry

tkts = theaters_out.pop("__tkts__")

# Vivian Beaumont is off-grid (inset) — drop traced coords, keep for reference
vb = theaters_out.get("Vivian Beaumont Theater")
print("beaumont traced (off-map, inset keeps hand position):", vb["x"], vb["y"])

# sanity: westernmost / extremes
xs = [(v["x"], k) for k, v in theaters_out.items() if k != "Vivian Beaumont Theater"]
ys = [(v["y"], k) for k, v in theaters_out.items() if k != "Vivian Beaumont Theater"]
print("x range:", min(xs), max(xs))
print("y range:", min(ys), max(ys))
print("tkts booth:", tkts["x"], tkts["y"])

json.dump({
    "streets": streets_out, "avenues": avenues_out, "broadway": bway,
    "theaters": theaters_out, "tkts": tkts,
}, open("geometry.json", "w"), indent=1)
print("wrote geometry.json")

# ---- emit src/lib/districtGeometry.ts ----
def ts_theater(name, t):
    fp = f',\n    footprint: "{t["footprint"]}"' if "footprint" in t else ""
    return (f'  "{name}": {{\n    x: {t["x"]},\n    y: {t["y"]},\n'
            f'    osm: "{t["osm"]}"{fp},\n  }}')

streets_ts = ",\n".join(
    f'  {{ street: {s["street"]}, x1: {s["from"][0]}, y1: {s["from"][1]}, '
    f'x2: {s["to"][0]}, y2: {s["to"][1]} }}'
    for s in streets_out)
avenues_ts = ",\n".join(
    f'  {{ name: "{a["name"]}", x1: {a["from"][0]}, y1: {a["from"][1]}, '
    f'x2: {a["to"][0]}, y2: {a["to"][1]} }}'
    for a in avenues_out)
bway_ts = ",\n".join(f"  {{ x: {x}, y: {y} }}" for x, y in bway)
theaters_ts = ",\n".join(
    ts_theater(n, t) for n, t in sorted(theaters_out.items()))
tkts_fp = tkts["footprint"] if "footprint" in tkts else None

out = f"""/*
 * GENERATED — do not edit by hand; regenerate with the Overpass trace
 * (recipe in DATA.md). Traced from OpenStreetMap on 2026-07-16.
 * Map data © OpenStreetMap contributors (ODbL); this stylized rendering
 * is a Produced Work — openstreetmap.org/copyright.
 *
 * Projection: equirectangular meters, rotated {abs(round(math.degrees(theta), 1))}° so the numbered
 * streets run horizontal, then fitted to the 1000×1150 viewBox. The x axis
 * is stretched {abs(xscale / yscale):.2f}× for legibility (subway-map convention); relative
 * positions are traced. Theater footprints keep their true shape (uniform
 * scale about their own centroid). The Vivian Beaumont (W 65th) is off-grid
 * and keeps its hand-placed inset position.
 */

export type XY = {{ x: number; y: number }};

export const DISTRICT_VIEW = {{ w: 1000, h: 1150 }} as const;

export const STREET_LINES: readonly {{
  street: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}}[] = [
{streets_ts},
];

export const AVENUE_LINES: readonly {{
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}}[] = [
{avenues_ts},
];

/** Broadway's real course — the bend through Times Square is genuine. */
export const BROADWAY_POINTS: readonly XY[] = [
{bway_ts},
];

export type TheaterGeo = {{
  x: number;
  y: number;
  /** OSM element the position (and footprint) was traced from. */
  osm: string;
  /** True building outline as an SVG path, where OSM has one. */
  footprint?: string;
}};

export const THEATER_GEO: Record<string, TheaterGeo> = {{
{theaters_ts},
}};

/** The red steps at Duffy Square (Broadway & W 47th). */
export const TKTS_BOOTH: TheaterGeo = {{
  x: {tkts["x"]},
  y: {tkts["y"]},
  osm: "{tkts["osm"]}",
  footprint: "{tkts_fp}",
}};
"""
open("/Users/charlie/personal_projects/theatr-project/src/lib/districtGeometry.ts", "w").write(out)
print("wrote districtGeometry.ts")
