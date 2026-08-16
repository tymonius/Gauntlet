# Gauntlet Development Status

**Current canonical version:** v0.6.3 — Third Playtest Revision  
**Release date:** August 12, 2026  
**Status:** Canonical published playtest edition

Gauntlet v0.6.3 is the current published rules and card package for tabletop playtesting. Earlier releases, working rules, preliminary rulebooks, review logs, release candidates, and implementation ledgers are retained for historical reference and do not override the v0.6.3 governing sources listed in [docs/README.md](README.md).

## Active targeted playtests

### Spirit Walker — Guardians of the Circle

Guardians of the Circle now scales its protective sacrifice with Mystics progress. On the first battle-loss interruption during the Spirit Walker's turn, protecting a begun Rite or the Ritual of Ascendance requires an Arcane card from Hand with value at least 1 plus the number of completed Rites. It still cannot preserve a continuing position requirement.

Test specifically whether:

- the 1/2/3 value thresholds make protection meaningfully more costly across successive Rites;
- the value-4 threshold is sufficient to balance protection of the Ritual of Ascendance;
- opponent-turn interruption remains a clear and practical counterplay window; and
- the revised ability preserves Alchemist/Spirit Walker parity.

### Financiers — Financial Capacity

Financiers determine Financial Capacity after the Capture step and its effects, before drawing. When Treasury value exceeds Territories controlled, they gain 1 additional Action that turn, provided at least one Action is spent on a Financier Faction Action.

Test specifically whether:

- the condition activates too automatically on the second Financier turn;
- the condition remains active too continuously once established; and
- the added economic action accelerates Deed acquisition or compounds Tariffs, Divestment, and Margin Loan too strongly.

## Release baseline

The current v0.6.3 package contains the six factions and twelve Leaders; the full Neutral and faction card pools; the current Territory pool; the official rulebook and reference guide; faction, teaching, and tableside materials; printable physical components; starter Deck data; canonical JSON; release manifest data; and the formal playtest sheet.

The release package is immutable historical evidence once published. Active tooling and development documentation must point to it rather than silently changing its contents.

## Historical playtest baseline

The first physical v0.6.0 playtest was held July 27, 2026. It exposed rules-language, timing, onboarding, table-organization, and playtest-instrumentation problems but no immediate balance failure. v0.6.1 implemented the first approved correction wave and introduced the production-coded formal-playtest workflow. v0.6.2 and v0.6.3 subsequently superseded that rules baseline.

The July 27 session used the recommended Spymaster and Ambassador Decks. It lasted roughly 90 minutes, reached ten rounds and three battles, and stopped because a player had to leave. Retain its qualitative and onboarding evidence, but exclude it from completed-game pacing and win-balance statistics.

### Positive evidence from that session

- both players rated the experience highly;
- battle tension built over the course of each battle;
- reclaiming Territory produced a strong positional payoff;
- accepted Terms produced a memorable negotiation decision; and
- no card or faction produced an immediate balance alarm.

### Corrective work first adopted for v0.6.1

- replace hand commitment and Battle Hand vocabulary with Gambit, Reserve, and Tactic;
- separate Gambit and Tactic reveal stages and define resolution priority;
- formalize the Aftermath of the battle;
- distinguish withdrawal, retreat, and post-battle movement;
- clarify Asset replacement and Overlay control;
- audit all six faction pools against the revised battle sequence;
- correct Rules Arbiter inference, citation, and version-label behavior;
- define physical play areas for Hand, Reserve, Gambit, Tactic, Assets, and faction components;
- add faction introductions and recommended Decks to first-game onboarding; and
- link printed playtest sheets, digital sessions, and Rules Arbiter history through unique codes and fallback serials.

These bullets are historical provenance, not a statement that v0.6.1 remains current.

## Current priorities

### 1. v0.6.3 post-release stabilization

- Use v0.6.3 as the sole governing package for current tabletop playtesting.
- Route discovered rules or card defects through the governing current source, then regenerate affected active surfaces and record the correction for the next tagged revision.
- Preserve older release packages and implementation records as immutable provenance.
- Keep public documentation, browser tools, and Rules Arbiter version labels synchronized with the current release.

### 2. Physical and human playtesting

- Verify that every card, Leader, reference, tracker, Proposal, Deed, Rite, Mission, marker, and tableside component is legible and practical at final printed size.
- Record instruction/setup time, game time, total time, turn count, capture count, battle count, victory route, and stalled-turn frequency using [Playtest Targets and Metrics](Gauntlet_Playtest_Targets_and_Metrics.md).
- Classify stopped sessions by reason and keep external interruptions separate from completed-game pacing and balance evidence.
- Reopen a frozen rule or card only when testing reveals a specific gameplay, wording, balance, or production failure.

### 3. Shared-rules validation

- Confirm impossible-target and partial-resolution handling across the full pool.
- Validate source-dependent and copied effects, especially bounded-repeat interactions.
- Confirm Overlay stacking, dormant removal conditions, capture timing, additional Tactics, and additional Action Opportunities remain consistent across faction packages.
- Verify mirror procedures, especially Diplomat Terms priority and Intelligence choice/revision order.

