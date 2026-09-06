# Gauntlet v0.7.0 — Intelligence Mission Reference Copy

> **Player-aid copy, not faction-rule authority.** This file is deliberately authored for compact table lookup. It is audited against the complete v0.7.0 authorities and does not define mechanics independently.
>
> Audit authority: `game-data/current-game.json`.
>
> Recheck against: Faction Features; Intel; Operation Progress; Starting a Mission; Completing a Mission; Aborting and failing; Starting a Special Operation; Readiness and completion.

## Front — Missions

### Faction Features

| Feature | Use |
|---|---|
| Missions | 1 Action · Denouement |
| Special Operations | 1 Action · Denouement |

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

Completion still requires the Denouement Action above after the requirement is satisfied.

## Reverse — Special Operations

### Abort / Fail

**Abort:** During Denouement, spend **1 Action**, reveal the Active Mission, and spend Intel equal to its value. Put it in your Discard Pile.

**Fail:** If a rule, effect, or continuing requirement causes failure, reveal the Mission and put it in your Graveyard.

### Readiness

A Special Operation is ready only while your **Operation Progress exceeds the number of Territories the opponent controls**.

To start one, the Mission / Special Operation slot must be empty and you must have an eligible Intelligence card in Hand.

### Start

During Denouement, spend **1 Action** to place the eligible card face down as your Special Operation.

It uses the card's printed Mission requirement. On completion, resolve only the Special Operation payment and win procedure below.

### Complete & Win

During Denouement, if its requirement is satisfied and readiness remains valid, spend **1 Action**, reveal it, and pay:

**Territories currently in the Gauntlet − card value**

Minimum payment: **1 Intel**. If paid, you win immediately.

If readiness is lost before completion, the Special Operation immediately fails and goes to the Graveyard.

