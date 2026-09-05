# Legacy v0.6 playable digital engine

This directory contains the earlier playable v0.6-era digital-engine architecture formerly mixed into the active `src/` tree.

It is preserved as historical implementation and migration evidence, not as current gameplay or digital-rules authority. The promoted engine lives under `src/v070/` and is exposed through `src/content/current.ts`.

The archived package retains its original sibling layout (`cards/`, `effects/`, `state/`, `types/`, and `dev/`) so its internal relative imports continue to resolve. The explicitly legacy CLI and GUI runners are preserved alongside it under `cli/` and `gui/`.

From the repository root, the opt-in historical runners remain available as:

```bash
npm run dev:legacy:cli
npm run dev:legacy:gui
```

Routine CI test routing treats `legacy/` as outside the maintained/current source surface. Historical tests here are provenance, not current regression authority. Any behavior reused by the promoted engine must be revalidated against current rules authority and moved into an active versioned/current boundary rather than imported from this archive.
