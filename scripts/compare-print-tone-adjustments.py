#!/usr/bin/env python3
"""Read-only before/after print-tone comparison of current canonical card artwork.

Models the browser's sRGB shadow transfer table, brightness, contrast, saturation.
Luminance metrics are an estimated rendered-artwork preview, NOT measured prints.
"""
import json
import os
import statistics
from pathlib import Path
from PIL import Image
import importlib.util
spec=importlib.util.spec_from_file_location("audit", Path(__file__).resolve().parent / "audit-card-artwork-brightness.py")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
source_for=module.source_for

ROOT = Path(__file__).resolve().parents[1]
TONE_FIELDS = ("brightness", "shadows", "contrast", "saturation")

def clamp(v):
    return max(0.0, min(1.0, v))

def shadow_table(strength):
    vals=[]
    for i in range(33):
        x=i/32
        lift=(strength/100)*0.32*(1-x)**2*(0.3+0.7*x**0.5)
        vals.append(min(1, x+lift))
    return vals

def shadow_lift(x, values):
    index=x*32
    i=min(31, int(index))
    frac=index-i
    return values[i]*(1-frac)+values[i+1]*frac

def tone_pixel(color, setting):
    r,g,b=[v/255 for v in color]
    shadow=setting.get("shadows", 0)
    if shadow>0:
        vals=shadow_table(shadow)
        r,g,b=[shadow_lift(v, vals) for v in (r,g,b)]
    brightness=setting.get("brightness", 100)/100
    if brightness!=1:
        r,g,b=[clamp(v*brightness) for v in (r,g,b)]
    contrast=setting.get("contrast", 100)/100
    if contrast!=1:
        r,g,b=[clamp((v-0.5)*contrast+0.5) for v in (r,g,b)]
    sat=setting.get("saturation", 100)/100
    if sat!=1:
        nr=(0.213+0.787*sat)*r+(0.715-0.715*sat)*g+(0.072-0.072*sat)*b
        ng=(0.213-0.213*sat)*r+(0.715+0.285*sat)*g+(0.072-0.072*sat)*b
        nb=(0.213-0.213*sat)*r+(0.715-0.715*sat)*g+(0.072+0.928*sat)*b
        r,g,b=[clamp(v) for v in (nr,ng,nb)]
    return tuple(round(v*255) for v in (r,g,b))

def metrics(pixels):
    ordered=sorted(round(0.2126*r+0.7152*g+0.0722*b) for r,g,b in pixels)
    n=len(ordered)
    return (round(statistics.mean(ordered),1),
            round(100*sum(v<64 for v in ordered)/n,1),
            round(100*sum(v<96 for v in ordered)/n,1),
            ordered[n//2])

def main():
    authority=json.loads((ROOT/"packages/game-data/current-game.json").read_text(encoding="utf-8"))
    cards={c["id"]:c for c in authority["gameplay"]["cards"]}
    rows=[]
    for id,settings in sorted(authority.get("artDirection",{}).items()):
        if id not in cards or not any(settings.get(k, 0 if k=="shadows" else 100) != (0 if k=="shadows" else 100) for k in TONE_FIELDS):
            continue
        path=source_for(cards[id])
        if not path:
            raise FileNotFoundError(f"No artwork for {id}")
        with Image.open(path) as src:
            img=src.convert("RGB")
            img.thumbnail((256,256))
            original=list(img.getdata())
        adjusted=[tone_pixel(rgb,settings) for rgb in original]
        before=metrics(original)
        after=metrics(adjusted)
        rows.append((cards[id]["name"],id,before,after,settings))
    print(f"CURRENT TONAL CORRECTIONS: {len(rows)} PLAYABLE CARDS")
    print("Image-level model approximates sRGB browser filters; source art only, not final crop/print.")
    for name,id,before,after,settings in sorted(rows, key=lambda x:x[2][0]):
        print(f'{name:25} id={id:37} before_mean={before[0]:5.1f} after_mean={after[0]:5.1f} delta={after[0]-before[0]:+5.1f} before_dark64={before[1]:5.1f}% after_dark64={after[1]:5.1f}% before_dark96={before[2]:5.1f}% after_dark96={after[2]:5.1f}% before_med={before[3]:3d} after_med={after[3]:3d} tone={json.dumps({k:settings[k] for k in TONE_FIELDS if k in settings},sort_keys=True,separators=(",",":"))}')
    summary=os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary,"a",encoding="utf-8") as f:
            f.write("\\n## Canonical print-tone edits: before vs adjusted (estimated)\\n\\n")
            f.write("Read-only source-art comparison, approximating in-browser sRGB filters; actual ink/paper and rendered crop not measured.\\n\\n")
            f.write("| Card | Before mean | After mean | Delta | Before <64 | After <64 | Tone controls |\\n|---|---:|---:|---:|---:|---:|---|\\n")
            for name,id,before,after,settings in sorted(rows,key=lambda x:x[2][0]):
                filters=", ".join(f"{k}={settings[k]}" for k in TONE_FIELDS if k in settings)
                f.write(f"| {name} | {before[0]} | {after[0]} | {after[0]-before[0]:+.1f} | {before[1]}% | {after[1]}% | {filters} |\\n")

if __name__=="__main__":
    main()
