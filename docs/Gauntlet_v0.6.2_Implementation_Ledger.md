# Gauntlet v0.6.2 Implementation Ledger

**Status:** Active release-preparation source  
**Baseline:** Gauntlet v0.6.1 — First Playtest Revision  
**Primary tracker:** [Issue #470 — Plan and assemble Gauntlet v0.6.2](https://github.com/tymonius/Gauntlet/issues/470)  
**Evidence:** August 2–4, 2026 playtests and subsequent design decisions

This ledger converts the accepted v0.6.2 design scope into an ordered implementation and synchronization plan. It is not a substitute for the final rulebook, faction guides, card-pool sources, or generated release artifacts. Until v0.6.2 is published, v0.6.1 remains the sole canonical playtest release.

The status categories below are binding:

- **Adopted:** implement unless explicitly superseded.
- **Test revision:** include in v0.6.2, identify as provisional balance work, and continue measuring.
- **Open decision:** do not propagate as canonical until separately resolved.

---

## 1. Release dependencies and locks

Broad source propagation should not begin until the following dependencies are settled sufficiently to prevent repeated repository-wide rewrites.

### Required terminology locks

- [ ] Lock the replacement for battle **opening effects**. **Battle Onset** is the leading term.
- [ ] Lock the replacement for **Defender's Advantage**. **Defensive Edge** is the leading term.
- [x] Adopt **Advance / Hold / Fall Back** for ordinary Movement choices.
- [x] Reserve **withdraw** for leaving or preventing a pending or active battle without a winner.
- [x] Reserve **retreat** for displacement after losing a battle.

### Required card locks — issue #481

The seven-card pool expansion is adopted in concept, but these fields remain unresolved:

- [ ] final value and uniqueness for Landslide;
- [ ] exact Landslide placement modes and complete Overlay text;
- [ ] final value and complete templating for Détente;
- [ ] final value and complete templating for Compound Interest;
- [ ] final value, uniqueness, and complete templating for Extraordinary Rendition;
- [ ] final value, placement modes, and complete templating for Nature's Altar;
- [ ] final value, uniqueness, and complete templating for Martyrdom;
- [ ] interaction and stacking audit for Military Invasion.

See [Issue #481](https://github.com/tymonius/Gauntlet/issues/481).

### Decisions deliberately left open

- Military alternate victory structure and threshold;
- Peace Treaty threshold, retained at five different Proposals for the next test;
- whether Leader Abilities need an explicit relationship to the Faction Ability taxonomy in player-facing references;
- final graphic form of the active-player marker;
- any further existing-card value changes arising from the new cards and rebuilt starter Decks.

No implementation task may silently resolve these questions.

---

## 2. Adopted shared-rule revisions

### Turn and Action system — issue #466

Use this full turn sequence:

> **Capture → Draw → Opening → Movement → Denouement → Cleanup**

- [ ] Replace the v0.6.1 Action Opportunity model in the rulebook and glossary.
- [ ] State that a player normally takes one Action per turn during either Opening or Denouement.
- [ ] State that a player normally cannot take more than one Action in either phase.
- [ ] Retain **Faction Action** and **Faction Ability** as distinct player-facing classifications.
- [ ] Print the permitted phase beside every Faction Action.
- [ ] Retain **Action** as the printed card-effect heading.
- [ ] Rewrite exceptional Action permissions in result-focused language rather than creating immediate or additional Action Opportunities.
- [ ] Preserve exactly two Action phases even when an effect permits two Actions.
- [ ] Audit every card, Leader, faction procedure, example, reference, prompt, and test that uses Action Opportunity terminology.

### Inquisition Purge

Canonical behavior to propagate:

> **Purge — Faction Action, Opening or Denouement.** Spend the listed Conviction to perform one Purge. You may take one Action during both your Opening and your Denouement, provided that one of those Actions is Purge.

- Purge may occupy either Action phase.
- The other Action occupies the other phase.
- Purge never permits two Actions in one phase.
- Purge may be taken as a Faction Action no more than once per turn.
- Final Judgment's Aftermath Purge is a directly permitted Faction Ability. It neither activates nor consumes the Purge Faction Action permission.

### Retreat, withdrawal, and backward movement — issue #473

- [ ] Use **Fall Back** only for the ordinary backward Movement choice.
- [ ] Use **withdraw** only when a pending or active battle ends without determining a winner.
- [ ] Use **retreat** only after a battle loss.
- [ ] Preserve the same normal attacker and defender fallback positions for retreat and withdrawal unless an effect says otherwise.
- [ ] Teach the distinction plainly: **a losing player retreats; a player who leaves without losing withdraws**.

### Contiguous Front Line — issue #460

- [ ] Define each player's Front Line as the contiguous Territories they control from their own end of the Gauntlet.
- [ ] Permit a Player Token to move beyond its controlled line without creating isolated control.
- [ ] Make normal Capture advance control only to the next opposing Territory beyond the player's Front Line.
- [ ] Keep Position, Occupation, Capture, and control distinct.
- [ ] Audit every immediate-capture effect, including Fortify, Shock and Awe / Consolidate, and Diplomatic Recognition.
- [ ] Audit Asset limits, Deeds, Income, capture triggers, Counterattacks, retreats, final-Territory capture, and Last Stand access against contiguous control.

### Straight Tiebreak Roll — issue #476

Canonical rule to propagate:

> If battle totals remain tied after applicable tie-breaking rules, each player makes an unmodified Tiebreak Roll. Do not apply advantage, disadvantage, card effects, numerical modifiers, or the previous battle totals. Higher roll wins; reroll further ties.

Only an effect that expressly refers to a Tiebreak Roll may modify it.

### Pending battle and Terms sequence — issue #457

Use this sequence:

> **Pending battle → Terms → [final battle-start term] → Gambits**

- Establish attacker, defender, and contested Position before Terms.
- Accepted Terms prevent the battle from beginning.
- Refused Terms or no offer proceed into the battle-start stage.
- Ordinary accepted-position baseline: attacker withdraws; defender remains at the contested Position.
- Mutual Disarmament retains both players withdrawing.
- Specialized positional Proposals retain their deliberate outcomes.

---

## 3. Adopted faction and card revisions

### Diplomats — issues #454, #455, #457, and #478

#### Influence

- newly accepted and ratified Proposal: return the Stake, then gain 1 Influence;
- newly refused, imposed, and ratified Proposal: return the Stake, then gain 2 Influence;
- failed Terms: lose the Stake and do not ratify;
- previously ratified Proposals grant no default repeat Influence;
- Proposal-specific text may override the default amounts;
- starting Influence remains 1 for the first v0.6.2 test cycle.

#### Proposal presentation

- [ ] Rewrite Proposals for the receiving player who physically reads the card.
- [ ] Prefer explicit roles: **the Diplomat**, **the accepting player**, **the attacker**, and **the defender**.
- [ ] Avoid perspective-dependent **you/your** when ownership and reader perspective could conflict.
- [ ] Keep Accepted and Refused results independently readable.

#### Good Faith

Accepted result:

> Put that card in your Graveyard, then gain 1 Influence.

Retain the current setup structure and value for the first test.

#### Leverage

Use the Subsidize progression rather than linear conversion:

| Modifier | Total Influence cost |
|---:|---:|
| +1 | 1 |
| +2 | 3 |
| +3 | 6 |
| +4 | 10 |

Each additional +1 costs one more Influence than the previous increment.

#### Gunboat Diplomacy

Remove its special Discard-Pile destination. Normal destinations apply:

- refusal-triggered or normal Gambit: Graveyard;
- normal Tactic: Discard Pile;
- accepted Terms: Discard Pile.

### Financiers — issue #453

**Test revision:** Begin with **2 Capital**.

- [ ] Identify the 2-Capital opening as a v0.6.2 test revision in release and design records.
- [ ] Do not change Line of Credit's collateral cap unless testing shows that 2 starting Capital remains insufficient.
- [ ] Measure first-Deed timing, investment-versus-defense choices, Banker engine startup, and first-game faction identity.

### Mystics — issues #477 and #481

#### Black Covenant

Initial v0.6.2 test at value 4:

> **Tactic:** Gain advantage. Then you may play one card from your Hand with a Tactic or Battle effect face up as an additional Tactic. In the Aftermath, put this card and that card in your Graveyard.

Do not globally weaken advantage or cap numerical bonuses based on the single observed +6 stack. Advantage improves roll reliability but does not raise the d6 ceiling; numerical bonuses raise the battle total. The revised Leverage progression addresses the cheaply purchased part of that stack.

#### Guardians of the Circle

Protecting progress requires sacrificing an eligible Arcane card with value at least:

- first Rite: 1;
- second Rite: 2;
- third Rite: 3;
- Ritual of Ascendance: 4.

### Military — issues #459 and #481

- [ ] Move Invasion from Neutral to Military.
- [ ] Expand every faction pool to 13 cards; no Military card must leave merely for symmetry.
- [ ] Audit Invasion with Onward, Rout, Give Chase, Shock and Awe, and other movement or additional-Tactic effects.
- [ ] Keep the Military alternate victory unresolved.

### New 13-card faction pools and Neutral replacement — issue #481

Target pool structure:

| Pool | v0.6.2 target |
|---|---:|
| Neutral | 50 cards |
| Military | 13 cards |
| Diplomats | 13 cards |
| Financiers | 13 cards |
| Intelligence | 13 cards |
| Mystics | 13 cards |
| Inquisition | 13 cards |

Accepted mechanical slate:

- **Neutral — Landslide:** one-use Territory Overlay that causes a player retreating onto its Territory to retreat one additional Position, if able, then leaves play. It never triggers from Fall Back or withdrawal.
- **Military — Invasion:** existing Neutral card moved into the Military pool.
- **Diplomats — Détente:** persistent Asset; first accepted use each turn of one of the Diplomat's previously ratified Proposals grants 1 Influence.
- **Financiers — Compound Interest:** after the normal Draw, if Treasury contains a card, the Financier may reveal the top Draw-Pile card and place it face up in Treasury.
- **Intelligence — Extraordinary Rendition:** persistent Asset that reveals the opponent's Hand, binds one chosen card face up beneath it, requires itself to be discarded before other controlled Assets when able, and sends the bound card to its owner's Discard Pile when the Asset leaves play.
- **Mystics — Nature's Altar:** Territory Overlay that permits a Rite to begin during Opening while the Mystic is on the Territory and to complete that turn only if the Mystic is on that Territory when the completion condition and timing are satisfied.
- **Inquisition — Martyrdom:** Aftermath response from Hand after losing; redirects cards remaining in the opponent's Reserve to the Graveyard, then sets Conviction to 4 after clearing and sends itself to the Graveyard. The normal loss, retreat, Occupation, and other result consequences still occur.

---

## 4. Starter Decks and first-game onboarding

### Retire Basic / Advanced — issue #463

- [ ] Remove Basic / Advanced as an active card classification from governing sources.
- [ ] Remove classification-dependent metadata, UI, validation, generation, tests, and documentation.
- [ ] Retain historical classification only where explicitly labeled as provenance.
- [ ] Rebuild all twelve Leader starter Decks from each Leader's full legal Neutral-plus-faction pool.
- [ ] Optimize each Deck for Leader strategy, faction engine, value curve, early plays, recovery tools, repetition, and Territory order.
- [ ] Validate rules legality, opening consistency, matchup behavior, and at least one new-player test per starter.

### First-game teaching — issue #461

Teach in three layers:

1. the shared game;
2. the player's own faction;
3. the minimum public information needed to play against the opponent's faction.

For each faction intro:

- [ ] explain the faction's aim;
- [ ] explain its resource or progression system;
- [ ] explain its additional victory;
- [ ] distinguish its two Leaders practically;
- [ ] identify the more approachable first Leader where appropriate;
- [ ] link the recommended starter Deck;
- [ ] include an opponent-facing summary.

Shared onboarding requirements:

- [ ] visually teach the turn and one ordinary battle before deep faction instruction;
- [ ] diagram Hand, Gambit, Reserve, Tactic, withdrawal, retreat, Occupation, and Capture;
- [ ] add a physical diagram and plain-language explanation for bound cards;
- [ ] create curated introductory faction pairings;
- [ ] evaluate a guided first battle or scripted demonstration opening;
- [ ] give each player one self-contained authoritative faction reference.

---

## 5. Tableside organization and physical references

- [ ] Create or revise a player mat / zone reference that separates Draw Pile, Hand, Discard Pile, Graveyard, Asset Bank, faction areas, Gambit, Reserve, and Tactic positions.
- [ ] Distinguish Hand commitment from battle-specific zones physically.
- [ ] Include Leader, Mission, Rite, Proposal, Deed, Treasury, and other faction-specific component areas.
- [ ] Verify that an ordinary turn, faction procedure, and battle can be run from tableside references without routine rulebook lookup.

### Active-player marker

Adopt a shared **Your Turn** card or token for the v0.6.2 playtest package.

Preferred printed sequence:

> **Capture → Draw → Opening → Movement → Denouement → Cleanup**

- [ ] Pass it after Cleanup.
- [ ] Include it in setup, player mats, printable components, and teaching examples.
- [ ] Ensure it does not imply Action tracking, battle initiative, or priority.
- [ ] Test whether it eliminates active-player confusion without adding procedural friction.

### Multi-mode Asset hierarchy

- [ ] Test card layouts that visually prioritize banked Asset and Use text above alternative Battle text.
- [ ] Treat this as a presentation refinement, not a rules change.

---

## 6. Canonical-source implementation order

Apply adopted changes in this order to minimize drift and regenerated-artifact churn.

### Wave A — shared rules and glossary

- [ ] Official rulebook.
- [ ] Glossary and editorial terminology references.
- [ ] Reference guide and shared turn/battle examples.
- [ ] Shared rules tests and scenario fixtures.

### Wave B — faction sources and exact component text

- [ ] Military faction guide, Leaders, Orders, cards, and references.
- [ ] Diplomats faction guide, Leaders, Terms, Proposals, Influence, and cards.
- [ ] Financiers faction guide, Leaders, Capital, Treasury, Deeds, and cards.
- [ ] Intelligence faction guide, Leaders, Missions, Intel procedures, and cards.
- [ ] Mystics faction guide, Leaders, Rites, Ritual, Invocation, Transmutation, and cards.
- [ ] Inquisition faction guide, Leaders, Conviction, Condemnation, Purge, and cards.
- [ ] Neutral card pool and Territory pool.

### Wave C — starter Decks and teaching materials

- [ ] Twelve starter Deck definitions.
- [ ] Faction first-game sections and opponent summaries.
- [ ] Introductory pairing and scripted-teaching material.
- [ ] Player mats, zone references, turn reference, battle reference, and active-player marker.

### Wave D — generated data and browser tools

- [ ] Canonical structured data and schemas.
- [ ] Deckbuilder pools, validation, starter loaders, print output, and guidance.
- [ ] Browser rulebook.
- [ ] Website and downloadable player materials.
- [ ] Printable card, Leader, Territory, Proposal, Rite, Mission, Deed, and supplemental outputs.

### Wave E — Rules Arbiter and digital implementation

- [ ] Regenerate the v0.6.2 corpus and source IDs.
- [ ] Update deterministic packets and judgment guidance.
- [ ] Add revised timing, Tiebreak Roll, Front Line, Terms, Purge, Influence, destinations, and new-card regressions.
- [ ] Preserve follow-up continuity, concise presentation, logging, and export behavior.
- [ ] Audit degraded fallbacks and source parity.
- [ ] Update any digital-game UI, prompts, validation, logs, replay state, or fixtures that claim v0.6.2 compatibility.

---

## 7. Release validation gates

### Rules and terminology

- [ ] Every accepted mechanical change has one canonical formulation.
- [ ] Every affected source and player-facing surface uses that formulation.
- [ ] Obsolete Action Opportunity and movement terminology is removed or retained only as an intentional search/compatibility alias.
- [ ] Repository-wide terminology audit passes.
- [ ] Source-parity audit passes.

### Faction and card systems

- [ ] Front Line Capture, Terms, Purge, Influence, and Tiebreak examples pass rules review.
- [ ] All seven #481 cards pass interaction, cost-curve, and templating review.
- [ ] Every faction contains 13 cards and Neutral remains at 50.
- [ ] Test revisions are labeled as tests in design records and release notes.
- [ ] Open investigations remain unresolved unless separately decided.

### Starter and first-game experience

- [ ] All twelve starter Decks are legal and validated.
- [ ] Opening-hand consistency and early engine access are reviewed.
- [ ] At least one new-player test is completed for each revised starter or an explicitly approved representative test matrix.
- [ ] A player can run a turn, their faction, and a battle from tableside references.

### Rules Arbiter

- [ ] Corpus and source IDs match v0.6.2 exactly.
- [ ] Deterministic regression suite covers every materially revised procedure and component.
- [ ] Provisional rulings remain session-bound, reviewable, and exportable.
- [ ] Fresh blind testing meets the adopted accuracy and status-calibration gates.

### Production and release artifacts

- [ ] Rulebook Markdown, DOCX, PDF, browser rendering, and references agree.
- [ ] Canonical JSON and manifests regenerate cleanly.
- [ ] Deckbuilder, print packages, card renders, and website materials agree with governing sources.
- [ ] Release notes distinguish adopted revisions, test revisions, and unresolved investigations.
- [ ] Migration notes explain changes from v0.6.1.
- [ ] Final package validation and governance checks pass.

---

## 8. Release-note structure

The v0.6.2 release notes should contain separate sections for:

1. shared turn, Action, battle, movement, and capture revisions;
2. Diplomat Terms, Proposals, Influence, Good Faith, Leverage, and Gunboat Diplomacy;
3. Financier 2-Capital test revision;
4. Mystic Black Covenant and Guardians of the Circle revisions;
5. Military Invasion migration and the seven-card pool expansion;
6. rebuilt starter Decks and retired Basic / Advanced classification;
7. first-game teaching, zone references, and active-player marker;
8. Rules Arbiter corpus and behavior synchronization;
9. migration guidance from v0.6.1;
10. open investigations that remain intentionally unresolved.

Do not describe an open investigation as a release feature merely because related files were touched.

---

## 9. Immediate next work

1. Complete the value, uniqueness, printed-mode, and templating review for the seven-card #481 slate.
2. Lock the final battle-start and defensive tie-benefit terminology.
3. Begin Wave A shared-rule propagation from the resulting locked vocabulary.
4. Propagate faction and card changes only after those dependencies are stable.
5. Rebuild starter Decks after the legal pools and exact card values are final.
