# Gauntlet v0.6 Military Card Pool Draft

**Status:** First complete twelve-card concept and wording draft; no card in this file is approved exact text.  
**Purpose:** Provide a coherent Military package for card-by-card review under the faction design guide and Military design brief.

Use with:

- `Gauntlet_v0.6_Faction_Card_Design_Guide.md`;
- `Gauntlet_v0.6_Military_Design_Notes.md`;
- `Gauntlet_v0.6_Working_Rules.md`;
- `Gauntlet_v0.6_Neutral_Card_Pool.md`;
- `card-reviews/MILITARY_INHERITED_CANDIDATE_AUDIT.md`.

This draft deliberately preserves only the strongest inherited ideas:

- **Brothers in Arms** is rebuilt around risky coordinated commitment;
- **Militias** is rebuilt as a delaying force rather than a defensive modifier;
- **Shock and Awe** is rebuilt as the cost-5 statement operation;
- **Patriotism** is not retained.

---

## Draft cost curve

| Cost | Cards |
|---:|---:|
| 1 | 1 |
| 2 | 2 |
| 3 | 4 |
| 4 | 4 |
| 5 | 1 |
| **Total** | **12** |

Total unique-card value: **38**  
Average cost: **3.17**

This intentionally leans slightly more premium than the default 1 / 3 / 4 / 3 / 1 planning curve.

---

# Cost 1

## 1. Battlefield Promotion

**Cost:** 1  
**Complexity:** Basic  
**Primary threads:** Command discipline; force preservation

> **Action:** Play only if you won a battle this turn and spent no Command during that battle. Gain 1 Command.
>
> **Battle:** During battle cleanup, if you win this battle and spent no Command during it, gain 1 Command.

### Design purpose

Battlefield Promotion rewards the player for trusting position, cards, and preparation instead of spending Command to secure the victory. It creates a low-cost tension between using an Order now and earning more Command afterward.

### Initial watchlist

- Reaching 2 Command too reliably after the first victory of a turn.
- Becoming an automatic cost-1 inclusion.
- Exact timing relative to Military's normal first-victory Command gain.

---

# Cost 2

## 2. Militias

**Cost:** 2  
**Complexity:** Advanced  
**Primary threads:** Maneuver; force preservation; defense into counterattack

> **Action:** Bank Militias as an Asset. When an opponent enters a Territory you control and a battle would begin, before Battle cards are committed, you may discard Militias. If you do, withdraw. The opponent remains in or occupies that Territory, their movement ends, and they cannot move again this turn.
>
> **Battle:** If you are defending a Territory you control and lose this battle, your opponent cannot move again this turn.

### Design purpose

Militias no longer improves defensive battle math. Local forces instead delay an advance, cover an organized withdrawal, and prevent one victory from automatically becoming a chain of further attacks.

The Action offers ground in exchange for force preservation and a future counterattack. The Battle effect lets the Military player contest the Territory while still limiting the opponent's momentum if the defense fails.

### Initial watchlist

- Excessive suppression of General, Invasion, and other multi-movement turns.
- Whether withdrawing before battle should allow the opponent to play an Action afterward.
- Whether cost 2 is appropriate for a prepared battle-avoidance effect.

## 3. Standing Orders

**Cost:** 2  
**Complexity:** Advanced  
**Primary threads:** Command discipline; leader-dependent sequencing

> **Action:** Play only before movement. The first 1-Command Order you use this turn costs 0 Command. If you use it, the next battle you win this turn does not cause you to gain Command.
>
> **Battle:** The first 1-Command Order you use during this battle costs 0 Command. If you use it, winning this battle does not cause you to gain Command.

### Design purpose

Standing Orders lets Military borrow tactical authority from its expected future success. It is useful during Command drought but preserves the faction's core tension by trading away the next normal Command gain.

The General can use it to sequence Onward into Rally; the Commandant can use it to access Entrench or Repel without starting Command. Neither leader receives permanent engine repair.

### Initial watchlist

- Whether the Action penalty should apply to the next victory or every victory that turn.
- Timing when the free Order resolves after the battle result, especially Repel.
- Interaction with Battlefield Promotion.

---

# Cost 3

## 4. Brothers in Arms

**Cost:** 3  
**Complexity:** Advanced  
**Primary threads:** Combined arms; commitment; force preservation

> **Action:** Bank Brothers in Arms as an Asset. Once per turn after Battle cards are revealed, if you have an active card committed from hand and an active card played from battle draw, you may discard Brothers in Arms and choose one of each. If you win, return one chosen card to your hand during battle cleanup instead of placing it in its normal destination. If you lose, place both chosen cards in your Graveyard during battle cleanup.
>
> **Battle:** If Brothers in Arms and at least one active card you played from the other source are active, choose Brothers in Arms and one such card. If you win, return one chosen card to your hand during battle cleanup instead of placing it in its normal destination. If you lose, place both chosen cards in your Graveyard during battle cleanup.

