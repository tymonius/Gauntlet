# Legacy v0.6 Development Helpers

This directory contains guided-choice and development helpers for the explicitly legacy v0.6 playable engine.

It is not a current engine surface. The promoted implementation lives under `src/v070/`.

Legacy dev helpers should use the explicit v0.6 aggregate boundaries where the old module graph permits them:

- `../state/v06`
- `../effects/v06`
- `../types/v06`

Legacy development helpers no longer use the generic `../cards` compatibility barrel. Military card definitions are now pure metadata, with stateful Military card procedures separated into `src/state/military-card-effects.ts`, so `guided-options.ts` can import `../cards/military` directly without relying on the former ESM initialization cycle.

Direct imports of specific legacy state procedures remain acceptable inside this historical/dev layer, but current engine code must not depend on this directory.
