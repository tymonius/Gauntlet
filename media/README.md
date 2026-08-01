# Gauntlet card media assets

This directory defines the supported export path for finished card images used outside Tabletop Simulator: the public website, rulebook, press material, and promotional compositions.

## Source discipline

The media exporter does not maintain an independent card design. It reads the same governing v0.6.1 card sources and approved artwork as the TTS exporter, then renders through the shared card component under `card-design/` and `tts/renderer/`.

The generated raster files are derivatives and are not committed to Git. GitHub Actions uploads them as a downloadable artifact.

## Profiles

| Profile | Dimensions | Formats | Intended use |
|---|---:|---|---|
| `thumbnail` | 300 × 420 | PNG, WebP | card lists, compact previews, mobile layouts |
| `website` | 800 × 1120 | PNG, WebP | website features, galleries, social and promotional compositions |
| `publication` | 1500 × 2100 | PNG | rulebook placement, press material, high-resolution composites |

The exporter renders one 1500 × 2100 master from the live HTML/CSS card component for each card. Smaller profiles are high-quality downscales from that master. It never enlarges the 400 × 560 TTS raster.

## Commands

```bash
npm run media:check
npx playwright install chromium
npm run media:build
npm run media:build -- --profile=website
npm run media:build -- --profile=thumbnail --strict-art
```

Supported profile values are `thumbnail`, `website`, `publication`, and `all`.

Generated output is written beneath:

```text
media/generated/v0.6.1/
  catalog.json
  manifest.json
  thumbnail/
    png/
    webp/
  website/
    png/
    webp/
  publication/
    png/
```

`manifest.json` records the card ID, name, faction, source, artwork path, profile dimensions, and every generated filename. Consumers should use the manifest rather than reconstructing paths from card names.

## Current scope

The first media pass covers all 122 playable cards. Territories remain cataloged by the shared canonical parser but require their own component renderer and are not forced into the playable-card frame.
