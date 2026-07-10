# Gauntlet v0.6 Card Review Log

Status: Working review log.

Source order: canonical v0.5.7 card order from `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`.

Purpose: record card-by-card **v0.6 release decisions**. These decisions supersede older `classification` and `likely_faction` metadata from v0.5.7.

This document is not a history of the old card file. It records what each reviewed card should become for v0.6. Notes marked for later review are follow-up items, but the listed classification, faction placement, cost, and rule direction should be treated as the working v0.6 card rule going forward.

## Review rules

- Do not mark a card as logged unless this file has actually been updated.
- For every faction-lock recommendation, evaluate both neutral-pool impact and interaction/duplication with that faction's mechanics.
- Before moving a neutral card into a faction, ask whether it provides shared counterplay, emergency defense, pacing correction, comeback tools, or interaction that other factions still need.
- If a card is tabled, it is not decided and should not be treated as reviewed.

## Reviewed Cards

### 1. Arcane Knowledge

**v0.6 classification:** Arcane faction card  
**v0.6 cost:** 5

**v0.6 rule direction:** Keep the core concept: Arcane Knowledge uses the eligible Battle effect of another card you played in the same battle.

**Release notes:**

- Clarify that using another card's Battle effect resolves only that effect.
- It does not count as playing, committing, revealing, copying, or changing the destination of the referenced card.
- It should not use cancellation, special-reveal, battle-ending, follow-up-battle, source-dependent, or card-lifecycle effects.
- It does not duplicate Ritual progress, Invocation, or Transmutation.
- Wording needs refinement.

---

### 2. Armistice

**v0.6 classification:** Advanced Neutral / Watchlist  
**v0.6 cost:** 4

**v0.6 rule direction:** Keep as an advanced neutral emergency brake and battle-ending tool. Do not move to Diplomats for v0.6.

**Release notes:**

- Armistice is Diplomat-adjacent thematically, but Diplomats already have Terms as their dedicated battle-avoidance system.
- Keeping Armistice neutral preserves shared counterplay and a universal way to stop a battle or pause escalation.
- Watch for stall potential during testing.
- Watch for weird interactions with refused Terms, Loss of Face, and battle-result-dependent Proposal effects if Armistice is ever made Diplomat-specific.

---

### 3. Assassins

**v0.6 classification:** Intelligence faction card  
**v0.6 cost:** 4

**v0.6 rule direction:** Keep harsh by design. Assassins remains targeted hand knowledge, disruption, and pre-battle threat.

**Release notes:**

- The harshness is intentional and supported by the card's cost.
- More destructive than normal Intelligence Interference, so it should probably require an appropriately difficult Mission.
- Create the Mission requirement later during the Intelligence faction-card pass.
- Watch density with Spies, Scouting Report, Sabotage, Treason, and future Special Operation mechanics.

---

### 4. Assimilation

**v0.6 classification:** Advanced Neutral / Watchlist  
**v0.6 cost:** 4

**v0.6 rule direction:** Keep as neutral capture acceleration and shared anti-siege / anti-stalemate breakthrough. Do not lock to Military for v0.6.

**Release notes:**

- Assimilation is Military-compatible, but it provides a shared breakthrough tool that other factions may need.
- If Assimilation causes an immediate capture, send Assimilation to the Graveyard after the capture resolves.
- If Assimilation does not cause an immediate capture, it follows its normal destination.
- This makes the capture shortcut powerful but costly.
- Watch total immediate-capture density if Military can combine Assimilation with Commandant/Fortify and other capture shortcuts.
- If every faction later receives its own reliable anti-stalemate / breakthrough tool, Assimilation can be revisited.

---

### 5. Attrition

**v0.6 classification:** Advanced Neutral / Watchlist  
**v0.6 cost:** 3

**v0.6 rule direction:** Keep as advanced neutral for now. It remains a shared attrition tool rather than becoming an Inquisition faction card by default.

**Release notes:**

