# Gauntlet Development Status

**Current canonical version:** v0.7.0 — Illustrated Cards & Tabletop Simulator  
**Release date:** August 27, 2026  
**Status:** Canonical published playtest edition

Gauntlet v0.7.0 is the current public tabletop/TTS playtest edition. The frozen release package is under releases/v0.7.0/. Current browser and production tooling derive from game-data/current-game.json and rulebook/player-facing/current-rulebook.md.

## Release baseline

v0.7.0 establishes the first fully illustrated, remotely playable public package:

- **142 playable cards** — 52 Neutral and 15 in each of the six factions;
- **25 Territories/Arenas**;
- **6 factions and 12 Leaders**;
- **12 locked starter Decks**, each 30 cards / 60 Deckbuilding Value;
- the Onset-based battle sequence;
- the revised six-Proposal Diplomat Peace Treaty threshold;
- Arcane explicitly identified as a trait rather than allegiance;
- fully illustrated production card faces;
- finished reference cards and faction components;
- a 100-page half-letter Rulebook booklet;
- current Browser Rulebook, Deckbuilder, Card Reference, faction pages, Rules Arbiter, and playtest surfaces; and
- the public v0.7.0 Tabletop Simulator Workshop package.

Published release snapshots remain immutable historical evidence. Corrections discovered after publication must be made in live/current sources or the next release without silently rewriting the frozen package.

## Current priorities

### 1. Post-v0.7.0 stabilization

- Keep all public surfaces labeled and sourced as v0.7.0 until a later release is published.
- Eliminate stale v0.6.x identity or metadata from current/unversioned surfaces.
- Validate that current card/faction counts, starter Decks, component contracts, and rendered assets agree with the complete current authority.
- Preserve releases/v0.7.0/ unchanged after publication.
- Route gameplay changes through an explicit next-version development state rather than altering the frozen package.

### 2. Broad human playtesting

The primary design need is now evidence from actual games rather than additional speculative system redesign.

Record at minimum preparation/setup time, game time, rounds/turns, battles, captures, winner and victory route, apparent decision point, whether the losing player retained meaningful decisions, faction/Leader matchup, and rules/component friction.

Use both physical play and the public TTS mod. Stopped sessions should remain separate from completed-game pacing and balance evidence.

### 3. Winner/loser experience

