# Gauntlet v0.6 Financier Card Pool

**Status:** Authoritative working exact-text source for the selected twelve-card v0.6 Financier package.  
**Purpose:** Consolidate the current Financier card names, costs, complexity, exact text, package structure, rules clarifications, and initial playtest watchlist in one active document.

Use this document with:

- `Gauntlet_v0.6_Working_Rules.md` for core play, Capital, Treasury, Deeds, income, Controlling Interest, leaders, Assets, and battle timing;
- `Gauntlet_v0.6_Faction_Card_Design_Guide.md` for package standards;
- `Gauntlet_v0.6_Financier_Design_Notes.md` for identity, strategic rationale, audit findings, and test priorities;
- `Gauntlet_v0.6_Neutral_Card_Pool.md` for shared cards and interaction checks.

Until the Working Rules are synchronized, the Financier-specific rules clarifications in this document supersede older uncapped Deed-cost formulas and undefined uses of **take an extra action**.

---

## Package summary

| Cost | Cards |
|---:|---|
| 1 | Speculation |
| 2 | Monetary Crisis; Liquidation; Underwriting |
| 3 | Capital Gains; Tariffs; Divestment; Margin Loan |
| 4 | Leveraged Buyout; Foreclosure; Property Dues |
| 5 | Corner the Market |
| **Total** | **12 cards** |

- **Total unique-card value:** 36
- **Average cost:** 3.00
- **Curve:** 1 / 3 / 4 / 3 / 1 at costs 1–5
- **Unique card:** Corner the Market

---

## Financier rules clarifications

### Extra actions

When an effect tells a player to **take an extra action**, it grants one additional Action opportunity that turn. The player may use it for anything they could normally do instead of playing an Action card, including a faction action or voluntary Asset removal. It does not grant additional movement unless an effect specifically says so.

### Deed-cost cap

> **Deed cost = min(Deeds you own + 1, 6) + position modifier + buyout premium**

The base purchase cost therefore rises from 1 through 6 Capital and remains 6 for every later Deed.

For a Deed owned by an opposing Financier:

> **Buyout premium = min(Deeds the opposing owner owns, 6)**

A Territory added to the Gauntlet by Manifest Destiny is a normal Territory with a Deed. Its Deed counts toward income and Controlling Interest, but additional Deeds do not cause either component of Deed cost to scale beyond 6.

---

# Cost 1

## Speculation

**Cost:** 1  
**Complexity:** Advanced  
**Primary threads:** Visible wagers; territorial prediction; risk and return

> **Action:** Choose one revealed Territory you neither control nor occupy. Place Speculation face up beside that Territory. At the start of your next turn, if you occupy or control that Territory, gain 2 Capital and discard Speculation. Otherwise, place Speculation in your Graveyard.
>
> **Battle:** If you initiated this battle, you may spend 1 Capital. If you spend Capital this way and win, gain 2 Capital during battle cleanup. If you spend Capital this way and do not win, place Speculation in your Graveyard instead of its normal destination.

Speculation is not an Asset or Overlay and does not alter the chosen Territory. While face up, it remains in play only to track its own effect.

---

# Cost 2

## Monetary Crisis

**Cost:** 2  
**Complexity:** Basic  
**Primary threads:** Hand disruption; Treasury shelter; symmetrical effects with asymmetric preparation

> **Action:** Each player discards their hand, then draws two cards.
>
> **Battle:** During battle cleanup, each player with more than one card in hand chooses one of those cards and discards the rest.

Monetary Crisis is formally symmetrical, but Treasury preparation lets the Financier shelter selected value outside the hand before triggering it.

## Liquidation

**Cost:** 2  
**Complexity:** Advanced  
**Primary threads:** Liquidity versus capacity; emergency spending; portfolio sacrifice

> **Action:** Choose one card in your Treasury and place it in your discard pile. Gain Capital equal to its value, then you may immediately buy or buy out one Deed.
>
> **Battle:** Before dice are rolled, you may choose one card in your Treasury and place it in your discard pile. If you do, gain Capital equal to its value, then you may immediately Subsidize.

