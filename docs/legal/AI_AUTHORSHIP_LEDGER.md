# Gauntlet AI & Human Authorship Ledger

**Prepared:** 2026-08-28  
**Purpose:** Evidence ledger for copyright registration and future IP diligence.

The U.S. Copyright Office analyzes AI-containing works based on the human authorship actually present in the final work. Repository ownership, prompting, project direction, or accepting an AI output is not by itself enough to make every machine-generated phrase human-authored expression.

For Gauntlet, the audit should nevertheless begin from the correct project-level fact: **Tymon Scott is the sole human creator/author directing the overall work.** The purpose of this ledger is not to reclassify the project as "AI-authored." It is to identify any appreciable final expression that was actually supplied by a generative system without sufficient human expressive contribution, so that those portions can be excluded from a registration while the human-authored text, revisions, modifications, selection, coordination, and arrangement are claimed.

Do not treat mere AI involvement as disqualifying. Use this ledger to distinguish **assistive AI use** from **AI-supplied final expression**.

## Classification codes

| Code | Meaning | Registration treatment |
| --- | --- | --- |
| H | Human-authored expression | Candidate to claim |
| HA | AI used only as an assisting tool; traditional expressive elements formed by human | Candidate to claim, document facts |
| HM | AI source materially modified by a human with independently original expression | Claim human modifications only |
| AR | AI-generated raw/substantially unchanged expression | Exclude/disclaim |
| TP | Third-party material | Exclude unless authorship was validly assigned |
| PD/U | Public domain or otherwise uncopyrightable | Exclude |
| TBD | Insufficient evidence | Resolve before filing |

## Required evidence fields

For each material asset or coherent asset family record:

| Field | Record |
| --- | --- |
| Asset ID / path | Stable card ID, file path, document section, or source module |
| Version first used | Earliest known Gauntlet version |
| Public first-use/publication evidence | Date + URL/commit/release evidence |
| Final-work classification | H / HA / HM / AR / TP / PD/U / TBD |
| Human author(s) | Legal name(s), if any |
| Human contribution | Specific expressive contribution actually created by the human |
| AI system/tool | Tool/model if known |
| AI contribution | Text/image/code/layout elements produced by AI |
| Human modification after AI | Specific changes, not merely "edited" |
| Source/provenance files | Prompt/history/source layers/commits |
| Third-party inputs | Asset/library/font/license |
| Registration treatment | Claim / claim modifications only / exclude |
| Notes | Ambiguities or attorney/examiner questions |

## v0.6.0 filing audit set

For the first registration pass, audit the **July 20, 2026 publication snapshot**, not the later archived v0.6.0 files on current `main`.

### Frozen sources

- Publication commit: `e3d03c68c182c4ea61947019485b4b09f7ca07b9`
- Rulebook Markdown: `releases/v0.6/Gauntlet_v0.6.0_Rulebook.md`, Git blob `48cc589e78029b65cf59dbeca550dfd88f14ad47`
- Rulebook PDF: `releases/v0.6/Gauntlet_v0.6.0_Rulebook.pdf`, Git blob `e6a6a7e92dbc111c78ffe12a0ff909965c65ff31`
- Canonical data: `releases/v0.6/Gauntlet_v0.6.0_Canonical_Data.json`, Git blob `669a1f8e6235d9d0475570516905aa9c67c5d273`
- Cards/components PDF: `releases/v0.6/Gauntlet_v0.6.0_All_Cards_and_Components.pdf`, Git blob `09852bf2759155734292b0b4017ee41c23aa87d0`

### Scope facts

The publication-snapshot comparison against v0.5.7 identifies the material that needs authorship classification:

- 122 v0.6.0 playable card designs versus 54 in v0.5.7;
- 73 card names new to the canonical set;
- 49 shared names, with only New Recruits and Rallying Cry retaining identical cost + Action text + Battle text;
- 47 shared-name designs revised in cost and/or Action/Battle expression;
- all 25 Territory text strings revised;
- six complete faction systems and twelve Leaders;
- a substantially rewritten/reorganized Rulebook.

These are **scope markers, not authorship conclusions**. A new name, changed rule, changed number, or changed mechanic is not itself protectable human authorship.

### Default classification rule for this audit

The audit should not ask merely whether AI participated. It should ask **who formed the protectable expression that survives in the final work**.

Treat the following as strong evidence of human authorship or human-assistive AI use:
- the human supplied the actual wording or substantial phrasing;
- the human dictated specific clauses, examples, sequence, or language and the tool implemented them closely;
- the human substantially rewrote an AI draft;
- AI use was limited to proofreading, formatting, grammar, consistency, organization assistance, or suggestions that the human independently expressed;
- the human made sufficiently creative modifications to machine-generated source material;
- the human selected, coordinated, and arranged material in a sufficiently creative way.

Do **not** classify material as AI-generated merely because it was developed through an AI conversation.

