# Gauntlet card media assets

This directory defines the supported export path for finished card images used outside Tabletop Simulator: the public website, rulebook, press material, and promotional compositions.

## Source discipline

The media exporter does not maintain an independent card design. It reads the current-game card authority and approved artwork through the same catalog path as the TTS exporter, then renders through the shared card component under `card-design/` and `tts/renderer/`.

Promotional compositions follow the same rule. They are assembled from generated canonical card renders through `media/compositions.json`; they do not redraw, approximate, or regenerate card faces. Card IDs, placement, scale, rotation, stacking, canvas dimensions, and output profiles remain explicit and reproducible.

The generated raster files are derivatives and are not committed to Git. GitHub Actions uploads them as downloadable artifacts. Selected public derivatives can also be published directly from the renderer to the production media endpoint without adding the raster to source control.

## Card profiles

| Profile | Dimensions | Formats | Intended use |
|---|---:|---|---|
| `thumbnail` | 300 × 420 | PNG, WebP | card lists, compact previews, mobile layouts |
| `website` | 800 × 1120 | PNG, WebP | website features, galleries, social and promotional compositions |
| `publication` | 1500 × 2100 | PNG | rulebook placement, press material, high-resolution composites |

The exporter renders one 1500 × 2100 master from the live HTML/CSS card component for each card. Smaller profiles are high-quality downscales from that master. It never enlarges the 400 × 560 TTS raster.

## Compositions

`media/compositions.json` defines reusable multi-card arrangements. Each composition references canonical card IDs and consumes the matching generated card profile.

Current compositions:

- `financiers-fanned-hand` — a five-card Financiers/Neutral hand treatment;
- `all-factions-promotional-showcase` — a deliberately non-playable seven-card promotional hero spread with one card from each faction plus a Neutral centerpiece:
  - Military — Invasion
  - Diplomats — Gunboat Diplomacy
  - Financiers — Corner the Market
  - Neutral — Valor
  - Mystics — Rend the Veil
  - Inquisition — Burning at the Stake
  - Intelligence — Assassins

Every composition exports with a transparent background in three profiles:

| Profile | Dimensions | Formats |
|---|---:|---|
| `thumbnail` | 900 × 540 | PNG, WebP |
| `website` | 1600 × 960 | PNG, WebP |
| `publication` | 3000 × 1800 | PNG |

The composition renderer validates that every referenced card exists in the current card authority and has canonical artwork before rendering. It records the exact cards and transforms in a separate compositions manifest.

## Public media

The canonical website-profile PNG for `all-factions-promotional-showcase` is published directly from the media renderer at:

```text
https://gauntlet.run/images/media/all-factions-promotional-showcase.png
```

`.github/workflows/deploy-pages.yml` publishes the site through a GitHub Actions Pages artifact. It stages the tracked public site, rebuilds the website media profile with strict artwork validation, adds the generated seven-card PNG at `/images/media/`, and stages the approved v0.7.0 TTS release assets under their clean `/tts/v0.7.0/` paths. Generated raster derivatives exist only in CI and are not checked into Git. The Pages artifact is size-gated below the 1 GB published-site limit.

This stable URL is suitable for the HTML announcement email and other external promotional surfaces that require a conventional static image URL rather than the live browser compositor.

## Commands

```bash
npm run media:check
npx playwright install chromium
npm run media:build
npm run media:build -- --profile=website
npm run media:build -- --profile=thumbnail --strict-art
```

Supported profile values are `thumbnail`, `website`, `publication`, and `all`.

`media:check` validates both the individual-card media source and the composition configuration. `media:build` generates the card library first and then builds every configured composition from those exact outputs.

Generated output is currently written beneath the media exporter's versioned directory:

```text
media/generated/v0.6.2/
  catalog.json
  manifest.json
  compositions-manifest.json
  thumbnail/
    png/
    webp/
  website/
    png/
    webp/
  publication/
    png/
  compositions/
    thumbnail/
      png/
      webp/
    website/
      png/
      webp/
    publication/
      png/
```

`manifest.json` records the card ID, name, faction, source, artwork path, profile dimensions, and every generated card filename. `compositions-manifest.json` records each reusable composition, its selected card IDs, transforms, canvas, and generated filenames. Consumers should use the manifests rather than reconstructing paths from names.

## Current scope

The card-media pass covers all 128 playable cards in the current catalog. The composition system supports both plausible hand treatments and explicitly promotional cross-faction arrangements without creating independent card artwork.

Territories remain cataloged by the shared canonical parser but require their own component renderer and are not forced into the playable-card frame.