- Attrition is Inquisition-adjacent, but it overlaps heavily with Inquisition's built-in Condemnation.
- It is not cleanly Military because it grinds down card economy rather than accelerating conquest, capture, or breakthrough pressure.
- The Battle effect is the distinctive piece because it can hit the entire initial battle draw, not only the played battle-drawn card.
- Watch whether the Asset version is too punishing in long games or too efficient as a neutral card-denial engine.
- If Attrition later becomes an Inquisition card, rework it so it does not merely duplicate Condemnation.

---

### 6. Blockade

**v0.6 classification:** Diplomat faction card  
**v0.6 cost:** 4

**v0.6 rule direction:** Rework Blockade as a Diplomat **Sanctions** card. It should be tied to rejected Terms and accepted settlement rather than functioning as generic neutral hand/resource denial.

**Release notes:**

- Treat Blockade as the first candidate for a possible Sanctions family of Diplomat cards.
- Blockade should interact with Terms rather than operate as a standalone neutral punishment.
- It should be playable or become stronger when the opponent rejects Terms.
- It may be discarded as a condition or consequence of the opponent accepting Terms.
- The ongoing pressure should feel like coercive diplomatic sanctions: refuse Terms, risk sanctions; accept Terms later, potentially lift sanctions.
- Keep a safety valve, likely tied to the affected player winning a battle against the Diplomat.
- Consider later whether Financiers can also impose Sanctions, likely through economic leverage rather than diplomatic legitimacy.
- Exact wording should be developed during the Diplomat faction-card pass and revisited in the v0.6.1 Diplomat overhaul.

---

### 7. Brothers in Arms

**v0.6 classification:** Military faction card  
**v0.6 cost:** 4

**v0.6 rule direction:** Keep as Military battle coordination and tactical commitment. It rewards playing both a hand-origin card and a battle-draw card in the same battle.

**Release notes:**

- Fits Military's battle coordination, battlefield momentum, and direct-pressure identity.
- Does not duplicate Assimilation: Assimilation accelerates capture, while Brothers in Arms improves battle commitment and protects the payoff of committing from both sources.
- Watch interaction with Intelligence because cancellation-proofing can reduce the value of disruption.
- Clarify **the other card** and **hand-origin card** terminology once final battle-card lifecycle language is locked.
- Keep the reminder that Brothers in Arms itself can still be canceled.

---

### 8. Capital Gains

**v0.6 classification:** Financiers faction card  
**v0.6 cost:** 3

**v0.6 rule direction:** Keep the investment/payoff concept, but treat the cost increase to 3 as the working v0.6 decision.

**Release notes:**

- Capital Gains is not merely neutral card draw; it has a Financier-shaped risk/reward structure of paying now for delayed payoff.
- Broad access to efficient card draw would be too generically attractive, so this should be a Financier card.
- The prior cost of 2 was likely too efficient because the Battle effect could draw two cards after a win with no Capital/Treasury/Deed requirement.
- Rework later so its payoff interacts with Capital, Treasury, Deeds, or other Financier infrastructure rather than remaining pure generic draw.

---

### 9. Capital Punishment

**v0.6 classification:** Advanced Neutral / Watchlist  
**v0.6 cost:** 4

**v0.6 rule direction:** Keep as expensive shared hard cancellation. Do not make hard cancellation faction-exclusive.

**Release notes:**

- Any faction may pay for access to a severe answer that blanks a Battle card and sends it to the Graveyard.
- Keeping Capital Punishment neutral preserves broad counterplay against high-impact Battle cards without making every cheap cancel equally severe.
- Capital Punishment is Inquisition-adjacent because it condemns cards to the Graveyard, but Inquisition should not monopolize all hard cancellation.
- Inquisition can still specialize in Graveyard punishment through Condemnation and other faction cards.
- Clarify that the Battle effect chooses an active opposing Battle card.
- Watch whether cost 4 is enough for broad access to hard cancellation plus immediate Graveyard placement.

---

### 10. Conscription

**v0.6 classification:** Core Neutral  
**v0.6 cost:** 3

**v0.6 rule direction:** Keep as a neutral core-system enabler for Asset deployment and battle-draw flexibility.

