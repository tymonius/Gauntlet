# Gauntlet v0.6.0 Copyright Diff Audit

**Prepared:** 2026-08-28  
**Baseline:** Gauntlet v0.5.7 canonical release  
**Target:** Gauntlet v0.6.0 publication snapshot  
**Purpose:** Identify the new/revised v0.6.0 material relevant to copyright registration while separating preexisting Gauntlet expression from the later release.

> This is a filing-preparation record, not a legal opinion. It intentionally distinguishes copyrightable expression from game mechanics, titles, short phrases, systems, and other uncopyrightable matter.

## 1. The comparison boundary

For copyright filing, the relevant comparison is not current `main` against current `main`. It is the last canonical pre-v0.6 release against the actual v0.6.0 publication snapshot.

### Preexisting baseline

- Version: **v0.5.7 — Core Cleanup Patch**
- Release commit: `e8cf21ea7d7a48ee7b77616b5ab6566fa90ad99e`
- Commit date: **2026-06-26**
- Canonical data: `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`
- Baseline contents: **54 playable card designs and 25 Territories**
- Earlier Gauntlet material predates v0.5.7 and is also treated as preexisting for this audit.

### v0.6.0 publication snapshot

- Version: **v0.6.0 — Faction Framework Release**
- Publication commit: `e3d03c68c182c4ea61947019485b4b09f7ca07b9`
- Commit timestamp: **2026-07-21 01:11:22 UTC / 2026-07-20 21:11:22 EDT**
- Release notes state publication date: **July 20, 2026**
- At that commit, the release directory was `releases/v0.6/`; it was renamed to `releases/v0.6.0/` afterward.
- Publication contents: **122 playable card designs, 25 Territories, six factions, twelve Leaders**

The working date of first publication remains **July 20, 2026**, subject to final confirmation that no substantially identical v0.6.0 work was distributed earlier through another channel.

## 2. Critical deposit-version finding

The files currently stored under `releases/v0.6.0/` on `main` are **not byte-identical to the July 20 publication snapshot**.

For example:

| Work | July 20 publication snapshot | Current archived file |
| --- | --- | --- |
| Rulebook Markdown | Git blob `48cc589e78029b65cf59dbeca550dfd88f14ad47` | Git blob `ffe9768fd477a07f8e0ef518dab44f1258506df3` |
| Canonical JSON | Git blob `669a1f8e6235d9d0475570516905aa9c67c5d273` | later blob on current `main` |

The current Rulebook includes post-publication wording changes, including later movement/Last Stand clarifications. Therefore a deposit intended to represent the work **as first published on July 20** should be recovered from the historical publication commit, not copied from current `main`.

The GitHub Release is also mutable. Its current downloadable assets were uploaded/replaced after the original release publication, including an asset refresh on **August 1, 2026**. Those current assets should not be assumed to be the July 20 edition merely because they appear under the `v0.6.0` release tag.

## 3. Frozen July 20 deposit evidence

The publication commit preserves the following historical release files:

| Work | Historical path at publication commit | Git blob SHA |
| --- | --- | --- |
| Rulebook Markdown | `releases/v0.6/Gauntlet_v0.6.0_Rulebook.md` | `48cc589e78029b65cf59dbeca550dfd88f14ad47` |
| Rulebook PDF | `releases/v0.6/Gauntlet_v0.6.0_Rulebook.pdf` | `e6a6a7e92dbc111c78ffe12a0ff909965c65ff31` |
| Rulebook DOCX | `releases/v0.6/Gauntlet_v0.6.0_Rulebook.docx` | `bdb7934d50e9880a972e4deb656bfb69819237a8` |
| All Cards & Components PDF | `releases/v0.6/Gauntlet_v0.6.0_All_Cards_and_Components.pdf` | `09852bf2759155734292b0b4017ee41c23aa87d0` |
| Canonical Data | `releases/v0.6/Gauntlet_v0.6.0_Canonical_Data.json` | `669a1f8e6235d9d0475570516905aa9c67c5d273` |
| Reference Guide Markdown | `releases/v0.6/Gauntlet_v0.6.0_Reference_Guide.md` | `687d8ad3df653a7c88b6fecfb03b950af29d57d5` |
| Reference Guide PDF | `releases/v0.6/Gauntlet_v0.6.0_Reference_Guide.pdf` | `c8b5ed453a91dd4eff4591043d7fc0e380a9bd5f` |
| Manifest | `releases/v0.6/Gauntlet_v0.6.0_Manifest.json` | `ddac316caf2eec32d76df0bd9e760e4d4deb8107` |
| Changelog | `releases/v0.6/Gauntlet_v0.6.0_Changelog.md` | `9ac790abf8a99189024ad89db77ab70f90850aae` |

