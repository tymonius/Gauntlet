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

The vocabulary and card-design dependencies that previously blocked broad source propagation are now settled.

### Terminology locks

- [x] Replace battle **opening effects** with **Onset**.
- [x] Use **Onset of the battle** in explanatory prose where clarity benefits, but use **Onset** as the formal stage name.
- [x] Treat **Onset** and **Aftermath** as the parallel opening and closing stages of a battle.
- [x] Replace **Defender's Advantage** with **Defensive Edge**.
- [x] Adopt **Advance / Hold / Fall Back** for ordinary Movement choices.
- [x] Reserve **withdraw** for leaving or preventing a pending or active battle without a winner.
- [x] Reserve **retreat** for displacement after losing a battle.

### Card locks — issue #481

The seven-card pool expansion is locked for the initial v0.6.2 test build.

- [x] Landslide: cost, modes, placement, stacking restriction, and Overlay text.
- [x] Military Invasion: cost, faction migration, and retained modes.
- [x] Détente: cost, one-banked restriction, and complete modes.
- [x] Compound Interest: cost, one-banked restriction, and revealed-card destination.
- [x] Extraordinary Rendition: cost, one-banked restriction, detention rules, and first-discard rule.
- [x] Nature's Altar: cost, modes, placement, and control-based same-turn completion tether.
- [x] Martyrdom: cost 5, Unique status, timing, destinations, and non-prevention clause.
- [ ] Complete interaction and stacking validation for Military Invasion during propagation and testing.

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
- [ ] Preserve the existing Occupation consequence when only the defender withdraws: the attacker remains in the contested Position and becomes the occupier when applicable.
- [ ] Distinguish timing: withdrawal before Onset prevents the battle and has no Aftermath; withdrawal at any time after Onset completes the remaining non-result steps of the Aftermath and clears any committed battle cards normally.
- [ ] Teach the distinction plainly: **a losing player retreats; a player who leaves without losing withdraws**.

### Contiguous Front Line — issue #460

- [ ] Define each player's Front Line as the contiguous Territories they control from their own end of the Gauntlet.
- [ ] Permit a Player Token to move beyond its controlled line without creating isolated control.
- [ ] Make normal Capture advance control only to the next opposing Territory beyond the player's Front Line.
- [ ] Keep Position, Occupation, Capture, and control distinct.
- [ ] Audit every immediate-capture effect, including Fortify, Shock and Awe / Consolidate, and Diplomatic Recognition.
- [ ] Audit Asset limits, Deeds, Income, capture triggers, Counterattacks, retreats, final-Territory capture, and Last Stand access against contiguous control.

### Onset

**Onset** is the formal opening stage of a battle, parallel to **Aftermath** as its closing stage.

Use this sequence:

> **Pending battle → Terms → Onset → Gambits**

- Establish the attacker, defender, contested Position, and all pending-battle facts before Terms.
- Accepted Terms prevent the battle from reaching Onset.
- Refused Terms or no Terms proceed into Onset.
- Replace `opening effects`, `battle opening`, and `Battle Onset` with **Onset** where they refer to this stage.
- Use phrases such as **during Onset** or **at the Onset of the battle** according to sentence structure.
- Do not confuse the battle's Onset with the turn's Opening phase.

### Defensive Edge — issue #452

Replace **Defender's Advantage** with **Defensive Edge**.

> **Defensive Edge:** When the defender has Defensive Edge, the defender wins tied battle totals.

The defender normally has Defensive Edge when:

- the defender controls the contested Territory; or
- the defender is making a Last Stand.

An effect may remove Defensive Edge, including an applicable Arena Territory effect. Defensive Edge is conditional; the defender does not have it merely because they are the defender.

- If Defensive Edge does not resolve the tie, proceed to the Tiebreak Roll.
- Audit every rule, card, Territory, example, UI label, test, and Rules Arbiter packet that uses Defender's Advantage.
- Retain Defender's Advantage only as a recognized legacy search synonym.

### Straight Tiebreak Roll — issue #476

Canonical rule to propagate:

