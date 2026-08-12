# Gauntlet Development Status


## Spirit Walker Guardians of the Circle playtest

Guardians of the Circle now scales its protective sacrifice with Mystics progress. On the first battle-loss interruption during the Spirit Walker's turn, protecting a begun Rite or the Ritual of Ascendance requires an Arcane card from Hand with value at least 1 plus the number of completed Rites. It still cannot preserve a continuing position requirement.

Test specifically whether:

- the 1/2/3 value thresholds make protection meaningfully more costly across successive Rites;
- the value-4 threshold is sufficient to balance protection of the Ritual of Ascendance;
- opponent-turn interruption remains a clear and practical counterplay window; and
- the revised ability preserves Alchemist/Spirit Walker parity.

## Financier Financial Capacity playtest

Financiers now determine Financial Capacity after the Capture step and its effects, before drawing. When Treasury value exceeds Territories controlled, they gain 1 additional Action that turn, provided at least one Action is spent on a Financier Faction Action.

Test specifically whether:

- the condition activates too automatically on the second Financier turn;
- the condition remains active too continuously once established; and
- the added economic action accelerates Deed acquisition or compounds Tariffs, Divestment, and Margin Loan too strongly.

**Current canonical version:** v0.6.1 — First Playtest Revision  
**Release date:** July 30, 2026  
**Status:** Canonical playtest edition

Gauntlet v0.6.1 is the current published rules and card package for playtesting. Earlier releases, working rules, preliminary rulebooks, review logs, and release trackers are retained for historical reference and do not override the v0.6.1 governing sources.

The first physical v0.6.0 playtest was held July 27, 2026. It exposed rules-language, timing, onboarding, table-organization, and playtest-instrumentation problems but no immediate balance failure. v0.6.1 implements those approved corrections and adds the production-coded formal playtest workflow.

## Release baseline

The current package contains:

- six factions and twelve Leaders;
- 50 Neutral cards;
- 72 faction cards;
- 25 Territories, including four Arenas;
- the official rulebook and reference guide;
- printable cards and supplemental components;
- the v0.6 Deckbuilder;
- generated canonical JSON and manifest data.

The source hierarchy is listed in [docs/README.md](README.md).

## First physical playtest findings

The July 27 session used the recommended Spymaster and Ambassador Decks. It lasted roughly 90 minutes, reached ten rounds and three battles, and stopped because a player had to leave. Retain its qualitative and onboarding evidence, but exclude it from completed-game pacing and win-balance statistics.

### Positive evidence

- both players rated the experience highly;
- battle tension built over the course of each battle;
- reclaiming Territory produced a strong positional payoff;
- accepted Terms produced a memorable negotiation decision; and
- no card or faction produced an immediate balance alarm.

### Corrective work approved for v0.6.1

- replace hand commitment and Battle Hand vocabulary with Gambit, Reserve, and Tactic;
- separate Gambit and Tactic reveal stages and define resolution priority;
- formalize the Aftermath of the battle;
- distinguish withdrawal, retreat, and post-battle movement;
- clarify Asset replacement and Overlay control;
- audit all six faction pools against the revised battle sequence;
- correct Rules Arbiter inference, citation, and version-label behavior;
- define physical play areas for Hand, Reserve, Gambit, Tactic, Assets, and faction components;
- add faction introductions and recommended Decks to first-game onboarding; and
- link each printed playtest sheet, digital session, and Rules Arbiter history through a unique single-use QR code and fallback serial.

## Current priorities

### 1. v0.6.1 post-release stabilization

- Use v0.6.1 as the sole governing package for current tabletop playtesting.
- Preserve the completed deployment and physical QR lifecycle evidence with the release package.
- Route any discovered defect through the governing source, regenerate affected outputs, and record the correction before the next tagged revision.
- Resume the deferred digital-engine migration without treating the legacy prototype as v0.6.1-compatible.

### 2. Physical and human playtesting

- Verify that every card, Leader, reference, tracker, Proposal, Deed, Rite, and Mission component is legible and practical at final printed size.
- Record instruction/setup time, game time, total time, turn count, capture count, battle count, victory route, and stalled-turn frequency using [Playtest Targets and Metrics](Gauntlet_Playtest_Targets_and_Metrics.md).
- Classify stopped sessions by reason and keep external interruptions separate from completed-game pacing and balance evidence.
- Reopen a frozen rule or card only when testing reveals a specific gameplay, wording, balance, or production failure.

### 3. Shared-rules validation

- Confirm impossible-target and partial-resolution handling across the full pool.
- Validate source-dependent and copied effects, especially Treason, Heresy, Witchcraft, Arcane Knowledge, and other bounded-repeat interactions.
- Confirm that Overlay stacking, dormant removal conditions, capture timing, additional Tactics, and additional Action Opportunities remain consistent across faction packages.
- Verify mirror procedures, especially Diplomat Terms priority and Intelligence choice/revision order.

### 4. Faction and Leader balance

