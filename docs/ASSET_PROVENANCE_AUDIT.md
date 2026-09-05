# Asset provenance audit

**Status:** Active legacy-remediation record  
**Started:** 2026-09-04

This file records evidence-backed remediation of assets that were initially classified `legacy-unresolved`. It is an audit trail, not a legal opinion and not a claim that unresolved assets are safe to use. Provenance records document the evidence and permission basis actually established; they do not assert copyrightability, uniqueness, or the absence of third-party rights unless the cited evidence specifically establishes those points.

## Resolved evidence families

The explicit provenance ledger now contains **367 records** for **368 current governed files**. Every remediation record is tied to a historical Git identity checkpoint and the materializer requires the current binary to be byte-for-byte identical to the binary at that checkpoint before writing its SHA-256 record.

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

### Batch 14 — 3D-workflow 2D references and turnarounds

**Status:** Resolved  
**Assets:** 43

All governed assets under `images/3d/2d assets/` were directly attested by the project owner on 2026-09-05 as created through OpenAI/ChatGPT image generation under Tymon Scott's direction. Some exact repository files were then manually cropped or repositioned by Tymon in Adobe Photoshop. The corpus therefore contains generated originals, extracted views, turnarounds, and project-edited variants.

The remediation records the corpus as `project-created` because the attestation expressly covers the complete directory and some exact binaries include manual project-authored editing. OpenAI-generated source provenance remains documented in the source and rights fields.

### Batch 15 — reference and reserve artwork

**Status:** Resolved  
**Assets:** 53

All governed files under `images/artwork/reference/` were directly attested on 2026-09-05 as generated through OpenAI/ChatGPT under Tymon Scott's direction. This includes environment, faction, leader-reference, and reserve/alternate artwork. The project-owner attestation is the primary corpus-level provenance evidence; historical prompts and repository history remain corroborating evidence where available rather than prerequisites for classification.

### Batch 16 — historical hero sketches and plates

**Status:** Resolved  
**Assets:** 8

The eight remaining hero-sketch and hero-plate files under `images/sketches/` were directly attested on 2026-09-05 as generated through OpenAI/ChatGPT under Tymon Scott's direction. These are separate from the twelve accepted leader design sheets resolved in Batch 1.

### Batch 17 — Diplomats Ratified wax seal

**Status:** Resolved  
**Assets:** 1

`images/artwork/supplemental/diplomats/ratified-wax-seal.webp` was directly attested on 2026-09-05 as generated through OpenAI/ChatGPT under Tymon Scott's direction.

### Batch 18 — historical/candidate faction symbols

**Status:** Resolved  
**Assets:** 7

The seven governed historical/candidate Military faction-symbol files under `images/faction-symbols/candidates/` were directly attested on 2026-09-05 as made through OpenAI/ChatGPT under Tymon Scott's direction. They remain historical candidates rather than active faction marks. This provenance classification is distinct from Batch 3, where the active symbols include Tymon's manual Illustrator cleanup/refinement.

### Batch 19 — Chief Justice / Rules Arbiter imagery

**Status:** Resolved  
**Assets:** 3

The three governed files under `images/rules-arbiter/` were directly attested on 2026-09-05 as generated through OpenAI/ChatGPT under Tymon Scott's direction.

### Batch 20 — remaining site artwork

**Status:** Resolved  
**Assets:** 2

`images/artwork/site/gauntlet-tts-playtest-table.webp` and `images/artwork/site/homepage-hero-three-leaders.webp` were directly attested on 2026-09-05 as made through OpenAI/ChatGPT under Tymon Scott's direction. They are recorded separately from the command-tent gameplay painting resolved in Batch 12.

### Batch 21 — social-preview composite

**Status:** Resolved  
**Assets:** 1

`images/social/gauntlet-og-1200x630-v2.jpg` was directly attested on 2026-09-05 as a composite assembled from other images that OpenAI/ChatGPT had generated under Tymon Scott's direction. Repository PR #364 (`https://github.com/tymonius/Gauntlet/pull/364`) independently documents the social-preview artwork and notes that the committed preview was produced through a temporary image-generation workflow. The finished preview is recorded as `project-created`, with its generated input provenance documented in the source chain.

The eight owner-attested families in Batches 14–21 all use repository commit `c9298f61c4a1d734b7652d6b262d67b22fee71d6` as their identity checkpoint. That checkpoint ties the owner's corpus-level attestations to the exact governed binaries subsequently materialized into the ledger.

## Controls applied

`.github/asset-provenance-remediation.json` records each evidence family and its exact paths or tightly scoped corpus prefixes. `.github/scripts/materialize-asset-provenance.py` refuses to materialize a record unless the current binary is byte-for-byte identical to the binary at its documented historical identity checkpoint, then computes the checked-in file's SHA-256. Production CI runs the materializer in read-only `--check` mode and then runs the normal provenance validator.

This means similarly named, visually similar, derived, or later-modified files do **not** inherit a batch classification automatically. A later attestation checkpoint may be used instead of an introduction commit only when the evidence establishes the provenance of the exact binary present at that checkpoint.

## Remaining legacy backlog

A fresh repository-wide inventory after materializing Batches 14–21 found:

- **368 current governed files**;
- **367 explicit provenance records**;
- **1 current `legacy-unresolved` file**;
- **0 unrecorded post-baseline anomalies**.

The sole current unresolved governed asset is:

- `card-design/deed-ornamental-divider.svg` — traced from an external ornament whose original source/license has not yet been recovered.

### Known external-source exception requiring action

`card-design/deed-ornamental-divider.svg` is intentionally **not** being classified from the project owner's general statement that no other external artwork is known. Repository/project history is more specific: on 2026-08-20 the project owner instructed, **"Just trace the one I found"**, and the resulting divider was traced directly into a clean SVG with no redesign. Repository commit `625174164c31231f026f184162fdbe09dc204398` is titled "Add traced Deed ornamental divider," and PR #834 documents use of the traced ornament. The original ornament's source URL, creator, public-domain status, or license has not been recovered.

Until that evidence is found, the divider should remain `legacy-unresolved` or be replaced with an original or verified-licensed ornament. No other current governed asset remains unresolved by the current-file inventory.

The project owner has stated that, other than known font/licensing matters, no additional outside visual/3D source is presently known. That statement remains useful audit context but is not used to override more specific repository or conversation evidence such as the Deed divider's documented external-source history.
