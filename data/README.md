# Legacy Digital Prototype Data

This directory contains early machine-readable data created before the canonical v0.6.0 faction-era package.

It is preserved as implementation provenance and schema scaffolding. It is **not current game data** and must not be used by the v0.6 Deckbuilder, printable sheets, release generator, or a new canonical rules engine.

## Files

- `cards.json` — partial legacy card records.
- `territories.json` — partial legacy Territory records.
- `recommended_decks.json` — legacy sample Decks.
- `game_config.json` — legacy constants and turn/battle assumptions.
- `schema.md` — the initial prototype data model.

## Current source

Use `releases/v0.6/Gauntlet_v0.6.0_Canonical_Data.json` for structured v0.6.0 content. It is generated from the official rulebook, definitive faction guides, Neutral pool, and Territory pool.

The future digital implementation plan is in `docs/Gauntlet_Digital_Roadmap.md`.

Do not update these legacy files piecemeal to resemble v0.6.0. A canonical engine should consume a deliberate versioned schema generated from current sources.
