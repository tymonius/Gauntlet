# Gauntlet v0.6.3 Implementation Ledger

**Status:** Active next-release decision and propagation record  
**Current canonical release:** [Gauntlet v0.6.2](../releases/v0.6.2/README.md)  
**Release tracker:** [Issue #528](https://github.com/tymonius/Gauntlet/issues/528)  
**Last updated:** August 7, 2026

---

## 1. Authority and release boundary

This ledger records adopted changes for Gauntlet v0.6.3 and the work required to propagate them safely.

Gauntlet v0.6.2 remains the sole canonical playtest release until v0.6.3 has been integrated, validated, packaged, and published. Files under `releases/v0.6.2/` are immutable historical release artifacts and must not be edited to simulate a v0.6.3 release.

A decision recorded here is adopted for v0.6.3 unless later discussion expressly supersedes it. Derived browser, print, structured-data, Rules Arbiter, or digital surfaces do not become authoritative merely because they are updated first.

---

## 2. Adopted opening revisions

### 2.1 Starting position

Each player begins with their Player Token on the Territory at their own end of the Gauntlet.

Placement during setup:

- is not movement;
- does not count as entering a Territory; and
- does not trigger effects that occur when a Territory is entered.

Start-of-turn, beginning-of-turn, and continuous Territory effects may apply normally during the player's first turn when their requirements are satisfied.

### 2.2 Opening Hand selection

After all non-Playable-Deck cards and required components have been removed or prepared, each player:

1. shuffles their remaining cards to form their Draw Pile;
2. draws four cards;
3. chooses one of those cards and places it face up in their Discard Pile; and
4. keeps the other three as their opening Hand.

Both players choose their opening discard before the first-player roll. The roll therefore cannot inform the discard choice.

This is the standard v0.6.3 opening procedure, not an optional mulligan.

---

## 3. Adopted Run the Gauntlet revisions

### 3.1 Umbrella victory term

**Running the Gauntlet** is the normal shared victory condition.

A player runs the Gauntlet and wins immediately by either:

1. capturing the Territory at the opponent's end of the Gauntlet; or
2. winning the opponent's Last Stand.

Neither route is a secondary or lesser form of the normal victory. Both are running the Gauntlet.

### 3.2 Final-Territory capture victory

When a player captures the Territory at the opponent's end of the Gauntlet, that player immediately runs the Gauntlet and wins.

This applies to every legal capture procedure, including:

- normal Capture at the start of the player's turn;
- a Leader ability;
- a faction ability;
- a playable-card effect;
- a Territory effect; or
- another rule that legally advances the player's Front Line to include the opponent's final Territory.

Do not create a victory-only exception that delays or suppresses an immediate-capture ability. If a particular ability proves too strong under this rule, balance that ability directly rather than making capture inconsistent at the final Territory.

### 3.3 Last Stand route

When a player wins a battle on the Territory at the opponent's end and forces that opponent beyond the Gauntlet, the winner remains on the opposing final Territory unless another effect moves them.

A player may initiate the opponent's Last Stand by using a **separate legal movement sequence** to Advance beyond the opponent's end of the Gauntlet while that opponent is beyond the Gauntlet.

The final Territory does not need to be controlled or already captured before that Last Stand can be initiated. Token position, the opponent's beyond-the-Gauntlet position, and the new legal Advance are sufficient.

The battle that first forced the opponent beyond the Gauntlet still ends the movement sequence that created it. The attacker therefore needs an effect or rule that directly permits another movement sequence before they can immediately force a Last Stand.

If the attacker does not initiate a Last Stand, they may remain on the opposing final Territory. The opponent receives the normal opportunity to Counterattack or otherwise dislodge them. If the attacker later captures that final Territory, the capture route wins immediately.

All other Last Stand rules—including defender status, Defensive Edge, battle procedure, destinations, and the result of losing the Last Stand—remain inherited from v0.6.2 unless expressly revised elsewhere in v0.6.3.

---

## 4. Design consequences to preserve

### 4.1 General and Commandant parity

The two Military Leaders should now have visibly different normal-victory strengths:

- the **General** can exploit follow-up movement and chain-battle effects to pursue a displaced opponent into an immediate Last Stand;
- the **Commandant** can exploit immediate-capture effects to consolidate the final Territory and win through capture.

Do not add a final-Territory exception that removes the Commandant's capture payoff or makes the General's movement route the only accelerated normal victory.

### 4.2 Territory ordering

Starting on the first controlled Territory makes Territory order matter from the opening turn.

The first Territory may provide a start-of-turn, beginning-of-turn, draw, Action, movement, or continuous benefit immediately. Enter-triggered effects do not trigger from setup placement.

The Territory-ordering decision should remain visible in first-game teaching and Deckbuilder presentation.

### 4.3 Opening information and first-player fairness

The draw-four-discard-one procedure gives each player one opening selection decision and establishes a face-up Discard Pile before play begins.

Because both discards occur before the first-player roll:

- neither player chooses with known initiative;
- effects that can use the Discard Pile on the first turn interact with a deliberately chosen card; and
- the opening Hand remains three cards.

### 4.4 Battle-start gameplay habit

The v0.6.3 player-facing materials should teach a simple routine whenever a battle begins:

1. review the contested Territory for effects that may apply; and
2. review the Assets the player controls and consider whether any may be useful during the battle.

This is a gameplay habit, not a new rule, timing window, permission, or battle step.

**Primary placement — First Game Guide / Learn to Play:** teach the habit during the first ordinary battle demonstration and repeat it in the shared tableside battle reference immediately before or with Onset.

Use this teaching wording:

> **Battle habit:** Whenever a battle begins, first check the contested Territory for any effect that may apply. Then check your Asset Bank and consider whether any of your Assets may be useful in this battle. Use each effect only at its stated timing.

**Secondary placement — complete Rulebook:** add a visually distinct callout near Onset or the beginning of the battle sequence. Do not make it a numbered procedure.

Use this compact callout wording:

> **Battle Habit:** At the start of a battle, check the contested Territory and your Assets for relevant effects. This is only a reminder; it does not create a new timing window or let you use an effect outside its stated timing.

The purpose is to reduce missed optional effects and help players develop a reliable battle routine without changing battle timing.

---

## 5. Required interaction audit

At minimum, audit:

### Immediate capture and Front Line effects

- Commandant — Fortify;
- Shock and Awe and any consolidation mode;
- Diplomatic Recognition;
- Hostile Takeover;
- Foreclosure;
- Assimilation;
- Manifest Destiny;
- Protracted Siege; and
- any other effect that advances a Front Line or captures outside normal Capture.

### Follow-up movement and Last Stand access

- General Orders, especially Rout;
- Give Chase;
- Countercharge;
- Forced March;
- Invasion;
- King’s Road;
- any effect granting additional movement or another movement sequence; and
- any effect that ends, replaces, or prevents a battle after the opponent has moved beyond the Gauntlet.

### Opening and starting-Territory interactions

- Supply Depot;
- Command Tent;
- King’s Road;
- Ruined Storehouse;
- all beginning-of-turn and start-of-turn Territory effects;
- all enter-triggered Territory effects; and
- faction setup rules that add, remove, bind, or reveal cards before the opening draw.

---

## 6. Ordered propagation plan

1. **Shared source layer**
   - governing setup and victory candidate;
   - normative test matrix;
   - glossary and terminology audit;
   - interaction checklist.

2. **Faction and component layer**
   - exact Leader, faction, card, Territory, and supplemental-component wording where required;
   - General/Commandant parity review;
   - immediate-capture and follow-up-movement compatibility audit.

3. **Player-facing layer**
   - complete Rulebook, including a non-normative Battle Habit callout near Onset or the battle sequence;
   - First Game Guide / Learn to Play material, including the fuller taught battle-start habit during the ordinary-battle walkthrough and shared battle reference;
   - compact Reference Guide;
   - returning-player changes;
   - playtest and tableside references.

4. **Structured and browser layer**
   - canonical v0.6.3 data;
   - Deckbuilder rules and setup presentation;
   - browser Rulebook, Start, reference, and print surfaces;
   - generated player materials.

5. **Rules Arbiter and digital layer**
   - v0.6.3 corpus and deterministic rulings;
   - setup state;
   - victory checks;
   - immediate capture;
   - Last Stand access without prior final-Territory control;
   - executable regressions.

6. **Release closeout**
   - release package and manifest;
   - migration guidance;
   - reproducibility and cross-surface validation;
   - public cutover only after all governing and derived sources agree.

---

## 7. Acceptance requirements

The v0.6.3 implementation is not complete until:

- no active v0.6.3 source places tokens before the Gauntlet during setup;
- no active v0.6.3 source uses a random three-card opening Hand;
- the opening discard always occurs before the first-player roll;
- setup placement is expressly not entering a Territory;
- both capture of the opponent's final Territory and victory in the opponent's Last Stand are described as running the Gauntlet;
- immediate-capture effects can legally win on the final Territory;
- Last Stand access does not require prior control of the final Territory;
- a separate legal movement sequence is still required after the battle that forces the opponent beyond the Gauntlet;
- the v0.6.3 First Game Guide / Learn to Play material teaches the battle-start Territory-and-Assets check;
- the v0.6.3 Rulebook includes the same habit as a non-normative callout near the battle sequence without creating a new timing window;
- all affected Leader, faction, card, Territory, Rules Arbiter, and digital interactions are tested; and
- the published v0.6.2 package remains unchanged.
