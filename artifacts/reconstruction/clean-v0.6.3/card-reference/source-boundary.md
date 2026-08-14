# Clean v0.6.3 Card Reference source boundary

## Binding gameplay source

This reconstruction reads the certified clean v0.6.3 structured authority directly at runtime:

- `artifacts/reconstruction/clean-v0.6.3/complete-authority/canonical-structured-data.json`
- SHA-256: `9b79203f38d99d79202ccd834f8794a345513503505f1910b71665973dbb7851`
- complete authority set: `64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49`

The complete authority set is the content authority. The public v0.6.1 Card Reference is reused only as a UI/renderer baseline and is not content authority. The withdrawn v0.6.3 candidate and release-candidate payloads are not loaded.

## Reconstruction behavior

The Card Reference exposes all 128 playable cards and 25 Territories from the clean structured authority, preserving six faction allegiances, stable IDs, effect labels, rules notes, Unique state, and Territory Arena state. The adapter explicitly verifies Second Line at `neutral-reserves` and Smuggler's Run at `territory-smuggler-s-pass`.

## Publication firewall

The reconstruction lives only under `artifacts/reconstruction/clean-v0.6.3/card-reference/`, is `noindex,nofollow`, and carries no production analytics tag. It does not modify the public `card-reference/` route, `src/content/current.ts`, release lifecycle state, print/TTS surfaces, or publication pointers. v0.6.1 remains the current public release and publication remains locked.