**Release notes:**

- Conscription is mechanically broader than Military even though the name is Military-flavored.
- It supports the shared Asset bank and battle-draw systems, so keeping it neutral helps the core game run smoothly.
- Multiple factions can use the Action to deploy Assets or the Battle effect to increase battle-draw flexibility.
- Consider a broader name such as **Mobilization**, **Call-Up**, or **Mustering** if Conscription feels too Military-specific.
- Mechanically, keep the card neutral.

---

### 11. Contraband

**v0.6 classification:** Core Neutral  
**v0.6 cost:** 3

**v0.6 rule direction:** Keep as neutral discard-pile recovery and tactical reuse.

**Release notes:**

- Core neutral needs some recovery tools so games do not become too brittle after useful cards enter the discard pile.
- Contraband recovers from the discard pile, not the Graveyard, so it does not intrude too heavily on Arcane's Graveyard identity.
- Preserve discard-pile recovery as neutral.
- Do not let Contraband retrieve from the Graveyard.
- Clarify that the chosen card is played in Contraband's place and follows its own destination rules.

---

### 12. Counterintelligence

**v0.6 classification:** Core Neutral  
**v0.6 cost:** 2

**v0.6 rule direction:** Keep as neutral anti-surveillance / anti-reveal protection and important shared counterplay.

**Release notes:**

- Counterintelligence is Intelligence-adjacent by name, but mechanically it is the shared defense against Intelligence-style reveal and look effects.
- Intelligence should be better at gathering and manipulating hidden information, but should not be the only faction able to protect hidden information.
- This gives every faction a way to say no to surveillance without preventing normal required battle or Territory reveals.
- Make sure it does not block normal required reveals from battle or Territory exploration.
- Watch whether cost 2 remains correct once Intelligence Missions and faction cards are finalized.

---

### 13. Court Martial

**v0.6 classification:** Core Neutral  
**v0.6 cost:** 3

**v0.6 rule direction:** Keep as neutral battle discipline / forced-retreat pressure.

**Release notes:**

- Keep neutral despite the Military-flavored name.
- It does not need to become Military because it does not directly accelerate capture or conquest.
- It does not need to become Inquisition because it does not interact with Graveyard punishment, Condemnation, Purge, or Conviction.
- Clarify forced additional retreat behavior if retreat paths are blocked or limited.

---

### 14. Decoys

**v0.6 classification:** Core Neutral  
**v0.6 cost:** 3

**v0.6 rule direction:** Keep as neutral protection against Asset removal and Battle-card cancellation.

**Release notes:**

- Keep neutral as shared protection.
- Do not move to Intelligence just because of deception flavor.
- The Action side protects one affected Asset by discarding Decoys, so it is a limited shield rather than permanent protection.
- Clarify whether Decoys protects only against **cancel** effects or also against **no effect / ignored** effects.
- Current recommendation: keep it limited to cancellation so it does not blunt every hard answer.

---

### 15. Disruption (renamed from Embargo)

**v0.6 classification:** Core Neutral  
**v0.6 cost:** 2

**v0.6 rule direction:** Keep the old Embargo mechanics as neutral soft cancellation / light hand disruption, but rename the card to **Disruption** so **Embargo** can be reserved for a Diplomat Sanctions card.

**Release notes:**

- Preserve as the cheaper shared soft-cancel counterpart to Capital Punishment.
- Maintain the destination distinction: hand-committed cards return to hand; battle-drawn cards go to discard.
- Keep neutral despite the disruption/control flavor.
- Reserve the name **Embargo** for a future Diplomat Sanctions card, likely tied to rejected Terms and accepted settlement.
- Watch whether the Action side's random discard feels too similar to Sanctions/Blockade.

---

### 16. Entrenchment

**v0.6 classification:** Core Neutral  
**v0.6 cost:** 2

**v0.6 rule direction:** Keep as neutral defensive positioning / anti-advance pressure.

**Release notes:**