> If battle totals remain tied after applicable tie-breaking rules, each player makes an unmodified Tiebreak Roll. Do not apply advantage, disadvantage, card effects, numerical modifiers, or the previous battle totals. Higher roll wins; reroll further ties.

Only an effect that expressly refers to a Tiebreak Roll may modify it.

### Pending battle and Terms sequence — issue #457

Use this sequence:

> **Pending battle → Terms → Onset → Gambits**

- Establish attacker, defender, and contested Position before Terms.
- Accepted Terms prevent the battle from beginning and therefore prevent Onset.
- Refused Terms or no offer proceed into Onset.
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

Accepted values and structures:

| Pool | Card | Cost | Restriction | Modes |
|---|---|---:|---|---|
| Neutral | Landslide | 4 | Maximum one Landslide on each Territory | Action, Battle, Overlay |
| Military | Invasion | 4 | None | Action, Battle |
| Diplomats | Détente | 3 | Maximum one banked Détente | Action, Asset |
| Financiers | Compound Interest | 4 | Maximum one banked Compound Interest | Action, Asset |
| Intelligence | Extraordinary Rendition | 4 | Maximum one banked Extraordinary Rendition | Action, Asset |
| Mystics | Nature's Altar | 4 | None | Action, Battle, Overlay |
| Inquisition | Martyrdom | 5 | Unique; maximum one copy per Playable Deck | Aftermath response from Hand |

#### Neutral — Landslide

**Cost:** 4  
**Card form:** Territory Overlay

> **Action:** Place Landslide as an Overlay on any Territory that does not already have a Landslide.
>
> **Battle:** During the Aftermath, if you lose and retreat from a Territory, after retreating you may place Landslide as an Overlay on the contested Territory.
>
> **Overlay:** When a player retreats onto this Territory, they retreat one additional Position, if able. Then put Landslide in its owner's Discard Pile.

- Separate Landslides on consecutive Territories may chain.
- Several copies cannot occupy the same Territory.
- Landslide never triggers from Fall Back or withdrawal.

#### Military — Invasion

**Cost:** 4  
**Unique:** No

Retain the existing Battle mode and migrate the card from Neutral to Military. Revise the Action wording for the Opening / Movement structure.

Working Action formulation:

> **Action:** During your Movement this turn, you may advance up to two additional Positions. Move one Position at a time. This additional movement may only be used to advance and may start a battle.

- Unused movement is lost when a battle begins.
- Audit Onward, Rout, Give Chase, Shock and Awe, and all additional-Tactic interactions.

#### Diplomats — Détente

**Cost:** 3  
**Card form:** Asset

> **Action:** Bank this card. You may have only one banked Détente.
>
> **Asset:** The first time each turn an opponent accepts one of your Proposals that was already ratified when you offered it, gain 1 Influence.

No Battle mode.

#### Financiers — Compound Interest

**Cost:** 4  
**Card form:** Asset

> **Action:** Bank this card. You may have only one banked Compound Interest.
>
> **Asset:** After your normal Draw, if your Treasury contains at least one card, you may reveal the top card of your Draw Pile. Place it face up in your Treasury or put it in your Discard Pile.

- Revealing the card is optional.
- Once revealed, it cannot remain on top of the Draw Pile.
- No Battle mode.

#### Intelligence — Extraordinary Rendition

**Cost:** 4  
**Card form:** Asset

> **Action:** Bank this card. When you do, reveal the opponent's Hand, choose one card there, and bind it face up beneath Extraordinary Rendition. You may have only one banked Extraordinary Rendition.
>
> **Asset:** The bound card cannot be played, moved, or affected except by Extraordinary Rendition. Whenever you discard one or more Assets you control, discard Extraordinary Rendition before any others, if able. When Extraordinary Rendition leaves play, put the bound card in its owner's Discard Pile.

- The first-discard rule includes voluntary Asset discard and replacement.
- No Use, Battle, or Mission mode.

#### Mystics — Nature's Altar

**Cost:** 4  
**Trait:** Arcane  
**Card form:** Territory Overlay

