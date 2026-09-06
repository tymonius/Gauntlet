# Legacy materials

This directory contains historical implementation material retained for provenance, compatibility, or reconstruction value.

Nothing under `legacy/` is current gameplay authority. New game behavior, current card/rule data, production applications, and active engine work must not be implemented here.

Current gameplay authority lives in `game-data/current-game.json`; current Rulebook authority lives in `rulebook/player-facing/current-rulebook.md`.

A legacy subtree may be removed later when its provenance value is no longer needed and no supported compatibility surface depends on it.

## Archived subtrees

- `digital-prototype-data/` — early machine-readable prototype data.
- `digital-engine-dev-runners/` — retired generic pre-faction/v0.5.6 CLI and GUI development runners, preserved as non-executable provenance.
- `digital-engine-reconstruction/` — clean v0.6.2/v0.6.3 digital-engine reconstruction snapshots and co-located historical regression tests moved out of the active `src/` typecheck boundary.
- `digital-engine-migration/` — superseded versioned engine-migration implementations moved out of the active `src/` boundary after their relevant behavior was promoted or otherwise retired.
- `digital-engine-v06/` — earlier playable v0.6-era cards/effects/state/types/dev architecture with its explicitly opt-in historical CLI/GUI runners; preserved outside the active `src/` authority and default test/typecheck boundary.
