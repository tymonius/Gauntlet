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

### Standing Orders

**Cost:** 2  
**Role:** Prepared access to one Order, including a 2-Command Order

> **Action:** Bank Standing Orders as an Asset. When you use an Order, you may discard Standing Orders. If you do, reduce that Order's Command cost by 1.
>
> **Battle:** Reduce the Command cost of one Order you use during this battle by 1.

Standing Orders is approved as the current design direction. It is a tactical discount rather than Command generation. It can make a 1-Command Order free or permit Rout or Fortify with only 1 Command, but the player must still satisfy the Order's normal timing and conditions.

This supersedes the first-pass future-Command debt mechanic. Final templating remains subject to timing review, especially for post-victory Orders.

### Field Command

**Cost:** 3  
**Role:** Combine the two different 1-Command Orders available to the chosen leader

> **Action:** Bank Field Command as an Asset. After you use a 1-Command Order, you may discard Field Command. If you do, you may use your leader's other 1-Command Order once this turn at its next legal timing without spending Command.
>
> **Battle:** After you use a 1-Command Order during this battle, you may use your leader's other 1-Command Order once this turn at its next legal timing without spending Command. If you do, place Field Command in your Graveyard after that Order resolves.

Field Command is approved as the current design direction. It does not merely discount an Order; it creates a leader-specific sequence:

- General: Onward and Rally;
- Commandant: Entrench and Repel.

Cost 3 reflects that the card supplies one additional 1-Command Order, requires the first Order to be funded normally, and still depends on legal timing. The Commandant sequence is more automatic, while the General sequence offers greater initiative and positioning flexibility; this asymmetry remains a playtest question rather than a blocker.

### Reserve Force

**Proposed cost:** 3  
**Role:** Delayed commitment and a prepared additional Battle card

> **Action:** Bank Reserve Force as an Asset and place one other Battle card from your hand face down beneath it. After Battle cards are revealed in a battle involving you, you may discard Reserve Force. If you do, play the stored card face up as an additional Battle card, if its Battle effect can still resolve. During battle cleanup, place the stored card in your Graveyard instead of its normal destination. If Reserve Force leaves play before the stored card is deployed, place the stored card in your Graveyard.
>
> **Battle:** After all Battle cards are revealed, you may replace Reserve Force with one Battle card from your hand whose Battle effect can still resolve. If you do, place Reserve Force in your Graveyard and play the chosen card face up. If you do not, place Reserve Force in your discard pile during battle cleanup instead of its normal destination.

The Reserve Force concept is liked and provisionally retained. Its Battle effect may be played either as the player's hand commitment or from battle draw. Reserve Force serves as a provisional commitment: after seeing all revealed Battle cards, the player may replace it with a more appropriate Battle card from hand.

If Reserve Force is replaced, using its effect sends it to the Graveyard regardless of whether it came from hand or battle draw. If it is not replaced, it goes to discard regardless of source. A hand-committed Reserve Force therefore avoids its normal Graveyard destination only when the player declines to use the replacement effect.

The Action mode provides the more reliable prepared version. It consumes an Action opportunity, Asset slot, and second card from hand; exposes the preparation to Asset disruption; and sends the stored card to the Graveyard whether it is deployed or the Reserve Force is destroyed.

Cost 3 remains provisional. Final review should test whether the hidden stored card creates acceptable handling, whether the Battle mode offers too much post-reveal flexibility, and whether the discard fallback makes Reserve Force too safe as a hand commitment.

---

## Unresolved design seed

### Brothers in Arms

The name and combined-arms concept remain available, but no current effect is approved.

The cost-4 proposal that repeated another Battle effect is set aside because:

- repeating card text risks feeling more Arcane than Military;
- interactions with premium Battle effects become difficult to bound;
- it produces rules and balance complexity disproportionate to the clarity of the military fantasy;
- the trigger still rewards a common high-commitment battle pattern rather than clearly creating a new decision.

The earlier preservation wager also remains rejected because it overlapped Battlefield Promotion, encouraged destination bookkeeping, and did not create a sufficiently memorable payoff.

Any future Brothers in Arms proposal should be simpler, should preserve ordinary counterplay, and should make coordinating hand commitment with battle draw into a deliberate choice rather than an automatic bonus. The release slot remains open; the name is not guaranteed a place in the final pool.

---

## Rejected

### Bridgehead

The name and current effect are rejected.

The replacement Overlay must represent something that makes physical and thematic sense to remain attached to a Territory across turns. It should not exist only as an abstract marker for a one-turn choice.

### First-pass Standing Orders debt wording

The version that made a 1-Command Order free and canceled the next Command gain is superseded by the approved discount design. It created delayed tracking, awkward stacking, and inconsistent value depending on whether another Command gain occurred.

### First-pass Brothers in Arms preservation wager

The version that returned one paired card to hand after victory and sent both to the Graveyard after defeat is rejected. It overlapped Battlefield Promotion, encouraged destination bookkeeping, and did not create a sufficiently memorable combined-arms payoff.

### Brothers in Arms repeated-effect proposal

The proposal that repeated one Battle effect after coordinating a hand commitment and battle-drawn card is not approved and is set aside pending a substantially cleaner concept.

### Bridgehead Overlay

Bridgehead's name and Hold/Expand effect are rejected in favor of Encampment.

---

## Secondary Overlay direction: Siegeworks

Persistent works placed on an enemy-controlled Territory to support repeated assaults remain a possible alternative or future Military design.

This direction is more General-leaning and risks overlap with Invasion, Siege Weaponry, and battle-draw support, but it has strong physical logic as an Overlay.

---

## Next step

Review Reserve Force's cost and handling, then develop the next Military candidate from a concrete, evocative battlefield decision. Battlefield Promotion still requires cost approval and exact timing review; the remaining Military slots are open.