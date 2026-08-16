# Gauntlet Playtest Targets and Metrics

**Status:** Active v0.6.3 testing standard.  
**Purpose:** Define what to record, what healthy play should look like, and what evidence is required before changing canonical rules or card text.

Use this document with the [current v0.6.3 rulebook](../releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md), [Development Status](Gauntlet_Development_Status.md), and the current source hierarchy in [docs/README.md](README.md). Older implementation ledgers remain historical provenance rather than active testing authority.

---

## 1. Testing principles

A useful playtest should answer a specific question. Record the Decks, Leaders, Territories, version, and any intentional variant before play begins.

Prefer:

- repeated matched tests over isolated anecdotes;
- human play after automated simulation;
- unchanged comparison Decks when testing one card or rule;
- exact event counts rather than impressions alone;
- notes about meaningful decisions, not only the winner;
- separating instruction/setup time from game time;
- separating rules confusion, production problems, and balance problems; and
- retaining stopped-game feedback without treating every stopped game as completed-game pacing evidence.

Do not change a canonical rule because one game was unusual. Reopen a frozen element when several tests reveal the same failure or when one test exposes a deterministic exploit or impossible resolution.

---

## 2. Required session record

Record the following for every completed or stopped session.

### Session identity

- date;
- rules version;
- unique sheet serial and digital session identifier;
- players or test agents;
- faction and Leader for each player;
- complete Deck list or saved Deck identifier;
- whether each player used a recommended Deck, modified it, or built a custom Deck;
- three Territories selected by each player and their order;
- first player;
- test type;
- any noncanonical test rule; and
- whether the players received the faction introductions before selection.

Each printed formal-playtest sheet should have a unique single-use QR code. The first scan creates the linked digital session; later scans join it. All Rules Arbiter questions asked through that session should be linked automatically. Closing the session retires the code. A short human-readable serial should remain available for damaged-code fallback and manual reconciliation.

The current coded-session service still identifies itself as v0.6.1 and uses `G061-…` serials pending migration. Record the actual tabletop rules version separately; do not infer it from that legacy service serial.

### Time record

Record separately:

- instruction and setup time;
- game time;
- total session time; and
- time spent on rules lookups where practical.

Do not report total session time as game duration.

### Completion status

Classify the session as:

- completed normally;
- concession;
- external interruption;
- rules blocker;
- component or technical failure; or
- other stopped reason, with explanation.

External-interruption sessions should be excluded from completed-game pacing, victory-route, and win-balance statistics. Retain their decisions, rules questions, production observations, and player feedback.

### Outcome

For a completed game, record:

- winner;
- victory route;
- total turns and rounds;
- final Player Token positions;
- final Territory control;
- final Hand, Draw Pile, Discard Pile, Graveyard, Reserve, and Asset counts where practical; and
- faction-resource or progression state at game end.

For a stopped game, record the same state at the stopping point where practical, but do not assign a projected winner unless the test specifically requires that judgment.

### Activity counts

- battles initiated by each player;
- battles won while attacking and defending;
- tied battles resolved by the governing v0.6.3 battle rules;
- withdrawals, retreats, and additional-position retreats;
- Territories occupied, captured, and recaptured;
- Action Opportunities used before and after movement;
- Gambits set;
- Tactics chosen;
- additional Tactics played;
- Assets banked, activated, replaced, and removed;
- Overlays placed, covered, exposed, transferred with Territory control, and removed;
- reshuffles; and
- turns in which a player had no meaningful legal Action or movement choice.

### Qualitative notes

- hardest decision;
- most satisfying sequence;
- any rule lookup;
- any wording interpreted differently by the players;
- any state or zone that was difficult to represent physically;
- any card that felt automatic, dead, oppressive, or irrelevant;
- whether the losing player retained plausible recovery decisions late in the game;
- whether the faction introduction prepared each player for the selected faction; and
- whether the recommended Deck behaved as the introduction suggested.

### Rules Arbiter record

For every Arbiter question, retain:

- exact question;
- answer shown to the player;
- rules version;
- cited source and section;
- answer classification and confidence;
- session and sheet serial;
- whether the ruling changed play; and
- reviewer correction or follow-up, if any.

The Arbiter must distinguish written canon from interpretation or a provisional table ruling. A later canonical clarification supersedes a provisional ruling.

---

## 3. Core pacing targets

These are investigation thresholds, not automatic balance rules.

### Game length

Target most completed experienced-player games to finish in roughly **35–60 minutes** once players know their Decks.

Track first-game instruction and setup separately. A long first session may expose onboarding or lookup problems without proving that experienced game time is unhealthy.

Investigate when:

- routine completed games exceed 75 minutes;
- instruction or setup remains lengthy after the teaching materials are stable;
- many games end before faction systems meaningfully appear;
- games regularly reach repeated reshuffle loops without territorial progress; or
- a player is functionally defeated many turns before the game ends.

### Territorial movement

Healthy games should contain contested occupation, counterattack opportunities, and at least some control changes.

Investigate when:

- both players repeatedly Hold because advancing is clearly irrational;
- one early capture determines the remainder of the game without meaningful recovery;
- immediate-capture effects routinely erase the normal counterattack window; or
- running the Gauntlet occurs without sustained interaction on opposing Territories.

### Battle decisions

Gambits should feel costly; Tactic choices should feel tactical rather than automatic.

Investigate when:

