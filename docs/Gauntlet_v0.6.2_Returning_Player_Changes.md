# What Changed in Gauntlet v0.6.2

**Status:** Release-candidate source for returning v0.6.1 players  
**Release tracker:** [#470](https://github.com/tymonius/Gauntlet/issues/470)  
**Closeout tracker:** [#506](https://github.com/tymonius/Gauntlet/issues/506)  
**Document tracker:** [#503](https://github.com/tymonius/Gauntlet/issues/503)

This handout explains what a player who already knows v0.6.1 must do differently in v0.6.2. It is organized around play at the table, not repository implementation history.

v0.6.1 remains the published playtest release until the v0.6.2 cutover is complete.

## Change labels

- **Mechanical change:** the game now plays differently.
- **Terminology change:** the procedure is substantially familiar, but its formal name or presentation changed.
- **Clarification:** the rule is now stated more precisely to prevent inconsistent readings.
- **Test revision:** intentionally adopted for v0.6.2 playtesting and subject to later evaluation.

# At a glance

The changes most likely to affect every game are:

1. **[Mechanical change] Turns now have six named phases:** Capture, Draw, Opening, Movement, Denouement, Cleanup.
2. **[Mechanical change] Your normal Action may be taken during Opening or saved for Denouement.** An additional Action does not by itself allow two Actions in the same phase.
3. **[Terminology change] Ordinary Movement choices are Advance, Hold, and Fall Back.** Fall Back is not retreat or withdrawal.
4. **[Mechanical change] A collision first creates a pending battle.** Terms occur before Onset; accepted Terms prevent the battle from beginning.
5. **[Terminology change] Onset is the formal opening stage of an active battle.** Gambits follow Onset.
6. **[Mechanical change] Tied battles use Defensive Edge or a separate Tiebreak Roll.** The original modified battle totals are not rerolled.
7. **[Mechanical change] Territory control must remain contiguous.** Your token's Position may extend beyond your controlled Front Line without granting isolated control.
8. **[Clarification] Retreat, withdrawal, and Fall Back are different events** even when they move a token in the same direction.
9. **[Mechanical change] Recommended starter Decks now use each Leader's full legal pool.** Basic and Advanced are no longer active construction restrictions.
10. **[Mechanical change] Seven card titles are new or moved between pools,** and several inherited cards, Territories, Proposals, and faction procedures have compatibility revisions.

# Setup and starting Decks

## Recommended starter Decks

**[Mechanical change]** All twelve Leader starter Decks have been rebuilt from their full legal construction pools. A recommended starter is still a legal 30-card, 60-value Deck with three Territories, but it is no longer restricted by the retired Basic/Advanced teaching split.

Use the printed v0.6.2 starter for the selected Leader rather than carrying forward a v0.6.1 list.

## Card complexity labels

**[Terminology change]** Basic and Advanced no longer determine whether a card may appear in a starter Deck or teaching game. Complexity may still be communicated for player guidance, but it is not an active construction rule.

## First-game materials

**[Clarification]** v0.6.2 separates the complete rules from first-game guidance and tableside references. New players should follow the first-game sequence and faction summary supplied with their Leader rather than infer procedure from card text alone.

A shared active-player marker may be passed after Cleanup to help track long interactive turns.

# Turn and Movement

## The turn sequence

**[Mechanical change]** Complete each turn in this order:

> **Capture → Draw → Opening → Movement → Denouement → Cleanup**

Capture now occurs before the normal draw. Resolve effects and victory checks following Capture before proceeding to Draw.

## Actions

**[Mechanical change]** You normally take one Action total during either Opening or Denouement.

An Action may:

- play a card for its Action effect;
- take a legal Faction Action; or
- discard an Asset you control.

A Faction Ability occurs at its stated timing and does not use an Action unless it expressly says otherwise.

No more than one Action may normally be taken during Opening, and no more than one during Denouement. An effect granting an additional Action increases the total available that turn; it does not automatically increase either phase's capacity.

## Movement choices

**[Terminology change]** During ordinary Movement, choose:

- **Advance:** move one Position toward the opponent's end;
- **Hold:** remain in place and end the current Movement sequence;
- **Fall Back:** move one Position toward your own end.

Entering the opponent's Position creates a pending battle and immediately ends that Movement sequence. Any unused movement from that sequence is lost even if Terms later prevent the battle.

# Battles

## Pending battle, Terms, and Onset

**[Mechanical change]** The pre-battle sequence is:

> **Pending battle → Terms → Onset → Gambits**

The attacker, defender, contested Position, and attack origin are established when the pending battle is created.

Terms occur before Onset. A pending battle is not yet an active battle, so battle, win, loss, retreat, and Aftermath triggers do not occur unless the battle reaches Onset.

If Terms are accepted, resolve the Proposal's Accepted effect. Unless that Proposal gives another positional result, the attacker withdraws to the attack origin and the defender remains at the contested Position. There is no Onset, battle result, Occupation caused by the accepted Terms, or Aftermath.

If Terms are refused or none are offered, proceed to Onset.

## Onset

**[Terminology change]** Onset replaces informal references to battle opening effects. During Onset, the pending battle becomes active, roles are fixed, and effects that apply during Onset or when the battle begins resolve before Gambits.

## Defensive Edge

**[Mechanical change]** A defender with Defensive Edge wins tied battle totals.

The defender normally has Defensive Edge while defending a Territory they control or making a Last Stand. Merely being the defender is not enough. An effect or Arena may remove Defensive Edge.

## Tiebreak Roll

**[Mechanical change]** If tied totals are not resolved by Defensive Edge or another explicit rule, make a separate Tiebreak Roll:

> Each player rolls one unmodified die. Higher roll wins. Reroll further ties.

Do not apply advantage, disadvantage, card effects, numerical modifiers, or the previous battle totals unless an effect expressly refers to a Tiebreak Roll.

## Retreat and withdrawal

**[Clarification]** A losing player retreats. A player who leaves a pending or active battle without losing withdraws. Fall Back is ordinary Movement and is neither.

Unless an effect says otherwise:

- an attacking player who retreats or withdraws returns to the Position from which they attacked;
- a defending player who retreats or withdraws moves one Position toward their own end;
- defender-only withdrawal leaves the attacker at the contested Position and may create Occupation;
- mutual withdrawal moves the attacker first, then the defender, and creates no Occupation from that withdrawal.

Withdrawal before Onset prevents the battle and Aftermath. Withdrawal after Onset ends the battle without a winner, then completes the remaining non-result Aftermath and clears committed battle cards normally.

# Front Line, Position, and Capture

## Contiguous control

**[Mechanical change]** Your controlled Territories must always form one unbroken line from your own end. That line is your **Front Line**.

Your **Position** is where your Player Token stands. Position and control are separate. A token may stand several Territories beyond its Front Line without controlling those Territories or the intervening ones.

## Normal Capture

**[Mechanical change]** During Capture, identify the next opponent-controlled Territory immediately beyond your Front Line. If your token is on or beyond it, add that Territory to your Front Line.

Normal Capture advances the Front Line by no more than one Territory per turn, regardless of how far the token has advanced. The Territory captured may therefore differ from the Territory containing the token.

## Immediate capture effects

**[Clarification]** Effects that previously appeared to capture a specific occupied Territory cannot create isolated control. Revised effects advance the player's Front Line by the permitted amount, if the token can support each addition.

Deep Position alone does not establish control of the opponent's final Territory or satisfy the normal Last Stand victory sequence.

# Faction and Leader changes

## Military

- **[Clarification]** Orders are Faction Abilities, not Actions. They occur at their printed timings.
- **[Mechanical change]** Invasion moves from Neutral to Military at cost 4. Its Opening Action grants up to two additional advance-only Positions during that turn's Movement. Its Battle mode gives an attacking Military one additional Reserve card and one additional Tactic.
- **[Mechanical change]** Creating a pending battle loses unused Invasion movement; accepted Terms do not restore it.
- **[Terminology change]** Hold the Line and Shock and Awe now use Onset.
- **[Mechanical change]** Battlefield Promotion and Give Chase are Denouement Actions.
- **[Clarification]** Fortify, Consolidate, and similar effects advance the contiguous Front Line rather than creating isolated control.

The Military alternate victory remains unresolved and is not introduced by v0.6.2.

## Diplomats

- **[Clarification]** Proposal cards use explicit player roles because they are physically presented to the receiving player.
- **[Mechanical change]** Accepted unratified Proposals normally grant 1 Influence. Imposed unratified Proposals normally grant 2 Influence. Already-ratified Proposals grant no default ratification reward.
- **[Mechanical change]** Leverage uses triangular total costs: +1 costs 1 Influence, +2 costs 3, +3 costs 6, and +4 costs 10.
- **[Mechanical change]** Détente is a new cost-3 Asset. Once each turn, it grants 1 Influence when an opponent accepts a Proposal that was already ratified when offered.
- **[Clarification]** Good Faith's Accepted result puts the selected card in the Graveyard, then grants 1 Influence.
- **[Clarification]** Gunboat Diplomacy uses its normal role destination: Discard when accepted or normally chosen as a Tactic; Graveyard when set as the refusal Gambit and cleared.
- **[Mechanical change]** Safe Conduct after Onset causes withdrawal and non-result Aftermath rather than a loss.
- **[Clarification]** Diplomatic Recognition advances the Diplomat's Front Line instead of creating isolated control.

The Peace Treaty threshold remains unresolved unless separately adopted before publication.

## Financiers

- **[Test revision]** Financiers begin with 2 Capital in v0.6.2 testing.
- **[Mechanical change]** Financial Capacity is checked after Capture effects and before Draw. When Treasury value exceeds controlled Territories, the Financier may take one Action during Opening and one during Denouement, provided at least one is a Financier Faction Action.
- **[Clarification]** Financier Faction Actions remain Denouement procedures. Financial Capacity does not permit two Actions in one phase.
- **[Mechanical change]** Compound Interest is a new cost-4 Asset. After the normal Draw, with a nonempty Treasury, its controller may reveal the top Draw Pile card and place it in Treasury or Discard it.
- **[Clarification]** Hostile Takeover and Foreclosure preserve contiguous Front Line control.
- **[Clarification]** Tariffs, Divestment, Margin Loan, and other additional-Action effects use the shared Action rules rather than Action Opportunities.

Line of Credit keeps its existing collateral cap.

## Intelligence

- **[Mechanical change]** Extraordinary Rendition is a new cost-4 Asset that binds one revealed opposing Hand card beneath it. The bound card cannot be played, moved, or affected except by Extraordinary Rendition.
- **[Mechanical change]** When Assets are discarded, Extraordinary Rendition must be discarded before other controlled Assets if able. Its bound card then goes to its owner's Discard Pile.
- **[Clarification]** Intelligence Missions and Special Operations taken as Faction Actions are Denouement procedures. Mission Control remains a direct permission that does not use an Action.
- **[Terminology change]** Fieldcraft uses Defensive Edge and Reconnaissance uses Onset.
- **[Clarification]** Counterintelligence and Fog of War no longer rely on obsolete hidden-Territory wording.
- **[Mechanical change]** Sleeper Network may be used as an Action during Opening or Denouement.

## Mystics

- **[Clarification]** Begin a Rite and Begin the Ritual of Ascendance are normally Denouement Faction Actions.
- **[Mechanical change]** Guardians of the Circle now requires an Arcane sacrifice of value at least 1 for the first Rite, 2 for the second, 3 for the third, and 4 for the Ritual.
- **[Mechanical change]** Black Covenant grants advantage and may add an additional Tactic or Battle card; both cards go to the Graveyard.
- **[Mechanical change]** Nature's Altar is a new cost-4 Arcane Overlay. It may be placed by Action on the current or adjacent Territory, or after winning on the contested Territory.
- **[Mechanical change]** Nature's Altar creates the special Opening permission to take Begin a Rite while the token is on its Territory. This does not change the Rite's cost or requirements. Same-turn completion applies only if the Altar's controller controls that Territory at completion timing.
- **[Clarification]** Nature's Altar does not waive Rite of Crossing's specialized beginning requirement.

All thirteen Mystics faction cards are Arcane.

## Inquisition

- **[Mechanical change]** Purge is a Faction Action legal during Opening or Denouement, normally no more than once per turn. The Inquisition may take an Action in both phases when one of them is Purge, but never two Actions in the same phase.
- **[Clarification]** Final Judgment's Aftermath Purge is a separate Faction Ability. It does not use an Action or consume the normal Purge Faction Action.
- **[Mechanical change]** Martyrdom is a new cost-5 Unique card played after losing, before battle cards clear. Remaining opposing Reserve cards go to the opponent's Graveyard, the Inquisition sets Conviction to 4, and Martyrdom goes to the Graveyard.
- **[Clarification]** Martyrdom does not prevent the loss, retreat, Occupation, or other battle-result consequences.
- **[Clarification]** Relentless Pursuit now follows pending battle, Terms, and Onset without inserting an Opening or Denouement.
- **[Mechanical change]** In an Inquisition mirror, the opposing No Martyrs can prevent the losing player's Martyrdom benefit.

# Cards, Territories, and Proposals

## New and moved titles

| Allegiance | Card | Cost | Summary |
|---|---|---:|---|
| Neutral | Landslide | 4 | Overlay that chains an additional Position of retreat when entered by retreat. |
| Military | Invasion | 4 | Moved from Neutral; additional advance movement or expanded attacking battle limits. |
| Diplomats | Détente | 3 | Asset rewarding acceptance of already-ratified Proposals. |
| Financiers | Compound Interest | 4 | Asset converting the top Draw Pile card into Treasury or Discard after Draw. |
| Intelligence | Extraordinary Rendition | 4 | Asset binding an opposing Hand card. |
| Mystics | Nature's Altar | 4 | Arcane Overlay enabling a special Opening Rite procedure. |
| Inquisition | Martyrdom | 5 | Unique Aftermath response after losing. |

The effective pool contains 128 playable card titles: 50 Neutral and 13 for each faction.

## Notable inherited compatibility revisions

- Forced March grants Opening movement that cannot create a pending battle.
- Advance Guard grants Opening movement that may create a battle, but no Gambit may be set when its extra Position causes it.
- Entrenchment and Difficult Terrain block Denouement Action cards under their revised timing.
- Palisade Wall uses Onset.
- Reinforcements, Insurrection, and Liberation grant additional Actions without granting same-phase capacity.
- Strategic Withdrawal distinguishes its Opening addition to normal Movement from its Denouement-created later Movement sequence.
- Assimilation advances the Front Line by one.
- Protracted Siege prevents one future attempt to add its Territory to the opposing Front Line.
- Manifest Destiny inserts its blank Territory only when it immediately joins the player's Front Line.
- Quicksand uses Fall Back.
- Command Tent permits one Action in each phase, but both must be card Action effects.
- Smuggler's Pass is an Action during Opening or Denouement.
- Refuge triggers from voluntary Fall Back, not retreat or withdrawal.
- Arenas remove Defensive Edge and use the separate Tiebreak Roll.

# What did not change

- A constructed Deck remains 30 cards with a total deckbuilding value of 60.
- Players still select one faction and one Leader and use three Territories.
- Gambits, Reserves, Tactics, Outcome, and Aftermath remain the core active-battle stages after Onset.
- A specific card, Territory, Proposal, Leader, or faction rule still overrides a general rule when it directly addresses the situation.
- v0.6.2 does not silently adopt unresolved alternate victories, thresholds, or balance experiments.

# Returning-player checklist

Before the first v0.6.2 game:

- use the v0.6.2 starter Deck or rebuild from the full legal pool;
- remember **Capture before Draw**;
- choose whether to use your Action during **Opening** or save it for **Denouement**;
- use **Advance, Hold, or Fall Back** during ordinary Movement;
- stop the Movement sequence when a pending battle is created;
- resolve **Terms before Onset**;
- use **Defensive Edge**, then a separate **Tiebreak Roll** if needed;
- track **Position** separately from the contiguous **Front Line**;
- distinguish **Fall Back**, **withdrawal**, and **retreat**;
- review the selected faction's revised timing and its new card;
- use the complete v0.6.2 rules whenever a component-specific interaction is not covered here.

# Intentionally unresolved during closeout

The following are not v0.6.2 rules unless a later recorded decision explicitly adopts them before publication:

- Military alternate victory;
- Peace Treaty threshold;
- Leader Ability taxonomy beyond adopted wording;
- unadopted balance experiments.
