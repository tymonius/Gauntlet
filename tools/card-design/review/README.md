# Card Design Review Tooling

This directory owns maintained browser tooling for reviewing, filtering, and inspecting rendered Gauntlet physical components.

The source files are intentionally independent from their public URLs. `config/publication-boundary.json` materializes them at the established `/card-design/` paths so the unified review catalog, Card Reference, Deckbuilder, and other browser consumers keep stable imports while repository ownership lives under `tools/`.

This boundary includes:

- the unified catalog's filter, catalog metadata, review rendering, and shell styles;
- the shared card inspector used by Card Design, Card Reference, and Deckbuilder.

It does **not** own the canonical physical-face renderer. Browser face runtime remains under `card-design/` for now, and environment-neutral face authority remains under `packages/rendering/`.