- Keep neutral as a shared defensive posture card.
- Useful counterweight against aggressive conquest decks.
- It does not need to become Military because it is defensive rather than conquest acceleration.
- Clarify whether the Asset triggers only when an opponent moves onto a Territory adjacent to your token, or also when entering your occupied Territory to initiate battle.

---

### 17. Fealty

**v0.6 classification:** Core Neutral  
**v0.6 cost:** 2

**v0.6 rule direction:** Keep as neutral disadvantage protection / battle stabilization. Keep the name **Fealty**.

**Release notes:**

- Keep neutral as shared counterplay against disadvantage.
- Fealty is acceptable as the final card name despite its loyalty/oath flavor.
- The Action side protects against opposing card effects that give disadvantage.
- The Battle side either ignores one disadvantage affecting you or gives +1 if no disadvantage is affecting you.

---

### 18. Fog of War

**v0.6 classification:** Intelligence faction Overlay  
**v0.6 cost:** 2

**v0.6 rule direction:** Keep as Intelligence battlefield-confusion Overlay / forced-random-selection effect.

**Release notes:**

- Move from Advanced Neutral / Watchlist to Intelligence.
- The Action side places a temporary Overlay on a revealed Territory.
- The Overlay affects the next battle fought there, then is discarded.
- Preserve the symmetrical Action effect: both players randomly select from battle draw during that battle.
- Preserve the Battle side's one-sided disruption.
- Clarify that random selection happens after all effects determine how many battle-drawn cards the affected player may play.
- This is fine for v0.6 even though Engineers may later specialize in Overlays; Engineers should not monopolize the card type.

---

### 19. Fortifications

**v0.6 classification:** Core Neutral  
**v0.6 cost:** 3

**v0.6 rule direction:** Keep as neutral defensive infrastructure / improved defensive battle draw.

**Release notes:**

- Keep neutral as shared defense.
- Does not need to become Military because it supports holding ground rather than accelerating conquest.
- Useful counterweight against Military and other aggressive decks.
- The Action side remains defensive: when defending, you may play up to two cards from your battle draw instead of one.
- The Battle side gives +1 while defending.
- If you still lose the battle, the additional withdrawal is voluntary.
- Use final v0.6 movement terminology to clarify that this is a voluntary additional withdrawal, not a forced retreat.

---

### 20. Illegal Occupation

**v0.6 classification:** Core Neutral  
**v0.6 cost:** 3

**v0.6 rule direction:** Keep as neutral anti-occupation / counterattack-window pressure. Keep the name **Illegal Occupation** for now.

**Release notes:**

- Keep neutral because the occupation/counterattack window is a core game structure.
- Punishes opponents who occupy a Territory you control before they control it.
- Useful shared counterweight against Military-style conquest acceleration.
- The Action side makes the occupying opponent's Assets inactive while they occupy a Territory you control without controlling it.
- The Battle side applies when you are counterattacking an opponent occupying a Territory you control: their Assets are inactive during the battle and you gain advantage.
- Keep the current name for v0.6 unless later testing creates a strong reason to rename it.

---

### 21. Insurrection

**v0.6 classification:** Advanced Neutral / Watchlist  
**v0.6 cost:** 4

**v0.6 rule direction:** Keep the global reshuffle / chaotic reset concept as an advanced neutral card. Do not lock to Military or Inquisition for v0.6.

**Release notes:**

- The Action side remains a disruptive reset: discard your hand, each player shuffles their discard pile into their deck, draw three cards, then you may immediately play one additional Action card.
- The Battle side rewards either attacking pressure or insurgent counterattack pressure: attacker gains advantage; counterattacking an opponent occupying your Territory gives double advantage.
- The effect is chaotic by design and should stay out of core starter decks.
- It is Military-compatible because it can support attack tempo, and Inquisition-compatible because it can reshape deck/discard pressure, but it is not cleanly owned by either faction.
- Watch whether the reshuffle undermines Inquisition Purification or Arcane Graveyard pressure too strongly.

---

### 22. Invasion

**v0.6 classification:** Advanced Neutral / Watchlist  
**v0.6 cost:** 4

