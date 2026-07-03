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

## Next Card

5. Attrition
