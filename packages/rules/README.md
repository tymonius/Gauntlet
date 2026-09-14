# Rules Source Package

`packages/rules/` owns the maintained source documents for Gauntlet's active three-layer rules architecture.

## Contents

- `player-guide/player-guide.md` — reviewed teaching surface for the shared game.
- `faction-guides/` — reviewed teaching surfaces for each faction plus the authoring template.
- `comprehensive/comprehensive-rules.md` — complete technical rules corpus used by the active `/rules/comprehensive/` surface.

## Authority boundary

Gameplay authority remains `packages/game-data/current-game.json`. These documents are maintained rules surfaces governed by `config/rules-surface-contract.json`; they must not silently introduce mechanics that disagree with current gameplay authority.

Public URLs are independent of this repository path. `config/publication-boundary.json` materializes these sources to the stable `/rules/sources/...` browser paths.

The legacy monolithic Browser Rulebook is intentionally not part of this package. Its source remains under `rulebook/` during the retirement-coverage transition.