Track [issue #464](https://github.com/tymonius/Gauntlet/issues/464) as a first-class player-experience question.

Do not add generic rubber-banding without evidence. Determine whether losses are:

- **painful but satisfying** — the player understands why they lost, retains agency, and wants another game; or
- **painful and alienating** — the player feels trapped, confused, or functionally eliminated well before the rules end the game.

Test when each player first believed the result was decided, whether meaningful decisions remained after that point, whether the decisive mistake was legible, whether positive-feedback loops made recovery implausible, and whether the endgame compressed appropriately.

### 4. Faction and Leader balance

Continue matchup testing across the full v0.7.0 pool.

- **Military:** Command pacing, Order chains, General/Commandant parity, attack tempo, retreat pressure, and whether the absence of an alternate victory remains healthy.
- **Diplomats:** Influence pacing, Proposal incentives, six-Article Peace Treaty timing, refusal pressure, and Ambassador/Senator parity.
- **Financiers:** Capital growth, Treasury usefulness, Deed acquisition, Financial Capacity, and Banker/Executive parity.
- **Intelligence:** Mission completion rates, Intel pacing, Operation Progress, Special Operation visibility/disruption, and Ranger/Spymaster parity.
- **Mystics:** Rite pacing, Graveyard recursion, Invocation/Transmutation, Ritual pressure, Guardians of the Circle, and Alchemist/Spirit Walker parity.
- **Inquisition:** Conviction pacing, Purge pricing, Purification viability, Arcane pressure, and Grand Inquisitor/Witch Hunter parity.

Cross-faction testing should especially identify matchups that remove meaningful decisions or make one victory route effectively nonviable.

### 5. v0.7.1 Mystics Rite expansion

The approved design record is docs/v0.7.1-mystics-rites.json.

Current direction:

- expand the Mystics Rite pool from three to six;
- choose exactly three different Rites as part of the game package;
- keep the selected three public at setup;
- complete all three selected Rites to satisfy the Ritual route's Rite requirement; and
- reset an active Rite immediately if its completion becomes impossible.

The three new Rite concepts are Shattering, Consecration, and Equivalence. Echoes and Crossing are revised while Blood keeps its rules with clarified reminder styling.

Do not treat this design record as published v0.7.0 authority.

### 6. Self-serve playtesting and onboarding

Continue [issue #358](https://github.com/tymonius/Gauntlet/issues/358).

The target is a choice-first workflow in which two testers can discover factions and Leaders, choose what interests them, receive a complete version-locked package or TTS handoff, learn/setup without the designer present, obtain rulings, record a valid session, and submit structured feedback.

The current TTS release substantially reduces remote-play friction, but blind onboarding still needs to prove that strangers can learn and play correctly without facilitation.

### 7. Deckbuilder → TTS interoperability

Add a direct path from a valid custom Deck in the Deckbuilder to a corresponding TTS game package.

The export should preserve faction and Leader, playable-card quantities, Territories, required faction components, version identity, and validation status.

This is the key step that turns the v0.7.0 TTS environment from a starter-Deck playtest surface into a practical environment for testing the full deck-construction game.

### 8. Rules-aware digital implementation

The automated digital engine remains behind the tabletop/TTS game. [Issue #741](https://github.com/tymonius/Gauntlet/issues/741) still describes the migration problem but its v0.6.3 language is now stale and should be rebased to v0.7.0 authority.

The eventual digital target must generate engine-facing content from the complete current authority; implement the Onset/Gambit/Reserve/Tactic/Outcome/Aftermath model; implement all current card, Territory, faction, Leader, replacement, reveal, withdrawal, destination, and copied/repeated-effect rules; preserve private/public information boundaries; support multiplayer synchronization; and pass complete engine/regression/rules-interaction tests.

TTS is the current supported remote-play solution; the rules-aware digital game is not a v0.7.0 publication dependency.

### 9. Arena

[Gauntlet: Arena issue #523](https://github.com/tymonius/Gauntlet/issues/523) remains an active future-mode design record.

Because the Complete Illustrated Edition became **v0.7.0**, Arena is now naturally a **v0.8+** track unless release planning explicitly changes. Do not destabilize the current two-player game in order to accelerate Arena.

Outstanding Arena problems remain branching Fronts, collisions/Position capacity, directional retreat and Breakouts, elimination cleanup, multiplayer targeting/duration, faction-victory adaptation, compatibility auditing, and first physical geometry/pacing tests.

### 10. Release and production discipline

The v0.7.0 launch demonstrated that cross-surface cutover itself is now a meaningful engineering risk.

For every future release:

1. update the complete current gameplay and Rulebook authorities;
2. regenerate all derived card/component/browser/TTS outputs;
3. validate release counts and metadata against actual records;
4. run automated and visual/physical QA;
5. cut over public version labels/routes in one release operation;
6. smoke-test GitHub Pages and TTS/public asset URLs after publication;
7. freeze the published release package and manifest; and
8. make any later correction through current/next-version authority without rewriting the frozen snapshot.

## Active design guardrail

The two-player core is stable enough that major systems should not be reopened merely because a different mechanism sounds interesting.

Reopen a frozen rule, card, or faction system when testing reveals a specific gameplay failure, balance failure, wording/timing defect, matchup lock, onboarding problem, or production/legibility failure.

The immediate question for Gauntlet is no longer what the game could become. It is how the current game behaves across enough real players, decks, factions, Leaders, and matchups to distinguish isolated anecdotes from repeatable design problems.
