# Gauntlet v0.6 Card Review Log

**Status:** Active consolidated migration log.  
**Source order:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`.

This file records the active v0.6 cost, wording direction, rationale, and follow-up work for each reviewed card. `Gauntlet_v0.6_Card_Metadata.md` is authoritative for the separate fields **allegiance**, **starter eligibility**, **complexity**, and **watchlist concern**.

Older labels such as **Core Neutral** and **Advanced Neutral / Watchlist** may appear in historical commits, but they are not current gameplay classes.

## Review protocol

For each card:

1. fetch the exact v0.5.7 text and cost;
2. assess its effect on the neutral pool;
3. assess overlap or strange interactions with candidate faction mechanics;
4. decide allegiance, starter eligibility, complexity, watchlist concern, cost, and rule direction separately;
5. update this log and the metadata registry only after approval.

A tabled card is not decided. Do not call a decision logged until the repository update succeeds.

---

## Reviewed cards

### 1. Arcane Knowledge

**Cost:** 5  
**Direction:** Arcane faction card. Preserve the concept of using the eligible Battle effect of another card played in the same battle.

- Resolves only the referenced effect; it does not count as replaying, recommitting, revealing, copying, or changing that card's destination.
- Exclude cancellation, special-reveal, battle-ending, follow-up-battle, source-dependent, and card-lifecycle effects.
- It should not duplicate Ritual progress, Invocation, or Transmutation.
- Final eligibility wording remains to be written.

---

### 2. Armistice

**Cost:** 4  
**Direction:** Keep Neutral as a shared emergency brake and battle-ending tool.

- Do not faction-lock to Diplomats; Terms already provide their dedicated battle-avoidance system.
- Exclude from starter decks and watch for stalling and unusual Terms interactions.

---

### 3. Assassins

**Cost:** 4  
**Direction:** Intelligence faction card. Keep its harsh targeted-information and disruption identity.

- Its Mission should be appropriately difficult.
- Watch density with Spies, Scouting Report, Sabotage, Treason, Interference, and Special Operation.

---

### 4. Assimilation

**Cost:** 4  
**Direction:** Keep Neutral as shared capture acceleration and anti-stalemate breakthrough.

- If Assimilation causes immediate capture, send it to the Graveyard after capture resolves.
- Otherwise it follows its normal destination.
- Watch cumulative immediate-capture density with Commandant/Fortify and future shortcuts.

---

### 5. Attrition

**Cost:** 3  
**Direction:** Keep Neutral as a shared card-economy pressure tool rather than defaulting it to Inquisition.

- The Battle effect's distinctive value is pressuring the full initial battle draw.
- Watch long-game denial and overlap with Condemnation.

---

### 6. Blockade

**Cost:** 4  
**Direction:** Rework as a Diplomat **Sanctions** card.

- Tie it to rejected Terms and accepted settlement rather than generic neutral denial.
- Preserve a safety valve, likely through later acceptance or winning against the Diplomat.
- Exact text belongs to the Diplomat faction-card pass and v0.6.1 overhaul.

---

### 7. Brothers in Arms

**Cost:** 4  
**Direction:** Military faction card rewarding simultaneous use of a hand-origin card and a battle-drawn card.

- Keep it distinct from capture acceleration.
- Clarify hand-origin terminology and cancellation interaction.
- Brothers in Arms itself remains cancellable.

---

### 8. Capital Gains

**Cost:** 3  
**Direction:** Financiers faction card; preserve investment/payoff structure.

- Rework pure card draw so the payoff connects to Capital, Treasury, Deeds, or other Financier infrastructure.
- Cost 3 is the current direction.

---

### 9. Capital Punishment

**Cost:** 4  
**Direction:** Keep Neutral as expensive shared hard cancellation.

- Target one active opposing Battle card and send it to the Graveyard.
- Inquisition should not monopolize every severe answer.
- Watch whether cost 4 sufficiently prices universal hard cancellation.

---

### 10. Conscription

**Cost:** 3  
**Direction:** Keep Neutral as a core Asset-deployment and battle-draw enabler.

- Mechanically broader than Military despite the name.
- A broader future name such as Mobilization, Call-Up, or Mustering may be considered.

---

### 11. Contraband

**Cost:** 3  
**Direction:** Keep Neutral as discard-pile recovery and tactical reuse.

- It must not retrieve from the Graveyard.
- Clarify that the retrieved card is played in Contraband's place and follows its own destination rules.

---

### 12. Counterintelligence

**Cost:** 2  
**Direction:** Keep Neutral as shared protection against surveillance, reveal, and look effects.

- It must not block normal required battle or Territory reveals.
- Recheck cost after Intelligence Missions and faction cards are finalized.

---

### 13. Court Martial

**Cost:** 3  
**Direction:** Keep Neutral as battle-discipline and forced-retreat pressure.

- Clarify additional retreat when paths are blocked or limited.

---

### 14. Decoys

**Cost:** 3  
**Direction:** Keep Neutral as shared protection against Asset removal and Battle-card cancellation.

- Limit protection to cancellation rather than every effect that causes another card to have no effect.

---

### 15. Disruption

**Cost:** 2  
**Direction:** Keep the former Embargo mechanics as Neutral soft cancellation and light hand disruption; rename the card **Disruption**.

- A canceled hand commitment returns to hand.
- A canceled battle-drawn card goes to discard.
- Reserve **Embargo** for a future Diplomat Sanctions card.

---

### 16. Entrenchment

**Cost:** 2  
**Direction:** Keep Neutral as shared defensive positioning and anti-advance pressure.

- Clarify whether the Asset triggers only on adjacent entry or also when an opponent enters the player's occupied space to initiate battle.

---

### 17. Fealty

**Cost:** 2  
**Direction:** Keep Neutral as disadvantage protection and battle stabilization. Retain the name **Fealty**.

- Action protects against opposing disadvantage effects.
- Battle ignores one disadvantage, or grants +1 if none applies.

---

### 18. Fog of War

**Cost:** 2  
**Direction:** Intelligence faction Overlay creating battlefield confusion and forced random selection.

- The Action places a temporary Overlay on a revealed Territory and affects the next battle there.
- Preserve symmetrical random selection for the Overlay and one-sided disruption for the Battle effect.
- Random selection occurs after effects determine how many battle-drawn cards may be played.

---

### 19. Fortifications

**Cost:** 3  
**Direction:** Keep Neutral as shared defensive infrastructure and improved defensive battle access.

- Action allows up to two battle-drawn plays while defending.
- Battle gives +1 while defending; if the player still loses, any additional withdrawal is voluntary.

---

### 20. Illegal Occupation

**Cost:** 3  
**Direction:** Keep Neutral as shared pressure against occupation before capture.

- Action makes the occupier's Assets inactive while they occupy but do not control the Territory.
- Battle applies during a counterattack, suppressing those Assets and granting advantage.
- Retain the current name for v0.6.

---

### 21. Insurrection

**Cost:** 4  
**Direction:** Keep Neutral as a chaotic global reset and situational battle-pressure card.

- Action: discard your hand; each player shuffles discard into deck; draw three; then you may immediately play one additional Action.
- Battle: attacker gains advantage; a counterattacker retaking their own Territory gains double advantage.
- Exclude from starter decks and watch interaction with Arcane Graveyard pressure and Inquisition Purification.

---

### 22. Invasion

**Cost:** 4  
**Direction:** Keep Neutral as shared offensive tempo rather than faction-locking it to Military.

- Military already expresses this job through Command and Orders.
- Exclude from starter decks.
- Watch stacking with Onward, Rally, Rout, and other attack-tempo effects.

---

### 23. Liberation

**Cost:** 4  
**Direction:** Keep Neutral as counterattack and comeback tempo. Redesign the Battle effect to mirror Invasion from the defensive side.

**Battle direction:** If you are counterattacking an opponent occupying a Territory you control, draw one additional battle card. You may play it in addition to your other Battle cards.

- Avoid post-battle movement that duplicates Military Rout.
- Exclude from starter decks and watch efficiency with other occupation answers.

---

### 24. Manifest Destiny

**Cost:** TBD  
**Direction:** Retain the name but fully redesign the current effect.

- Reject permanent insertion of a new blank Territory into the Gauntlet.
- The current mechanic disrupts board geometry, Asset limits, Deeds, Special Operation thresholds, pacing, and breakthrough distance.
- Reserve **New Frontier** as a separate future card name.

---

### 25. Militias

**Cost:** 3  
**Direction:** Military faction card supporting defense, counterattack, and holding ground.

**Action direction:** Bank Militias as an Asset. During the first battle each turn on a Territory you control, your opponent gains disadvantage.

**Battle direction:** Your opponent gains disadvantage. If this battle is on a Territory you control, they gain double disadvantage instead.

- Watch stacking with Commandant Orders, Fortifications, Patriotism, and Homeland Advantage.

---

### 26. Monetary Crisis

**Cost:** 2  
**Direction:** Financiers faction card retaining symmetrical hand-reset effects.

**Action direction:** Each player discards their hand, then draws two cards.

**Battle direction:** During battle cleanup, each player discards down to one card.

- Financiers gain asymmetry through Treasury preparation rather than extra printed benefit.
- Watch repeated cheap resets against factions that must retain planned cards.

---

### 27. Necromancy

**Cost:** 5  
**Direction:** Arcane faction card with the Arcane trait; premium direct Graveyard-to-hand recovery.

**Action direction:** Return one card from your Graveyard to your hand. Place Necromancy in your Graveyard instead of discard.

**Battle direction:** During battle cleanup, return one card from your Graveyard to your hand.

- Remove the restriction against retrieving another Necromancy.
- Watch Rite, Invocation, Transmutation, and Arcane Knowledge interactions.

---

### 28. New Recruits

**Cost:** 1  
**Direction:** Keep Neutral with both effects unchanged.

**Action:** Discard one other card from your hand, then draw two cards.

**Battle:** Add +1 to your battle total.

- Starter-eligible basic filtering; watch only for automatic-inclusion pressure.

---

### 29. Palisade Wall

**Cost:** 2  
**Direction:** Keep Neutral as shared defensive counterplay.

**Action direction:** During the next battle in which you defend, the opponent's Assets are inactive. The post-review Condition pass must determine the cleanest persistent representation.

**Battle direction:** If defending, choose one active opposing Battle card committed from hand. It has no effect during this battle. If no such card exists, gain advantage instead.

- The affected card remains played and follows its normal destination.

---

### 30. Patriotism

**Cost:** 3  
**Direction:** Military faction card supporting defense on controlled Territory.

**Action direction:** Bank Patriotism as an Asset. You may have only one banked Patriotism. During battles on a Territory you control, double the first +1 or advantage granted by one of your Battle cards.

**Battle direction:** If defending a Territory you control, gain advantage.

- The Asset does not double Homeland Advantage, Heartland defense, Orders, or opposing disadvantage.
- Remove the obsolete Homeland Advantage protection clause.

---

### 31. Protracted Siege

**Cost:** 4  
**Direction:** Keep Neutral as visible, expendable capture-delay counterplay using a Territory Overlay.

**Action direction:** Bank as an Asset. When the opponent occupies a Territory you control, you may move Protracted Siege onto it as an Overlay. When normal start-of-turn capture would occur, discard the Overlay instead and prevent that capture. Discard it if the opponent ceases occupying the Territory.

**Battle direction:** If you defend a Territory you control and lose, place Protracted Siege there as the same Overlay instead of its normal destination.

- Each copy delays one scheduled capture only.
- Immediate-capture effects bypass it unless they use the normal schedule.
- Watch excessive game length; do not impose a one-copy restriction before testing.

---

### 32. Rallying Cry

**Cost:** 1  
**Direction:** Keep Neutral with both effects unchanged.

**Action:** Draw one card.

**Battle:** Add +1 to your battle total.

- Starter-eligible basic cycling and battle support.

---

### 33. Redemption

**Cost:** 2  
**Direction:** Keep Neutral as shared protection against discard-pile disruption. Bank the Action as an Asset until voluntarily used.

**Action:** Bank Redemption as an Asset. Whenever an opposing effect places one or more of your other cards in your discard pile, you may discard Redemption. If you do, return one of those cards to your hand after that effect resolves.

**Battle:** If an opposing effect causes one other Battle card you played to have no effect and places it in your discard pile, return that card to your hand after the battle instead.

- Redemption cannot save itself and does not protect cards entering the Graveyard.

---

### 34. Reinforcements

**Cost:** 2  
**Direction:** Keep Neutral as shared Action economy and late-battle flexibility.

**Action:** Bank Reinforcements as an Asset. During your turn, you may discard Reinforcements to play one additional Action card.

**Battle:** After all other Battle cards are revealed, draw one additional battle card. You may immediately play it face up in addition to your other Battle cards if its Battle effect can still resolve.

- The Asset may be expended at the point the extra Action is used, not only at turn start.
- Watch action stacking and late-battle timing.

---

### 35. Resistance

**Cost:** 3  
**Direction:** Keep Neutral as repeatable shared counterattack support.

**Action:** Bank Resistance as an Asset. When you counterattack an opponent occupying a Territory you control, draw two additional cards as part of your initial battle draw.

**Battle:** If you are counterattacking an opponent occupying a Territory you control, gain advantage. If you win, bank Resistance after the battle instead of placing it in its normal destination.

**Reminder:** If your Asset bank is full, you may discard one Asset to make room. Otherwise, place Resistance in its normal destination.

- Not starter-eligible; Advanced complexity.
- Watch stacking with Liberation, Protracted Siege, Illegal Occupation, and multiple Resistance Assets.
- Do not impose a one-copy restriction before testing.

---

### 36. Revolution

**Cost:** 4  
**Direction:** Keep Neutral as a destabilizing hand-economy and battle-result reversal card.

**Action:** Each player discards their hand, then draws cards equal to the number of cards the other player discarded.

**Battle:** After all rerolls, you may exchange the players' final selected die results. Each player retains their own modifiers.

**Reminder:** If both players use Revolution to exchange the results, no exchange occurs.

- Not starter-eligible; Advanced complexity.
- Watch extreme hand swings, repeated recovery, battle reversal frequency, and simultaneous-use timing.

---

### 37. Rousing Speech

**Cost:** 2  
**Direction:** Keep Neutral as shared Asset-development catch-up and anti-snowball support.

**Action:** Bank Rousing Speech as an Asset. Whenever your opponent banks an Asset, you may draw one card, then discard one card.

**Battle:** If your opponent has more face-up Assets than you do, gain advantage.

**Reminder:** Turning an existing Asset face up does not count as banking an Asset.

- Starter-eligible; Basic complexity.
- No initial watchlist concern.

---

### 38. Sabotage

**Cost:** 2  
**Direction:** Keep Neutral as shared temporary Asset suppression and Battle-card cancellation. Remove the Action's attached Condition.

**Action:** Choose one face-up opposing Asset. Turn it face down until the start of your next turn.

**Battle:** Cancel one active opposing Battle card. Place it in its owner's discard pile immediately.

**Reminder:** If there are no active opposing Battle cards, Sabotage has no effect.

- The Action resolves and enters its normal destination immediately; the target Asset's face-down state tracks the duration.
- Intelligence already has Surveillance and Interference, so faction-locking Sabotage would create unnecessary overlap.
- Starter-eligible; Basic complexity.
- Watch total Neutral cancellation density.

---

### 39. Scorched Earth

**Cost:** 3  
**Direction:** Fully redesign as a Neutral defensive-denial card that converts into a persistent Ruins Overlay when the defender loses and is forced from controlled ground.

**Action:** Bank Scorched Earth as an Asset. After you lose a battle while defending a Territory you control and are required to retreat from it, you may place Scorched Earth face up on that Territory as a Ruins Overlay.

**Battle:** If you lose this battle while defending a Territory you control and are required to retreat from it, place Scorched Earth face up on that Territory as a Ruins Overlay instead of placing it in its normal destination.

**Ruins Overlay:** That Territory's printed effect is inactive while Scorched Earth remains there.

**Reminder:** Ruins Overlays remain until removed by an effect. There is no universal Repair action in v0.6.

- Remove the v0.5.7 Asset-discard and Asset-banking prohibition mechanics entirely.
- Keep Neutral because scorched-earth retreat is shared advanced territorial counterplay rather than an Inquisition engine.
- Not starter-eligible; Advanced complexity.
- Watch repeated Ruins stacking, persistent printed-effect suppression, and the limited availability of removal.
- Reserve **Repair** as an Engineer faction capability for v0.7 or later rather than a universal core action.

---

## Next card

Continue review at **Scouting Report**.
