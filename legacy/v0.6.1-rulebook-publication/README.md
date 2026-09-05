# v0.6.1 Rulebook Publication System

This subtree consolidates the Rulebook design-proof and production-rendering implementation originally developed for the v0.6.1 playtest revision. That implementation remains the historical basis for several later version-specific publication adapters.

It is not Rulebook authority. Current Rulebook authority lives under `rulebook/player-facing/`. The source is retained here as version-pinned publication provenance, and maintained reproduction tooling references this canonical legacy boundary directly.

## Structure

- `rulebook-design/` — approved v0.6.1 visual proof system.
- `rulebook-production/` — v0.6.1 production renderer and fidelity gate built from that approved proof system.
- `images` — symbolic link to the repository image tree so the preserved renderer can resolve its historical relative asset paths without rewriting source files.
- `releases` — symbolic link to the repository release tree so the renderer can read the frozen v0.6.1 Rulebook source at its historical relative path.

The repository-root compatibility aliases have been retired. `legacy/v0.6.1-rulebook-publication/` is the sole repository source boundary for this preserved publication subsystem.

The manual GitHub Actions fidelity workflow executes this preserved subsystem directly and serves this directory as its HTTP root, preserving the original internal `/rulebook-design/` and `/rulebook-production/` browser paths.

Do not add gameplay or Rulebook authority here. Changes should be limited to historical reproducibility and publication compatibility.

Maintained release renderers may reuse this approved presentation engine only through `scripts/build-rulebook-production.py`. That adapter receives its Rulebook source and release identity explicitly; version-specific wrappers remain historical entrypoints. Browser runners set `GAUNTLET_PUBLICATION_PATH` when the repository root, rather than this directory, is the HTTP server root.
