# Gauntlet v0.6 Conversation Audit Leads

**Status:** Post-audit list of remaining work-in-progress and future leads.  
**Purpose:** Preserve verified conversation-derived ideas that are not final rules while avoiding duplication of decisions already promoted elsewhere.

The complete 2026-07-10 source audit is documented in:

- `docs/Gauntlet_Conversation_Audit_2026-07-10.md`

Items already promoted to a current source-of-truth document are not unresolved merely because they originated in conversation.

---

## 1. Closed and documented leads

### Current faction and leader names

Current roster:

- Military — General / Commandant
- Diplomats — Ambassador / Senator
- Inquisition — Grand Inquisitor / Witch Hunter
- Arcane — Alchemist / Spirit Walker
- Financiers — Banker / Executive
- Intelligence — Ranger / Spymaster

Older labels such as Magic and Spy are historical only.

**Status:** Documented/current in Working Rules and leader documents.

### Parallel Progress

Both players should usually be able to make meaningful progress toward at least one visible victory path at the same time.

**Status:** Documented/current in Design Principles and Working Rules.

### Neutral-pool and faction-interaction checks

Before faction-locking a card, assess:

- whether other factions lose needed shared counterplay or pacing tools;
- whether the card duplicates, bypasses, or creates strange interactions with the proposed faction mechanic.

**Status:** Documented/current in the card-review protocol.

### Assassins Mission hook

Assassins remains Intelligence and harsh by design. Its Mission should be appropriately difficult.

**Status:** Card classification documented/current; Mission design remains WIP.

### Deckbuilder version modes

The deckbuilder should use a shared UI shell with separate versioned rules/data modes. v0.5 decks should not silently migrate into v0.6.

**Status:** Documented/current in deckbuilder README and Digital Prototype Roadmap.

### Asset-bank purpose and risk

The Territory-scaled Asset bank is intended to accelerate games and connect progress to infrastructure. It may also amplify snowballing.

**Status:** Documented/current in Working Rules and Playtest Targets.

### Multiplayer variants

- 2v2 dual-lane Gauntlet
- cross-board / central Arena
- free-for-all / Arena variant

**Status:** Documented/current as v0.7+ parking-lot material.

### Engineers and Legal faction reservations

- Engineers may specialize in Overlays later without owning them exclusively.
- Scales remain reserved for a possible future Legal faction rather than Inquisition.

**Status:** Documented/current as future design material.

### Leader visual direction

Historical/fictional archetypes and production designs have been promoted to dedicated leader documents.

**Status:** Documented/current as art direction, not rules.

### Lore direction

Shared-civilization institutional framing, early-modern material culture, and rejected direct colonial analogues are now preserved.

**Status:** Documented/current as WIP lore direction in `Gauntlet_Lore_Development_Notes.md`.

### Playtest metrics

Turn terminology, pacing targets, card-economy telemetry, Asset-bank monitoring, and qualitative questions are now centralized.

**Status:** Documented/current in `Gauntlet_Playtest_Targets_and_Metrics.md`.

### Core redesign history

The reason for the v0.5 rebuild and the status of round limits, breach, Foothold, card destinations, and other old directions are now centralized.

**Status:** Documented/current in `Gauntlet_Development_History_and_Superseded_Directions.md`.

### Digital prototype architecture

Canonical data, deckbuilder, rules engine, CLI, GUI, current limitations, and next implementation sequence are now centralized.

**Status:** Documented/current in `Gauntlet_Digital_Prototype_Roadmap.md`.

---

## 2. Active v0.6 work-in-progress leads

### Intelligence Missions

Still needed:

- Mission text for Assassins;
- Mission requirements for other Intelligence faction cards;
- difficulty calibration against card value;
- Special Operation viability and counterplay testing.

Do not invent final Missions from older generic suggestions without reviewing current Intelligence rules.

### Diplomat naming and v0.6.1 overhaul

Still open:

- replacement for `Good Offices` as an ability name;
- final Sanctions family structure;
- Demilitarized Zone form;
- Influence staking and Loss of Face redesign for v0.6.1;
- Proposal recalibration.

### Faction and leader balance

Still requires human testing:

- General versus Commandant;
- Ambassador versus Senator;
- Grand Inquisitor versus Witch Hunter;
- Alchemist versus Spirit Walker;
- Banker versus Executive;
- Ranger versus Spymaster.

### Canonical v0.6 data

Current v0.6 card decisions are still distributed across working rules, metadata, and review logs. Canonical v0.6 data should be created after the migration is sufficiently stable.

### Condition reduction

After card review, audit every Condition and replace it with an Asset, Overlay, or immediate resolution where that preserves the intended effect more cleanly.

---

## 3. Product and tooling leads

### Starter packaging

A future starter product may include the neutral core plus Military and perhaps one additional faction, while a full product may include the complete pool with sufficient multiples.

**Status:** Product lead only. Not a v0.6 rules or release-content decision.

### v0.6 deckbuilder mode

Still needed:

- faction selector;
- leader selector;
- legality filtering;
- faction reference and supplemental-card support;
- v0.6 validation rules;
- v0.6 print/export layouts.

### Digital rules target

Choose explicitly between:

- completing a faithful v0.5.7 digital implementation first; or
- creating a separate v0.6-development mode.

Do not allow placeholder `0.5.6-dev` examples to become an accidental long-term target.

### Playtest data collection

Future digital builds should capture the metrics in `Gauntlet_Playtest_Targets_and_Metrics.md`, but telemetry should follow correct rules implementation rather than precede it.

---

## 4. v0.7+ and optional-module leads

### Multiplayer

Questions remain about:

- lane crossing;
- team versus individual Territory control;
- defending for teammates;
- Asset-bank limits in team play;
- breakthrough count;
- alternate victories in teams and FFA;
- alliances and kingmaking.

### Engineers

Potential future depth:

- Overlay movement, upgrading, repair, dismantling, and chaining;
- connected infrastructure;
- infrastructure-based victory.

### Day/Night

Optional future module only. Needs testing for:

- faction or leader affiliation;
- modest bonuses without dead turns;
- first-player balance;
- whether it speeds decisions or encourages waiting.

### Possible Legal faction

Only a symbolic and thematic reservation currently exists. No faction framework is approved.

---

## 5. Lore leads

The setting should continue one decision at a time.

Open questions include:

- what overarching authority collapsed;
- when and how it collapsed;
- whether factions are at open war, proxy conflict, or institutional competition;
- the geographic scale of a normal Gauntlet;
- the public status of Arcane practice;
- the legal, religious, and political character of the Inquisition;
- the place of towns, communities, and non-faction populations;
- the degree of supernatural certainty.

These remain WIP and should not be answered wholesale in one lore pass.

---

## 6. Do-not-revive reminders

Do not treat the following as current merely because they appear in old conversations:

- Magic or Spy as current faction/leader names;
- round limit as the normal core ending;
- breach or exhaustion markers;
- Foothold as a current rule;
- minimum-2 Asset capacity as adopted;
- all played Battle cards going to the Graveyard;
- Active Effects terminology;
- Heartland cards;
- direct Old World / New World analogue;
- Age of Claims as canon;
- ancient roads or a universal legendary prize as mandatory setting cosmology;
- old card classifications superseded by current review logs.

---

## 7. Next use of this file

Use this file only for unresolved or future leads. When an item becomes approved:

1. write it into the relevant durable source;
2. update its status here or remove it from the unresolved sections;
3. update the Project Index when the source hierarchy or active checkpoint changes.
