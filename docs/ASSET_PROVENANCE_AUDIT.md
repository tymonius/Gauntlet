# Asset provenance audit

**Status:** Active legacy-remediation record  
**Started:** 2026-09-04

This file records evidence-backed remediation of assets that were initially classified `legacy-unresolved`. It is an audit trail, not a claim that unresolved assets are safe to use and not a legal opinion about copyrightability.

## Batch 1 — faction leader artwork

**Status:** Resolved in the explicit provenance ledger  
**Assets:** 24

The first batch covers the twelve normalized faction-leader images in `images/` and the corresponding twelve leader design-sheet/sketch images in `images/sketches/`.

### Evidence used

- the user-provided ChatGPT conversation export for **Faction Leader Archetypes** (2026-07-09; conversation id `6a4f9ae3-b9bc-83ea-8fcb-08008020a034`), which records the image-generation and acceptance/correction process;
- `docs/Archive/Gauntlet_v0.6_Character_Design_Sheet_Log.md`, which explicitly records the accepted leader sheets as generated ChatGPT/session artifacts and maps them to leader names;
- repository commit `4bdb43b04ed2eff8e0f0aa7d7da1ebf89557c931`, which introduced the normalized leader image set and eleven of the twelve sketch files;
- repository commit `7c17c85404dec0f01d9182af691a1f02cdb9b2ae`, which first introduced `images/sketches/banker.png`; its Git blob is byte-for-byte identical to the current file despite a later delete/re-add cycle;
- OpenAI Terms of Use as the documented rights basis between the user and OpenAI for generated Output, qualified in every ledger record so it does not assert copyrightability, uniqueness, or absence of third-party rights.

### Controls applied

`.github/asset-provenance-remediation.json` records the evidence family and candidate paths. `.github/scripts/materialize-asset-provenance.py` refuses to materialize a record unless the current binary is byte-for-byte identical to the binary at its documented introduction commit, then computes the checked-in file's SHA-256. The CI verification workflow checks that the resulting materialized record exactly matches the explicit record in `.github/asset-provenance.json` and then runs the normal provenance validator.

This means similarly named, visually similar, derived, or later-modified files do **not** inherit the batch classification automatically.

## Remaining legacy backlog

All governed assets without complete explicit records remain `legacy-unresolved`. They should be remediated by evidence family rather than by filename inference. Likely follow-up families include faction symbols/branding, card artwork, leader-derived 3D/reference assets, card-design source files, and other historical creative assets.

For each follow-up batch, use repository history plus primary source material (conversation exports, source files, license records, contributor records, or other durable evidence). Where the evidence is insufficient, leave the asset unresolved or replace it with an asset whose provenance can be documented.
