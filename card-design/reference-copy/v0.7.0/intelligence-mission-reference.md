# Gauntlet v0.7.2 Candidate — Intelligence Mission Reference Copy

> **Player-aid copy, not faction-rule authority.** This file is deliberately authored for compact table lookup. It is audited against the complete current authorities and does not define mechanics independently.
>
> Audit authority: `game-data/current-game.json`.
>
> Recheck against: Faction Features; Intel; Operation Progress; Operational Capacity; Starting a Mission; Completing a Mission; Aborting and failing; Starting a Special Operation; Readiness and completion.

## Front — Missions

### Faction Features

| Feature | Use |
|---|---|
| Missions | 1 Action · Denouement |
| Special Operations | 1 Action · Denouement |
| Operational Capacity | Automatic |

### Intel & Progress

At the **start of your turn**, gain Intel equal to your current **Operation Progress**.

Operation Progress begins at 0, is not normally spent, and records completed normal Missions. Completing a normal Mission still gives **+1 Operation Progress** and immediate **Intel equal to that card's value**.

### Operational Capacity

If you used your normal Action during **Opening**, you may still spend **1 Action during Denouement** to **Start or Complete a Mission or Special Operation**.

You still cannot take more than one Action in either phase. **Abort Mission does not qualify.**

### Start a Mission

During Denouement, spend **1 Action** to place an eligible Intelligence card from Hand face down as your **Active Mission**.

- Choose a card with a printed **Mission** requirement.
- The Mission / Special Operation slot holds **one card**.
- A Mission becomes eligible to complete starting on a later turn.

### Complete a Mission

During Denouement, if its requirement is satisfied, spend **1 Action** to reveal and complete the Active Mission:

- Increment **Operation Progress by 1**.
- Gain **Intel equal to the card's value**.
- Put the Mission in your **Discard Pile**.

Completion still requires the Denouement Action above after the requirement is satisfied. The new Progress increases start-of-turn Intel beginning on your next turn; it does not create another immediate Intel payment.

## Reverse — Special Operations

### Abort / Fail

**Abort:** During Denouement, spend **1 Action**, reveal the Active Mission, and spend Intel equal to its value. Put it in your Discard Pile. Abort does **not** qualify for Operational Capacity.

**Fail:** If a rule, effect, or continuing requirement causes failure, reveal the Mission and put it in your Graveyard.

### Readiness

A Special Operation is ready only while your **Operation Progress exceeds the number of Territories the opponent controls**.

To start one, the Mission / Special Operation slot must be empty and you must have an eligible Intelligence card in Hand.

### Start

During Denouement, spend **1 Action** to place the eligible card face down as your Special Operation. This Action qualifies for Operational Capacity.

It uses the card's printed Mission requirement. On completion, resolve only the Special Operation payment and win procedure below.

### Complete & Win

During Denouement, if its requirement is satisfied and readiness remains valid, spend **1 Action**, reveal it, and pay:

**Territories currently in the Gauntlet − card value**

Minimum payment: **1 Intel**. If paid, you win immediately. This Action qualifies for Operational Capacity.

If readiness is lost before completion, the Special Operation immediately fails and goes to the Graveyard.