These are Git object identifiers, not independent SHA-256 file digests. Before filing, recover the selected binary deposit from this commit and record its SHA-256 separately.

## 4. Objective v0.5.7 → v0.6.0 content diff

### Playable cards

Canonical-data comparison at the publication snapshot shows:

- v0.5.7: **54** playable card designs
- v0.6.0: **122** playable card designs
- **73** v0.6.0 card names did not appear in the v0.5.7 canonical set
- **49** names are shared between the two releases
- among those 49 shared names, only **New Recruits** and **Rallying Cry** have identical cost + Action text + Battle text in the canonical data
- the other **47 shared-name designs** changed in cost, Action/Battle expression, or both
- **5** v0.5.7 names do not appear as playable names in the July 20 v0.6.0 snapshot: `Blockade`, `Embargo`, `Militias`, `Patriotism`, and `The Black Edict`

This numerical comparison is development evidence only. A new title, changed number, or rewritten game instruction is not automatically copyrightable authorship. The underlying mechanics, systems, procedures, short phrases, and titles must not be claimed merely because they changed.

### Distribution by v0.6.0 allegiance

| Pool | Total | Names new relative to v0.5.7 | Shared names |
| --- | ---: | ---: | ---: |
| Neutral | 50 | 14 | 36 |
| Military | 12 | 9 | 3 |
| Diplomats | 12 | 12 | 0 |
| Financiers | 12 | 9 | 3 |
| Intelligence | 12 | 8 | 4 |
| Mystics | 12 | 10 | 2 |
| Inquisition | 12 | 11 | 1 |

The all-new-by-name Diplomat pool and the largely new-by-name faction pools are strong candidates for **new matter**, but the protectable claim still depends on who formed the expressive wording and design elements.

### Territories

- v0.5.7: **25**
- v0.6.0: **25**
- all **25 Territory names** carry forward
- all **25 Territory text strings** differ between the two canonical releases

Many Territory changes are terminology normalization, rules clarification, or mechanical revision. Treat the entire earlier Territory set as preexisting and claim only qualifying new human-authored expression established by the authorship audit.

## 5. Major new/revised bodies of material

The v0.6.0 changelog and canonical sources identify these major additions/revisions.

### Six faction frameworks

v0.6.0 adds complete player-facing faction systems for:

1. Military
2. Diplomats
3. Financiers
4. Intelligence
5. Mystics
6. Inquisition

Each includes faction-specific rules, card pools, Leader rules, components, terminology, and—where applicable—resources or alternate victory structures.

### Twelve Leaders

Two Leaders per faction were added, with Leader-specific rules and supplemental components.

### Supplemental component systems

New release material includes, among other items:

- Military Command / Orders materials
- Diplomat Influence, Terms, Proposals and Treaty Articles
- Financier Capital, Treasury and Deed materials
- Intelligence Missions, Intel and Operation Progress materials
- Mystics Rites and Ritual materials
- Inquisition Conviction and Purge materials
- faction references and trackers

The systems/mechanics themselves are not copyrightable merely as systems. Their qualifying literary/graphic expression, selection, coordination, and arrangement may be.

### Rulebook rewrite and reorganization

The v0.6.0 release states that the official Rulebook was newly authored from canonical Markdown rather than assembled from the earlier PDFs.

The changelog records substantial reorganization/revision around:

- the six-Territory Gauntlet and removal of the former Heartland defined area;
- Last Stand and standard victory language;
- Defender's Advantage;
- face-up Territory setup;
- Action Opportunities;
- Battle Hands and sequential battle choices;
- card destinations;
- retirement of Conditions as a general category;
- Assets and Overlays;
- movement, displacement, occupation, control, and capture;
- Overlay stacking and dormancy;
- six faction sections and Leader material.

