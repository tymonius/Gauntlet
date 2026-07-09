# Gauntlet v0.6 Card Review Log

Status: Working review log.

Source order: canonical v0.5.7 card order from `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`.

Purpose: record card-by-card **v0.6 release decisions**. These decisions supersede older `classification` and `likely_faction` metadata from v0.5.7.

This document is not a history of the old card file. It records what each reviewed card should become for v0.6. Notes marked for later review are follow-up items, but the listed classification, faction placement, cost, and rule direction should be treated as the working v0.6 card rule going forward.

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

---

### 2. Armistice

**v0.6 classification:** Advanced Neutral / Watchlist  
**v0.6 cost:** 4

**v0.6 rule direction:** Keep as an advanced neutral emergency brake and battle-ending tool. Do not move to Diplomats for v0.6.

**Release notes:**

- Armistice is Diplomat-adjacent thematically, but Diplomats already have Terms as their dedicated battle-avoidance system.
- Keeping Armistice neutral preserves shared counterplay and a universal way to stop a battle or pause escalation.
- Watch for stall potential during testing.

---

### 3. Assassins

**v0.6 classification:** Intelligence faction card  
**v0.6 cost:** 4

**v0.6 rule direction:** Keep harsh by design. Assassins remains targeted hand knowledge, disruption, and pre-battle threat.

**Release notes:**

- The harshness is intentional and supported by the card's cost.
- More destructive than normal Intelligence Interference, so it should probably require an appropriately difficult Mission.
- Create the Mission requirement later during the Intelligence faction-card pass.

---

### 4. Assimilation

**v0.6 classification:** Military faction card  
**v0.6 cost:** 4

**v0.6 rule direction:** Keep as Military capture acceleration. Assimilation rewards winning as the attacker on opponent-controlled ground.

**Release notes:**

- If Assimilation causes an immediate capture, send Assimilation to the Graveyard after the capture resolves.
- If Assimilation does not cause an immediate capture, it follows its normal destination.
- This makes the capture shortcut powerful but costly.
- Watch total immediate-capture density if Military can combine Assimilation with Commandant/Fortify and other capture shortcuts.

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

## Next Card

14. Decoys
