# Legacy v0.6 Digital State Module

This directory contains the earlier playable digital-engine architecture used by the explicitly legacy v0.6 development runners.

It is **not** the promoted current engine API. Current promoted implementation lives under `src/v070/` and is exposed through `src/content/current.ts`.

The legacy aggregate API is intentionally versioned as `src/state/v06.ts`. There is no generic state barrel; consumers of this architecture must opt into the v0.6 boundary explicitly.

## Preserved pieces

- `initialize.ts` creates the legacy authoritative `GameState` from two player setups.
- `validation.ts` checks setup shape before game creation.
- `views.ts` converts authoritative state into public and player-private views.
- `actions.ts` defines legacy digital action commands.
- `reducer.ts` and the apply modules execute the earlier playable rules architecture.
- faction and Neutral modules preserve the substantial v0.6 implementation work used by historical regression tests and the legacy dev runners.

These modules remain useful implementation evidence, but they must not be treated as authority for current v0.7.x behavior without deliberate revalidation and promotion.

Foundational legacy state modules use the explicit `../types/v06` type boundary. These imports are type-only and are intentionally migrated independently from runtime `cards` imports, which still participate in an older circular module graph.

The legacy Intelligence runtime subsystem follows the same rule: its state/effect modules import shared engine shapes through `../types/v06` using type-only imports, while existing runtime card imports remain untouched.

The legacy Diplomat runtime subsystem likewise imports its shared engine shapes through `../types/v06` using type-only imports.

## Hidden information rule

The authoritative `GameState` contains all private information. UI and network clients using this legacy architecture should receive only one of these derived views:

- `PublicGameView` for spectators/shared public state.
- `PrivateGameView` for a specific player.

No client should receive the raw authoritative `GameState` during online play.
