# Gauntlet card media assets

This directory defines the supported export path for finished card images used outside Tabletop Simulator: the public website, rulebook, press material, and promotional compositions.

## Source discipline

The media exporter does not maintain an independent card design. It reads the same governing v0.6.1 card sources and approved artwork as the TTS exporter, then renders through the shared card component under `card-design/` and `tts/renderer/`.

Promotional compositions follow the same rule. They are assembled from the generated canonical card renders through `media/compositions.json`; they do not redraw, approximate, or regenerate card faces. Card IDs, placement, scale, rotation, stacking, canvas dimensions, and output profiles remain explicit and reproducible.

The generated raster files are derivatives and are not committed to Git. GitHub Actions uploads them as a downloadable artifact.

## Card profiles

| Profile | Dimensions | Formats | Intended use |
|---|---:|---|---|
| `thumbnail` | 300 × 420 | PNG, WebP | card lists, compact previews, mobile layouts |
| `website` | 800 × 1120 | PNG, WebP | website features, galleries, social and promotional compositions |
| `publication` | 1500 × 2100 | PNG | rulebook placement, press material, high-resolution composites |

The exporter renders one 1500 × 2100 master from the live HTML/CSS card component for each card. Smaller profiles are high-quality downscales from that master. It never enlarges the 400 × 560 TTS raster.

## Compositions

`media/compositions.json` defines reusable multi-card arrangements. Each composition references canonical card IDs and consumes the matching generated card profile.

The current artwork-led compositions are:

- `financiers-fanned-hand`: Scouting Report, Leveraged Buyout, Corner the Market, Monetary Crisis, and Sabotage;
- `neutral-battlefront-spread`: Bombardment, Rallying Cry, Invasion, Valor, and Scorched Earth; and
- `intelligence-intrigue-stack`: Counterintelligence, Spies, Assassins, Sedition, and Sabotage.

The battlefront composition uses a broad, shallow spread to feature the vivid sunset, fire, banners, and battlefield artwork. The Intelligence composition is a tighter stack with a darker charcoal, blue, and lamplit palette. Both remain legal-looking faction-plus-Neutral groups rather than arbitrary cross-faction collages.

Every composition exports with a transparent background in three profiles:

| Profile | Dimensions | Formats |
|---|---:|---|
| `thumbnail` | 900 × 540 | PNG, WebP |
| `website` | 1600 × 960 | PNG, WebP |
| `publication` | 3000 × 1800 | PNG |

The composition renderer validates that every referenced card exists and has approved artwork before it renders. It records the exact cards and transforms in a separate compositions manifest.

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

Generated output is written beneath:

```text
media/generated/v0.6.1/
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

The card-media pass covers all 122 playable cards. The composition system currently contains three approved five-card treatments and is designed to accept additional hands, stacks, battle reveals, and other website or publication arrangements without creating independent card artwork.

Territories remain cataloged by the shared canonical parser but require their own component renderer and are not forced into the playable-card frame.
