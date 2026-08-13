# Clean v0.6.3 downstream source boundary

**Status:** reconstruction candidate; not published  
**Certified authority set:** `2da05383c10fe3e784c64b26fd2d9837913011cad996966f49a7ae3a92af8ed9`

The Rulebook and six faction guides certified in `artifacts/reconstruction/clean-v0.6.3/certification/authority-set.json` are the binding clean v0.6.3 authority. The published v0.6.1 canonical data is used only as the stable schema and structure baseline where the seven authority documents do not enumerate the complete neutral-card and Territory catalogs.

The finalized v0.6.3 canonical-data file at `artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json` is pinned to Git blob `955dfa654cac96a9de820867ab694e83d0fb1d36` and is consumed only as a verified delta payload. Its historical provenance fields are stripped and replaced with the clean authority boundary before any downstream artifact is emitted. Withdrawn v0.6.2/v0.6.3 release documents are forbidden as authority.

The twelve starter compositions come from PR #573 (merge `e13cd423bacc4c965aad9f8ed622100bef88d48f`) and are accepted only after legality is revalidated against this rebuilt clean card/Territory pool.

Publication remains separately locked; v0.6.1 remains current/public.