- players almost always set a Gambit or almost never do;
- players routinely choose the same Tactic without regard to the opposing position;
- one effect category dominates all choices;
- information effects make hidden choices effectively irrelevant;
- chain battles create excessive downtime or unavoidable collapse; or
- the governing defensive rules make attacking controlled Territories consistently futile.

### Card flow

Investigate when:

- players frequently have no cards available for either normal play or battle choices;
- low-value Decks consistently outperform higher-value alternatives only through reshuffle frequency;
- Graveyard pressure removes meaningful participation too early; or
- draw and recovery loops make Gambits effectively free.

---

## 4. Victory-route health

### Running the Gauntlet

Track separately:

1. battles won on the opponent's final Territory;
2. successful occupation through the opponent's counterattack turn;
3. capture of the final Territory;
4. attempts to advance beyond the Gauntlet; and
5. final run-the-Gauntlet battles won by the attacker and defender where applicable under the current rules.

Investigate when the sequence is commonly misunderstood, rarely completed after reaching the final Territory, or routinely bypassed by effects not intended to replace it.

### Additional faction victories

An additional victory should be visible, interactive, and achievable without becoming the only rational plan.

For each faction, record:

- turn when progress first became public;
- turn when the opponent could reasonably respond;
- amount of progress lost to disruption;
- whether progress advanced through ordinary movement and battles;
- whether the threat changed opposing decisions; and
- whether the faction could still pursue running the Gauntlet.

Investigate when an additional victory is:

- effectively solitaire;
- enabled only by opponent cooperation;
- too slow to matter;
- so efficient that territorial play becomes secondary; or
- erased so completely that investing in it is irrational.

---

## 5. Faction-specific watch metrics

### Military

- Command gained and spent;
- Orders used by type;
- additional battles initiated through Orders or cards;
- captures that bypassed a counterattack window; and
- General/Commandant win rate with matched Decks.

### Diplomats

- Terms offered, accepted, refused, and imposed;
- Influence staked, returned, gained, and spent through Leverage;
- Treaty Articles ratified by route;
- turns at which Peace Treaty became a credible threat;
- mirror games in which attacker-first Terms priority mattered; and
- Ambassador/Senator win rate with matched Decks.

### Financiers

- Capital gained and spent;
- cards placed in and removed from Treasury;
- Deeds bought, bought out, or lost;
- turns at which Controlling Interest became a credible threat; and
- Banker/Executive win rate with matched Decks.

### Intelligence

- Missions activated, completed, abandoned, or left dead;
- Intel gained and spent;
- Operation Progress gained and lost;
- Gambit Surveillance and Tactic Surveillance uses;
- Interference uses, targets, replacements, and revised choices;
- prevented Surveillance attempts and their paid Intel;
- Special Operations begun, disrupted, recovered, and completed; and
- Ranger/Spymaster win rate with matched Decks.

### Mystics

- Rites begun, completed, and interrupted;
- turns required for each Rite;
- cards bound, sacrificed, exchanged, or recovered;
- Invocation, Transmutation, and Convergence uses;
- Rituals of Ascendance begun, interrupted, and completed;
- final Ritual battles initiated and their results; and
- Alchemist/Spirit Walker win rate with matched Decks.

### Inquisition

- Conviction gained by source and spent by purpose;
- opposing cards placed in the Graveyard through Condemnation or Purge;
- Purges used by cost tier;
- turns at which Purification became a credible threat;
- Arcane cards that generated Blasphemy Conviction; and
- Grand Inquisitor/Witch Hunter win rate with matched Decks.

---

## 6. Matchup and recovery tests

For each faction pairing, test both seating orders and both Leaders where practical.

Record:

- first-player win rate;
- average completed-game length;
- victory routes used;
- whether either faction's core system was shut off;
- whether a trailing player had meaningful comeback lines; and
- whether one repeated sequence determined the matchup.

Prioritize:

- Inquisition versus Mystics;
- high-pressure Military versus slower progression plans;
- Diplomats against factions that prefer battle;
- Diplomat mirrors under attacker-first Terms priority;
- Financier mirrors and Deed buyouts;
- Intelligence information effects against special reveal or replacement effects; and
- any matchup with heavy Asset, Overlay, or Graveyard interaction.

---

## 7. Production and onboarding testing

Physical review is part of rules testing.

Check:

- card text legibility at 100% print scale;
- portrait cropping and title readability;
- tracker alignment and stability;
- double-sided component registration;
- whether orientation clearly communicates Territory and Overlay control;
- whether supplemental components can be identified without consulting a separate document;
- whether the table footprint is practical;
- whether Hand, Reserve, Gambit, Tactic, Asset Bank, Graveyard, and Discard Pile remain visibly distinct;
- whether players can restore the game state after moving or stacking components;
- whether the faction introductions support informed faction selection;
- whether the recommended Decks reinforce the introductions; and
- whether the sheet QR code and fallback serial are easy to scan and reconcile.

A component or workflow that works only in the digital tool is not complete.

---

## 8. Decision thresholds

Classify findings before acting:

- **Rules defect:** two reasonable readings produce different legal outcomes.
- **Production defect:** the rule is clear but the component, layout, or tool communicates it poorly.
- **Balance concern:** the rule resolves cleanly but creates repeated unhealthy outcomes.
- **Preference:** players differ in taste without evidence of a gameplay failure.

For a normal balance change, seek at least one of:

- a repeated pattern across several human games;
- a strong matched-test difference;
- a reproducible deterministic exploit;
- simulation evidence confirmed by human play; or
- a clear failure against an explicit design guardrail.

Record the evidence and intended correction before editing canonical text.
