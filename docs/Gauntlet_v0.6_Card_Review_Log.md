# Gauntlet v0.6 Card Review Log

Status: Working review log.

Source order: canonical v0.5.7 card order from releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json.

Purpose: record card-by-card v0.6 migration decisions using exact current card text.

## Reviewed Cards

### 1. Arcane Knowledge

Cost: 5

Current classification: Faction Candidate

Likely faction: Arcane / Magic

Action: Bank Arcane Knowledge as an Asset. Once per turn during a battle, Arcane Knowledge may use the eligible Battle effect of one other card you played in that battle.

Battle: Arcane Knowledge may use the eligible Battle effect of one other card you played in this battle.

Reminder: It cannot use cancellation, special-reveal, battle-ending, follow-up-battle, source-dependent, or card-lifecycle effects.

Decision: Arcane faction card.

Status: Keep concept; reword later for clarity.

Faction-mechanic check:

- Does not duplicate Ritual progress.
- Does not duplicate Invocation.
- Does not duplicate Transmutation.
- Should not count as playing the copied card when it uses another card's Battle effect.

Rewording note: Clarify that using another card's Battle effect resolves only that effect and does not count as playing, committing, revealing, or changing the destination of the copied card.

### 2. Armistice

Cost: 4

Current classification: Advanced Neutral / Watchlist

Likely faction: Diplomats watchlist

Action: Play Armistice as a Condition. For the rest of this turn and throughout your opponent's next turn, neither player may initiate a battle. Discard Armistice at the end of that turn.

Battle: Resolve effects that cancel Battle cards first. If Armistice remains in play, end the battle immediately without a winner. The attacker returns to the Territory they entered from. Other unresolved Battle effects do not resolve. Place all other Battle cards still in play in their owners' discard piles, and place Armistice in your Graveyard.

Reminder: The attacker's return is not a retreat. Effects that already resolved are not undone.

Decision: Keep as Advanced Neutral / Watchlist.

Status: Keep concept. Do not move to Diplomats for v0.6.

Neutral-removal check:

- Armistice is Diplomat-adjacent thematically, but Diplomats already have Terms as their dedicated battle-avoidance system.
- Removing Armistice from neutral would remove a useful shared emergency brake and battle-ending tool.
- Keep available as advanced neutral unless testing shows it undermines faction identity or causes stalls.

### 3. Assassins

Cost: 4

Current classification: Faction Candidate

Likely faction: Intelligence

Action: Look at your opponent's hand. Choose one card and place it in their discard pile.

Battle: Choose one opposing Battle card committed from hand. That card has no effect; place it in its owner's Graveyard immediately. If your opponent committed no card from hand, they gain disadvantage during this battle.

Decision: Intelligence faction card.

Status: Keep harsh by design; create a Mission for it later.

Faction-mechanic check:

- Fits Intelligence as targeted hand knowledge, disruption, and pre-battle threat.
- More destructive than normal Intelligence Interference, so it should remain expensive and should probably have an appropriately difficult Mission requirement.
- The harshness is intentional and supported by the card's cost.

### 4. Assimilation

Cost: 4

Current classification: Faction Candidate

Likely faction: Military

Action: Play Assimilation as a Condition. If you win your next battle this turn as the attacker on a Territory your opponent controls, immediately capture that Territory instead of occupying it. If another effect would delay capture, reduce that delay by one round instead. Discard Assimilation at the end of the turn.

Battle: If you win this battle as the attacker on a Territory your opponent controls, immediately capture that Territory instead of occupying it. This effect overrides effects that would delay capture.

Reminder: Against Protracted Siege, the Action restores the normal capture schedule; the Battle effect captures immediately.

Decision: Military faction card.

Status: Keep concept; revise destination when the capture effect succeeds.

Neutral-removal check:

- Immediate capture is a core Military pressure tool.
- Keeping this as neutral would give every faction broad access to bypassing the counterattack window.
- Removing it from neutral is acceptable because other factions should not all share Military's strongest conquest acceleration tools.

Faction-mechanic check:

