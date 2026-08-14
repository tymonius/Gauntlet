# Clean v0.6.3 complete authority source boundary

**Status:** certified on manual merge of the containing PR  
**Authority set:** `64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49`  
**Publication:** locked  
**Current public release:** v0.6.1

This authority reconstruction does not copy gameplay content from the withdrawn v0.6.2 canonical package or the historical v0.6.3 release-candidate canonical package.

The complete structured authority is regenerated from the immutable published v0.6.1 canonical baseline by rebuilding the effective v0.6.2 data in memory, running the exact historical v0.6.3 card-language/refinement sequence, and then running the v0.6.3 canonical rules integration. While that sequence runs, the withdrawn v0.6.2 canonical JSON is physically unavailable, so an accidental historical-package dependency fails.

The complete 25-Territory authority is independently checked against the regenerated v0.6.2 state after applying only two historically evidenced v0.6.3 Territory transformations: the Asset ownership-language normalization encoded in scripts/apply-v063-asset-language.mjs (affecting Disrupted Supply Lines) and the stable-ID title migration from **Smuggler's Pass** to **Smuggler's Run**.

The frozen #405 finalized-card tracker is repository evidence, not a live mutable dependency. The current clean-v0.6.3 downstream gameplay payload is used only as an equality target. Any content difference causes the build to fail; the builder never repairs a mismatch by copying the existing downstream value.

`governance/traceability.json` is explicitly excluded from this certification because its version metadata and some expected fields are stale. The decision registry and version-scoped reconstruction records remain the governing provenance records.

Publication remains separately locked. v0.6.1 remains current/public; v0.6.2 and v0.6.3 remain withdrawn.
