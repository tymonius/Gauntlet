# Legacy materials

This directory contains historical implementation material retained for provenance, compatibility, reconstruction value, or an explicitly temporary release-transition bridge.

Nothing under `legacy/` is current gameplay authority. New game behavior, current card/rule data, production applications, and active engine work must not be implemented here.

Current gameplay authority lives in `packages/game-data/current-game.json`. Maintained active rules source and shared rules-publication support live under `packages/rules/`. The monolithic Browser Rulebook source has been archived under `legacy/rulebook-browser/`, but that archived source still materializes the stable `/rulebook/` release surface until the v0.7.2 cutover so Released v0.7.1 and the current release candidate remain available through the existing toggle.

A legacy subtree may be removed later when its provenance value is no longer needed and no supported compatibility or release-transition surface depends on it.

## Archived subtrees

- `card-design-studies/` — superseded card-design studies, review notes, and design rationale removed from the maintained `card-design/` production and authoring surface; their established `/card-design/...` URLs are materialized from this source for compatibility.
- `card-design-v0.6.3/` — historical v0.6.3 card-design review material, including the long-card review surface, generated review catalog, and superseded bespoke reference-card copy; stable `/card-design/...` compatibility URLs are materialized from this source by the publication contract.
- `digital-prototype-data/` — early machine-readable prototype data.
- `digital-engine-dev-runners/` — retired generic pre-faction/v0.5.6 CLI and GUI development runners, preserved as non-executable provenance.
- `digital-engine-reconstruction/` — clean v0.6.2/v0.6.3 digital-engine reconstruction snapshots and co-located historical regression tests moved out of the active `src/` typecheck boundary.
- `digital-engine-migration/` — superseded versioned engine-migration implementations moved out of the active `src/` boundary after their relevant behavior was promoted or otherwise retired.
- `digital-engine-v06/` — earlier playable v0.6-era cards/effects/state/types/dev architecture with its explicitly opt-in historical CLI/GUI runners; preserved outside the active `src/` authority and default test/typecheck boundary.
- `public-compatibility/` — source for retired browser compatibility surfaces that still need stable public routes.
- `public-versions/` — source for historical versioned browser surfaces that still publish at stable public URLs.
- `rulebook-browser/` — archived Browser Rulebook application source retained for provenance and historical publication adapters; temporarily still staged at `/rulebook/` as the v0.7.1 release bridge.
- `v0.6.1-rulebook-publication/` — preserved v0.6.1 Rulebook proof/production system used for historical reproduction and later publication adapters.
- `v0.6.4-candidate/` — historical candidate inputs and review records retained for provenance.
