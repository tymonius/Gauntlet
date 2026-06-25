# Digital State Module

This module contains the first pure state-layer helpers for digital Gauntlet.

## Current pieces

- `initialize.ts` creates an authoritative `GameState` from two player setups.
- `validation.ts` checks setup shape before game creation.
- `views.ts` converts authoritative state into public and player-private views.

## Hidden information rule

The authoritative `GameState` contains all private information. UI and network clients should receive only one of these derived views:

- `PublicGameView` for spectators/shared public state.
- `PrivateGameView` for a specific player.

No client should receive the raw authoritative `GameState` during online play.
