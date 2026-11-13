#!/usr/bin/env python3
"""Read-only darkness audit of illustrated non-playable card faces in the current game.

Covers current Territory/Arena, Leader, Proposal, Rite, and Ritual fronts and
shared illustrated supplemental reverses. Text-only reference, deed, tracker,
and ledger faces and generated standard backs have no original illustration
to rank and are excluded explicitly.
"""
import csv
import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from urllib.parse import unquote

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
AUTHORITY = ROOT / "packages/game-data/current-game.json"
ART = ROOT / "images/artwork/cards"
EXTS = {".png", ".jpg", ".jpeg", ".webp"}

def slug(text):
    text = unicodedata.normalize("NFKD", str(text)).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", text.casefold()).strip("-")

def path_from_url(value):
    return ROOT / unquote(str(value).split("?", 1)[0].lstrip("/"))

def measure(path):
    with Image.open(path) as image:
        im = image.convert("RGB")
        im.thumbnail((256, 256))
        values = [round(0.2126*r + 0.7152*g + 0.0722*b) for r,g,b in im.getdata()]
    values.sort()
    n=len(values)
    return {"mean": round(sum(values)/n,1),
            "median":values[n//2],
            "dark_under_64_pct": round(100*sum(x<64 for x in values)/n,1),
            "dark_under_96_pct": round(100*sum(x<96 for x in values)/n,1)}

def resolve_territory(territory):
    if territory.get("artwork"):
        return path_from_url(territory["artwork"])
    names = [territory["name"]]
    if territory.get("arena"):
        names.append(re.sub(r"^Arena:\s*", "", territory["name"], flags=re.I))
    names.append(territory["id"].removeprefix("territory-"))
    candidates = list((ART / "territories").iterdir())
    for stem in [slug(n) for n in names]:
        found = [p for p in candidates if p.is_file() and p.suffix.lower() in EXTS and slug(p.stem)==stem]
        if found:
            return sorted(found, key=lambda p: ([".png",".webp",".jpg",".jpeg"].index(p.suffix.lower()), p.name))[0]
    return None

def main():
    game=json.loads(AUTHORITY.read_text(encoding="utf-8"))
    expected={"Territory / Arena":25,"Leader":12,"Proposal":9,"Rite":6,"Ritual":1,"Shared reverse art":3}
    rows=[]
    def add(name, kind, path):
        path = Path(path) if path is not None else None
        if path is None or not path.is_file():
            raise FileNotFoundError(f"{kind}: {name}: {path}")
        rows.append({"card":name, "category":kind, "path":str(path.relative_to(ROOT)), **measure(path)})
    for territory in game["gameplay"]["territories"]:
        add(territory["name"],"Territory / Arena",resolve_territory(territory))
    for leader in game["leaders"]:
        add(leader["name"],"Leader",path_from_url(leader["image"]))
    for proposal in game["proposals"]:
        add(proposal["name"],"Proposal",ART / "diplomats" / "proposals" / (proposal["id"]+".png"))
    for rite in game["mystics"]["rites"]:
        add(rite["name"],"Rite",path_from_url(rite["artwork"]))
    ritual=game["mystics"]["ritual"]
    add(ritual["name"],"Ritual",path_from_url(ritual["artwork"]))
    add("Proposal ratified (shared reverse)","Shared reverse art",
        ROOT / "images/artwork/supplemental/diplomats/ratified-wax-seal.webp")
    add("Rite completed (shared reverse)","Shared reverse art",
        path_from_url(game["mystics"]["completedArtwork"]))
    add("Ritual of Ascension (reverse)","Shared reverse art",
        path_from_url(ritual["cardBack"]))
    actual = {key:sum(r["category"]==key for r in rows) for key in expected}
    if actual!=expected:
        print(f"ERROR: mismatch expected {expected} actual {actual}",file=sys.stderr)
        return 2
    rows.sort(key=lambda x:(x["mean"],-x["dark_under_64_pct"],x["card"]))
    with (ROOT/"nonplayable-artwork-brightness-audit.csv").open("w",newline="",encoding="utf-8") as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"NONPLAYABLE ARTWORK FULL RANKING — {len(rows)} ORIGINAL IMAGES (53 FRONT + 3 SHARED REVERSE)")
    for i,r in enumerate(rows,1):
        print(f'{i:3d}. {r["card"]:<38} {r["category"]:<19} mean={r["mean"]:>5} dark<64={r["dark_under_64_pct"]:>5}% median={r["median"]:>3}  {r["path"]}')
    print("\nCATEGORY LOWEST FIVE")
    for kind in expected:
        print(kind)
        for r in [x for x in rows if x["category"]==kind][:5]:
            print(f'  {r["card"]}: mean={r["mean"]} dark<64={r["dark_under_64_pct"]}%')
    summary=os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary,"a",encoding="utf-8") as f:
            f.write("\n# Illustrated non-playable card artwork darkness audit\n\n")
            f.write("53 illustrated front images (25 Territories/Arenas, 12 Leaders, 9 Proposals, 6 Rites, 1 Ritual), plus 3 shared reverse artworks.\n")
            f.write("Excludes text-only Reference, Deed, Tracker, Ledger faces and generated standard card backs.\n\n")
            f.write("| Rank | Image | Type | Mean 0–255 | Dark pixels (<64) |\n|---:|---|---|---:|---:|\n")
            for i,r in enumerate(rows,1):
                f.write(f'| {i} | {r["card"]} | {r["category"]} | {r["mean"]} | {r["dark_under_64_pct"]}% |\n')
            f.write("\nLow overall luminance alone does not establish poor print legibility.\n")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
