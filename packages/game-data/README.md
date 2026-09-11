# Current Gauntlet game data

`game-data/current-game.json` is the **complete current gameplay authority** for Gauntlet's active development state.

It is not a manifest, patch list, overlay, or source-precedence declaration. Current browser tools, TTS generation, card/component renderers, Deckbuilder, Card Reference, and release publication load this document directly.

`rulebook/player-facing/current-rulebook.md` is the corresponding complete current Rulebook authority.

## Single-source model

The current gameplay authority directly contains:

- all 142 playable cards;
- all 25 Territories and Arenas;
- all six faction records and resolved faction rules;
- all 12 structured Leader definitions;
- the Faction Feature taxonomy and each faction's shared Features;
- all nine Diplomat Proposals;
- Mystics Rite/Ritual data;
- Arcane-symbol rules;
- the physical-component contract;
- all 12 recommended starter Decks;
- canonical artwork-direction data used by production renderers.

No current consumer should merge v0.6.3 data with v0.6.4 change documents to reconstruct the game.

## Historical derivation

The authority's `provenance` object records the historical v0.6.3 and v0.6.4 documents from which v0.7.0 was derived.

Those paths are **history only**. They may be used by archival tests, historical-release reproduction, or explicit migration/provenance tooling. They are not runtime inputs, override layers, or alternate current authorities.

In particular, these historical files do not participate in current resolution:

- `docs/v0.6.4-card-additions.json`
- `docs/v0.6.4-territories.json`
- `docs/v0.6.4-diplomat-proposals.json`
- `docs/v0.6.4-arcane-symbol.json`
- `docs/v0.6.4-rules.json`
- reconstructed v0.6.3 canonical gameplay data.

## Runtime adapter

`game-data/current-game.mjs` loads only `game-data/current-game.json`.

Its responsibilities are limited to:

- validating the complete authority;
- exposing convenient lookup methods such as `findCard()`, `findTerritory()`, and `findLeader()`;
- cloning/freezing data so consumers cannot mutate shared authority state.

It must not add, retire, replace, merge, relabel, or rewrite game mechanics or printed card semantics. Current authority is already in the semantic form consumed by current surfaces; renderers may format it, but they may not repair it through hidden compatibility or presentation transforms.

Node tooling uses `scripts/current-game-authority.mjs`, which likewise reads only the complete authority.

## Rulebook authority

`rulebook/player-facing/current-rulebook.md` is the native Rulebook for the active current-game authority.

It contains the complete current rules and is not reconstructed from the v0.6.3 Rulebook, chapter patches, terminology transformations, or candidate overlays.

Publication may derive presentation-only artifacts from it—such as the printable Card Anatomy figure and booklet PDF—but may not change gameplay rules.

## Artwork positioning

Canonical artwork direction is embedded in `current-game.json` under `artDirection`.

The Card Design compositor may continue using its authoring file while artwork is being adjusted, but an approved current authority must contain the resulting resolved positions. Production consumers read the authority, not a second artwork-position source.

## Published releases

Published release snapshots remain immutable.

The v0.7.0 publication pipeline copies the complete gameplay and Rulebook authorities, generates publication-only assets, hashes the result, and freezes the package. It does not replay historical migrations.

Historical release tooling may intentionally load historical files when its explicit purpose is to reproduce or inspect that historical version. Such code must not be used by unversioned or current runtime surfaces.

## Changing current gameplay

Edit the complete current authority—not an old change document. Each development version is a self-contained current state. Migration tools may help construct that state, but the resulting authority must be complete and surface-ready before it becomes current.

Do **not** introduce a new current UI or tool that selects its own versioned gameplay file or layers corrections over an older release.

## Guardrails

`tests/current-game-authority.test.ts` enforces the single-source architecture. It fails if current runtime, TTS, or release publication reintroduces:

- base-game source selection;
- card-change resolution;
- rule override resolution;
- separate current Territory/Proposal/starter sources;
- transitional `sources`, `resolution`, `baseVersion`, or `factionOverrides` fields;
- retired current terminology.

The default rule is simple: **current gameplay comes from `game-data/current-game.json`; current rules come from `rulebook/player-facing/current-rulebook.md`.**