> **Action:** Place Nature's Altar as an Overlay on your current Territory or an adjacent Territory.
>
> **Battle:** During the Aftermath, if you win, you may place Nature's Altar as an Overlay on the contested Territory.
>
> **Overlay:** During your Opening, if your Player Token is on this Territory, you may take the Begin a Rite Faction Action. A Rite begun this way may complete during that turn if you control this Territory when its completion condition and timing are satisfied.
>
> This does not change the Rite's beginning cost, requirements, or completion condition.

The earlier token-at-completion formulation is superseded by the control-based completion tether.

#### Inquisition — Martyrdom

**Cost:** 5  
**Unique:** Maximum one copy per Playable Deck

> When you lose a battle while Martyrdom is in your Hand, during the Aftermath before battle cards are cleared, you may play it without taking an Action. If you do, cards remaining in the opponent's Reserve go to their Graveyard instead of their Discard Pile during this Aftermath. After battle cards are cleared, set your Conviction to 4 and put Martyrdom in your Graveyard.
>
> Martyrdom does not prevent the loss, retreat, Occupation, or other normal consequences of the battle result.

### Obsolete `revealed Territory` audit

Since all Territories begin revealed, `revealed Territory` is obsolete when used as a normal eligibility qualifier.

- [ ] Remove the qualifier from Landslide and Nature's Altar.
- [ ] Audit every existing card, Leader, Territory, rule, reference, starter definition, structured-data record, schema, Deckbuilder surface, generated artifact, test, scenario fixture, and Rules Arbiter source.
- [ ] Replace `revealed Territory` with **Territory** where revelation no longer changes eligibility.
- [ ] Preserve occurrences that genuinely describe revealing hidden information, historical rules, migration notes, or compatibility aliases.
- [ ] Add a regression or repository search gate preventing obsolete card text from returning.

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
- [ ] Onset and Defensive Edge terminology migration.
- [ ] Obsolete `revealed Territory` audit across shared and card-facing sources.

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
- [ ] Add revised timing, Onset, Defensive Edge, Tiebreak Roll, Front Line, Terms, Purge, Influence, destinations, and new-card regressions.
- [ ] Preserve follow-up continuity, concise presentation, logging, and export behavior.
- [ ] Audit degraded fallbacks and source parity.
- [ ] Update any digital-game UI, prompts, validation, logs, replay state, or fixtures that claim v0.6.2 compatibility.

---

## 7. Release validation gates

### Rules and terminology

- [ ] Every accepted mechanical change has one canonical formulation.
- [ ] Every affected source and player-facing surface uses that formulation.
- [ ] Obsolete Action Opportunity, movement, battle-start, defensive-tie, and `revealed Territory` terminology is removed or retained only as an intentional search/compatibility alias.
- [ ] Repository-wide terminology audit passes.
- [ ] Source-parity audit passes.

### Faction and card systems

- [ ] Front Line Capture, Terms, Purge, Influence, Onset, Defensive Edge, and Tiebreak examples pass rules review.
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

1. shared turn, Action, Onset, Defensive Edge, Tiebreak, movement, and capture revisions;
2. Diplomat Terms, Proposals, Influence, Good Faith, Leverage, and Gunboat Diplomacy;
3. Financier 2-Capital test revision;
4. Mystic Black Covenant and Guardians of the Circle revisions;
5. Military Invasion migration and the seven-card pool expansion;
6. rebuilt starter Decks and retired Basic / Advanced classification;
7. first-game teaching, zone references, and active-player marker;
8. obsolete-language and source-parity audits;
9. Rules Arbiter corpus and behavior synchronization;
10. migration guidance from v0.6.1;
11. open investigations that remain intentionally unresolved.

Do not describe an open investigation as a release feature merely because related files were touched.

---

## 9. Immediate next work

1. Review and merge Wave A shared-rule candidate PR #493 after its validation suite passes.
2. Integrate the approved Wave A text into the complete v0.6.2 rulebook, glossary, compact references, and executable rule fixtures.
3. Propagate the seven-card #481 slate into faction and Neutral governing sources and complete the Invasion interaction audit.
4. Run the obsolete `revealed Territory` audit while touching card and rules sources.
5. Rebuild starter Decks after the legal pools and exact card values are present in canonical structured data.
