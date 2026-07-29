# Gauntlet Development Status

**Current canonical version:** v0.6.0 — Faction Framework Release  
**Release date:** July 20, 2026  
**Status:** Canonical pre-release playtest edition

Gauntlet v0.6.0 remains the sole published rules and card package for playtesting. Earlier working rules, preliminary rulebooks, review logs, and release trackers are preserved under `docs/Archive/` and are not active sources.

The first physical v0.6.0 playtest was held July 27, 2026. It exposed rules-language, timing, onboarding, table-organization, and playtest-instrumentation problems but no immediate balance failure. Approved corrections are being implemented for v0.6.1 and tracked in [Gauntlet v0.6.1 Implementation Ledger](Gauntlet_v0.6.1_Implementation_Ledger.md). Until the v0.6.1 package is complete and published, the v0.6.0 sources remain canonical.

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

### 1. v0.6.1 source synchronization

- Fold the approved shared battle rules into the governing rulebook.
- Fold each completed faction audit into its definitive faction guide and exact card text.
- Update Neutral cards, Territories, and supplemental components affected by timing, Asset, Overlay, Gambit, or Tactic terminology.
- Regenerate canonical data, printable sheets, reference guides, browser tools, and Rules Arbiter sources.
- Visually inspect every regenerated player-facing artifact before publishing v0.6.1.

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

### 6. Product, onboarding, and table organization

- Maintain tested recommended Decks for Leaders or factions.
- Present concise faction introductions before first-game faction selection.
- Ask whether the introduction prepared each player for the selected faction.
- Produce a player mat or compact reference showing Deck, Discard Pile, Graveyard, Hand, Asset Bank, Leader/Mission, faction-specific areas, Reserve, Gambit, and Tactic zones.
- Determine the best faction pairing and component scope for a future starter product only after revised first-game testing.

### 7. Playtest and Rules Arbiter infrastructure

- Generate a unique single-use QR code and human-readable serial for each printed playtest sheet.
- Let the first scan create the session and later scans join it.
- Link all Rules Arbiter questions and answers to that session automatically.
- Retire the QR code when the session closes.
- Store Arbiter questions, answers, citations, version, and Explicit/Inferred/Unresolved status for review.
- Separate instruction/setup time, game time, and total time in the session record.

## Change discipline

When testing produces an approved change:

1. edit the governing canonical Markdown source;
2. update exact card or component text at the same source level;
3. regenerate canonical data and derived documents;
4. synchronize printable sheets and the Deckbuilder;
5. rerun automated and visual validation;
6. record the change in the next release changelog.

Do not restore an archived document as an active authority. Extract any still-useful rationale into the appropriate current source instead.