### Design purpose

The rebuilt Brothers in Arms no longer grants advantage, blanket protection, and recovery together. It turns coordinated commitment into a wager: victory preserves one component of the operation, while defeat destroys both.

It interacts broadly with battle-draw support without merely rewarding every ordinary two-card battle.

### Initial watchlist

- Repeated card-preservation loops.
- Whether the loss penalty is severe enough to create a genuine decision.
- Exact treatment of canceled or negated cards.
- Whether cost 3 or 4 is appropriate.

## 5. Feigned Retreat

**Cost:** 3  
**Complexity:** Advanced  
**Primary threads:** Maneuver; prepared operations; defense into counterattack

> **Action:** Bank Feigned Retreat as a face-up Asset. When a battle begins in which you are the defender, before Battle cards are committed, you may turn Feigned Retreat face down and withdraw. If you do, no battle occurs. At the beginning of your next turn, turn Feigned Retreat face up and gain one additional movement that turn. That movement may be used only to move toward the opponent's Heartland and may initiate a battle. Discard Feigned Retreat at the end of that turn.
>
> **Battle:** If you lose this battle, after completing your normal retreat, bank Feigned Retreat face down instead of placing it in its normal destination. At the beginning of your next turn, turn it face up and gain one additional movement that turn. That movement may be used only to move toward the opponent's Heartland and may initiate a battle. Discard Feigned Retreat at the end of that turn.

### Design purpose

Feigned Retreat transforms retreat from pure loss into a visible counterattack plan. The Action lets the player deliberately yield a position; the Battle effect recovers tempo after an actual defeat.

The delayed extra movement remains vulnerable to Asset removal, Asset-capacity pressure, and changes in board position.

### Initial watchlist

- Whether battle avoidance plus a future attacking movement is too efficient.
- Face-down Asset tracking and voluntary-removal timing.
- Whether the Action should require a controlled Territory.
- Interaction with Militias and Neutral Strategic Withdrawal.

## 6. Economy of Force

**Cost:** 3  
**Complexity:** Advanced  
**Primary threads:** Command discipline; restraint; force preservation

> **Action:** Bank Economy of Force as an Asset. After you win a battle in which you played fewer active Battle cards than your opponent, you may discard Economy of Force and choose one active Battle card you played. Return that card to your hand during battle cleanup instead of placing it in its normal destination.
>
> **Battle:** If Economy of Force is your only active Battle card and you win this battle, return it to your hand during battle cleanup instead of placing it in its normal destination.

### Design purpose

Economy of Force creates the opposite incentive from Brothers in Arms. It rewards winning with restraint, efficient Orders, position, and prepared Assets rather than maximum card commitment.

These two cards should compete for deck space and encourage different interpretations of Military rather than forming one package.

### Initial watchlist

- Repeatable self-return loops.
- Whether the card is too weak without a direct battle modifier.
- Whether “fewer active Battle cards” remains clear after cancellation and negation.

## 7. Counteroffensive

**Cost:** 3  
**Complexity:** Advanced  
**Primary threads:** Momentum versus consolidation; defense into counterattack; Command discipline

> **Action:** Bank Counteroffensive as an Asset. After you win a battle you did not initiate, discard Counteroffensive and choose one:
>
> - gain 1 Command; or
> - bank Counteroffensive face down instead of discarding it. At the beginning of your next turn, discard it and gain one additional movement that turn. That movement may be used only to move toward the opponent's Heartland and may initiate a battle.
>
> **Battle:** During battle cleanup, if you win a battle you did not initiate, choose one:
>
> - place Counteroffensive in your Graveyard and gain 1 Command; or
> - bank Counteroffensive face down instead of placing it in its normal destination. At the beginning of your next turn, discard it and gain one additional movement that turn. That movement may be used only to move toward the opponent's Heartland and may initiate a battle.

### Design purpose

Counteroffensive asks whether a defensive victory should be consolidated into Command or converted into an attack on the next turn. It naturally favors the Commandant but remains useful to the General when forced onto the defensive.

### Initial watchlist

- Wording of discarding versus banking from the Action form.
- Too much overlap with Feigned Retreat.
- Whether gaining Command after a defensive win is too reliable.
- Extra-movement stacking.

---

# Cost 4

## 8. Bridgehead

**Cost:** 4  
**Complexity:** Advanced  
**Card form:** Territory Overlay  
**Primary threads:** Occupation; momentum versus consolidation; prepared position

