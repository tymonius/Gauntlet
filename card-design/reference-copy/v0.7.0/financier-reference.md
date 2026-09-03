# Gauntlet v0.7.0 — Financier Reference Copy

> **Player-aid copy, not faction-rule authority.** This file is deliberately authored for compact table lookup. It is audited against the complete v0.7.0 authorities and does not define mechanics independently.
>
> Audit authority: `game-data/current-game.json`.
>
> Recheck against: Capital and Capital Ledger; Financial Capacity; Treasury; Income; Buying and buying out Deeds; Play the Market; Subsidize; Controlling Interest.

## Front — Capital & Capacity

### Capital Limit

Capital limit = Territories you control + total card value in your Treasury.

Capital may exceed the limit temporarily. At the end of every turn, reduce Capital to the current limit if necessary.

### Faction Features

| Feature | Use |
|---|---|
| Treasury | 1 Action · Denouement |
| Deeds | 1 Action · Denouement · Current Deed cost |
| Play the Market | 1 Action · Denouement · Discard 1 card |
| Subsidize | No Action · Before dice · Capital cost |
| Financial Capacity | No Action · After Capture |
| Income | Automatic · After Capture |

### Treasury

During Denouement, spend **1 Action** to place a card from your Hand face up in your Treasury. Its value increases your Capital limit.

### Income

After Capture at the start of your turn, gain **1 Capital per Deed** you own.

### Financial Capacity

After Capture, if your Treasury value is greater than the number of Territories you control, you may take one Action in **Opening** and one Action in **Denouement** that turn.

At least one Action must be spent on a **Faction Feature marked 1 Action**.

## Reverse — Deeds & Spending

### Buying Deeds

During Denouement, spend **1 Action** and pay the Deed's full cost.

**Base cost:** min(Deeds you own + 1, 6)

| Position | Modifier |
|---|---:|
| Control Territory | -1 |
| Occupy Territory | 0 |
| Neither | +1 |

| Buyout | Premium |
|---|---:|
| Unowned | 0 |
| Opposing Financier | + min(their Deeds, 6) |

Minimum cost: **1 Capital**.

If making several purchases, recalculate after each purchase.

### Play the Market

During Denouement, spend **1 Action**, discard **1 card from Hand**, and roll:

| Roll | Result |
|---:|---|
| 1 | Graveyard; gain 0 |
| 2–3 | Gain 1 Capital |
| 4–5 | Gain Capital equal to card value |
| 6 | Gain twice the card's value |

### Subsidize

Before dice are rolled, spend Capital to increase your battle total.

**+1:** 1 Capital

**+2:** 3 Capital

**+3:** 6 Capital

**+4:** 10 Capital

### Controlling Interest

If you own the Deeds to **every Territory currently in the Gauntlet**, you win immediately.

