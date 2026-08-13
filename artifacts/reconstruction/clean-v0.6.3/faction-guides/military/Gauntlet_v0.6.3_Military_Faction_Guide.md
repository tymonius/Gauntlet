# Gauntlet v0.6.3 Military Faction Guide

> **Clean v0.6.3 Military faction authority candidate.** Reconstructed from the certified clean v0.6.2 faction authority plus only the approved clean-v0.6.3 deltas. Faction-card wording is adopted from the pinned finalized v0.6.3 canonical-data evidence; that evidence is not an authority skeleton. Shared rules remain the certified clean v0.6.2 Rulebook plus approved v0.6.3 shared-rule deltas until the clean v0.6.3 Rulebook is reconstructed. The withdrawn v0.6.3 Rulebook and combined faction guide are forbidden authority sources.

# 1. Military overview

## How it works

The Military turns battle victories into **Command**, then spends Command on Leader-specific **Orders**. The General uses Orders to attack, reinforce, and pursue. The Commandant uses them to defend, repel, and capture.

Military has no alternate victory condition. It wins by running the Gauntlet.

## Complete rules

| Element | Military rule |
|---|---|
| Victory | Run the Gauntlet. |
| Resource | Command, maximum 2. |
| Resource gain | The first time each turn you win a battle, gain 1 Command. |
| Faction Actions | None. Orders use their printed timings and do not spend Actions. |
| Leaders | General and Commandant. |
| Faction pool | 13 Military card titles. |
| Unique card | Shock and Awe, cost 5; maximum one copy per Deck. |

## Faction Actions

Military has **no Faction Actions**. Orders are Faction Abilities used at their printed timings; they do not use an Action. Playing a Military card for its Action effect still uses the normal Action rules.

# 2. Components and setup

A Military Deck includes:

- one Military Leader Card: **General** or **Commandant**;
- one Military Command Tracker; and
- any Military cards included in the Deck.

Place the chosen Leader face up. Place the Command Tracker beneath it, fully covered, to show 0 Command. Slide the Leader upward to the 1 or 2 registration line as Command changes.

# 3. Command and Orders

## How it works

The first battle you win during each turn gives you 1 Command, even when you win while defending on the opponent's turn. Spend Command only when an Order reaches its printed timing.

## Complete rules

Military may have up to 2 Command.

The first time each turn the Military player wins a battle, gain 1 Command. This trigger may occur during either player's turn. Winning while already at 2 Command still counts as the first Military victory of that turn.

Determine the winner, then gain normal Command before applying other effects caused by that victory. Newly gained Command may pay for an Order whose timing occurs during the Aftermath.

- Use an Order only at its printed timing.
- Spend the listed Command when the Order is used unless an effect changes the cost.
- An Order cannot be used without enough Command.
- Withdrawal has no winner, so it generates no Command and cannot satisfy a victory-dependent Order.

# 4. Leaders

## General

**Archetype:** Attack, forward pressure, and tempo  
**Motto:** *Forward. Again.*

### Orders

> **Onward — 1 Command:** During your Movement, before a pending battle is created, move one additional Position. This movement may create a pending battle.

> **Rally — 1 Command:** Before dice are rolled in a battle you initiated, add +1 to your battle total.

> **Rout — 2 Command:** At the end of the Aftermath of a battle you initiated and won, advance one Position. This movement may create a pending battle.

Onward cannot be used after a battle. Rout creates a new movement sequence after the completed Aftermath.

## Commandant

**Archetype:** Defense, counterattack, and control  
**Motto:** *We hold. They break.*

### Orders

> **Entrench — 1 Command:** Before dice are rolled in a battle you did not initiate, add +1 to your battle total.

> **Repel — 1 Command:** During the Aftermath of a battle you did not initiate and won, after the opponent's normal retreat, they retreat one additional position, if able.

> **Fortify — 2 Command:** During the Aftermath of a battle you won while occupying an enemy-controlled Territory, advance your Front Line by one Territory, if able.

# 5. Military-specific rules

## Initiating battles

You initiated a battle when your movement or effect caused it to begin. A follow-up battle is a new battle with new Gambits, Reserves, Tactics, and once-per-battle opportunities.

## Additional Tactics

Military effects may add Tactics after the normal Tactic reveal. Play such a card face up. Its effect must still be applicable at that timing. It does not reopen normal Tactic choice, Surveillance, Interference, or reveal windows.

## Conflicting victory benefits

War Crimes and Shock and Awe may prohibit movement, capture, or Orders resulting from the same victory. Apply only combinations of effects that can legally be applied together.

# 6. Canonical Military card pool

