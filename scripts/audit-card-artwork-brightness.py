#!/usr/bin/env python3
"""Read-only darkness audit of the current Gauntlet playable card artwork."""
import csv
import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
AUTHORITY = ROOT / "packages/game-data/current-game.json"
ART = ROOT / "images/artwork/cards"
EXTS = {".png", ".jpg", ".jpeg", ".webp"}

def normalize(text):
    text = unicodedata.normalize("NFKD", str(text)).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", text.casefold()).strip("-")

def source_for(card):
    faction = card["allegiance"].lower()
    path = ART / faction
    candidates = [p for p in path.iterdir() if p.is_file() and p.suffix.lower() in EXTS]
    wanted = {normalize(card["name"]), normalize(card["id"].split("-", 1)[-1])}
    matching = [p for p in candidates if normalize(p.stem) in wanted]
    if not matching:
        return None
    return sorted(matching, key=lambda p: ([".png", ".webp", ".jpg", ".jpeg"].index(p.suffix.lower()), p.name))[0]

def measurements(path):
    with Image.open(path) as source:
        im = source.convert("RGB")
        im.thumbnail((256, 256))
        pixels = list(im.getdata())
    lum = sorted(round(0.2126 * r + 0.7152 * g + 0.0722 * b) for r,g,b in pixels)
    n=len(lum)
    return {"mean": round(sum(lum)/n,1),
            "median": lum[n//2],
            "p10": lum[n//10],
            "p25": lum[n//4],
            "p75": lum[3*n//4],
            "pct_under_64": round(100 * sum(v<64 for v in lum)/n,1),
            "pct_under_96": round(100 * sum(v<96 for v in lum)/n,1)}

def main():
    data = json.loads(AUTHORITY.read_text(encoding="utf-8"))
    cards=data["gameplay"]["cards"]
    rows=[]
    missing=[]
    for card in cards:
        path = source_for(card)
        if path is None:
            missing.append((card["id"],card["name"]))
            continue
        rows.append({"card":card["name"],"faction":card["allegiance"],
                     "path":str(path.relative_to(ROOT)),**measurements(path)})
    rows.sort(key=lambda x:(x["mean"],-x["pct_under_64"],x["card"]))
    if missing or len(rows)!=len(cards):
        print(f"ERROR: ranked {len(rows)}/{len(cards)} current cards; missing={missing}",file=sys.stderr)
        return 2
    out=ROOT / "artwork-brightness-audit.csv"
    with out.open("w",newline="",encoding="utf-8") as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    def formatted(r,i):
        return f'{i:3d}. {r["card"]:<28} {r["faction"]:<12} mean={r["mean"]:>5} dark<64={r["pct_under_64"]:>5}% median={r["median"]:>3}'
    print(f"ALL {len(rows)} CURRENT PLAYABLE CARDS RANKED BY AVERAGE ARTWORK DARKNESS")
    for i,r in enumerate(rows,1):
        print(formatted(r,i))
    print("\nTOP 30 BY SHARE OF VERY DARK PIXELS (<64/255)")
    for i,r in enumerate(sorted(rows,key=lambda r:(-r["pct_under_64"],r["mean"]))[:30],1):
        print(formatted(r,i))
    summary=os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary,"a",encoding="utf-8") as f:
            f.write("# Gauntlet card artwork darkness audit\n\n")
            f.write(f"Audited all **{len(rows)} current playable cards** from `packages/game-data/current-game.json`. ")
            f.write("Metrics are from original illustrations, not photographed prints. ")
            f.write("Mean luminance uses 8-bit sRGB weighted components (0=black, 255=white).\n\n")
            f.write("| Rank | Card | Faction | Mean luminance | Under 64 |\n|---:|---|---|---:|---:|\n")
            for i,r in enumerate(rows,1):
                f.write(f'| {i} | {r["card"]} | {r["faction"]} | {r["mean"]} | {r["pct_under_64"]}% |\n')
            f.write("\n**Interpretation:** darkness is not the same as poor print legibility; inspect local contrast and composition before adjusting artwork.\n")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
