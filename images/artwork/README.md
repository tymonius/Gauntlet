# Approved Gauntlet Artwork

This directory stores approved final artwork created for Gauntlet.

## Directory structure

```text
images/artwork/
  cards/
    neutral/
    military/
    diplomats/
    financiers/
    intelligence/
    mystics/
    inquisition/
  territories/
  reference/
    factions/
    leaders/
    environments/
  promotional/
  manifest.json
```

## Filing rules

- Canonical playable-card illustrations belong under `cards/<allegiance>/`.
- Canonical Territory and Arena illustrations belong under `territories/`.
- Approved visual-development pieces that are not canonical card titles belong under `reference/`.
- Website, box, rulebook splash, and campaign images belong under `promotional/`.
- Exploratory, rejected, or superseded generations must not be placed in this directory.
- Use lowercase kebab-case filenames matching the canonical component title when applicable.
- Preserve the full approved source image. Cropped, compressed, framed, or text-overlaid derivatives should live elsewhere and point back to the source asset.

## Approval workflow

1. Develop and revise artwork outside this directory.
2. After the final image is explicitly approved, save the exact approved source here.
3. Add or update its entry in `manifest.json`.
4. Record its intended component or reference use.
5. Replace an existing file only when a later version has explicitly superseded it.

The manifest, rather than filenames alone, is the production inventory for artwork coverage audits.