Liquidation converts long-term Capital capacity into immediate spending power while reducing the player's future Capital limit.

## Underwriting

**Cost:** 2  
**Complexity:** Advanced  
**Primary threads:** Insurance; aggressive Subsidize decisions; partial loss recovery

> **Action:** Bank Underwriting as an Asset. After you lose a battle in which you used Subsidize, you may discard Underwriting. If you do, gain Capital equal to the bonus you purchased.
>
> **Battle:** After this battle, if you lose and used Subsidize, gain Capital equal to the bonus you purchased.

Underwriting does not improve the battle directly. It changes how much Capital the player is willing to risk without fully refunding larger Subsidize purchases.

---

# Cost 3

## Capital Gains

**Cost:** 3  
**Complexity:** Advanced  
**Primary threads:** Investment maturity; Treasury liquidity; battle-to-economy conversion

> **Action:** Place Capital Gains beneath one card in your Treasury. At the start of your next turn, after captures and income, return that Treasury card to your hand and gain Capital equal to its value, then discard Capital Gains. If you lose a battle before then, place both cards in your discard pile instead. If the chosen card leaves your Treasury before this effect resolves, discard Capital Gains.
>
> **Battle:** During battle cleanup, if you won, choose one other card you played during this battle that would enter your discard pile or Graveyard. Place that card face up in your Treasury instead.

The Action converts protected capacity into a temporary liquidity window. The Battle effect turns a successful tactical commitment into long-term infrastructure.

## Tariffs

**Cost:** 3  
**Complexity:** Advanced  
**Card form:** Asset  
**Primary threads:** Borrowing against future draws; action compression; opponent payment

> **Action:** Bank Tariffs as an Asset. Draw two cards, then take an extra action this turn.
>
> **Asset:** While Tariffs is banked, skip your normal draw. You cannot bank Tariffs while you control another banked Tariffs. You cannot cause Tariffs to leave play during the turn it is banked.
>
> **Battle:** Your opponent may discard one card from their hand. If they do not, add +1 to your battle total.

Tariffs advances cards and tempo immediately, then remains as visible debt until the player spends a later Action opportunity to remove it or an opposing effect removes it.

## Divestment

**Cost:** 3  
**Complexity:** Advanced  
**Primary threads:** Portfolio restructuring; ownership versus liquidity; sacrificing income for tempo

> **Action:** Make one Deed you own unowned. Gain Capital equal to the number of Deeds you owned before doing so, then take an extra action.
>
> **Battle:** Before dice are rolled, you may make one Deed you own unowned. If you do, gain Capital equal to the number of Deeds you owned before doing so, then you may immediately Subsidize.

Divestment abandons income and Controlling Interest progress to fund a different purchase or decisive battle.

## Margin Loan

**Cost:** 3  
**Complexity:** Advanced  
**Card form:** Asset with collateral  
**Primary threads:** Leverage; repayment timing; default risk

> **Action:** Choose one other card in your hand or Treasury and place it beneath Margin Loan as collateral. Bank Margin Loan as an Asset. Gain Capital equal to the collateral card's value plus 2, then take an extra action.
>
> At the start of your next turn, after captures and income, choose one:
>
> - **Repay the loan:** Pay Capital equal to the collateral card's value plus 3. Return the collateral card to your hand, then discard Margin Loan.
> - **Default:** Place Margin Loan and its collateral in your Graveyard.
>
> **Battle:** Before dice are rolled, you may place one other card from your hand or Treasury beneath Margin Loan as collateral. If you do, gain Capital equal to its value, then you may immediately Subsidize. During battle cleanup, if you won, return the collateral card to your hand. Otherwise, place Margin Loan and its collateral in your Graveyard.
>
> **Reminder:** If Margin Loan leaves play before the loan is resolved, you default.

Margin Loan provides more immediate liquidity than Liquidation but risks permanent card loss and requires repayment with interest.

---

# Cost 4

## Leveraged Buyout

**Cost:** 4  
**Complexity:** Advanced  
**Primary threads:** Collateralized acquisition; card sacrifice; battle-driven ownership