- Fits Military's conquest and battlefield momentum identity.
- Does not exactly duplicate Commandant's Fortify: Assimilation rewards winning as the attacker on opponent-controlled ground, while Fortify rewards winning while already occupying enemy ground.
- Watch total immediate-capture density if Military can combine Assimilation with Commandant/Fortify and other capture shortcuts.

Revision note:

- If Assimilation causes an immediate capture, send Assimilation to the Graveyard after the capture resolves.
- If Assimilation does not cause an immediate capture, it follows its normal destination.
- This makes the capture shortcut powerful but costly, and prevents immediate capture from being too clean or reusable.

### 5. Attrition

Cost: 3

Current classification: Advanced Neutral / Watchlist

Likely faction: Inquisition / Military watchlist

Action: Bank Attrition as an Asset. Whenever your opponent loses a battle against you, each card they played from their battle draw goes to their Graveyard instead of their discard pile.

Battle: If your opponent loses this battle, place every card from their initial battle draw in their Graveyard.

Reminder: The initial battle draw is the first battle-draw amount before additional or replacement cards; if fewer cards were drawn, affect all of them.

Decision: Keep as Advanced Neutral / Watchlist.

Status: Keep concept; watch closely.

Neutral-removal check:

- Attrition is thematically close to Inquisition, but it overlaps heavily with Inquisition's built-in Condemnation.
- It is not cleanly Military because it grinds down the opponent's card economy rather than accelerating conquest, capture, or breakthrough pressure.
- Keeping it as Advanced Neutral preserves a shared attrition tool without making Inquisition's core pressure redundant.

Faction-mechanic check:

- As an Inquisition card, current Attrition may stack too harshly with Condemnation.
- As a Military card, current Attrition points toward exhaustion rather than conquest.
- The Battle effect is the more distinctive piece because it can hit the entire initial battle draw, not only the played battle-drawn card.

Revision note:

- If Attrition later becomes an Inquisition faction card, rework it so it does not merely duplicate Condemnation.
- Watch whether the Asset version is too punishing in long games or too efficient as a neutral card-denial engine.

### 6. Blockade

Cost: 4

Current classification: Advanced Neutral / Watchlist

Likely faction: Financiers / Inquisition watchlist

Action: Play Blockade as a Condition affecting your opponent. At the beginning of each of their turns, after their normal draw, if they have more than one card in hand, they discard one at random. When they win a battle, discard Blockade.

Battle: Your opponent may discard one card from their hand. If they do not, each card they played from their battle draw has no effect during this battle. If they lose, play Blockade as a Condition affecting them instead of its normal destination.

Reminder: A player may have only one Blockade Condition.

Decision: Diplomat faction card.

Status: Keep concept; rework around rejected Terms and accepted settlement.

Neutral-removal check:

- Blockade is not merely generic resource denial if framed as sanctions after refused negotiation.
- As a neutral card, it is a high-complexity control tool that can feel disconnected from faction identity.
- As a Diplomat card, it gives Diplomats coercive leverage: refuse Terms, risk sanctions; accept Terms later, potentially lift sanctions.

Faction-mechanic check:

- Blockade should interact with Terms rather than operate as a standalone neutral punishment.
- It should be playable or become stronger when the opponent rejects Terms.
- It may be discarded as a condition or consequence of the opponent accepting Terms.
- This creates a negotiation fork without requiring the full v0.6.1 Terms economy overhaul.

Revision direction:

- Treat Blockade as part of a possible **Sanctions** family of Diplomat cards.
- Explore whether Sanctions are a broader Diplomat subtheme: coercive diplomatic pressure created by refused Terms and relieved through accepted Terms.
- Consider later whether Financiers can also impose Sanctions, likely through economic leverage rather than diplomatic legitimacy.
- Exact Blockade wording should be developed during the Diplomat faction-card pass and revisited in the v0.6.1 Diplomat overhaul.

### 7. Brothers in Arms

Cost: 4

Current classification: Faction Candidate

Likely faction: Military

Action: Bank Brothers in Arms as an Asset. Whenever you play both a card from your hand and a card from your battle draw in the same battle, gain advantage. If you win, place the hand-origin card in your discard pile instead of your Graveyard.

