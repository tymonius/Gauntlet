# Gauntlet v0.6.1 Implementation Ledger

**Status:** Active implementation source on the v0.6.1 revision branch  
**Baseline:** Gauntlet v0.6.0 — Faction Framework Release  
**Evidence:** First physical v0.6.0 playtest, July 27, 2026

This document records the approved v0.6.1 corrections while they are being folded into the governing rulebook, faction guides, card sources, player aids, browser tools, and playtest workflow. It is not a substitute for those final sources. Once synchronization is complete, retain only the changelog and any continuing implementation notes.

---

## 1. Battle vocabulary

Use these terms consistently:

- **Hand:** persistent private cards.
- **Gambit:** a card set from Hand at the start of a battle.
- **Reserve:** temporary cards drawn for that battle.
- **Tactic:** a card chosen from Reserve.
- **Aftermath of the battle:** result, retreat, capture, destination, and follow-up phase.
- **Pass:** the standard choice when a player sets or chooses no card.

Mnemonic: **Gambits go to the Graveyard.**

### Actions and Action Opportunities

An **Action** is a spendable allowance; an **Action Opportunity** is a timing window. A player normally has 1 Action and two normal Action Opportunities each turn, before and after movement. No more than 1 Action may be spent during the same Action Opportunity.

### Printed effect headings

- **Action:** normally played by spending 1 Action during an Action Opportunity.
- **Gambit:** may only be set as a Gambit.
- **Tactic:** may only be chosen as a Tactic.
- **Battle:** may be used as either a Gambit or Tactic.
- **Mission:** requirement when assigned as a Mission or Special Operation.

Playing a card for one printed effect does not activate its other printed effects unless a rule says otherwise. Setting a Gambit or choosing a Tactic places the card in battle; it does not resolve immediately unless stated. A card already face up still waits for its normal reveal timing.

---

## 2. Pending battles and opening effects

When movement or an effect would start a battle, establish the attacker, defender, and contested position. Resolve opening effects before Gambits are set.

If an opening effect prevents the battle from proceeding, no battle is fought. Otherwise, continue to Set Gambits.

Accepted Terms prevent the pending battle. Battle, victory, loss, and Aftermath triggers do not occur. An Overlay removed after the next battle fought there remains in play when Terms prevent that battle.

### Diplomat mirror

Only one player may offer Terms for a pending battle. The attacker has the first opportunity. If the attacker passes, the defender may offer Terms. Once either player offers Terms, the other cannot offer Terms for that battle, even if the Proposal is refused.

---

## 3. Battle sequence

Resolve each battle in this order:

1. Resolve opening effects.
2. Set Gambits.
3. Set each Hand aside, then draw three cards to form each Reserve.
4. Reveal Gambits.
5. Choose Tactics.
6. Reveal Tactics.
7. Resolve the battle.
8. Resolve the Aftermath of the battle.

Unless changed by an effect, the attacker sets a Gambit first and chooses Tactics first. An effect that changes Gambit order does not change Tactic order unless it says so, and vice versa.

Setting the Hand aside is only a physical separation. Those cards remain in Hand and may still be revealed, discarded, or used by effects. A Reserve remains hidden and separate from the Hand; its owner may examine and arrange it freely.

A player may normally set one Gambit and choose one Tactic. Permission to set or choose additional cards is optional unless stated otherwise.

---

## 4. Reveal, information, and resolution priority

To reveal a face-down Gambit or Tactic, turn it face up and leave it face up. Its effect still waits for the normal reveal stage unless stated otherwise.

To reveal a Hand or Reserve, its owner shows that zone to the opponent. The cards remain in that zone.

Gambits are revealed simultaneously. Effects that expressly resolve before other Gambit effects resolve first. After that, when multiple effects share a timing, the attacker resolves one controlled effect, then the defender resolves one controlled effect, alternating until none remain. Each player chooses the order of effects they control.

Simultaneous reveal does not mean simultaneous resolution. An effect cannot be negated after it has resolved.

A negated Gambit or Tactic has no effect but remains in battle and keeps its role and normal destination unless stated otherwise.

---

## 5. Replacements, revisions, and additional Tactics

A replacement card takes the same role as the card it replaces. A replacement Gambit must be Gambit-eligible; a replacement Tactic must be Tactic-eligible. Place it face up or face down as instructed.

A replacement does not reopen an earlier timing window. Only unresolved effects whose timing remains available can resolve.