**v0.6 rule direction:** Keep as advanced neutral offensive tempo. Do not lock to Military for v0.6.

**Release notes:**

- Invasion is Military-compatible, but it duplicates Military's Command / Orders identity too directly if faction-locked.
- Keeping it neutral preserves a shared offensive tempo tool for non-Military factions.
- Keep out of starter core because it bends both movement and battle-draw expectations.
- Watch Military stacking with Onward, Rally, Rout, leader abilities, and other attack-tempo cards.
- If Military access to Invasion creates explosive overrun turns, restrict, redesign, or reconsider its neutral availability.

---

### 23. Liberation

**v0.6 classification:** Advanced Neutral / Watchlist  
**v0.6 cost:** 4

**v0.6 rule direction:** Keep as advanced neutral counterattack / comeback tempo. Do not lock to Military for v0.6. Redesign the Battle side to mirror Invasion from the defensive counterattack side rather than creating post-battle movement.

**Working v0.6 Battle direction:** If you are counterattacking an opponent occupying a Territory you control, draw one additional battle card. You may play that card in addition to your other Battle cards.

**Release notes:**

- Liberation is Military-compatible, but as a faction-locked Military card it would overlap too much with Command, Rout, Repel, Fortify, and other momentum tools.
- Keep neutral because counterattacking an opponent who occupies your Territory is a core Gauntlet system and non-Military factions need shared comeback / anti-overextension tools.
- The old Battle side reached past the battle into post-battle movement and possible chain-battle timing, which was confusing and too close to Military Rout.
- The new Battle direction intentionally mirrors Invasion: Invasion rewards proactive attacking tempo, while Liberation rewards reactive counterattack tempo.
- Watch whether the Action side plus revised Battle side makes Liberation too efficient as a neutral recovery engine.
- Keep out of starter core because it modifies battle-draw expectations and is tied to occupation/counterattack timing.

---

### 24. Manifest Destiny

**v0.6 classification:** Redesign required / name retained  
**v0.6 cost:** TBD

**v0.6 rule direction:** Reject the current permanent-Territory insertion effect, but retain **Manifest Destiny** as a card name and redesign the card rather than cutting the name from Gauntlet.

**Release notes:**

- The current effect permanently inserts a new blank Territory, which changes the shape and length of the Gauntlet rather than merely interacting with the existing board.
- Permanent Territory insertion creates too many cross-system questions for v0.6, especially with Asset bank limits, Financier Deeds, Intelligence Special Operation thresholds, Territory counts, breakthrough distance, and pacing.
- The problem is the current mechanic, not the card name.
- Keep **Manifest Destiny** in the redesign queue for a new effect that better fits v0.6 systems and pacing.
- **New Frontier** is also a strong card name and should be reserved for a separate future card rather than used as a replacement name for Manifest Destiny.
- The permanent board-expansion concept may still return later in a scenario, board-modification, or Engineer-adjacent design pass under a different implementation.

---

### 25. Militias

**v0.6 classification:** Military faction card  
**v0.6 cost:** 3

**v0.6 rule direction:** Keep Militias as a defensive Military card, especially aligned with the Commandant. Preserve the Battle effect, but limit the Asset to the first qualifying battle each turn so it does not create a passive disadvantage wall across every battle on controlled ground.

**Working v0.6 Action direction:** Bank Militias as an Asset. During the first battle each turn on a Territory you control, your opponent gains disadvantage.

**Working v0.6 Battle direction:** Your opponent gains disadvantage. If this battle is on a Territory you control, they gain double disadvantage instead.

**Release notes:**

- Militias is not needed as a shared neutral defensive tool because neutral already has Entrenchment, Fealty, Fortifications, and Illegal Occupation.
- The card fits Military's defensive, counterattack, and hold-the-ground identity without adding another movement or capture shortcut.
- The first-battle limit prevents one banked Asset from penalizing every battle in a long turn or chain.
- Militias remains mechanically distinct from Entrench, which adds +1 to the Military player; Fortifications, which improves defensive battle-card access; and Illegal Occupation, which targets the occupation/counterattack window.
- Watch defensive stacking with Commandant Orders, Fortifications, Patriotism, Homeland Advantage, and multiple copies of Militias.

