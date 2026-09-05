# Legacy v0.6 playable digital engine

This directory contains the earlier playable v0.6-era digital-engine architecture formerly mixed into the active `src/` tree.

It is preserved as historical implementation and migration evidence, not as current gameplay or digital-rules authority. The promoted engine lives under `src/v070/` and is exposed through `src/content/current.ts`.

The archived package retains its original sibling layout (`cards/`, `content/`, `effects/`, `state/`, `types/`, and `dev/`). The CLI and GUI runner sources are preserved under `cli/` and `gui/` as evidence. They are no longer exposed through package scripts because this rules version is not a supported development target.

Routine CI test routing treats `legacy/` as outside the maintained/current source surface. Historical tests here are provenance, not current regression authority. Any behavior reused by the promoted engine must be revalidated against current rules authority and moved into an active versioned/current boundary rather than imported from this archive.
