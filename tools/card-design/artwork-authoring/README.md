# Card Artwork Authoring Tooling

This directory is the maintained source boundary for the browser-side artwork compositor and authoring client used by Gauntlet card/component production.

The source files are **not** served from this repository path. `config/publication-boundary.json` materializes them at their established `/card-design/` URLs, and local/browser render harnesses resolve those same public URLs through the publication contract. This keeps browser imports stable while source ownership lives under `tools/`.

The Cloudflare authoring service remains under `workers/artwork-authoring/`. Canonical artwork direction is stored in `packages/game-data/current-game.json#artDirection`.

Do not add gameplay mechanics or rendering-model authority here. Shared physical-face model authority belongs under `packages/rendering/`; this directory owns browser authoring/compositor behavior only.

## Print tone corrections

The developer-only Card Review compositor at `/card-design/` edits both **composition** (fit, focus, zoom) and **print tone** (Brightness, Shadows, Contrast, Saturation). Each tone slider defaults to neutral: brightness 100%, shadows 0%, contrast 100%, saturation 100%. `Show original tone` compares the original tonal appearance without discarding controls; `Reset tone to original` changes only the four tone values.

The shadow control uses an artwork-only sRGB component-transfer curve that disproportionately lifts low values while keeping white unchanged. Brightness, contrast, and saturation are ordinary CSS image filters applied **after** shadow lift. No source PNG/JPEG is rewritten, and card frames/text aren't filtered.

Only the Card Review page loads the authoring client and compositor. The compositor saves all non-neutral values together with explicit fit/focus/zoom in the existing per-card `artDirection` field of `packages/game-data/current-game.json`. The shared FaceSpec artwork renderer applies approved corrections in Card Reference displays, Deckbuilder production prints, and other canonical card-face consumers as **output only**. Neither public page loads the compositor, shows editing controls, or provides an artwork-authoring interface. A saved change on the working artwork branch remains unpublished until its batch PR is published. Corrections are opt-in per card; the other cards remain unchanged.

For the identified dark-art prototypes, compare small adjustments on actual Canon G620/Epson Presentation Matte prints. Avoid using a fixed brightness threshold as an automatic edit, since average luminance doesn't measure focal legibility or intended mood.