> **Card-text boundary.** The card identities and ordering below are inherited from certified clean v0.6.2 faction authority. The printed v0.6.3 effect text is the exact pinned finalized canonical-data evidence produced by the approved v0.6.3 card-language pipeline (PRs #540, #549, #550, #551, and #560). This adoption does not authorize any withdrawn or downstream v0.6.3 release surface.

## Unbroken Ranks

**Cost:** 1

> **Asset:** After you win a battle in which you used no Orders, you may discard this card: +1 Command.
>
> **Gambit/Tactic:** If you win this battle and used no Orders during it, +1 Command.

The Command gain occurs during the Aftermath before an eligible post-victory Order.

## Battlefield Promotion

**Cost:** 2

> **Action:** Play only during Denouement if you won a battle this turn. Return one Tactic you chose during that battle from your Discard Pile to your Hand.
>
> **Gambit/Tactic:** In the Aftermath, if you win, return one other Tactic you chose to your Hand instead of putting it in your Discard Pile.

## Encampment

**Cost:** 2  
**Card form:** Territory Overlay

> **Action:** Place this Overlay on a Territory you occupy and control.
>
> **Overlay:** At the end of this card's owner's turn, if they occupy and control this Territory, +1 Command. When another player gains control of this Territory, put this card in its owner's Graveyard.
>
> **Gambit/Tactic:** In the Aftermath, if you won while defending a Territory you control, place this Overlay there.

Encampment identifies its owner because general Overlay control changes with the underlying Territory.

## Rearguard

**Cost:** 2

> **Asset:** After you lose and retreat, when the opponent would use an Order or card effect to enter your Position that turn, you may discard this card to prevent that movement. No Command is spent; return any card used to its owner's Hand. That Order or card cannot be used again that turn.
>
> **Gambit/Tactic:** In the Aftermath, if you lose and retreat, bank this card.

## Brothers in Arms

**Cost:** 2

> **Asset:** When choosing Tactics, if you did not set a Gambit, you may discard this card for +1 Tactic from Hand.
>
> **Tactic:** When you choose this card as your Tactic, if you did not set a Gambit: +1 Tactic from Hand. In the Aftermath, put that card in your Graveyard instead of your Discard Pile.

## Field Command

**Cost:** 3

> **Asset:** After you use a 1-Command Order, you may discard this card to use your Leader's other 1-Command Order at its next legal timing this turn without spending Command.
>
> **Gambit/Tactic:** After you use a 1-Command Order during this battle, you may use your Leader's other 1-Command Order once this turn at its next legal timing without spending Command. If you do, put this card in your Graveyard after that Order takes effect.

## Reserve Force

**Cost:** 3

> **Action:** Bank this card; Bind a Tactic from your Hand to it face down.
>
> **Asset:** After Tactics are revealed, you may discard this card and play the bound card as a Tactic. Put it in your Graveyard in the Aftermath. If this card leaves play with a bound card, put that card in your Graveyard.
>
> **Gambit/Tactic:** After Tactics are revealed, you may replace this card with up to two eligible cards from your Hand, face up. If replaced, put this card in your Graveyard; otherwise discard it in the Aftermath.

## Give Chase

**Cost:** 3

> **Action:** During Denouement, if you won a battle you initiated this turn, advance 1 Position. Then put this card in your Graveyard.
>
> **Gambit/Tactic:** Following the Aftermath, if you won as the attacker, you may advance 1 Position. Put this card in your Graveyard.

If an advance from this card starts a battle, you cannot set a Gambit or use Orders in it. In that battle, −1 Reserve for each battle you already fought this turn beyond the first, to a minimum of 0.

## Hold the Line

**Cost:** 4

> **Asset:** During Onset while defending a Territory you control, you may put this card in your Graveyard to apply its Gambit/Tactic effect after Tactics are revealed.
>
> **Gambit/Tactic:** If you are defending a Territory you control, after Tactics are revealed, +2 Reserve; +1 Tactic from those cards. If you lose, after you retreat, the attacker captures that Territory. In the Aftermath, put this card in your Graveyard.

## Countercharge

**Cost:** 4

> **Asset:** At the end of the Aftermath, if you won and did not initiate this battle, you may put this card in your Graveyard to advance one Position.
>
> **Gambit/Tactic:** At the end of the Aftermath, if you won and did not initiate this battle, put this card in your Graveyard, then advance one Position.

## War Crimes

**Cost:** 4

> **Asset:** In the Aftermath, if you won, you may put this card in your Graveyard to put all opposing Tactics from this battle in their owner's Graveyard instead of their Discard Pile; Opponent: Retreat +1. You cannot move, capture a Territory, or use an Order as a result of that victory.
>
> **Gambit/Tactic:** In the Aftermath, if you win, you may apply the same effect and put this card in your Graveyard.

## Shock and Awe

**Cost:** 5  
**Unique:** Maximum one copy per Deck

> **Asset:** During Onset, you may put this card in your Graveyard to apply its Gambit/Tactic effect after Tactics are revealed.
>
> **Gambit/Tactic:** When attacking on an enemy-controlled Territory, after Tactics are revealed: +1 Tactic from Hand. Lose — Retreat +1. Win — Choose one:
Breakthrough — Opponent: Retreat +1, if able; then you advance one Position.
Consolidate — Advance Front Line 1, if able; Command = 2.

Afterward, you cannot move, advance your Front Line, or use an Order as a result of this victory.
In the Aftermath, put both cards in your Graveyard.

## Invasion

**Cost:** 4

> **Action:** During your Movement this turn, you may advance up to two additional Positions. This additional movement may only be used to advance.
>
> **Gambit/Tactic:** Attacker — +1 Reserve, +1 Tactic.

# 7. Quick reference

- Command maximum 2.
- First Military victory each turn gives 1 Command.
- Onward extends pre-battle movement only.
- Rout occurs at the end of the Aftermath and may start another battle.
- Gambits normally go to the Graveyard; Tactics normally go to the Discard Pile.
- Rearguard prevents repeated use of the same Order or same physical card that turn.

---

Gauntlet v0.6.3 reconstruction candidate © 2026 Tymon Scott. All rights reserved. Military Faction Guide.