Use **AR** only where the final protectable expression was substantially supplied by a generative system and survives without sufficient human expressive contribution. Use **HM** where qualifying human modifications are protectable even though the source expression was AI-generated. Use **TBD** only where the evidence is genuinely insufficient.

Project direction, approval, mechanics, and ideas remain important context, but they do not by themselves convert machine-supplied wording into human-authored expression.

See `docs/legal/V0_6_0_COPYRIGHT_DIFF_AUDIT.md`.

## Workstream 1 — Rulebook prose

Audit the current Rulebook by section/chapter, with special attention to passages drafted or substantially rewritten through ChatGPT or other generative systems.

### v0.6.0 Rulebook resolved filing table

This table applies to the **July 20, 2026 publication snapshot** and incorporates the targeted expressive-provenance pass in `V0_6_0_EXPRESSIVE_PROVENANCE_AUDIT.md`.

| Section | Class / copyright posture | Human contribution established | AI treatment | Registration treatment |
| --- | --- | --- | --- | --- |
| Welcome to Gauntlet | AR for final three-paragraph expressive prose; H/HA for human-directed substance and surrounding editorial structure | Human supplied substantive constraints, rejected earlier marketing-style wording, required mirror-match accuracy and deck-construction emphasis, selected/approved final placement | ChatGPT supplied the final sentence-level three-paragraph prose; expressly exclude it | Exclude `introductory text generated by artificial intelligence`; claim overall selection/coordination/arrangement |
| Rules Conventions / Playing Cards | H/HA + PD/U | Terminology, hierarchy, editorial conventions, revisions | No additional appreciable AI-generated prose identified | Claim qualifying text/arrangement; game methods excluded |
| 1. Components | H/HA + PD/U | Component model and terminology decisions | No material AI issue identified | Claim qualifying text/arrangement; functional matter excluded |
| 2. Building a Deck | H/HA + PD/U | Strong direct evidence for Deck / Playable Deck / Draw Pile hierarchy and supplemental components | No priority expressive-prose issue | Claim qualifying text/revisions/arrangement |
| 3. Setup | H/HA + PD/U | Human-directed setup decisions and sequencing | No priority expressive-prose issue | Functional procedure excluded; qualifying editing/arrangement claimed |
| 4. Turn Structure | H/HA + PD/U | Human-directed sequence and capture timing | No priority expressive-prose issue | Same |
| 5. Movement | H/HA + PD/U | Human-directed terminology and distinctions | No appreciable nonfunctional block identified as a filing blocker | Same |
| 6. Battles | H/HA + PD/U | Strong direct evidence for battle sequencing and hand-vs-Battle-Hand destinations | No appreciable nonfunctional block identified as a filing blocker | Same |
| 7. Territory Control | H/HA + PD/U | Human-directed occupation/control/capture architecture | No priority expressive-prose issue | Same |
| 8. Running the Gauntlet | H/HA + PD/U | Human-directed objective/Last Stand architecture | Predominantly functional exposition; not treated as a separate AI-authorship blocker | Claim qualifying text/arrangement; systems/procedures excluded |
| 9. Game Zones | H/HA + PD/U | Human-directed zone taxonomy | Low | Claim selection/arrangement and qualifying text |
| 10. Actions, Assets, and Overlays | H/HA + PD/U | Human-directed system integration and terminology | Low outside functional prose | Same |
| 11–16. Factions | H/HA + PD/U; exact short descriptive lines not relied on as principal authorship | Strong human selection, editing, scope, chapter order, mechanics, terminology integration | Exact line-by-line provenance of short faction/Leader descriptions is incomplete, but those short/function-heavy passages do not justify delaying Worksheet A | Claim qualifying editing/arrangement and supported text; do not rely on mottos/titles/function summaries as major literary authorship |
| 17. Glossary | H/HA + PD/U | Human terminology selection/normalization | Low | Claim selection/coordination/arrangement; functional/short matter excluded |
| Quick Reference | H/HA + PD/U | Human selection/condensation/arrangement | Low | Claim compilation arrangement; procedures excluded |
| Rulebook pictorial material | Unclaimed in Worksheet A | Visual provenance reserved for separate visual/card audit | No need to classify each image for this Literary Work filing | Exclude all `pictorial material` from Worksheet A |

The Rulebook filing therefore no longer depends on a sentence-by-sentence AI audit of functional rules or an image-by-image visual provenance audit. The known appreciable AI-drafted literary block is the three-paragraph Welcome; pictorial material is excluded from this filing as a scope choice.

Do not classify a whole chapter as AI-generated merely because it was developed through an AI-assisted workflow. Conversely, human control of mechanics or approval alone does not convert appreciable machine-supplied final expression into human-authored prose.

## Workstream 2 — card text

Audit by card ID, preferably generated from canonical game data.

For each card:
- record whether title/rules/flavor text was written by a human, AI, or collaboratively revised;
- separate uncopyrightable mechanics/short phrases from expressive text;
- identify substantial human rewriting of AI drafts.