### 4. Faction and Leader balance

- **Military:** Command pacing, General/Commandant parity, chain battles, retreat pressure, and capture shortcuts.
- **Diplomats:** Influence pacing, Proposal incentives, Peace Treaty progress, Leverage, and Ambassador/Senator parity.
- **Financiers:** Capital growth, Treasury usefulness, Deed clarity, Controlling Interest pacing, Financial Capacity, and Banker/Executive parity.
- **Intelligence:** Mission completion rates, Intel pacing, Special Operation recovery, information density, and Ranger/Spymaster parity.
- **Mystics:** Rite pacing, Graveyard recursion, Invocation, Transmutation, Convergence, Ritual of Ascendance pressure, Guardians of the Circle, and Alchemist/Spirit Walker parity.
- **Inquisition:** Conviction pacing, Purge pricing, Purification viability, Arcane matchup pressure, and Grand Inquisitor/Witch Hunter parity.

### 5. Cross-faction health

- Ensure every faction remains engaged with movement, battle, occupation, capture, and running the Gauntlet.
- Confirm that additional victory conditions are visible, interactive, and disruptable.
- Identify matchups that routinely remove meaningful decisions or make one victory route nonviable.
- Watch the Inquisition–Mystics relationship for healthy counterplay rather than a hard lock.
- Confirm that Territory-scaled Asset capacity accelerates games without making recovery implausible.

### 6. Unified visual identity and production design

- Use the [Visual Identity and Design System](Gauntlet_Visual_Identity_and_Design_System.md) as the roadmap for one coherent language across cards, printed components, the rulebook, website, browser tools, digital play, playmat, packaging, and promotional material.
- Use the [Typography System](Gauntlet_Typography_System.md) and [live typography specimen](../typography/) before locking exact scales.
- Continue the card-front system across faction cards, Assets, Overlays, Territories, Leaders, and supplemental components.
- Complete universal and faction-specific reverses, emblems, functional icons, resource icons, and state markers.
- Test all print assets at final physical size and all digital applications at desktop and mobile widths, including accessibility checks.

### 7. Product, onboarding, and table organization

- Maintain tested recommended Decks for Leaders or factions.
- Present concise faction introductions before first-game faction selection.
- Ask whether the introduction prepared each player for the selected faction.
- Continue refining player mats and compact references for Deck, Discard Pile, Graveyard, Hand, Asset Bank, Leader/Mission, faction-specific areas, Reserve, Gambit, and Tactic zones.
- Determine the best faction pairing and component scope for a future starter product only after revised first-game testing.

### 8. Playtest and Rules Arbiter infrastructure

The coded formal-playtest workflow was introduced during the v0.6.1 revision work. Its architecture remains useful, but its runtime versioning is not fully synchronized with the current release.

Current state:

- the unversioned public Rules Arbiter routes to v0.6.3;
- explicitly versioned older Arbiter routes remain available as historical/compatibility surfaces;
- the generic browser-side Rules Assistant fallback still loads v0.6.1 sources and must be migrated before it is a valid v0.6.3 fallback;
- the playtest-session Worker still hard-codes `v0.6.1` and `G061-…` serials; and
- the tagged v0.6.3 Formal Playtest Sheet is the current release artifact.

Required migration work:

- migrate the playtest-session runtime version, serial contract, tests, and linked-session assumptions to v0.6.3 or to a version-neutral contract;
- migrate the Rules Assistant browser fallback to the current release source policy;
- verify session-to-Arbiter version attribution so a legacy session serial cannot mislabel a current ruling; and
- rerun end-to-end sheet, scan, join, ruling, session closure, and post-closure rejection tests after the runtime changes.

### 9. Playable digital implementation

The automated playable game is post-release development work and is not a publication dependency for v0.6.3.

The earlier `feature/v061-digital-engine-migration` work remains historical implementation evidence. The active target is now explicit synchronization with v0.6.3:

- generate engine-facing content from the v0.6.3 canonical dataset;
- replace legacy battle and card-flow assumptions with current rules and terminology;
- migrate every affected Neutral, faction, Leader, Territory, replacement, reveal, withdrawal, and destination handler;
- preserve older version behavior only where an explicitly versioned compatibility surface requires it;
- add complete private/public information views and multiplayer synchronization; and
- pass full engine, regression, rules-interaction, and remote-play validation before presenting the digital build as v0.6.3-compatible.

## Change discipline

When testing produces an approved change:

1. edit the governing current source;
2. update exact card or component text at the same source level;
3. regenerate canonical data and derived documents for the next release candidate or tagged revision as appropriate;
4. synchronize printable sheets, browser tools, and Rules Arbiter surfaces;
5. rerun automated and visual validation; and
6. record the change in the next release changelog.

Do not restore an archived or superseded document as active authority. Extract any still-useful rationale into the appropriate current source instead.