Battle: If Brothers in Arms was played from your hand and you also play a card from your battle draw - or vice versa - gain advantage. The other card cannot be canceled or have its Battle effect ignored.

Reminder: Brothers in Arms counts as one of the pair, but it can still be canceled.

Decision: Military faction card.

Status: Keep concept; watch cancellation-proofing.

Neutral-removal check:

- Brothers in Arms is a battle-efficiency and coordinated-commitment card, not a shared defensive answer or universal counterplay tool.
- Removing it from neutral is acceptable because other factions do not need broad access to Military's tactical battle superiority.
- It strengthens Military's identity as the faction most rewarded for committing to and winning battles.

Faction-mechanic check:

- Fits Military's battle coordination, battlefield momentum, and direct-pressure identity.
- Does not duplicate Assimilation: Assimilation accelerates capture, while Brothers in Arms improves battle commitment and protects the payoff of committing from both sources.
- Watch interaction with Intelligence, because cancellation-proofing can reduce the value of disruption.

Revision note:

- Clarify **the other card** and **hand-origin card** terminology once final battle-card lifecycle language is locked.
- Keep the reminder that Brothers in Arms itself can still be canceled.

### 8. Capital Gains

Cost: 2

Current classification: Faction Candidate

Likely faction: Financiers

Action: As an additional cost to play Capital Gains, discard one other card from your hand. Play Capital Gains as a Condition. At the beginning of your next turn, draw three cards instead of your normal draw, then discard Capital Gains.

Battle: After this battle, if you won, draw two cards. If you lost, discard one card from your hand.

Reminder: You cannot play the Action if you have no other card to discard.

Decision: Financiers faction card.

Status: Keep concept; likely increase cost to 3.

Neutral-removal check:

- Capital Gains is not merely neutral card draw; it has a Financier-shaped risk/reward structure of paying now for delayed payoff.
- Removing it from neutral is acceptable because broad access to efficient card draw would be too generically attractive.
- As a Financier card, the payoff fits investment, leverage, and delayed return.

Faction-mechanic check:

- Fits Financiers thematically, but current text is card-economy oriented rather than Capital/Treasury/Deed oriented.
- Later wording should connect more directly to Capital, Treasury, Deeds, or investment timing.
- The Battle effect may be too efficient at cost 2 because winning draws two cards with no additional resource tie-in.

Revision note:

- Consider increasing Capital Gains from cost 2 to cost 3.
- Rework later so its payoff interacts with Capital, Treasury, Deeds, or other Financier infrastructure rather than remaining pure generic draw.

### 9. Capital Punishment

Cost: 4

Current classification: Advanced Neutral / Watchlist

Likely faction: Inquisition watchlist

Action: Play Capital Punishment as a Condition. Choose one opposing Asset. If you defeat that opponent in battle this turn, place the chosen Asset in its owner's Graveyard. Discard Capital Punishment at the end of the turn.

Battle: Choose one opposing Battle card. That card has no effect; place it in its owner's Graveyard immediately.

Decision: Keep as Advanced Neutral / Watchlist.

Status: Keep concept; preserve hard cancellation as expensive shared access.

Neutral-removal check:

- Hard cancellation should not be faction-exclusive.
- An expensive card may give any faction access to a strong answer that blanks a Battle card and sends it to the Graveyard.
- Keeping Capital Punishment neutral preserves broad counterplay against high-impact Battle cards without making every cheap cancel equally severe.

Faction-mechanic check:

- Capital Punishment is thematically Inquisition-adjacent because it condemns cards to the Graveyard.
- It should remain on the Inquisition watchlist, but not move to Inquisition by default.
- Inquisition can still specialize in Graveyard punishment through Condemnation and other faction cards, while expensive neutral hard cancellation remains available to everyone.

Revision note:

- Clarify that the Battle effect chooses an active opposing Battle card.
- Watch whether cost 4 is enough for broad access to hard cancellation plus immediate Graveyard placement.

## Next Card

10. Conscription
