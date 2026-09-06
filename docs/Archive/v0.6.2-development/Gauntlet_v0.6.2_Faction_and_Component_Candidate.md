# Gauntlet v0.6.2 Faction and Component Candidate

**Status:** Normative Wave B source candidate  
**Shared rules:** `docs/Gauntlet_v0.6.2_Shared_Rules_Candidate.md`  
**Tracker:** [Issue #494](https://github.com/tymonius/Gauntlet/issues/494)  
**Published release:** v0.6.1 remains canonical until v0.6.2 is released

This document governs every faction, Proposal, card, Territory, and supplemental-component change adopted for Wave B. It inherits unchanged text from the published v0.6.1 faction guides, Neutral card pool, and Territory pool. When this document supplies replacement text, that text supersedes the inherited v0.6.1 wording for the v0.6.2 candidate.

This is a source candidate, not a released rulebook or generated component package. Later waves must propagate it into canonical structured data, full faction guides, card renders, the Deckbuilder, browser tools, the Rules Arbiter corpus, and the digital implementation.

---

# 1. Candidate pool structure

| Pool | Count | Change |
|---|---:|---|
| Neutral | 50 | Remove Invasion; add Landslide. |
| Military | 13 | Add Invasion. |
| Diplomats | 13 | Add Détente. |
| Financiers | 13 | Add Compound Interest. |
| Intelligence | 13 | Add Extraordinary Rendition. |
| Mystics | 13 | Add Nature's Altar. |
| Inquisition | 13 | Add Martyrdom. |

## Accepted new-card values

| Pool | Card | Cost | Restriction | Modes |
|---|---|---:|---|---|
| Neutral | Landslide | 4 | Maximum one Landslide on each Territory | Action, Battle, Overlay |
| Military | Invasion | 4 | None | Action, Battle |
| Diplomats | Détente | 3 | Maximum one banked Détente | Action, Asset |
| Financiers | Compound Interest | 4 | Maximum one banked Compound Interest | Action, Asset |
| Intelligence | Extraordinary Rendition | 4 | Maximum one banked Extraordinary Rendition | Action, Asset |
| Mystics | Nature's Altar | 4 | None | Action, Battle, Overlay |
| Inquisition | Martyrdom | 5 | Unique; maximum one copy per Playable Deck | Aftermath response from Hand |

---

# 2. Shared component migration rules

## Action timing

- A card played for an **Action** effect is played during Opening or Denouement unless its text names one of those phases.
- Replace “before movement Action Opportunity” with **Opening**.
- Replace “after movement Action Opportunity” with **Denouement**.
- An additional Action does not itself permit two Actions in one phase.
- A directly permitted procedure outside Opening or Denouement is not an Action unless its text says it is.

## Battle timing

- Replace battle “opening effects” with **Onset**.
- Terms occur during the pending-battle state before Onset.
- Accepted Terms prevent the battle from beginning.
- A withdrawal after Onset completes the remaining non-result Aftermath steps. Clear any committed battle cards using their normal destinations.

## Movement terminology

- Use **Advance**, **Hold**, and **Fall Back** for ordinary Movement choices.
- Use **withdraw** only when a pending or active battle ends without a winner.
- Use **retreat** only after losing a battle.

## Front Line and immediate Capture

Territory control remains contiguous from each player's own end.

When an inherited effect would capture a specific Territory but that Territory cannot legally join the player's contiguous Front Line, the effect instead advances that player's Front Line by the number of Territories the effect permits, if the player's token is on or beyond each Territory added. It never creates isolated control.

Component text revised in this document uses **advance your Front Line by one Territory** where that is the actual result.

## Defensive Edge and Arenas

**Defensive Edge:** When the defender has Defensive Edge, the defender wins tied battle totals.

The defender normally has Defensive Edge while defending a Territory they control or making a Last Stand, unless an effect removes it.

When an Arena removes Defensive Edge and battle totals remain tied, proceed to a Tiebreak Roll. Do not reroll the original modified battle calculation.

## Obsolete Territory visibility language

All Territories are revealed during setup. Do not use **revealed Territory** as an ordinary eligibility condition. Preserve reveal language only when a real hidden-information state changes.

---

# 3. Military

## Faction structure

| Element | v0.6.2 rule |
|---|---|
| Victory | Run the Gauntlet. |
| Resource | Command, maximum 2. |
| Resource gain | The first time each turn the Military wins a battle, gain 1 Command. |
| Faction Actions | None. |
| Faction Abilities | Orders at their printed timings. |
| Faction pool | 13 Military card titles. |
| Unique card | Shock and Awe, cost 5. |

Military Orders are Faction Abilities. They do not use an Action.

## Orders

> **Onward — 1 Command:** During your Movement, before a pending battle is created, move one additional Position. This movement may create a pending battle.

> **Rally — 1 Command:** Before dice are rolled in a battle you initiated, add +1 to your battle total.

> **Rout — 2 Command:** At the end of the Aftermath of a battle you initiated and won, advance one Position. This movement may create a pending battle.

> **Entrench — 1 Command:** Before dice are rolled in a battle you did not initiate, add +1 to your battle total.

> **Repel — 1 Command:** During the Aftermath of a battle you did not initiate and won, after the opponent's normal retreat, they retreat one additional Position, if able.

> **Fortify — 2 Command:** During the Aftermath of a battle you won while occupying an enemy-controlled Territory, advance your Front Line by one Territory, if able.

## Military — Invasion

**Cost:** 4  
**Unique:** No

> **Action — Opening:** During your Movement this turn, you may advance up to two additional Positions, one at a time. This additional movement may only be used to advance and may create a pending battle.
>
> **Battle:** If you are the attacker, form your Reserve with one additional card and you may choose one additional Tactic.

Unused additional movement is lost when a pending battle is created.

### Invasion interaction rules

- Invasion and Onward contribute to the same Movement sequence unless an effect expressly creates a later sequence.
- Each Position is entered separately and its Territory effects resolve normally.
- Creating a pending battle ends the current Movement sequence and loses unused Invasion movement.
- Accepted Terms do not restore lost movement.
- The Battle mode changes Reserve and Tactic limits only for that battle.
- Several active effects may each increase Reserve or Tactic limits unless a specific effect prohibits stacking.
- Give Chase, Rout, Countercharge, and Shock and Awe create or resolve later movement according to their own timings; unused Invasion movement does not carry into them.

## Revised inherited Military text

### Battlefield Promotion

> **Action — Denouement:** Play only if you won a battle this turn. Return one Tactic you chose during that battle from your Discard Pile to your Hand.

Its Battle mode is unchanged.

### Encampment

Replace both occurrences of **revealed Territory** with **Territory**.

### Give Chase

> **Action — Denouement:** Play only if you won a battle you initiated this turn. Advance one Position. This movement may create a pending battle. If it does, you cannot set a Gambit or use Orders during that battle. Form your Reserve with one fewer card for each earlier battle after the first that you fought this turn. This may reduce your Reserve to zero cards. Put Give Chase in your Graveyard after this movement.

Its Battle mode retains the same restrictions and occurs at the end of the Aftermath.

### Hold the Line

Replace **during opening effects** with **during Onset**.

If its controller loses, the attacker advances their Front Line by one Territory, if able, after the defender retreats.

### Shock and Awe

Replace **during opening effects** with **during Onset**.

Replace Consolidate with:

> **Consolidate —** Advance your Front Line by one Territory, if able, then set your Command to 2.

All movement, additional-Tactic, loss, destination, and post-choice restrictions remain unchanged.

---

# 4. Diplomats

## Faction structure

| Element | v0.6.2 rule |
|---|---|
| Victory | Run the Gauntlet or complete the Peace Treaty. |
| Resource | Influence, 0–10. |
| Starting value | 1 Influence. |
| Faction Actions | None. |
| Faction procedure | Offer Terms during a pending battle before Onset. |
| Faction Ability | Leverage before dice following refused Terms. |
| Faction pool | 13 Diplomat card titles. |

## Influence and ratification

### Accepted Terms

When an unratified Proposal is accepted:

1. apply its Accepted effect;
2. return the Stake;
3. ratify the Proposal; and
4. gain 1 Influence.

When an already-ratified Proposal is accepted, return the Stake but gain no default ratification reward.

### Refused Terms

When Terms are refused, apply the Refused effect and proceed to Onset unless the effect prevents the battle.

- If the Diplomat wins and the Proposal was unratified, return the Stake, ratify it, and gain 2 Influence.
- If the Diplomat loses, lose the Stake and do not ratify it.
- If the battle ends without a winner, return the Stake and do not ratify it.
- An already-ratified Proposal grants no default reward.
- Proposal-specific text may override these rewards.

## Leverage

Before dice are rolled in a battle following refused Terms, the Diplomat may spend Influence for a battle-total bonus:

| Bonus | Total Influence cost |
|---:|---:|
| +1 | 1 |
| +2 | 3 |
| +3 | 6 |
| +4 | 10 |

The progression continues without a fixed maximum. Each additional +1 costs one more Influence than the previous increment. Staked Influence cannot be spent.

## Proposal presentation rule

Proposal cards are physically presented to the receiving player. Accepted and Refused text therefore uses explicit roles rather than perspective-dependent **you** or **your**.

## Proposal set — exact v0.6.2 text

### De-escalation

**Stake:** 0  
**Requirement:** None

> **Accepted:** Both players withdraw. The accepting player draws one card.
>
> **Refused:** The Diplomat draws one card.

### Orderly Withdrawal

**Stake:** 0  
**Requirement:** The Diplomat must be the attacker.

> **Accepted:** The Diplomat withdraws. The accepting player remains at the contested Position, then draws one card.
>
> **Refused:** Add +1 to the Diplomat's battle total.

### Capitulation

**Stake:** 0  
**Requirement:** The Diplomat must be the defender.

> **Accepted:** The Diplomat withdraws. The accepting player remains at the contested Position and becomes the occupier when applicable, then draws one card.
>
> **Refused:** If the Diplomat loses, the Diplomat draws two cards.

### Open Channels

**Stake:** 1  
**Requirement:** The Diplomat must have a card in Hand.

> **Accepted:** Both players reveal their Hands, then both players withdraw. The accepting player draws one card.
>
> **Refused:** The refusing player reveals their Hand. When the Diplomat forms their Reserve, the Diplomat draws one additional card.

### Mutual Disarmament

**Stake:** 1  
**Requirement:** Both players must have a card in Hand.

> **Accepted:** Each player discards one card from Hand. The accepting player draws one card, then both players withdraw.
>
> **Refused:** The Diplomat may discard one card from Hand. If they do, the Diplomat draws one additional card when forming their Reserve.

### Prisoner Exchange

**Stake:** 1  
**Requirement:** Each player must have a card in their Graveyard.

> **Accepted:** Each player may move one card from their Graveyard to their Discard Pile. Then both players withdraw.
>
> **Refused:** If the Diplomat loses, the Diplomat may move one card from their Graveyard to their Discard Pile.

### Rebuilding Pact

**Stake:** 1  
**Requirement:** The Diplomat must have a card in Hand that can be banked as an Asset.

> **Accepted:** Each player may bank one eligible card from Hand as an Asset without taking an Action. Then both players withdraw.
>
> **Refused:** During the Aftermath, the Diplomat may bank one eligible card from Hand as an Asset without taking an Action.

### Ultimatum

**Stake:** 2  
**Requirement:** None

> **Accepted:** The accepting player withdraws. The Diplomat remains at the contested Position and becomes the occupier when applicable.
>
> **Refused:** Add +1 to the Diplomat's battle total.

### Diplomatic Recognition

**Stake:** 2  
**Requirement:** The Diplomat must be defending a Counterattack while occupying a Territory the opposing player controlled immediately before the Diplomat became its occupier.

> **Accepted:** The Diplomat advances their Front Line by one Territory, if able. The accepting player withdraws, then draws two cards.
>
> **Refused:** If the Diplomat wins, advance the Diplomat's Front Line by one Territory during the Aftermath, if able. The Diplomat gains no Influence for imposing this Proposal.

## Diplomats — Détente

**Cost:** 3  
**Card form:** Asset

> **Action:** Bank this card. You may have only one banked Détente.
>
> **Asset:** The first time each turn an opponent accepts one of your Proposals that was already ratified when you offered it, gain 1 Influence.

Détente does not trigger when the accepted Proposal becomes ratified during those Terms.

## Revised inherited Diplomat cards

### Good Faith

Replace its Accepted result with:

> **Accepted:** Put that card in your Graveyard, then gain 1 Influence.

### Gunboat Diplomacy

> **Terms:** When you offer Terms, before the opponent accepts or refuses, you may reveal Gunboat Diplomacy from your Hand.
>
> **Accepted:** Put Gunboat Diplomacy in your Discard Pile.
>
> **Refused:** Set Gunboat Diplomacy face up as an additional Gambit in the resulting battle. It does not count against your Gambit limit.
>
> **Battle:** Add +2 to your battle total.

Normal destinations apply. A refusal-set Gambit goes to the Graveyard; a normally chosen Tactic goes to the Discard Pile.

### Safe Conduct

When used after Onset, Safe Conduct causes withdrawal rather than a loss. Complete the remaining non-result Aftermath, clear committed cards normally, and apply Occupation if only the defender withdraws.

### Demilitarized Zone

Accepted Terms occur before Onset. Placement remains after the Accepted effect. Any player still at the contested Position then withdraws as printed.

---

# 5. Financiers

## Faction structure

| Element | v0.6.2 rule |
|---|---|
| Victory | Run the Gauntlet or achieve Controlling Interest. |
| Starting Capital | 2, as a v0.6.2 test revision. |
| Capital limit | Territories controlled plus total Treasury value. |
| Faction Actions | Place a card in Treasury, buy or buy out a Deed, Play the Market, or use Hostile Takeover; each is taken during Denouement. |
| Faction pool | 13 Financier card titles. |

Line of Credit retains its existing collateral cap.

## Financial Capacity

After Capture and all effects following Capture, but before Draw, compare Treasury value with the number of Territories the Financier controls.

If Treasury value is greater, the Financier may take one Action during both Opening and Denouement that turn, provided at least one of those Actions is a Financier Faction Action. A Financier Faction Action is normally legal only during Denouement.

Financial Capacity does not permit two Actions in one phase. Determine eligibility once at this timing.

## Front Line interactions

- Capital limit counts Territories actually controlled, not token position.
- Income counts Deeds owned, independent of control or position.
- Controlling Interest still requires the Deed to every Territory in the Gauntlet.
- Hostile Takeover and Foreclosure cannot create isolated control.

### Hostile Takeover

After the qualifying purchase succeeds, advance the Executive's Front Line by one Territory, if able, rather than taking isolated control of the occupied Territory.

### Foreclosure

Replace its Action mode with:

> **Action — Denouement:** Choose the next opposing Territory immediately beyond your Front Line if its Deed is yours and it is unoccupied. Advance your Front Line by one Territory.

Replace its Battle result with:

> **Battle:** During the Aftermath, if you initiated the battle on a Territory whose Deed you owned when the battle began and you won, advance your Front Line by one Territory, if able, instead of becoming the occupier.

## Financiers — Compound Interest

**Cost:** 4  
**Card form:** Asset

> **Action:** Bank this card. You may have only one banked Compound Interest.
>
> **Asset:** After your normal Draw, if your Treasury contains at least one card, you may reveal the top card of your Draw Pile. Place it face up in your Treasury or put it in your Discard Pile.

Revealing is optional. Once revealed, the card cannot remain on top of the Draw Pile. Compound Interest has no Battle mode.

## Revised inherited Financier timing

- Treasury placement, Deed purchase, Play the Market, and Hostile Takeover are Faction Actions during Denouement.
- Tariffs, Divestment, and Margin Loan each permit one additional Action during the phase in which the card's Action resolves. This explicit card permission overrides the normal one-Action-per-phase limit.
- Resolve the card fully before taking the additional Action. The permission expires when that phase ends.

---

# 6. Intelligence

## Faction structure

Intelligence retains its v0.6.1 resource, Mission, Leader, and victory systems. Faction Actions must state their legal phase, and all battle procedures use Onset, Defensive Edge, Tiebreak Roll, Fall Back, withdraw, retreat, and Front Line under the shared candidate.

## Intelligence — Extraordinary Rendition

**Cost:** 4  
**Card form:** Asset with a bound opposing card

> **Action:** Bank this card. When you do, reveal the opponent's Hand, choose one card there, and bind it face up beneath Extraordinary Rendition. You may have only one banked Extraordinary Rendition.
>
> **Asset:** The bound card cannot be played, moved, or affected except by Extraordinary Rendition. Whenever you discard one or more Assets you control, discard Extraordinary Rendition before any others, if able. When Extraordinary Rendition leaves play, put the bound card in its owner's Discard Pile.

The first-discard requirement applies to voluntary Asset discard, required Asset loss, and Asset replacement. Extraordinary Rendition has no Use, Battle, or Mission mode.

---

# 7. Mystics

## Faction Actions

- **Begin a Rite — Denouement:** Choose one incomplete Rite you may legally begin and pay its beginning cost.
- **Begin the Ritual of Ascendance — Denouement:** After completing all three Rites, bind the required Arcane cards from Hand, Discard Pile, and Graveyard.

Completing a Rite is a Faction Ability, not a Faction Action.

## Guardians of the Circle

> **Guardians of the Circle:** The first time on your turn that you lose a battle and that loss would interrupt a begun Rite or your Ritual of Ascendance, you may put one Arcane card from your Hand in your Graveyard whose value is at least the protection value for your current progress. If you do, prevent that interruption.

| Protected progress | Minimum Arcane value |
|---|---:|
| First Rite | 1 |
| Second Rite | 2 |
| Third Rite | 3 |
| Ritual of Ascendance | 4 |

Guardians of the Circle does not preserve a continuing position or control requirement.

## Black Covenant

**Cost:** 4  
**Trait:** Arcane

> **Tactic:** Gain advantage. Then you may play one card from your Hand with a Tactic or Battle effect face up as an additional Tactic. In the Aftermath, put this card and that card in your Graveyard.

## Mystics — Nature's Altar

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

Nature's Altar creates the only general exception to the rule that a Rite cannot complete on the turn it begins. Rite of Crossing retains its specialized beginning requirement. If the Altar's controller does not control its Territory at completion timing, the same-turn exception does not apply.

---

# 8. Inquisition

## Purge — Faction Action

> **Purge — Opening or Denouement:** Spend one Action and the listed Conviction to perform one Purge. You may take one Action during both Opening and Denouement that turn, provided one of those Actions is Purge.

- Purge may occupy either Action phase.
- The other Action must occupy the other phase.
- Purge never permits two Actions in one phase.
- Purge may be taken as a Faction Action no more than once per turn.
- A Purge directly permitted without taking an Action is not the Purge Faction Action.

The existing Purge costs and effects remain unchanged.

## Final Judgment

> **Final Judgment:** Once per turn, during the Aftermath of a battle you won, after battle cards are cleared and effects triggered by those moves are applied, you may immediately Purge without taking an Action. Reduce that Purge's Conviction cost by 1, to a minimum of 1.

Final Judgment is a Faction Ability. It does not consume the once-per-turn Purge Faction Action and does not activate the two-phase permission.

## Inquisition — Martyrdom

**Cost:** 5  
**Unique:** Maximum one copy per Playable Deck

> When you lose a battle while Martyrdom is in your Hand, during the Aftermath before battle cards are cleared, you may play it without taking an Action. If you do, cards remaining in the opponent's Reserve go to their Graveyard instead of their Discard Pile during this Aftermath. After battle cards are cleared, set your Conviction to 4 and put Martyrdom in your Graveyard.
>
> Martyrdom does not prevent the loss, retreat, Occupation, or other normal consequences of the battle result.

Setting Conviction to 4 is one set operation, not four separate gains. Condemnation still governs opposing Tactics, and opposing Gambits still use their normal Graveyard destination.

---

# 9. Neutral — Landslide

Remove Invasion from the Neutral pool and add Landslide at the same value.

**Cost:** 4  
**Card form:** Territory Overlay

> **Action:** Place Landslide as an Overlay on any Territory that does not already have a Landslide.
>
> **Battle:** During the Aftermath, if you lose and retreat from a Territory, after retreating you may place Landslide as an Overlay on the contested Territory.
>
> **Overlay:** When a player retreats onto this Territory, they retreat one additional Position, if able. Then put Landslide in its owner's Discard Pile.

- Maximum one Landslide may be on each Territory.
- Landslides on consecutive Territories may trigger in sequence.
- Landslide does not trigger from Fall Back or withdrawal.
- If the additional retreat enters another Territory with Landslide, resolve that Landslide separately.

---

# 10. Territory revisions

## Quicksand

Replace ordinary backward-movement terminology:

> If a player begins their Movement on Quicksand, they cannot voluntarily Fall Back or move more than one Position that turn. Forced displacement is unaffected.

## Difficult Terrain

Replace the final sentence with:

> A player who begins their turn there or enters it during their turn cannot play a card for its Action effect during Denouement that turn.

## Command Tent

> If a player begins their turn occupying and controlling Command Tent, they may take one Action during both Opening and Denouement that turn. If they do, both Actions may be used only to play cards for their Action effects.

## Smuggler's Pass

Replace **During an Action Opportunity** with **During Opening or Denouement, as an Action**.

## Arenas

For each Arena, replace its first tie sentence with:

> During battles here, Defensive Edge does not apply. If battle totals remain tied, make a Tiebreak Roll.

The remaining Arena effects are unchanged:

- **Spoils of War:** winner may return one unchosen Reserve card to Hand during clearing.
- **No Quarter:** losing player retreats one additional Position, if able.
- **Single Combat:** all banked Assets are inactive during the battle.
- **Grand Melee:** each player forms Reserve with one additional card and may choose one additional Tactic.

---

# 11. Source-level interaction requirements

The following behavior is fixed for later executable implementation:

1. accepted Terms end the pending battle before Onset;
2. refused Terms proceed to Onset unless their effect prevents the battle;
3. Détente triggers only from a Proposal already ratified when offered;
4. the ordinary accepted reward is 1 Influence and ordinary imposed reward is 2;
5. triangular Leverage costs are cumulative;
6. Gunboat Diplomacy uses normal role destinations;
7. Financial Capacity and Purge grant two-phase permission, not an Action window;
8. Tariffs, Divestment, and Margin Loan grant an Action but no same-phase permission;
9. Invasion movement ends when a pending battle is created;
10. immediate-capture effects advance the Front Line without creating isolated control;
11. Defensive Edge covers controlled-Territory defense and Last Stand unless removed;
12. Arenas remove Defensive Edge and use a separate Tiebreak Roll;
13. Guardians of the Circle requires Arcane value 1, 2, 3, or 4 according to progress;
14. Nature's Altar requires token presence at beginning and Territory control at completion timing;
15. Extraordinary Rendition is discarded before another Asset whenever possible;
16. Landslide triggers only from retreat and may chain across Territories;
17. Martyrdom changes remaining-Reserve destinations but does not change the battle result;
18. published v0.6.1 sources remain unchanged.