---

### 26. Monetary Crisis

**v0.6 classification:** Financiers faction card  
**v0.6 cost:** 2

**v0.6 rule direction:** Keep the current symmetrical hand-reset design. Clarify that the Battle effect resolves during normal battle cleanup rather than redesigning it as an immediate effect.

**Working v0.6 Action direction:** Each player discards their hand, then draws two cards.

**Working v0.6 Battle direction:** During battle cleanup, each player discards down to one card.

**Release notes:**

- The Battle effect naturally belongs to battle cleanup because it modifies hand state as part of resolving the completed battle; unlike Liberation's old effect, it does not begin movement or another battle sequence.
- Keep the Treasury interaction implicit. Financiers may protect value in their Treasury before triggering the crisis, but Treasury cards cannot be played normally and therefore are stored infrastructure rather than preserved tactical cards.
- The printed effects remain symmetrical, so cost 2 is appropriate; the Financier gains asymmetry through preparation and Treasury use rather than an additional printed benefit.
- The card is not required as shared neutral counterplay. Neutral already has lighter hand cycling and disruption.
- Watch whether repeated cheap hand resets become too oppressive, particularly against factions that need to hold cards for Missions, Terms, Rites, or planned battle sequences.

---

### 27. Necromancy

**v0.6 classification:** Arcane faction card; Arcane trait  
**v0.6 cost:** 5

**v0.6 rule direction:** Keep direct Graveyard-to-hand recovery as a premium Arcane effect. Remove the restriction preventing Necromancy from returning another Necromancy card.

**Working v0.6 Action direction:** Return one card from your Graveyard to your hand. Place Necromancy in your Graveyard instead of your discard pile.

**Working v0.6 Battle direction:** During battle cleanup, return one card from your Graveyard to your hand.

**Release notes:**

- Direct Graveyard-to-hand recovery is a clear Arcane specialty and is not needed in the neutral pool; neutral already has discard-pile recovery through Contraband.
- The non-Necromancy restriction is unnecessary. Using one Necromancy to recover another normally exchanges which copy is in hand and which is in the Graveyard, producing no net card advantage.
- A two-copy recursion loop still consumes the player's Action, occupies two cost-5 deck slots, and does not by itself advance a Rite.
- Keep cost 5 because the card can recover the best eligible card in the Graveyard and its Battle effect does not require winning.
- Watch interactions with Invocation, Transmutation, Rite costs, and Arcane Knowledge, but treat those as thematic synergies rather than automatic problems.

---

### 28. New Recruits

**v0.6 classification:** Core Neutral  
**v0.6 cost:** 1

**v0.6 rule direction:** Keep both effects unchanged as foundational neutral hand filtering and a simple Battle bonus.

**Working v0.6 Action direction:** Discard one other card from your hand, then draw two cards.

**Working v0.6 Battle direction:** Add +1 to your battle total.

**Release notes:**

- New Recruits is a basic consistency tool that every faction can use and does not belong mechanically to Military despite the name.
- The Action is hand filtering rather than card advantage: playing New Recruits and discarding another card consumes two cards, then draws two replacements.
- The Battle effect is intentionally modest, reliable, and suitable for the starter pool.
- Keep cost 1 so it remains a useful low-cost deckbuilding piece.
- Retain the reminder that the Action cannot be played without another card to discard, at least while it remains an introductory Core Neutral card.
- Watch whether it becomes an automatic inclusion in most decks, but do not change it preemptively.

---

### 29. Palisade Wall

**v0.6 classification:** Core Neutral  
**v0.6 cost:** 2

**v0.6 rule direction:** Preserve both defensive effects as shared neutral counterplay. Clarify that the Battle effect targets an active opposing Battle card committed from hand.

**Working v0.6 Action direction:** Play Palisade Wall as a Condition. During the next battle in which you are the defender, your opponent's Assets are inactive. Discard Palisade Wall after that battle.

