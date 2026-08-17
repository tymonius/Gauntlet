# Gauntlet: Arena — v0.6.3 Baseline Migration

**Status:** Active compatibility overlay for the next Arena prototype  
**Arena design record:** [Working Design Record](Gauntlet_Arena_Working_Design.md)  
**Current inherited two-player authority:** [Gauntlet v0.6.3 Rulebook](../../releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md) and [v0.6.3 canonical data](../../releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json)  
**Tracking issue:** [#523 — Design and prototype Gauntlet: Arena](https://github.com/tymonius/Gauntlet/issues/523)  
**Recorded:** August 17, 2026

## Purpose

The Arena Working Design Record was established while v0.6.2 was the active two-player baseline. Gauntlet v0.6.3 is now the current canonical playtest release.

This document migrates **inherited standard-game authority** to v0.6.3 without silently changing Arena-specific prototype decisions. It is a compatibility overlay, not a new Arena ruleset.

For the next Arena test:

1. use v0.6.3 for every shared rule, term, card, Territory, faction, and Leader interaction that Arena does not expressly replace;
2. retain existing Arena-specific Prototype rules until they are deliberately revised;
3. treat a Working Design statement that merely says Arena “inherits v0.6.2” as superseded by this document; and
4. where a v0.6.3 change creates a genuine four-player ambiguity, keep that subject open rather than importing a two-player answer by analogy.

## Migration matrix

| Subject | v0.6.3 inherited baseline | Arena consequence |
| --- | --- | --- |
| Rules authority | v0.6.3 is the current two-player release. | New Arena tests must not use v0.6.2 as their default shared-rules authority. |
| Deck terminology | **Deck** is the constructed ordinary-card set; **Draw Pile** is the shuffled in-play pile. | Replace inherited `Playable Deck` or overloaded `deck` assumptions when Arena materials are next edited. Existing Arena rule “one shared Deck” means one current v0.6.3 Deck per player. |
| Opening selection | After faction setup, draw four, discard one face up, keep three; Territory arrangement follows the known opening Hand/discard; first-player roll follows arrangement. | The card-selection procedure can be inherited. Arena still has explicit open questions about four-player arm arrangement and first-player procedure, so those are not silently resolved here. |
| Action structure | Turn sequence uses **Opening** and **Denouement** as the two normal Action phases. A player normally has one Action total and no more than one Action in either phase; additional Actions do not create additional phases. | Arena retains one shared player-level Action allowance. Its two movement points are an Arena movement rule, not extra Actions or Action phases. Any old `Action Window` language should be retired when encountered. |
| Ordinary movement | The normal Movement choices are **Advance, Hold, or Fall Back**. Effect-granted movement follows current movement-sequence rules. | Arena's two-force/two-point movement expressly replaces the one-token geometry while continuing to use Advance/Fall Back direction. Any force-local effect-granted movement must be audited against the current shared movement rule. |
| Front Line and Capture | Controlled Territories form a contiguous **Front Line** from the player's own end. Normal Capture advances that line by the next opposing Territory rather than creating non-contiguous control. | Arena's branching Front model is an express multiplayer replacement that now must be reconciled with current Front Line terminology. The existing cut-off-control question remains open. Immediate Front Line advancement effects must identify a legal branch and preserve connection. |
| Occupation vs. control | Position/Occupation and Territory control remain distinct; deep Occupation does not itself create non-contiguous control. | This supports Arena's existing distinction between force position and player control. No Arena-specific change is adopted by this migration. |
| Fall Back, withdrawal, retreat | **Fall Back** is ordinary backward Movement. **Withdrawal** ends or prevents a battle without a winner/loser. **Retreat** follows a battle loss and carries loss/retreat consequences. | Arena's directional retreat and Breakout geometry remains an express prototype rule. Its semantics must still preserve the current distinction between retreat and withdrawal, especially for Terms, battle-ending effects, and Breakout edge cases. |
| Tied battles | A tied final Battle Total proceeds to an unmodified **Tiebreak Roll**: one die each, with no Advantage/Disadvantage, card effects, numeric modifiers, or previous totals unless an effect expressly modifies a Tiebreak Roll. | The Working Design already names Tiebreak Roll for Arena Battles. All Arena battle and Breakout ties inherit the current v0.6.3 procedure unless a future Arena rule expressly replaces it. |
| Battle flow | A pending battle is established before battle Onset; applicable Diplomat Terms resolve before the battle begins. Gambit, Reserve, Tactic, reveal, dice, result, and Aftermath use the current v0.6.3 procedures and destinations. | Multiplayer targeting rules may restrict who participates, but one-on-one Arena battles otherwise inherit current timing. Do not revive v0.6.2-era or earlier battle terminology just because it appears in prototype notes. |
| Gambits and Tactics | Current v0.6.3 eligibility, reveal timing, additional-Tactic rules, and default destinations govern. | Arena cards/resources used in a battle must follow current card-flow rules. Multi-battle turns do not refresh cards, resources, or once-per-turn permissions unless a rule says so. |
| Assets, Overlays, binding | Use current v0.6.3 component and card-zone rules. | The central Arena's existing prohibition on persistent attachments remains an Arena-specific prototype rule. Every old component-type name in the Working Design should be checked against current terminology before publication or testing. |
| Standard victory | Two-player normal victory is **Run the Gauntlet**, by final-Territory capture or winning a legal Last Stand. | Arena expressly replaces the normal shared victory with player elimination and last-player-standing. The Working Design's exclusion of standard Last Stand remains an Arena-specific prototype rule. |
| Faction/card pools | Current v0.6.3 faction systems, Leaders, 13-card faction pools, 50-card Neutral pool, and exact current card text govern. | The eventual Arena compatibility audit must use current v0.6.3 identities/effects, not the earlier v0.6.2 pool. This includes Invasion as Military and all other adopted v0.6.3 wording/mechanics. |
| Territories/Arenas | Current v0.6.3 Territory identities and text govern standard components. | Arena still needs its explicit 25-card Territory/Arena compatibility audit. The central selected Arena tile remains governed by the Arena prototype except for its inherited current printed rule. |

## Existing Arena rules preserved by this migration

This baseline change does **not** itself revise the current prototype decisions for:

- the four-arm cross geometry and neutral central Arena;
- two forces per player;
- two movement points divided between forces;
- one shared player-level Deck, Hand, card zones, faction engine, resources, Action allowance, and control state;
- one-on-one battles;
- winner-directed retreat from an Arena Battle;
- directional retreat outside the Arena;
- Breakout battles and force removal;
- the neutral Arena's non-control/non-capture status;
- branching territorial progress;
- elimination by outermost-Territory capture or loss of both forces; or
- last-player-standing victory.

Those remain Arena-specific prototype rules or open questions exactly to the extent recorded in the Working Design Record.

## Reconciliation required before the next physical prototype test

The following are now explicit pre-test work rather than implicit v0.6.2 inheritance:

- [ ] Integrate current **Front Line** terminology and connection rules into the branching-Front sections without prematurely deciding cut-off control.
- [ ] Audit the two-force movement sections against v0.6.3 effect-granted movement and current Advance/Hold/Fall Back terminology.
- [ ] Audit every withdrawal, retreat, and Breakout edge case against the current no-winner withdrawal distinction.
- [ ] Confirm all Arena Battle and Breakout tie paths use the current Tiebreak Roll.
- [ ] Replace stale standard-game terminology in the Working Design Record when those sections are substantively edited.
- [ ] Adapt all six current v0.6.3 faction systems and alternate victories to multiplayer.
- [ ] Audit every current Leader, playable card, Territory/Arena, and supplemental component for four-player targeting and geometry.
- [ ] State the inherited two-player release explicitly on every structured Arena playtest record.

## Authority rule going forward

The Arena Working Design Record governs **Arena-specific design**. The current Gauntlet release governs **shared two-player rules inherited by Arena**. This compatibility overlay records the handoff between them.

A later Arena edit should fold resolved v0.6.3 translations directly into the Working Design Record. Until then, a bare v0.6.2 inheritance statement in that older record is historical context, not active authority for a new test.
