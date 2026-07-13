# Military Draft Review Notes

**Status:** Active review provenance for the first twelve-card Military package draft.  
**Purpose:** Record accepted, rejected, and current proposed Military-card directions before the pool is rewritten.

---

## Approved or provisionally retained

### Battlefield Promotion

The card name is retained. The original Command-gain effect does not fit the name well enough and is retired.

Preferred new direction:

> **Action:** Play only after you win a battle. Choose one card you played from battle draw during that battle. Return it from your discard pile to your hand.
>
> **Battle:** During battle cleanup, if you win, return one other card you played from battle draw to your hand instead of placing it in your discard pile.

The concept is that an uncertain battle-drawn card distinguishes itself and becomes a reliable card in hand. Cost is unresolved, with cost 2 currently more plausible than cost 1.

### Encampment

**Cost:** 2  
**Card form:** Territory Overlay

> **Action:** Place Encampment as an Overlay on the revealed Territory you currently occupy and control.
>
> **Overlay:** At the end of your turn, if you occupy and control this Territory, gain 1 Command.
>
> When an opponent gains control of this Territory, place Encampment in its owner's Graveyard.
>
> **Battle:** During battle cleanup, if you won this battle while defending a revealed Territory you control, place Encampment on that Territory as an Overlay instead of placing it in its normal destination.

The Action, Overlay, Battle effect, and cost-2 starting value are approved as the current Military design direction. Final templating remains subject to the completed v0.6 card-text pass.

Encampment follows the universal Overlay rules:

- the active Encampment supersedes the underlying Territory's printed effect;
- lower Overlays, if any, are dormant while Encampment remains exposed;
- leaving the Territory does not dismantle the camp;
- returning to and ending a turn on the Territory can provide Command again;
- temporary enemy occupation does not immediately remove it;
- it disappears only when the opponent gains control of the Territory.

Players may establish and control multiple Encampments. No explicit per-player or per-Territory copy restriction is intended beyond the normal rules governing Overlays and duplicate cards.

Cost 2 reflects that Encampment replaces rather than supplements the Territory's printed effect. Its value therefore depends on both repeatable Command access and the opportunity cost of converting that Territory into a rally point.

---

## Current candidates for review

### Standing Orders

**Proposed cost:** 2  
**Role:** Prepared access to one Order, including a 2-Command Order

> **Action:** Bank Standing Orders as an Asset. When you use an Order, you may discard Standing Orders. If you do, reduce that Order's Command cost by 1.
>
> **Battle:** Reduce the Command cost of one Order you use during this battle by 1.

This replaces the first-pass future-Command debt mechanic. It is shorter, creates no tracking debt, works on either player's turn when prepared, and can help access Rout or Fortify rather than interacting only with the 1-Command Orders.

Standing Orders should be evaluated as a tactical discount, not Command generation. It still requires the player to possess any remaining Command and satisfy the chosen Order's normal timing and conditions.

### Field Command

**Proposed cost:** 3  
**Role:** Combine the two different 1-Command Orders available to the chosen leader

> **Action:** Bank Field Command as an Asset. After you use a 1-Command Order, you may discard Field Command. If you do, you may use your leader's other 1-Command Order once this turn at its next legal timing without spending Command.
>
> **Battle:** After you use a 1-Command Order during this battle, you may use your leader's other 1-Command Order once this turn at its next legal timing without spending Command. If you do, place Field Command in your Graveyard after that Order resolves.

Field Command does not merely discount an Order. It creates a leader-specific sequence:

- General: Onward and Rally;
- Commandant: Entrench and Repel.

Cost 3 is the current proposal rather than the first-pass cost 4. The card supplies only one additional Command of value, requires the first Order to be funded normally, and still depends on legal timing. The Commandant sequence is more automatic, while the General sequence offers greater initiative and positioning flexibility; this leader asymmetry requires testing.

### Brothers in Arms

**Proposed cost:** 4  
**Role:** High-commitment combined-arms tactical burst

> **Action:** Bank Brothers in Arms as an Asset. After your Battle cards are revealed, if you have an active card committed from hand and an active card played from battle draw, you may discard Brothers in Arms. Choose one active card from each source. Resolve one chosen card's Battle effect one additional time. During battle cleanup, place both chosen cards in your Graveyard instead of their normal destinations.
>
> **Battle:** If Brothers in Arms and at least one active card you played from the other source are active, choose one such card. Resolve that card's Battle effect one additional time. During battle cleanup, place Brothers in Arms and the chosen card in your Graveyard instead of their normal destinations.

The first-pass preservation wager is discarded. This version makes combined arms produce a memorable, concentrated payoff while permanently consuming both participating cards.

The proposal must follow the general anti-recursion rule: it cannot repeat a Battle effect that itself resolves another Battle effect. Final wording must also clarify that the selected effect must be capable of resolving in the current battle.

Primary watchlist:

- extreme interactions with Reinforcements, Conscription, Capital Punishment, Invasion, Assimilation, Revolution, and similar premium Battle effects;
- whether repeating one effect is too Arcane in character despite the narrow combined-arms requirement;
- whether both selected cards entering the Graveyard provides sufficient risk at cost 4;
- whether the Action form becomes an automatic premium Asset.

---

## Rejected

### Bridgehead

The name and current effect are rejected.

The replacement Overlay must represent something that makes physical and thematic sense to remain attached to a Territory across turns. It should not exist only as an abstract marker for a one-turn choice.

### First-pass Standing Orders debt wording

The version that made a 1-Command Order free and canceled the next Command gain is superseded by the simpler discount proposal. It created delayed tracking, awkward stacking, and inconsistent value depending on whether another Command gain occurred.

### First-pass Brothers in Arms preservation wager

The version that returned one paired card to hand after victory and sent both to the Graveyard after defeat is superseded. It overlapped Battlefield Promotion, encouraged destination bookkeeping, and did not create a sufficiently memorable combined-arms payoff.

### Bridgehead Overlay

Bridgehead's name and Hold/Expand effect are rejected in favor of Encampment.

---

## Secondary Overlay direction: Siegeworks

Persistent works placed on an enemy-controlled Territory to support repeated assaults remain a possible alternative or future Military design.

This direction is more General-leaning and risks overlap with Invasion, Siege Weaponry, and battle-draw support, but it has strong physical logic as an Overlay.

---

## Next step

Review the revised Standing Orders, Field Command, and Brothers in Arms candidates. Approve, revise, or reject them before creating additional Military slots. The first twelve-card draft remains superseded design provenance rather than a near-final package.