**Working v0.6 Battle direction:** If you are the defender, choose one active opposing Battle card committed from hand. That card has no effect during this battle. If there is no active opposing Battle card committed from hand, gain advantage instead.

**Release notes:**

- Palisade Wall provides broadly useful defense against developed Asset engines and powerful hand commitments, so it should remain available to every faction.
- Do not move it to Military or reserve it for a future Engineer faction merely because of its construction theme.
- It is narrower than Disruption because it requires defending and can target only a hand-committed card, but the affected card remains played and follows its normal destination.
- It is less severe and less flexible than Capital Punishment, which can target any opposing Battle card and sends it directly to the Graveyard.
- The fallback advantage prevents the Battle effect from becoming dead when the opponent commits no active card from hand.
- Keep the reminder that the chosen card remains played and follows its normal destination after battle.

---

### 30. Patriotism

**v0.6 classification:** Military faction card  
**v0.6 cost:** 3

**v0.6 rule direction:** Keep Patriotism as a defensive Military Asset and Battle card. Remove the clause protecting Homeland Advantage, and limit each player to one banked Patriotism at a time.

**Working v0.6 Action direction:** Bank Patriotism as an Asset. You may have only one Patriotism banked at a time. During battles on a Territory you control, the first +1 or advantage granted by one of your Battle cards is doubled.

**Working v0.6 Battle direction:** If you are defending a Territory you control, gain advantage.

**Release notes:**

- Patriotism fits Military, especially the Commandant's hold-the-ground identity, and is not required as shared neutral defense.
- Remove the Homeland Advantage protection because the only current effects disabling Homeland Advantage are Arena Territory rules, making the clause narrow and unnecessarily exceptional.
- The one-copy bank limit prevents multiple Patriotism Assets from creating unclear or escalating doubling interactions.
- The Asset doubles only a +1 or advantage granted by one of your Battle cards; it does not double Homeland Advantage, the Heartland-defense bonus, an Order, or an opposing disadvantage.
- Preserve the reminder that +1 becomes +2, advantage becomes double advantage, and the Action effect applies only once per battle.

---

### 31. Protracted Siege

**v0.6 classification:** Advanced Neutral / Watchlist  
**v0.6 cost:** 4

**v0.6 rule direction:** Keep Protracted Siege as shared capture-delay counterplay, but make each copy an expendable Territory Overlay rather than a persistent global Asset or a Condition. Multiple copies may be used during the same occupation.

**Working v0.6 Action direction:** Bank Protracted Siege as an Asset. When your opponent occupies a Territory you control, you may move Protracted Siege from your Asset bank onto that Territory as an Overlay. When they would capture that Territory at the start of their turn, you may discard Protracted Siege. If you do, they do not capture it. If they cease occupying the Territory, discard Protracted Siege.

**Working v0.6 Battle direction:** If you are defending a Territory you control and lose, place Protracted Siege over that Territory as an Overlay instead of placing it in its normal destination. When your opponent would capture that Territory at the start of their turn, you may discard Protracted Siege. If you do, they do not capture it. If they cease occupying the Territory, discard Protracted Siege.

**Release notes:**

- Keep Advanced Neutral because an extra counterattack window is useful shared comeback and anti-overextension counterplay, but it is too pacing-sensitive for the core starter pool.
- Each Overlay delays one scheduled start-of-turn capture and is then discarded; immediate-capture effects such as Assimilation or Fortify are not affected unless they explicitly use the normal start-of-turn capture schedule.
- Multiple Protracted Siege Overlays may occupy the same Territory. Each copy can be discarded separately to delay a later scheduled capture.
- Do not impose a one-copy or once-per-occupation restriction. Building around several cost-4 copies is a legitimate, expensive deckbuilding strategy with meaningful opportunity cost.
- Moving the Action copy from the Asset bank to the Territory frees the Asset-bank slot and makes the delayed capture visible on the board.
- Watch for excessive game length when several copies are combined with strong counterattack or alternate-victory strategies, but test the strategy before restricting it.

---

## Next Step

Continue card review at **Rallying Cry**.
