# Legacy v0.6 Development Helpers

This directory contains guided-choice and development helpers for the explicitly legacy v0.6 playable engine.

It is not a current engine surface. The promoted implementation lives under `src/v070/`.

Legacy dev helpers should use the explicit v0.6 aggregate boundaries where the old module graph permits them:

- `../state/v06`
- `../effects/v06`
- `../types/v06`

The generic `../cards` compatibility barrel is still used by `guided-options.ts` because its Military card-definition import participates in the existing legacy ESM initialization cycle between `cards/military.ts` and the state engine. `intelligence-options.ts` and `neutral-options.ts` now bypass the aggregate barrel through their pure card modules. Do not remove the remaining shim dependency until the Military state procedures are separated from card definitions and the full legacy test suite stays green.

Direct imports of specific legacy state procedures remain acceptable inside this historical/dev layer, but current engine code must not depend on this directory.