When an effect lets a player revise a choice, the revised choice does not create another Surveillance, Interference, reveal, or replacement opportunity unless stated otherwise.

### Additional Tactics

When an effect lets a player play an additional Tactic, place an eligible card with a Tactic or Battle effect in battle as instructed. If Tactics have already been revealed, play it face up and resolve only effects whose timing remains available.

Playing an additional Tactic does not reopen Tactic choices, reveal timing, Surveillance, or Interference. It follows the normal Tactic destination unless the effect specifies otherwise.

### Multiple Tactics

When a player may choose more than one Tactic, choose all of them simultaneously. Each remains a separate Tactic.

- **a Tactic** means one Tactic;
- **your Tactics** or **all Tactics** means every applicable Tactic.

Removing or replacing one does not affect the others unless the effect says otherwise.

A card returned to its source returns to the zone from which it entered battle unless another rule gives it a destination.

---

## 6. Withdrawal and retreat

### Effect-caused withdrawal

An effect-caused withdrawal ends the battle immediately unless stated otherwise.

- Do not resolve remaining Battle effects or roll dice.
- There is no winner or loser.
- Win, loss, and retreat triggers do not occur.
- Resolve the withdrawing player's movement, then normal battle cleanup.
- An attacking player withdraws to the position from which they entered.
- A defending player withdraws one position toward their own end; the attacker occupies the contested position.
- If both players withdraw, move the attacker first, then the defender.

Withdrawal is not retreat.

### Retreat

Retreat is forced displacement after losing a battle. It is not movement or withdrawal.

- A losing attacker returns to the position from which they entered.
- A losing defender retreats one position toward their own end.
- A winning attacker occupies the contested position.
- A winning defender remains there.
- Additional retreats resolve one position at a time.
- A player cannot retreat through the opponent.
- A player on their final Territory may retreat beyond the Gauntlet normally.

---

## 7. Aftermath order

Resolve the Aftermath of the battle in this order:

1. Determine the battle result.
2. Apply effects that replace losing with withdrawal.
3. If the battle still has a winner, resolve immediate result triggers, including normal Command gain.
4. Resolve normal retreat and occupation, including replacements.
5. Resolve additional retreats and final-position effects.
6. Resolve other Aftermath effects that occur before cards leave battle.
7. Move battle cards to their destinations.
8. Resolve effects triggered by those destinations.
9. Resolve effects at the end of the Aftermath, including follow-up movement.

Normal destinations:

- Gambits go to their owners' Graveyards.
- Tactics go to their owners' Discard Piles.
- Cards remaining in Reserve go to their owners' Discard Piles.
- A card-specific destination overrides the normal destination.

Withdrawal uses these normal destinations unless the withdrawing effect says otherwise.

---

## 8. Battles and movement

When movement starts a battle, the moving player's current movement ends and all remaining movement is lost. A player moves after the battle only when a rule or effect specifically permits it.

Approved Military Orders:

> **Onward — 1 Command:** During your Movement step, before a battle begins, move one additional position. This movement may start a battle.

> **Rout — 2 Command:** At the end of the Aftermath of a battle you initiated and won, advance one position. This movement may start another battle.

Onward cannot be used after a battle. Rout is an explicit post-battle movement effect.

---

## 9. Assets and Overlays

### Asset replacement

When banking an Asset at the Asset limit, a player may discard one Asset they control to make room and bank the new Asset during the same Action Opportunity. An effect that prevents an Asset from leaving play also prevents replacing it this way.

### Overlay control

An Overlay is controlled by the controller of the Territory beneath it. Its control changes when control of that Territory changes.

The card's owner does not change. When an Overlay leaves play, put it in its owner's Discard Pile unless stated otherwise.

On an Overlay, **you** means the current controller unless the text identifies its owner, the player who placed it, or another player.

### Fog

> **Battle:** After Tactics are revealed, if your opponent set a Gambit and has one or more Tactics in battle, they choose one: return their Gambit to their Hand; or return each of their Tactics to its source. They have no Gambit or no Tactics in this battle, as chosen.

Fog's order effect applies separately to Gambits and Tactics. Neutral Observers overrides Fog only for Gambit order.

---

## 10. Copied effects

When a rule instructs a player to resolve another card's effect, resolve only the specified printed effect.

