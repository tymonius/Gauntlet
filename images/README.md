# Image Asset Organization

This directory contains Gauntlet's visual source material. It is not a general-purpose dump for generated copies.

## Canonical locations

- `artwork/cards/` — approved card and Territory illustration assets used by production surfaces.
- `artwork/cardbacks/` and `artwork/supplemental/` — approved non-front card/component artwork.
- `artwork/reference/` — unique visual references and exploratory source material that are not themselves the approved production asset.
- `sketches/` — character/Leader sketch source material. Named Leader sketches live at the root; alternate hero studies live under `sketches/hero-sketches/`; assembled plates live under `sketches/hero-plates/`.
- `3d/` — modeling/miniature source packages and related assets.
- `tools/` — local artwork/compositing utilities.

## Duplication rule

Do not retain a second binary under `artwork/reference/` once that exact image is already the approved production artwork under `artwork/cards/`. Preserve any useful provenance or old descriptive name as documentation rather than another multi-megabyte copy.

The following historical reference names now resolve conceptually to their approved card-art locations:

- `reference/environments/river-fort.png` → `cards/neutral/consolidation.png`
- `reference/reserve/reinforcements-sunlit-ridge-02.png` → `cards/neutral/reinforcements.png`
- `reference/reserve/militia-armory-enlistment.png` → `cards/neutral/new-recruits.png`

Likewise, the original hero study belongs with its alternate studies at `sketches/hero-sketches/hero sketch.png`; a duplicate root copy should not be retained.

Legacy base64/multipart parchment upload fragments are not source assets. Production uses the full-resolution `*-parchment-v2.png` files directly, so `.b64` sidecars belong outside Git.

Large-format source artwork may legitimately remain large. Size alone is not grounds for deleting a unique approved/source asset.
