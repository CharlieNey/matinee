#!/usr/bin/env python3
"""Match theaters.ts rows to OSM elements; emit matched.json {name: {qid, lat, lon, footprint?}}."""
import json

OURS = [
    "Ambassador Theatre", "Ethel Barrymore Theatre", "Belasco Theatre",
    "Bernard B. Jacobs Theatre", "Booth Theatre", "Broadhurst Theatre",
    "Broadway Theatre", "Gerald Schoenfeld Theatre", "James Earl Jones Theatre",
    "John Golden Theatre", "Imperial Theatre", "Longacre Theatre",
    "Lyceum Theatre", "Majestic Theatre", "Music Box Theatre",
    "Shubert Theatre", "Winter Garden Theatre",
    "Gershwin Theatre", "Lena Horne Theatre", "Lunt-Fontanne Theatre",
    "Marquis Theatre", "Minskoff Theatre", "Nederlander Theatre",
    "Neil Simon Theatre", "Palace Theatre", "Richard Rodgers Theatre",
    "New Amsterdam Theatre",
    "Al Hirschfeld Theatre", "August Wilson Theatre", "Eugene O'Neill Theatre",
    "Hudson Theatre", "Lyric Theatre", "St. James Theatre", "Walter Kerr Theatre",
    "Circle in the Square Theatre", "Vivian Beaumont Theater",
    "Todd Haimes Theatre", "Stephen Sondheim Theatre", "Studio 54",
    "Samuel J. Friedman Theatre", "Hayes Theater",
]

# OSM name -> our name, where they differ
ALIASES = {
    "Barrymore Theatre": "Ethel Barrymore Theatre",
    "Neil Simon Theater": "Neil Simon Theatre",
    "Helen Hayes Theatre": "Hayes Theater",
    "Palace Theater": "Palace Theatre",
}
SKIP_IDS = {
    ("way", 266034074),   # "American Airlines Theatre" — stale duplicate of Todd Haimes (same QID)
    ("node", 12517105503),  # QID-less duplicate Sondheim node
    ("node", 6797561785),   # QID-less duplicate Winter Garden node
}

d = json.load(open("theatres.json"))
matched = {}
for e in d["elements"]:
    tags = e.get("tags", {})
    name = tags.get("name")
    key = ALIASES.get(name, name)
    if key not in OURS or (e["type"], e["id"]) in SKIP_IDS:
        continue
    if e["type"] == "way":
        pts = [(g["lat"], g["lon"]) for g in e["geometry"]]
        lat = sum(p[0] for p in pts) / len(pts)
        lon = sum(p[1] for p in pts) / len(pts)
        entry = {"qid": tags.get("wikidata"), "lat": lat, "lon": lon,
                 "footprint": pts, "osm": f'way/{e["id"]}'}
    else:
        entry = {"qid": tags.get("wikidata"), "lat": e["lat"], "lon": e["lon"],
                 "osm": f'node/{e["id"]}'}
    # prefer ways (footprints) over nodes when both exist
    if key in matched and "footprint" in matched[key] and "footprint" not in entry:
        continue
    matched[key] = entry

# TKTS booth footprint (Duffy Square)
for e in d["elements"]:
    if e["type"] == "way" and e["id"] == 258619240:
        pts = [(g["lat"], g["lon"]) for g in e["geometry"]]
        matched["__tkts__"] = {
            "qid": None,
            "lat": sum(p[0] for p in pts) / len(pts),
            "lon": sum(p[1] for p in pts) / len(pts),
            "footprint": pts, "osm": "way/258619240",
        }

missing = [n for n in OURS if n not in matched]
print("matched:", len([k for k in matched if k != "__tkts__"]), "/", len(OURS))
print("missing:", missing)
dupes = [k for k in matched if k != "__tkts__" and matched[k]["qid"] is None]
print("no QID:", dupes)
json.dump(matched, open("matched.json", "w"), indent=1)
