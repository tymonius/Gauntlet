# Gauntlet Digital Data Starter

This folder contains early machine-readable data created for digital Gauntlet prototyping.

It is useful as schema and implementation scaffolding, but it is **not automatically the authoritative source for the latest released or v0.6-development card text**.

## Current files

- `cards.json` — starter machine-readable card records.
- `territories.json` — starter machine-readable Territory records.
- `recommended_decks.json` — starter recommended playtest decks.
- `game_config.json` — starter global constants and turn/battle sequence.
- `schema.md` — explanation of the initial data model.

## Source-of-truth policy

For a released version, use that release's canonical data under `/releases` for card names, costs, text, deck rules, Territories, and recommended decks.

For v0.6 development:

- approved card decisions currently live in the v0.6 card review logs and card metadata registry;
- faction and leader rules currently live in `docs/Gauntlet_v0.6_Working_Rules.md`;
- canonical v0.6 data still needs to be created after the relevant decisions are sufficiently stable;
- do not silently copy stale v0.5 text into a v0.6 client.

The digital roadmap is documented in `docs/Gauntlet_Digital_Prototype_Roadmap.md`.

## Intended evolution

The long-term goal is versioned digital data that can serve:

- printable releases;
- the deckbuilder;
- the digital rules engine;
- playtest setup;
- telemetry and reproducible logs.

The next data decision should be explicit: either synchronize a complete v0.5.7 dataset for the current engine or establish a separate v0.6-development schema and dataset. Do not treat this starter folder as both at once.
