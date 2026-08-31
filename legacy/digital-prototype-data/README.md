# Legacy Digital Prototype Data

This directory contains the first machine-readable data created for Gauntlet's early digital-playtesting prototype.

It is retained as implementation provenance and schema scaffolding. It is **not current game data**, has no current runtime consumers, and must not be used by the Deckbuilder, renderers, release tooling, TTS generation, or the active rules-aware digital engine.

## Files

- `cards.json` — partial legacy card records.
- `territories.json` — partial legacy Territory records.
- `recommended_decks.json` — historical sample Decks.
- `game_config.json` — historical rules constants and turn/battle assumptions.
- `schema.md` — the initial prototype data model.

## Current sources

Use `game-data/current-game.json` for current structured gameplay authority and `src/` for the active rules-aware digital engine.

Do not update these files piecemeal to resemble current rules. They are preserved evidence of the original prototype data model.