> **Action:** Place Bridgehead as an Overlay on a Territory you occupy but do not control. You may have only one Bridgehead Overlay.
>
> **Overlay:** When you win a battle as the defender on this Territory, choose one:
>
> - **Hold:** Leave Bridgehead in place and gain 1 Command.
> - **Expand:** Place Bridgehead in your Graveyard, then move one space toward the opponent's Heartland. This movement may initiate a battle, but you cannot spend Command during that battle.
>
> When you capture this Territory or cease occupying it, place Bridgehead in your Graveyard.
>
> **Battle:** If you win this battle as the attacker on a Territory your opponent controls, place Bridgehead on that Territory as an Overlay instead of placing it in its normal destination.

### Design purpose

Bridgehead is the package's principal Overlay. It makes an occupied Territory a visible operational position rather than a passive waiting room before capture.

The Commandant can use it to hold and accumulate Command through successful defense. The General can turn a defended foothold into renewed expansion, but the follow-up battle cannot use Command.

### Initial watchlist

- Repeated Command gain while holding the Overlay.
- Whether Expand improperly bypasses normal movement or capture expectations.
- Overlap with Foothold, Fortify, Assimilation, and Rout.
- Overlay ownership and removal when control changes.

## 9. Operational Reserve

**Cost:** 4  
**Complexity:** Advanced  
**Primary threads:** Prepared operations; Command allocation; combined arms

> **Action:** Bank Operational Reserve as an Asset. After the initial battle dice are rolled and before rerolls, if your battle total is lower, you may discard Operational Reserve and spend 1 Command. If you do, draw one additional battle card and immediately play it face up in addition to your other Battle cards if its Battle effect can still resolve.
>
> **Battle:** After the initial battle dice are rolled and before rerolls, if your battle total is lower, you may spend 1 Command. If you do, draw one additional battle card and immediately play it face up in addition to your other Battle cards if its Battle effect can still resolve.

### Design purpose

Operational Reserve gives Military a visible, costly way to reinforce a battle after the initial result is known. It differs from Neutral Reinforcements by requiring Command, triggering only from behind, and resolving after dice rather than before them.

The player must decide whether rescuing the current battle is worth losing Command that could fuel post-battle Orders.

### Initial watchlist

- Which Battle effects remain eligible after dice.
- Interaction with rerolls, Revolution, and other result-changing effects.
- Whether the Battle version provides too much value when committed from hand.

## 10. Decisive Engagement

**Cost:** 4  
**Complexity:** Advanced  
**Primary threads:** Commitment; visible risk; high-stakes battle

> **Action:** Bank Decisive Engagement as an Asset. After Battle cards are revealed in a battle involving you, you may discard Decisive Engagement. If you do, each player draws one additional battle card and may immediately play one additional card from their battle draw face up if its Battle effect can still resolve. During battle cleanup, the loser retreats one additional space, if able.
>
> **Battle:** When Decisive Engagement is revealed, each player draws one additional battle card and may immediately play one additional card from their battle draw face up if its Battle effect can still resolve. During battle cleanup, the loser retreats one additional space, if able.

### Design purpose

Decisive Engagement raises both the resources and positional stakes of one battle. The opponent receives the same additional opportunity, so the Military player should use it only when position, Command, preparation, or deck construction makes escalation favorable.

It is intentionally interactive rather than a one-sided premium bonus.

### Initial watchlist

- Multiple-copy stacking and battle-card explosion.
- Whether the symmetric extra play favors the controller too reliably through Military synergies.
- Interaction with cards whose effects remain unresolved when drawn after reveal.
- Additional-retreat boundaries.

## 11. Field Command

**Cost:** 4  
**Complexity:** Advanced  
**Primary threads:** Command discipline; leader-dependent sequencing; prepared operations

> **Action:** Bank Field Command as an Asset. After you spend 1 Command on a 1-Command Order, you may discard Field Command and choose a different 1-Command Order available to your leader. You may use the chosen Order once this turn at its next legal timing without spending Command.
>
> **Battle:** During this battle, after you spend 1 Command on a 1-Command Order, choose a different 1-Command Order available to your leader. You may use the chosen Order once this turn at its next legal timing without spending Command. If you do, place Field Command in your Graveyard after that Order resolves.

### Design purpose

Field Command creates one premium sequence of two different Orders rather than simply generating Command. Its value changes sharply by leader and timing:

- the General may combine movement and offensive support;
- the Commandant may combine defensive preparation and post-battle displacement.

The player must still fund the first Order and find legal timing for the second.

### Initial watchlist

- Whether this is an automatic inclusion in every Order-heavy deck.
- Legal timing when the chosen second Order cannot resolve later that turn.
- Interaction with Standing Orders and other free-Order effects.
- Whether the Battle form favors the Commandant too strongly.

---

# Cost 5

## 12. Shock and Awe

