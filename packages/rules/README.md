# Rules Source Package

`packages/rules/` owns the maintained source documents and shared support for Gauntlet's active three-layer rules architecture.

## Contents

- `player-guide/player-guide.md` — reviewed teaching surface for the shared game.
- `faction-guides/` — reviewed teaching surfaces for each faction plus the authoring template.
- `comprehensive/comprehensive-rules.md` — complete technical rules corpus used by the active `/rules/comprehensive/` surface.
- `publication/` — maintained editorial, pedagogy, and semantic dependency support for rules publication.
- `rule-facts.js` — shared current-rule fact derivation and synchronization support consumed by governance validation.

## Authority boundary

Gameplay authority remains `packages/game-data/current-game.json`. These documents and helpers are maintained rules surfaces/support governed by repository contracts; they must not silently introduce mechanics that disagree with current gameplay authority.

Public URLs are independent of this repository path. `config/publication-boundary.json` materializes the registered rules sources to stable `/rules/sources/...` browser paths where required.

The legacy monolithic Browser Rulebook is intentionally not part of this package. Its compatibility source remains under `rulebook/` during the retirement-coverage transition.
