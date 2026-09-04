# Historical digital-engine reconstruction

This subtree preserves the clean v0.6.2 and v0.6.3 reconstruction modules and their co-located tests that were originally developed under `src/reconstruction/`.

These files are historical reconstruction evidence, not part of the promoted digital-engine implementation or current gameplay authority. The reconstructed source files are retained byte-for-byte; their internal relative imports remain valid at this legacy depth.

Keeping this material under `legacy/` removes it from the active `src/**/*.ts` TypeScript boundary while preserving it for provenance, comparison, and targeted historical regression work.

Do not add new engine behavior here. Revalidated procedures belong in an explicit maintained engine layer before they are exposed through the promoted engine surface.
