# Gauntlet Development Status

**Current canonical version:** v0.7.1 — Mystics Rites & Deck Import  
**Release date:** August 30, 2026  
**Status:** Canonical published playtest edition

Gauntlet v0.7.1 is the current public tabletop/web playtest edition. The frozen release package is under `releases/v0.7.1/`. Current browser and production tooling derive from `game-data/current-game.json` and `rulebook/player-facing/current-rulebook.md`.

The Steam Workshop is deliberately on a separate publication gate: the public Tabletop Simulator mod remains **v0.7.0** until the v0.7.1 TTS candidate completes its manual in-game QA and is explicitly promoted.

## Release baseline

v0.7.1 preserves the v0.7.0 two-player core while adding the approved focused update:

- **142 playable cards** — 52 Neutral and 15 in each of the six factions;
- **25 Territories/Arenas**;
- **6 factions and 12 Leaders**;
- **12 locked starter Decks**, each 30 cards / 60 Deckbuilding Value;
- the Onset-based battle sequence and six-Proposal Peace Treaty threshold;
- a **six-Rite Mystics pool**, with exactly three different Rites selected publicly during game-package construction;
- the approved Echoes and Crossing revisions plus the new Shattering, Consecration, and Equivalence Rites;
- the canonical **Ritual of Ascension** route after all three selected Rites are completed;
- audited faction/card metadata, including 15 Mystics cards and the Unique status of Plenipotentiary and Martyrdom;
- **Deckbuilder → TTS Deck Codes** for v0.7.1 Deck packages;
- current Browser Rulebook, Deckbuilder, Card Reference, faction pages, Rules Arbiter, and playtest surfaces; and
- TDS Games / Misty Hollow Enterprises publication branding.

Published release snapshots remain immutable historical evidence. Corrections discovered after publication must be made in live/current sources or a later release without silently rewriting the frozen package.

## Current priorities

### 1. v0.7.1 Tabletop Simulator QA and promotion

Complete the separately gated v0.7.1 TTS manual QA record before changing the public Workshop target from v0.7.0. Validate the six-Rite Mystics package, Deck Code import, starter Bags, faction components, normal battle handling, and save/reload behavior in the actual TTS client.

Do not label the Workshop v0.7.1 until that gate passes and the subscribed public copy is smoke-tested after publication.

### 2. Broad human playtesting

The primary design need is evidence from actual games rather than additional speculative system redesign.

Record at minimum preparation/setup time, game time, rounds/turns, battles, captures, winner and victory route, apparent decision point, whether the losing player retained meaningful decisions, faction/Leader matchup, selected Mystics Rites when applicable, and rules/component friction.

Use both physical play and the public TTS environment. Stopped sessions should remain separate from completed-game pacing and balance evidence.

### 3. Winner/loser experience

Track [issue #464](https://github.com/tymonius/Gauntlet/issues/464) as a first-class player-experience question.

Do not add generic rubber-banding without evidence. Determine whether losses remain painful but satisfying, or become functionally decided too early. Record when each player first believed the result was decided and whether meaningful decisions remained after that point.

### 4. Faction and Leader balance

Continue matchup testing across the full v0.7.1 pool.

- **Military:** Command pacing, Order chains, General/Commandant parity, attack tempo, and retreat pressure.
- **Diplomats:** Influence pacing, Proposal incentives, six-Article Peace Treaty timing, refusal pressure, and Ambassador/Senator parity.
- **Financiers:** Capital growth, Treasury usefulness, Deed acquisition, Financial Capacity, and Banker/Executive parity.
- **Intelligence:** Mission completion rates, Intel pacing, Operation Progress, Special Operation visibility/disruption, and Ranger/Spymaster parity.
- **Mystics:** six-Rite package selection, individual Rite completion rates, Rite-order incentives, Invocation/Transmutation, Ritual pressure, and Alchemist/Spirit Walker parity.
- **Inquisition:** Conviction pacing, Purge pricing, Purification viability, Arcane pressure, and Grand Inquisitor/Witch Hunter parity.

Cross-faction testing should especially identify matchups that remove meaningful decisions or make one victory route effectively nonviable.

### 5. Self-serve playtesting and onboarding

Continue [issue #358](https://github.com/tymonius/Gauntlet/issues/358).

The target is a choice-first workflow in which two testers can discover factions and Leaders, choose what interests them, receive a complete version-locked package or TTS handoff, learn/setup without the designer present, obtain rulings, record a valid session, and submit structured feedback.

Deck Codes now remove much of the custom-Deck handoff friction; the remaining question is whether unfacilitated testers can use the full flow correctly.

### 6. Rules-aware digital implementation

Work on the automated digital engine remains an active development track, tracked in [issue #741](https://github.com/tymonius/Gauntlet/issues/741).

Synchronize the engine with complete v0.7.1 authority; implement the current Onset/Gambit/Reserve/Tactic/Outcome/Aftermath model and all current card, Territory, faction, Leader, Rite, replacement, reveal, withdrawal, destination, and copied/repeated-effect rules; preserve private/public information boundaries; support multiplayer synchronization; and keep regression/rules-interaction tests exhaustive.

TTS remains the supported remote-play solution while the rules-aware digital game is under development.

### 7. Arena

[Gauntlet: Arena issue #523](https://github.com/tymonius/Gauntlet/issues/523) remains a future-mode design record and is naturally a **v0.8+** track unless release planning explicitly changes.

Do not destabilize the current two-player game to accelerate Arena. Outstanding problems remain branching Fronts, collisions/Position capacity, directional retreat and Breakouts, elimination cleanup, multiplayer targeting/duration, faction-victory adaptation, compatibility auditing, and physical geometry/pacing tests.

### 8. Release and production discipline

For every future release:

1. update the complete current gameplay and Rulebook authorities;
2. regenerate all derived card/component/browser outputs and any release-specific TTS outputs;
3. validate release counts and metadata against actual records;
4. run automated and visual/physical QA;
5. cut over public version labels/routes in one release operation;
6. smoke-test GitHub Pages and other public asset URLs after publication;
7. freeze the published release package and manifest; and
8. make later corrections through current/next-version authority without rewriting the frozen snapshot.

## Active design guardrail

The two-player core is stable enough that major systems should not be reopened merely because a different mechanism sounds interesting.

Reopen a frozen rule, card, or faction system when testing reveals a specific gameplay failure, balance failure, wording/timing defect, matchup lock, onboarding problem, or production/legibility failure.

The immediate question for Gauntlet remains how the current game behaves across enough real players, Decks, factions, Leaders, Rite packages, and matchups to distinguish isolated anecdotes from repeatable design problems.
