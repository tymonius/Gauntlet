# Legacy v0.6 Development Helpers

This directory contains guided-choice and development helpers for the explicitly legacy v0.6 playable engine.

It is not a current engine surface. The promoted implementation lives under `src/v070/`.

Legacy dev helpers should use the explicit v0.6 aggregate boundaries when they need aggregate APIs:

- `../state/v06`
- `../effects/v06`
- `../cards/v06`
- `../types/v06`

Direct imports of specific legacy state procedures remain acceptable inside this historical/dev layer, but current engine code must not depend on this directory.