This establishes a substantial **revision boundary** for registration purposes, but not by itself the human authorship of each sentence.

## 6. AI/human-authorship boundary

The v0.6.0 development process used generative-AI tools extensively, but **AI involvement is not the same thing as AI authorship**.

The project-level filing posture is that **Tymon Scott is the sole human creator/author of the overall Gauntlet work**. The provenance audit should therefore identify only the appreciable final expression that a generative system actually supplied without sufficient human expressive contribution, rather than treating every passage developed through an AI conversation as presumptively non-human.

For registration purposes, classify final material based on the expression actually present:

- **H / HA:** qualifying human-authored expression, including work where AI functioned only as an assisting tool, may be claimed;
- **HM:** claim qualifying human modifications to AI-generated source expression;
- **AR:** substantially AI-generated final expression that survives without sufficient human expressive contribution must be excluded;
- **TP:** third-party expression must be excluded unless copyright was validly transferred;
- **PD/U:** public-domain or uncopyrightable matter is excluded;
- **TBD:** use only where provenance is genuinely insufficient.

Strong evidence of human authorship includes human-supplied wording or substantial phrasing, dictated clauses/examples/sequence, substantial human rewriting, sufficiently creative human modifications, and creative human selection/coordination/arrangement.

This audit therefore identifies the universe of potentially new matter without assuming that the 73 new-name cards, faction guides, or rewritten Rulebook passages are either automatically human-authored **or** automatically AI-authored.

## 7. Filing consequence

### v0.6.0 Rulebook

The v0.6.0 Rulebook is a viable separate registration target as a published revised/derivative literary work.

Safe limitation posture:

**Exclude**
- all pre-v0.6 Gauntlet expression;
- AI-generated material;
- third-party material;
- uncopyrightable game methods, procedures, systems, titles, and short phrases.

**Claim only after the provenance review**
- qualifying new/revised human-authored text;
- qualifying human editing/modifications;
- qualifying human selection, coordination, and arrangement.

The 2021 source recovery is no longer a prerequisite to this filing if the application broadly excludes **all pre-v0.6 Gauntlet material** rather than attempting to claim it through the v0.6 registration.

### v0.6.0 Cards & Components

The card/component package is a plausible separate registration target, but it should remain behind the Rulebook filing until the card-text and visual-asset authorship audit is complete.

The package mixes:
- preexisting card concepts/expression;
- substantially revised card expression;
- new faction-card expression;
- new supplemental components;
- graphic/layout authorship;
- potentially AI-assisted material;
- uncopyrightable game methods and short text.

A separate filing allows those limitations to be stated more accurately than attempting to combine the entire tabletop release into one undifferentiated claim.

## 8. Recommended filing sequence

1. **Rulebook first.**
   - Recover the July 20 Rulebook PDF from publication commit `e3d03c68...`.
   - Record an independent SHA-256 of that recovered PDF.
   - Complete Rulebook prose authorship classification.
   - Confirm first-publication nation and claimant.
   - Finalize Standard Application limitation/new-material language.
   - File.

2. **Cards & Components second.**
   - Recover the July 20 combined card/component PDF.
   - Audit v0.6 new/revised card text and component expression.
   - Audit visual/graphic/third-party provenance.
   - Choose work type and final claim wording.
   - File if the resulting protectable human-authored claim is substantial enough to justify a separate registration.

3. **Historical 2021 work later.**
   - Continue recovering the old Google Sheets/TTS materials for historical protection and evidentiary completeness.
   - Do not allow that recovery project to delay the 2026 filing if pre-v0.6 material is excluded from the v0.6 claim.

## 9. Remaining filing blockers for Worksheet A

- [ ] Recover exact July 20 Rulebook PDF from publication commit and calculate SHA-256.
- [ ] Complete affirmative human-authorship classification for the final July 20 Rulebook expression.
- [ ] Identify appreciable AI-generated prose/visual material requiring exclusion.
- [ ] Identify appreciable third-party content in the deposit requiring exclusion.
- [ ] Confirm nation of first publication.
- [ ] Confirm claimant/owner at filing time.
- [ ] Confirm no substantially identical v0.6.0 Rulebook was distributed before July 20, 2026.

Everything else needed to define the derivative-work boundary can now be handled by the broad exclusion of pre-v0.6 Gauntlet material.
