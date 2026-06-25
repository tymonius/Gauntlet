# Gauntlet Digital Data Starter

This folder is the start of a single source of truth for digital Gauntlet playtesting.

It currently includes:

- `cards.json` — starter machine-readable card records.
- `territories.json` — starter machine-readable Territory records.
- `recommended_decks.json` — starter recommended playtest decks.
- `game_config.json` — global constants and turn/battle sequence.
- `schema.md` — explanation of the data model.

Next implementation target:

1. Expand `cards.json` and `territories.json` to cover the full current release.
2. Load the JSON files in a small web app.
3. Render the board, hands, decks, discard, Graveyard, Asset bank, Conditions, and battle rows.
4. Add a guided battle wizard.
5. Convert `effect.kind` stubs into executable rule handlers as needed.