> **Action:** Buy or buy out one Deed. For this purchase, you may use any number of cards from your hand or Treasury as collateral. Each collateral card contributes Capital equal to its value and is placed in your Graveyard after the purchase. Collateral may pay the entire cost.
>
> **Battle:** During battle cleanup, if you won as the attacker on a Territory whose Deed you do not own, you may immediately buy or buy out that Deed, treating the Territory as occupied. For this purchase, you may use any number of other cards you played in this battle as collateral. Each contributes Capital equal to its value and is placed in your Graveyard instead of its normal destination. Collateral may pay the entire cost.

Leveraged Buyout converts cards already committed to the strategic plan into immediate ownership, at the cost of permanently losing them.

## Foreclosure

**Cost:** 4  
**Complexity:** Advanced  
**Primary threads:** Ownership-to-control conversion; visible territorial claims; immediate capture

> **Action:** Choose one unoccupied Territory whose Deed you own that is adjacent to a Territory you control. Take control of that Territory.
>
> **Battle:** If you initiated this battle on a Territory whose Deed you owned when the battle began and you win, capture that Territory immediately instead of occupying it.

Foreclosure makes prior Deed ownership materially affect the board while requiring adjacency, visible setup, and an unoccupied target for remote control.

## Property Dues

**Cost:** 4  
**Complexity:** Advanced  
**Card form:** Asset  
**Primary threads:** Ownership pressure; opponent choice; income from contested property

> **Action:** Bank Property Dues as an Asset. The first time each turn your opponent advances onto a Territory whose Deed you own, they choose one:
>
> - discard one card from their hand; or
> - you gain 2 Capital.
>
> **Battle:** If this battle takes place on a Territory whose Deed you own, your opponent chooses one:
>
> - discard one card from their hand; or
> - you gain 3 Capital during battle cleanup.

Property Dues makes Deed ownership economically relevant to the opponent without directly preventing movement or battle.

---

# Cost 5

## Corner the Market

**Cost:** 5  
**Complexity:** Advanced  
**Unique:** Maximum one copy per deck  
**Primary threads:** Portfolio culmination; stored liquidity; sudden Controlling Interest threat

> **Action:** Buy or buy out any number of Deeds. Fully resolve each purchase before calculating the cost of the next.
>
> **Battle:** During battle cleanup, if you won, you may buy or buy out any number of Deeds. Fully resolve each purchase before calculating the cost of the next.

Corner the Market removes the normal one-purchase Action bottleneck without generating Capital or discounting any Deed. It can produce an immediate Controlling Interest victory only if the player has already assembled the required resources and access.

---

## Package notes

### Strategic threads

The package supports overlapping approaches rather than sealed subpackages:

- investment versus readiness;
- liquidity versus long-term Capital capacity;
- ownership versus territorial control;
- leverage, repayment, insurance, and default;
- Deed acquisition, buyouts, and portfolio restructuring;
- economic pressure through hand loss, payments, and contested property.

### Leader interpretation

The **Banker** naturally emphasizes Treasury construction, collateral efficiency, delayed payoff, and large portfolio transactions.

The **Executive** naturally emphasizes offensive battles, occupation, immediate purchase timing, and converting Deeds into control or capture.

Neither leader owns a closed subset of the pool. Several cards change function or timing depending on the selected leader.

### Initial watchlist

- whether Tariffs, Divestment, and Margin Loan collectively erase the faction's intended Action pressure;
- whether repeated Monetary Crisis prevents opponents from assembling meaningful hands;
- whether multiple Property Dues Assets create excessive stacking from one advance;
- whether Divestment's sell-and-rebuy line is too reliable as a generic Capital gain;
- whether extra-Battle-card effects make Leveraged Buyout's Battle mode too efficient;
- whether Capital Gains can preserve cards of excessive value too easily;
- whether Foreclosure's adjacency restriction creates sufficient counterplay;
- whether Underwriting is too narrow compared with the rest of the cost-2 group;
- whether the combined physical tracking burden of Speculation, Capital Gains, and Margin Loan remains acceptable;
- whether Corner the Market ends games dramatically after visible preparation rather than abruptly from routine accumulation.
