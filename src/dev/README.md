# Legacy v0.6 Development Helpers

This directory contains guided-choice and development helpers for the explicitly legacy v0.6 playable engine.

It is not a current engine surface. The promoted implementation lives under `src/v070/`.

Legacy dev helpers should use the explicit v0.6 aggregate boundaries where the old module graph permits them:

- `../state/v06`
- `../effects/v06`
- `../types/v06`

The generic `../cards` compatibility barrel is still used by three dev helpers because importing `cards/v06` directly changes legacy ESM initialization order and exposes an existing circular dependency between card definitions and the state engine. Do not remove that shim dependency until the underlying cycle is broken and the full legacy test suite stays green.

Direct imports of specific legacy state procedures remain acceptable inside this historical/dev layer, but current engine code must not depend on this directory.
