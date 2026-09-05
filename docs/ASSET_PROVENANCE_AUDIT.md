# Asset provenance audit

**Status:** Active legacy-remediation record  
**Started:** 2026-09-04

This file records evidence-backed remediation of assets that were initially classified `legacy-unresolved`. It is an audit trail, not a legal opinion and not a claim that unresolved assets are safe to use. Provenance records document the evidence and permission basis actually established; they do not assert copyrightability, uniqueness, or the absence of third-party rights unless the cited evidence specifically establishes those points.

## Resolved evidence families

The explicit provenance ledger now contains **235 records**. Every remediation record is tied to a historical Git identity checkpoint and the materializer requires the current binary to be byte-for-byte identical to the binary at that checkpoint before writing its SHA-256 record.

### Batch 1 — faction leader artwork

**Status:** Resolved  
**Assets:** 24

This batch covers the twelve normalized faction-leader images in `images/` and the corresponding twelve accepted leader design-sheet/sketch images in `images/sketches/`.

Evidence includes the user-provided **Faction Leader Archetypes** ChatGPT conversation export (2026-07-09; conversation id `6a4f9ae3-b9bc-83ea-8fcb-08008020a034`), `docs/Archive/Gauntlet_v0.6_Character_Design_Sheet_Log.md`, repository introduction history, and OpenAI Terms of Use. Repository commit `4bdb43b04ed2eff8e0f0aa7d7da1ebf89557c931` introduced the normalized set and eleven sketch files; `images/sketches/banker.png` first appeared in `7c17c85404dec0f01d9182af691a1f02cdb9b2ae` and its current Git blob is byte-identical to that original upload.

### Batch 2 — canonical card artwork

**Status:** Resolved  
**Assets:** 184

This batch covers every governed canonical artwork file under `images/artwork/cards/`: Diplomats 23, Financiers 15, Inquisition 17, Intelligence 15, Military 15, Mystics 22, Neutral 52, and Territories 25.

The primary evidence is direct project-owner attestation on 2026-09-04/05 that all canonical Gauntlet card artwork was generated through OpenAI/ChatGPT image generation under Tymon Scott's direction. `docs/artwork/card-artwork-tracker.md` identifies the canonical artwork corpus, and retained ChatGPT/File Library generation records corroborate many individual cards. The identity checkpoint for this attestation is repository commit `fd8e61cf59db30148d86e87fc18c9e42d1cb3a96`.

This corpus-level remediation uses `asset_prefixes` because the evidence itself expressly applies to the complete, tightly scoped canonical card-art directory. Individual prompt recovery is corroborating evidence, not a prerequisite for this batch.

### Batch 3 — active faction symbols

**Status:** Resolved  
**Assets:** 6

The six active faction symbols were directly attested as hybrid project work: OpenAI-generated design concepts produced under Tymon Scott's direction, followed by Tymon's manual cleanup/refinement in Adobe Illustrator. The final active SVGs are therefore recorded as `project-created`, with the generated concept stage documented in their source and rights basis.

Historical candidate files under `images/faction-symbols/candidates/` are intentionally excluded from this batch because their individual lineage has not yet been established.

### Batch 4 — card parchment backgrounds

**Status:** Resolved  
**Assets:** 8

The governed files under `images/artwork/card-backgrounds/` were directly attested as parchment/background textures generated through OpenAI/ChatGPT under Tymon Scott's direction. The batch contains the six faction parchment variants, the neutral parchment variant, and the governed `parchments.webp` asset.

### Batch 5 — card-back composites

**Status:** Resolved  
**Assets:** 2

The governed card-back files under `images/artwork/cardbacks/` and `images/card-backs/` were directly attested as project-created composites assembled from existing Gauntlet assets, principally faction icons and the Gauntlet wordmark. Component provenance remains governed independently; this batch documents the composite files themselves.

### Batch 6 — Gauntlet wordmark/logo family

**Status:** Resolved  
**Assets:** 5

