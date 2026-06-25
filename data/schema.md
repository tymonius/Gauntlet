# Gauntlet Data Schema v0.5.6

This is the first machine-readable schema for digital playtesting.

The current goal is not full automation. The goal is to make every card, territory, deck, and core rule addressable by a future rules engine.

## Files

- `cards.json` — main deck card definitions.
- `territories.json` — territory and arena definitions.
- `recommended_decks.json` — current v0.5.6 test decks.
- `game_config.json` — global rules constants and turn/battle sequence.

## Card object

```json
{
  "id": "card-embargo",
  "name": "Embargo",
  "type": "ActionBattle",
  "cost": 2,
  "unique": false,
  "version": "0.5.6",
  "action": {
    "text": "...",
    "default_destination": "condition_area"
  },
  "battle": {
    "text": "...",
    "default_destination_by_origin": {
      "hand": "graveyard",
      "battle_draw": "discard",
      "replayed": "graveyard"
    }
  },
  "tags": ["condition", "cancel_or_ignore"],
  "effect": {
    "kind": "embargo",
    "status": "stub"
  }
}
```

## Design note

`effect.kind` is deliberately a stub. The next pass should replace stubs with executable rule handlers one card at a time, starting with battle flow and destination-changing effects.