- **Military:** Command pacing, General/Commandant parity, chain battles, retreat pressure, and capture shortcuts.
- **Diplomats:** Influence pacing, Proposal incentives, Peace Treaty progress, Leverage, and Ambassador/Senator parity.
- **Financiers:** Capital growth, Treasury usefulness, Deed clarity, Controlling Interest pacing, and Banker/Executive parity.
- **Intelligence:** Mission completion rates, Intel pacing, Special Operation recovery, information density, and Ranger/Spymaster parity.
- **Mystics:** Rite pacing, Graveyard recursion, Invocation, Transmutation, Convergence, Ritual of Ascendance pressure, and Alchemist/Spirit Walker parity.
- **Inquisition:** Conviction pacing, Purge pricing, Purification viability, Arcane matchup pressure, and Grand Inquisitor/Witch Hunter parity.

### 5. Cross-faction health

- Ensure every faction remains engaged with movement, battle, occupation, capture, and running the Gauntlet.
- Confirm that additional victory conditions are visible, interactive, and disruptable.
- Identify matchups that routinely remove meaningful decisions or make one victory route nonviable.
- Watch the Inquisition–Mystics relationship for healthy counterplay rather than a hard lock.
- Confirm that Territory-scaled Asset capacity accelerates games without making recovery implausible.

### 6. Unified visual identity and production design

- Use the [Visual Identity and Design System](Gauntlet_Visual_Identity_and_Design_System.md) as the roadmap for one coherent language across cards, printed components, the rulebook, the website, browser tools, the future digital implementation, the playmat, packaging, and promotional material.
- Use the [Typography System](Gauntlet_Typography_System.md) and [live typography specimen](../typography/) to test P22 1722 Pro, Adobe Caslon Pro, Georgia, P22 Declaration Pro, Inter, Caslon italic callouts, and actual-size card typography before locking exact scales.
- Complete the Gauntlet wordmark, compact mark, typography system, core palette, faction palettes, shape language, material language, spacing scale, and accessibility standards.
- Build and test the card-front system using both short and text-heavy examples; the initial Neutral implementation is available in the [live card-front specimen](../card-design/), after which the system should expand to faction cards, Assets, Overlays, Territories, Leaders, and supplemental components.
- Run a full brevity pass over all 25 Territory and Arena cards using the unified card-review catalog. Preserve every mechanic, timing condition, and defined term while removing redundant wording in the governing canonical Territory source, then regenerate and validate every derived render and player-facing surface.
- Design the universal card back, Proposal and other required reverses, final faction emblems, functional icons, resource icons, and state markers.
- Consolidate shared website and tool styles only after the foundations are stable enough to avoid repeated migration work.
- Apply the system to the rulebook, reference sheets, instructional diagrams, tokens, trackers, standees, miniature bases, playmat, packaging, and marketing derivatives in the documented implementation sequence.
- Test all print assets at final physical size and all digital applications at desktop and mobile widths, including color-blind, low-ink, contrast, keyboard, and reduced-motion validation where applicable.

### 7. Product, onboarding, and table organization

- Maintain tested recommended Decks for Leaders or factions.
- Present concise faction introductions before first-game faction selection.
- Ask whether the introduction prepared each player for the selected faction.
- Produce a player mat or compact reference showing Deck, Discard Pile, Graveyard, Hand, Asset Bank, Leader/Mission, faction-specific areas, Reserve, Gambit, and Tactic zones.
- Determine the best faction pairing and component scope for a future starter product only after revised first-game testing.

### 8. Playtest and Rules Arbiter infrastructure

Implemented on the v0.6.1 revision branch:

- a batch generator creates one live digital session, unique QR code, and human-readable serial for each formal printed sheet;
- the public QR contains only the join URL while the facilitator receives a private host manifest;
- participants may join the session, record game timing/status events, and ask the v0.6.1 Rules Arbiter;
- Rules Arbiter questions, answers, citations, version, and Explicit/Inferred/Unresolved status are linked automatically to the session and sheet serial;
- closing a session preserves its records while rejecting future joins and playtest events, retiring the printed QR code; and
- raw join and host credentials are not stored in the database.

Remaining production work:

- apply the shared D1 migration;
- configure Cloudflare and facilitator secrets;
- deploy and health-check both Workers; and
- test an end-to-end generated sheet, scan, join, Arbiter question, session closure, and post-closure rejection before formal use.

### 9. Playable digital implementation — final priority

The automated playable game is deliberately deferred until the v0.6.1 tabletop release is complete. It is not a publication dependency.

Exploratory migration work has been preserved on `feature/v061-digital-engine-migration`. After publication, resume from that branch and:

- replace the legacy hand-commitment and Battle Hand procedure with Gambits, Reserves, Tactics, and the ordered Aftermath;
- migrate every affected Neutral, faction, Leader, Territory, replacement, reveal, withdrawal, and destination handler;
- preserve versioned v0.6.0 behavior where required rather than silently changing existing saved or test states;
- add complete private/public information views and multiplayer synchronization; and
- pass full engine, regression, rules-interaction, and remote-play validation before presenting the digital build as v0.6.1-compatible.

## Change discipline

When testing produces an approved change:

1. edit the governing canonical Markdown source;
2. update exact card or component text at the same source level;
3. regenerate canonical data and derived documents;
4. synchronize printable sheets and the Deckbuilder;
5. rerun automated and visual validation;
6. record the change in the next release changelog.

Do not restore an archived document as an active authority. Extract any still-useful rationale into the appropriate current source instead.
