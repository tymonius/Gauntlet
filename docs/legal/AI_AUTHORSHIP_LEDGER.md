# Gauntlet AI & Human Authorship Ledger

**Prepared:** 2026-08-28  
**Purpose:** Evidence ledger for copyright registration and future IP diligence.

The U.S. Copyright Office analyzes AI-containing works based on the human authorship actually present in the final work. Repository ownership, prompting, project direction, or accepting an AI output is not by itself enough to treat the output as human-authored expression.

Use this ledger to record **affirmative human authorship**, not merely the use of an AI tool.

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

Do not mark a v0.6 passage/card/component **H** merely because:
- the underlying game idea came from the project owner;
- the project owner directed or approved the wording;
- the material was committed under the project owner's account;
- the material was iteratively discussed with a generative-AI system.

Use **TBD** until there is affirmative evidence of the human-created expressive contribution. Where generative AI supplied substantially unchanged wording, classify the machine-generated expression **AR** and separately record any qualifying human modifications, selection, coordination, or arrangement.

See `docs/legal/V0_6_0_COPYRIGHT_DIFF_AUDIT.md`.

## Workstream 1 — Rulebook prose

Audit the current Rulebook by section/chapter, with special attention to passages drafted or substantially rewritten through ChatGPT or other generative systems.

### Rulebook table

| Section / path | First version | Class | Human contribution | AI contribution | Registration treatment | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `rulebook/player-facing/current-rulebook.md` — Ch. 1 | TBD | TBD | TBD | TBD | TBD | Git history / conversation provenance |
| Ch. 2 | TBD | TBD | TBD | TBD | TBD | |
| Ch. 3 | TBD | TBD | TBD | TBD | TBD | |
| Ch. 4 | TBD | TBD | TBD | TBD | TBD | |
| Ch. 5 | TBD | TBD | TBD | TBD | TBD | |
| Ch. 6+ | TBD | TBD | TBD | TBD | TBD | |

Do not classify a whole chapter as human-authored merely because the concepts/mechanics originated with a human. The question for copyright registration is who formed the protectable **expression**.

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