- Treat **you** and **your** as referring to the player resolving it.
- References to **this card** refer to the card whose text is being resolved.
- All costs, requirements, targets, and timing restrictions still apply.
- The source card does not move unless the instruction or resolved effect says it does.
- The copied effect cannot reopen an earlier timing window.
- An effect that resolves another effect cannot select another such effect unless a rule expressly permits it.

Heresy retains its printed one-additional-layer exception.

---

## 11. Standard verbs

Use these verbs consistently:

- **set** a Gambit;
- **choose** a Tactic;
- **play** a card for a printed effect;
- **activate** an Asset;
- **use** an Order, Surveillance, Interference, Leverage, Subsidize, or another named faction ability; and
- **resolve** an effect.

Avoid generic phrases such as “use a Gambit,” “use a Tactic,” or “use an Asset.”

---

## 12. Structural card revisions already approved

### Black Covenant

> **Tactic:** When Black Covenant is revealed, you may bind one other card from your Hand with a Tactic or Battle effect. Play it face up as an additional Tactic and resolve its effect immediately after Black Covenant. During the Aftermath of the battle, put Black Covenant and the bound card in your Graveyard.

### Confession

> **Tactic:** After Tactics are chosen, before they are normally revealed, reveal Confession if it is face down. Reveal one opposing face-down Tactic. You may return Confession to your Reserve and choose another eligible Tactic from your Reserve face down.

### Brothers in Arms

> **Action:** Bank Brothers in Arms as an Asset. When choosing Tactics, if you did not set a Gambit, you may discard it. If you do, choose one eligible Tactic from your Reserve and one card from your Hand with a Tactic or Battle effect. Set both face down as your Tactics, or pass.
>
> **Tactic:** When you choose Brothers in Arms as your Tactic, if you did not set a Gambit, you may also choose one card from your Hand with a Tactic or Battle effect as an additional Tactic. Set it face down and reveal both together.
>
> During the Aftermath of the battle, put the card chosen from your Hand in your Graveyard instead of your Discard Pile.

### Rearguard

> **Action:** Bank Rearguard as an Asset. After you lose a battle and retreat, when your opponent would use an Order or card effect to enter your position during that turn, you may discard Rearguard. If you do, prevent that movement. No Command is spent, and any card used for that effect returns to its owner's Hand. That Order cannot be used again that turn, and that specific card cannot be played again that turn.
>
> **Battle:** During the Aftermath of the battle, if you lose and retreat, bank Rearguard as an Asset instead of putting it in its normal destination.

A second copy of the same card title remains legal.

---

## 13. First-playtest response status

### Addressed in approved rules or wording

- battle vocabulary and physical card roles;
- battle sequence and timing;
- reveal versus private inspection;
- simultaneous reveal and effect priority;
- Gambit and Tactic replacement;
- withdrawal versus retreat;
- movement ending when a battle begins;
- Onward versus Rout;
- Asset replacement at capacity;
- Overlay control and perspective;
- Intelligence Surveillance and Interference timing;
- faction-card compatibility with Gambits and Tactics;
- Diplomat mirror Terms priority; and
- copied-effect boundaries.

### Addressed in approved playtest workflow

- unique single-use QR code per printed sheet;
- first scan creates a session and later scans join it;
- Rules Arbiter questions are linked to the session automatically;
- closing the session retires the QR code;
- a human-readable sheet serial provides fallback reconciliation;
- record instruction/setup time, game time, and total time separately;
- classify stopped sessions by reason;
- exclude external-interruption sessions from completed-game pacing and win-balance statistics while retaining their feedback;
- show faction introductions and recommended Decks before selection; and
- ask whether the faction introduction prepared each player for the faction.

### Still requires production implementation or further evidence

- synchronize the rulebook, all six faction guides, exact card data, printable sheets, browser references, Deckbuilder, and digital rules engine;
- produce a player mat or reference defining Deck, Discard Pile, Graveyard, Hand, Asset Bank, Leader/Mission, faction-specific areas, Reserve, Gambit, and Tactic zones;
- implement QR-session generation, joining, retirement, and serial reconciliation;
- implement the Rules Arbiter question-and-answer review database and confidence labels;
- regenerate and visually inspect every affected PDF, DOCX, card sheet, and browser layout; and
- run additional completed games before drawing pacing, matchup, or balance conclusions.

The first game ended because a player had to leave. Its roughly 90-minute duration, ten rounds, and three battles remain useful onboarding and process evidence, but not a completed-game pacing or victory-balance result.
