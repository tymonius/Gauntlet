# Asset provenance audit

**Status:** Active legacy-remediation record  
**Started:** 2026-09-04

This file records evidence-backed remediation of assets that were initially classified `legacy-unresolved`. It is an audit trail, not a legal opinion and not a claim that unresolved assets are safe to use. Provenance records document the evidence and permission basis actually established; they do not assert copyrightability, uniqueness, or the absence of third-party rights unless the cited evidence specifically establishes those points.

## Resolved evidence families

The explicit provenance ledger now contains **249 records**. Every remediation record is tied to a historical Git identity checkpoint and the materializer requires the current binary to be byte-for-byte identical to the binary at that checkpoint before writing its SHA-256 record.

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

### Batch 9 — historical leader-card derivatives

**Status:** Resolved  
**Assets:** 10

The historical assets under `images/leader-cards/` are project-created crops or wrappers derived from the already-resolved faction-leader artwork. Repository history explicitly identifies these as leader-card crops and crop cleanups, including `a144d3392304b6527700d981369934c4a4caca83` ("Add Alchemist leader-card crop") and `75ccfacc71b7dd596bce7a85b7ea05000b5833ab` ("Add Spirit Walker leader-card crop"). Representative SVG wrappers directly reference their governed source portrait, such as `images/leader-cards/alchemist.svg` embedding `../alchemist.png`.

The derivative presentation files are recorded as `project-created`; the underlying character-art provenance remains governed independently.

### Batch 10 — deterministic card-back symbol pattern

**Status:** Resolved  
**Assets:** 1

`card-design/card-back-pattern.svg` is a project-created deterministic vector composite assembled from the already-governed active faction-symbol paths. Repository history documents flattening, self-containment, baked rotation, and deterministic restoration in commits `1cbdae298e9a76cc6f9e1401d14578609186eb90`, `fd860f5637bce62f509e5d94b90b6c0f039dca85`, and `b0eb132938514a2f18f0c60b7909c23f2bad64f6`.

### Batch 11 — deckbuilder QR

**Status:** Resolved  
**Assets:** 1

`images/qr/gauntlet-v0.6-deckbuilder.svg` is a project-generated functional QR encoding of the Gauntlet deckbuilder destination. Repository history repeatedly identifies and updates/restores the destination to the project-controlled `gauntlet.run` URL, including commits `e3d03c68c182c4ea61947019485b4b09f7ca07b9`, `f8577f4bcc717577c2b9380ce7717b9bfb6fe168`, `75045d622a8225e9141533c1ecaa62fd276e565b`, and `61586adee38266f77a5219f0dedc10a585be138b`.

### Batch 12 — command-tent gameplay painting

**Status:** Resolved  
**Assets:** 1

`images/artwork/site/gauntlet-command-tent-gameplay-painting.webp` is an OpenAI-generated Gauntlet gameplay-showcase painting created under Tymon Scott's direction. The 2026-07-29 project conversation records creation of the painted command-tent gameplay scene in the established Gauntlet visual style, and repository commit `d4cedd89f6db666df86c93e3d76fbe17358d4e5d` added the gameplay showcase artwork. The current WebP is the repository's restored/optimized form of that project artwork.

### Batch 13 — Mystics completed-side supplemental graphic

**Status:** Resolved  
**Assets:** 1

`images/artwork/supplemental/mystics/rite-completed.webp` is a project-created composite. The 2026-08-13/14 project conversation records iterative generation and selection of the parchment/residue image, followed by the explicit decision to add **Completed** with P22 Declaration Pro rather than relying on generated text. The image-generation component is covered by the existing OpenAI rights basis; the finished typography uses the same Adobe Fonts commercial/output rights basis documented for the Gauntlet wordmark family. The record does not authorize redistribution of the P22 font software.

## Controls applied

`.github/asset-provenance-remediation.json` records each evidence family and its exact paths or tightly scoped corpus prefixes. `.github/scripts/materialize-asset-provenance.py` refuses to materialize a record unless the current binary is byte-for-byte identical to the binary at its documented historical identity checkpoint, then computes the checked-in file's SHA-256. Production CI runs the materializer in read-only `--check` mode and then runs the normal provenance validator.

This means similarly named, visually similar, derived, or later-modified files do **not** inherit a batch classification automatically. A later attestation checkpoint may be used instead of an introduction commit only when the evidence establishes the provenance of the exact binary present at that checkpoint.

## Remaining legacy backlog

A repository-wide inventory after materializing the thirteen evidence families found **368 current governed files**, **249 explicit records**, and **119 files still `legacy-unresolved`**. It found **zero unrecorded post-baseline anomalies**: every unresolved file is byte-identical to its baseline version rather than a new or silently changed governed asset.

The remaining unresolved files group as follows:

- `images/artwork/reference/`: 53 — environment/faction/leader references and reserve variants;
- `images/3d/2d assets/`: 43 — character/reference inputs and turnarounds used in the 3D workflow, distinct from the five resolved Tripo3D output archives;
- `images/sketches/`: 8 — hero sketch/hero-plate assets outside the accepted leader-art batch;
- `images/faction-symbols/`: 7 — historical/candidate military-symbol files intentionally excluded from the active-symbol attestation;
- `images/rules-arbiter/`: 3 — Chief Justice imagery;
- `images/artwork/site/`: 2 — the TTS playtest-table screenshot and the homepage three-leader hero;
- `card-design/deed-ornamental-divider.svg`: 1 — traced from an external ornament whose original source/license has not yet been recovered;
- `images/artwork/supplemental/diplomats/ratified-wax-seal.webp`: 1 — Diplomats supplemental seal graphic;
- `images/social/gauntlet-og-1200x630-v2.jpg`: 1 — social preview graphic whose source chain includes the still-unresolved homepage hero.

### Known external-source exception requiring action

`card-design/deed-ornamental-divider.svg` is intentionally **not** being classified from the project owner's general statement that no other external artwork is known. Repository/project history is more specific: on 2026-08-20 the project owner instructed, **"Just trace the one I found"**, and the resulting divider was traced directly into a clean SVG with no redesign. Repository commit `625174164c31231f026f184162fdbe09dc204398` is titled "Add traced Deed ornamental divider," and PR #834 documents use of the traced ornament. The original ornament's source URL, creator, public-domain status, or license has not been recovered. Until that evidence is found, the divider should remain `legacy-unresolved` or be replaced with an original/verified-licensed ornament.

The project owner has stated that, other than known font/licensing matters, no additional outside visual/3D source is presently known. That statement remains useful audit context but is not used as a blanket origin classification when repository or conversation evidence is more specific or an exact creation workflow has not yet been established.

The next remediation pass should prioritize the 43 3D reference inputs/turnarounds, the 53 reference/reserve images, the hero sketch/plate family, Chief Justice imagery, and the remaining site/supplemental graphics. Historical military-symbol candidates should remain separate until their individual lineage is established. Where evidence is insufficient, the asset remains `legacy-unresolved` or becomes a replacement candidate.