The Gauntlet wordmark and derived logo/icon artwork began from **P22 Declaration Blackletter** letterforms and were manually modified by Tymon Scott in Adobe Illustrator. The resolved files are `images/Gauntlet-G.svg`, `images/Gauntlet.svg`, `images/branding/Gauntlet.ai`, `images/branding/Gauntlet.png`, and `images/branding/gauntlet-icon.png`.

The documented rights basis is Adobe Fonts' license guidance permitting commercial design work and logos, including modification after converting type to outlines or rasterizing it. The provenance record covers the finished modified artwork, not redistribution or relicensing of the P22 font software. References: `https://helpx.adobe.com/fonts/web/font-licensing/font-licensing.html` and `https://fonts.adobe.com/fonts/p22-declaration-pro`.

### Batch 7 — TDS Games mark

**Status:** Resolved  
**Assets:** 1

`images/branding/tds-games-mark.svg` was directly authored by Tymon Scott and is recorded as `project-created`.

### Batch 8 — Tripo3D character-model outputs

**Status:** Resolved  
**Assets:** 5

The five ZIP archives in `images/3d/` (`Alchemist`, `Ambassador`, `Banker`, `Commandant`, and `General`) were directly attested as generated through a **paid Tripo3D plan** approximately two to three weeks before 2026-09-04. Their input character designs were OpenAI-generated Gauntlet designs created under Tymon Scott's direction.

The documented service-rights basis is Tripo's paid-user terms, section 5.2.2 (`https://www.tripo3d.ai/terms`), which grants paid users broad rights to use, modify, distribute, license, and derive revenue from Inputs and Outputs subject to the agreement and applicable law. Input artwork provenance is governed separately.

## Controls applied

`.github/asset-provenance-remediation.json` records each evidence family and its exact paths or tightly scoped corpus prefixes. `.github/scripts/materialize-asset-provenance.py` refuses to materialize a record unless the current binary is byte-for-byte identical to the binary at its documented historical identity checkpoint, then computes the checked-in file's SHA-256. Production CI runs the materializer in read-only `--check` mode and then runs the normal provenance validator.

This means similarly named, visually similar, derived, or later-modified files do **not** inherit a batch classification automatically. A later attestation checkpoint may be used instead of an introduction commit only when the evidence establishes the provenance of the exact binary present at that checkpoint.

## Remaining legacy backlog

A repository-wide inventory after materializing the eight batches found **368 current governed files**, **235 explicit records**, and **133 files still `legacy-unresolved`**. It found **no unrecorded post-baseline anomalies**: all 133 unresolved files are byte-identical to their baseline versions rather than new or silently changed governed assets.

The remaining unresolved files group as follows:

- `images/artwork/`: 58 — reference/reserve artwork plus site and supplemental graphics;
- `images/3d/`: 43 — 2D character/reference inputs and turnarounds, distinct from the five resolved Tripo3D output archives;
- `images/leader-cards/`: 10 — historical rendered leader-card assets;
- `images/sketches/`: 8 — hero sketch/hero-plate assets outside the accepted leader batch;
- `images/faction-symbols/`: 7 — historical/candidate military-symbol files intentionally excluded from the active-symbol attestation;
- `images/rules-arbiter/`: 3 — Chief Justice imagery;
- `card-design/`: 2 — `card-back-pattern.svg` and `deed-ornamental-divider.svg`;
- `images/qr/`: 1 — historical deckbuilder QR SVG;
- `images/social/`: 1 — social preview graphic.

These files remain unresolved pending evidence-family review. The project owner has stated that, other than known font/licensing matters, no additional outside visual/3D source is presently known; that statement is useful audit context but is not being used as a blanket origin classification for files whose exact creation workflow has not yet been established.

The next remediation pass should prioritize the 3D 2D-reference inputs, reference/reserve artwork, historical leader-card renders, supplemental/site artwork, and other small project-generated derivative families. Candidate faction-symbol files should remain separate until their individual lineage is established. Where evidence is insufficient, the asset remains `legacy-unresolved` or becomes a replacement candidate.
