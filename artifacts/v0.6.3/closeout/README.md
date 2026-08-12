# Gauntlet v0.6.3 — Cross-Surface Closeout

This directory records the final **pre-publication** integration state for v0.6.3. It sits above the earlier source-package and print-package stage manifests: the source package is assembled, the printed-material candidate exists, and the dedicated closeout gate validates that all candidate surfaces agree on the same release state.

The source package's own `deployment-status.json` intentionally describes the earlier source-assembly stage and therefore still says the print package was not ready at that moment. The aggregate manifest in this directory is the current rollout status after the print candidate merged and the cross-surface gate passed.

## Closeout gate

The dedicated closeout workflow rebuilds and validates the governing v0.6.3 card/rules sources, browser surfaces, Rules Arbiter candidate, executable digital candidate, starter Decks, source release candidate, and print candidate on the same commit, then runs the [60-scenario closeout matrix](../../../docs/Gauntlet_v0.6.3_Cross_Surface_Closeout_Matrix.md).

Passing closeout does **not** publish v0.6.3. Until the explicit cutover PR merges, the root site, public Rules Arbiter, digital default, and immutable release package remain on v0.6.2.

After a green closeout merge, the next rollout step is the single v0.6.3 publication/cutover change.