**Cost:** 5  
**Complexity:** Advanced  
**Primary threads:** Statement operation; momentum versus consolidation; Command commitment; overextension

> **Action:** Bank Shock and Awe as an Asset. During your turn, after you win a battle and resolve Military's normal Command gain, you may discard Shock and Awe and spend 2 Command. If you do, you cannot use Orders for the rest of this turn. Choose one:
>
> - **Consolidate:** If you occupy a Territory your opponent controls, capture it immediately, then end your movement for this turn.
> - **Press:** Move one space toward the opponent's Heartland. This movement may initiate a battle. After each later battle you win this turn, choose Consolidate or Press again.
>
> **Battle:** During your turn, if you win this battle, after resolving Military's normal Command gain, you may spend 2 Command and place Shock and Awe in your Graveyard. If you do, you cannot use Orders for the rest of this turn. Choose Consolidate or Press as described above.

### Design purpose

Shock and Awe no longer grants immediate capture and follow-up movement together. It launches a single major operation in which every victory forces a choice:

- stop and secure the gain; or
- continue forward without access to Orders and risk overextension.

It synthesizes the General's and Commandant's strategic priorities without replacing either leader's normal Orders. The card is visible when prepared, requires full Command, and can collapse as soon as the Military player loses a battle.

### Initial watchlist

- Potential chain-battle turns and breakthrough speed.
- Whether Press should be limited to once or twice per operation.
- Whether ending movement after Consolidate is sufficient cost.
- Interaction with Onward, Rout, Fortify, Invasion, Assimilation, and extra-movement effects used before activation.
- Whether the Battle form is too difficult to activate from 0 Command.

---

# Package-level interaction map

## Competing commitment strategies

- **Brothers in Arms** rewards coordinated heavy commitment.
- **Economy of Force** rewards winning with fewer cards.
- **Operational Reserve** rewards holding Command and visible reserves for a late intervention.
- **Decisive Engagement** deliberately enlarges the battle for both players.

These cards should compete rather than form one obvious package.

## Retreat and counterattack cluster

- **Militias** yields ground or limits post-victory movement.
- **Feigned Retreat** converts withdrawal or defeat into next-turn attacking movement.
- **Counteroffensive** converts a defensive win into Command or delayed movement.

Package testing must ensure these cards combine productively without making Military impossible to press or creating a solved defensive-counterattack deck.

## Command strategies

- **Battlefield Promotion** rewards winning without spending Command.
- **Standing Orders** borrows a 1-Command Order from the next victory's Command gain.
- **Field Command** chains two different 1-Command Orders.
- **Operational Reserve** spends Command reactively after dice.
- **Shock and Awe** consumes full Command to launch an operation and then shuts Orders off.

These cards create several different uses and valuations of Command. Testing must ensure none becomes mandatory infrastructure and that the package does not make Command too plentiful.

## Occupation and board position

- **Bridgehead** is the package's Overlay and occupation build-around.
- **Shock and Awe** creates the strongest momentum-versus-consolidation choice.
- **Militias**, **Feigned Retreat**, and **Counteroffensive** make yielding, holding, and retaking ground tactically distinct.

---

# Package-level concerns before approval

1. **Command density:** Five cards interact directly with gaining, spending, or replacing Command. This may be appropriate for faction identity but must not become a required Command package.
2. **Delayed-movement tracking:** Feigned Retreat and Counteroffensive both bank face down for next-turn movement. They may need differentiation or consolidation.
3. **Defensive density:** Militias, Feigned Retreat, Counteroffensive, and Bridgehead all have defensive applications. Testing should confirm General decks still see several attractive cards.
4. **Extra movement:** Feigned Retreat, Counteroffensive, Bridgehead, and Shock and Awe can create movement outside the normal baseline. Chain limits and turn ownership require careful rules review.
5. **Battle-card volume:** Brothers in Arms, Operational Reserve, and Decisive Engagement interact with additional or multiple Battle cards. Watch complexity and explosive combinations with Conscription and Reinforcements.
6. **Overlay boundary:** Bridgehead must remain a specific operational position rather than establish repeatable infrastructure, networks, Repair, or Engineer-like Overlay management.
7. **Exact timing:** Several cards depend on pre-commitment, post-dice, post-victory, and next-turn windows. The concepts should be judged before final wording is polished.

---

# Recommended review order

1. Battlefield Promotion
2. Bridgehead
3. Brothers in Arms
4. Shock and Awe
5. Militias
6. Standing Orders
7. Economy of Force
8. Operational Reserve
9. Feigned Retreat
10. Counteroffensive
11. Decisive Engagement
12. Field Command

This order establishes the package's simplest Command card, Overlay, inherited redesigns, and statement card before resolving the denser supporting mechanics.