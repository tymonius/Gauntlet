# Card Artwork Authoring Tooling

This directory is the maintained source boundary for the browser-side artwork compositor and authoring client used by Gauntlet card/component production.

The source files are **not** served from this repository path. `config/publication-boundary.json` materializes them at their established `/card-design/` URLs, and the local card-design server resolves those same public URLs through the publication contract. This keeps browser imports and the public compositor stable while source ownership lives under `tools/`.

The Cloudflare authoring service remains under `workers/artwork-authoring/`. Canonical artwork direction is stored in `packages/game-data/current-game.json#artDirection`.

Do not add gameplay mechanics or rendering-model authority here. Shared physical-face model authority belongs under `packages/rendering/`; this directory owns browser authoring/compositor behavior only.
