# Gauntlet v0.6.3 — Cross-Surface Closeout

This directory records the final **pre-publication** integration state for v0.6.3. The dedicated closeout gate rebuilds the source package and printed-material package from the same current candidate, then validates that all candidate surfaces agree.

The source package's own `deployment-status.json` intentionally describes the source-assembly stage. The aggregate manifest here is the current rollout status after the full source + print + cross-surface gate passes.

## Freshness lock

The closeout manifest stores SHA-256 fingerprints for the tracked source package, print HTML + manifest, development browser surfaces, Rules Arbiter candidate, digital v0.6.3 modules, and faction-symbol assets. A later change to those tracked candidate surfaces makes the materialized closeout record stale; publication validation must fail until closeout is rebuilt.

Raw PDF bytes are deliberately excluded from the fingerprint because Chromium/PDF tooling can rewrite document metadata without changing the rendered pages. The closeout workflow instead re-renders all 11 PDFs from the fingerprinted print semantics every run and applies the print and visual-regression validators to those fresh files.

## Closeout gate

The dedicated closeout workflow rebuilds and validates the governing v0.6.3 card/rules sources, browser surfaces, Rules Arbiter candidate, executable digital candidate, finalized starter Decks, source release candidate, and print candidate on the same commit, then runs the [60-scenario closeout matrix](../../../docs/Gauntlet_v0.6.3_Cross_Surface_Closeout_Matrix.md).

Passing closeout does **not** publish v0.6.3. Until the explicit cutover PR merges, the root site, public Rules Arbiter, digital default, and immutable release package remain on v0.6.2.

After a green closeout merge, the next rollout step is the single v0.6.3 publication/cutover change.