A machine-readable ledger should eventually be added next to the canonical game data so future releases can inherit provenance.

Suggested future schema:

```json
{
  "card_id": "military-unbroken-ranks",
  "text_authorship": {
    "classification": "TBD",
    "human_authors": [],
    "human_contribution": "",
    "ai_tools": [],
    "ai_contribution": "",
    "registration_treatment": "TBD"
  },
  "art_authorship": {
    "classification": "TBD",
    "human_authors": [],
    "human_modifications": "",
    "ai_tools": [],
    "registration_treatment": "TBD"
  }
}
```

## Workstream 3 — card artwork

Every production illustration should receive its own row or inherit from a documented batch only where the workflow is genuinely identical.

| Card ID | Artwork file | Class | AI source? | Human modifications | Third-party input | Registration treatment |
| --- | --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD | TBD | TBD |

### Evidence useful for HM claims

Preserve, where available:
- original AI output;
- intermediate edit files/layers;
- masks/compositing files;
- paintover/redraw work;
- before/after exports;
- commit history;
- written description of the human changes.

Cropping, resizing, format conversion, simple color correction, or merely choosing one generated image should not automatically be recorded as sufficiently creative human modification.

## Workstream 4 — graphic design and symbols

Audit:
- Gauntlet logo/wordmark;
- card frames;
- borders;
- faction symbols;
- Arcane trait markers;
- card backs;
- Territory/Leader/component layouts;
- Rulebook diagrams;
- website visual assets.

| Asset | Path | Class | Human author | AI contribution | Third-party input | Registration treatment |
| --- | --- | --- | --- | --- | --- | --- |
| Gauntlet logo/wordmark | TBD | TBD | TBD | TBD | fonts? TBD | TBD |
| Card frame system | `card-design/` | TBD | TBD | TBD | TBD | TBD |
| Faction symbols | TBD | TBD | TBD | TBD | TBD | TBD |
| Card backs | TBD | TBD | TBD | TBD | TBD | TBD |
| Arcane trait marks | TBD | TBD | TBD | TBD | TBD | TBD |

## Workstream 5 — software/code

This project uses generative-AI coding assistance extensively enough that code cannot simply be presumed human-authored because it is committed under the project account.

Audit coherent modules, not every line where that would be impractical:

| Module | Paths | Class | Human-authored architecture/expression | AI-generated code | Human modifications | Third-party deps | Registration treatment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Deckbuilder | `deckbuilder/` | TBD | TBD | TBD | TBD | package audit | TBD |
| Rules engine | `src/` + current engine paths | TBD | TBD | TBD | TBD | package audit | TBD |
| Rules Arbiter | `rules-assistant/` | TBD | TBD | TBD | TBD | package audit | TBD |
| Card renderers | `card-design/` | TBD | TBD | TBD | TBD | package audit | TBD |
| TTS tooling | `tts/` | TBD | TBD | TBD | TBD | TTS/platform | TBD |

## Workstream 6 — third-party/license ledger

Separate copyright **authorship** from permission to use an asset. A licensed third-party asset can be lawful to use while still being excluded from Gauntlet's copyright claim.

| Asset/dependency | Source | License | Commercial use allowed? | Attribution required? | Modified? | Included in deposit? |
| --- | --- | --- | --- | --- | --- | --- |
| Fonts | TBD | TBD | TBD | TBD | TBD | TBD |
| npm dependencies | `package.json` / lockfile | per package | TBD | TBD | N/A | source deposit review |
| TTS/platform assets | TBD | platform terms | TBD | TBD | TBD | exclude |
| Textures/reference assets | TBD | TBD | TBD | TBD | TBD | TBD |

## Release gate addition

For future canonical releases, provenance should become part of release QA:

- every new card has text and art authorship metadata;
- every new visual asset has source/license provenance;
- every substantially AI-generated item is marked before release;
- every externally contributed human work has a written license/assignment status;
- registration-deposit candidates can be generated reproducibly from frozen sources.

This avoids reconstructing authorship months or years later.


## Filing posture for Gauntlet

For registration purposes, the working posture is:

- **Human author:** Tymon Scott.
- **Overall work:** a human-directed and human-authored game publication containing AI-assisted and, in some places, potentially AI-generated material.
- **Claim affirmatively:** qualifying human-authored text; human revisions and sufficiently original modifications; qualifying graphic/design authorship; and human selection, coordination, and arrangement.
- **Exclude only where required:** appreciable final text or pictorial material actually generated by AI without sufficient human expressive contribution; third-party material; preexisting material; and uncopyrightable game systems/methods.
- **Do not characterize Gauntlet as AI-authored** merely because generative tools were used extensively during development.

The practical objective is the broadest accurate human-authorship claim supported by the final work and provenance evidence, not a maximal disclaimer of everything touched by AI.
