# Gauntlet v0.6 Financier Faction Guide

> **Definitive v0.6 Financier faction source.** This guide governs all Financier-specific rules, Leaders, Capital, Treasury, Deeds, collateral, Play the Market, Subsidize, Controlling Interest, supplemental components, and the canonical twelve-card Financier pool. General movement, battle, capture, Asset, Overlay, and victory rules remain in the core rulebook.

## 1. Financier overview

Financiers convert cards and Territory control into Capital, Capital into Deeds, and Deeds into income or Controlling Interest. They may win by running the Gauntlet or by owning the Deeds to every Territory currently in it.

### At a glance

| **ELEMENT** | **FINANCIER RULE** |
|---|---|
| **Victory** | Run the Gauntlet or achieve Controlling Interest. |
| **Resource** | Capital, minimum 0; maximum determined by the Capital limit. |
| **Capital limit** | Territories you control plus the total deckbuilding value of cards in your Treasury. |
| **Income** | After the Capture step at the start of your turn, gain 1 Capital per Deed you own. |
| **Leaders** | Banker and Executive. |
| **Faction pool** | 12 Financier card titles. |
| **Unique card** | Corner the Market, cost 5; maximum one copy per Playable Deck. |

### Components

A Financier Deck includes:

- one Financier Leader Card: **Banker** or **Executive**;
- one **Financier Reference Card**;
- one public **Capital Ledger**;
- eight identical full-size **Deed Cards** in a shared supply; and
- any Financier cards included in the Playable Deck.

No Capital marker is used. Deed Cards are supplemental components. They have no deckbuilding value and never enter a normal card zone.

### Setup

1. Place the chosen Leader Card, Financier Reference Card, and Capital Ledger near your play area.
2. Record starting Capital as 0 and record the current Capital limit.
3. Place all eight Deed Cards in a shared unowned supply.
4. Begin with an empty Treasury.

## 2. Capital, Treasury, and Deeds

### Capital

Capital is a public tracked value. It cannot fall below 0.

Gain, spend, or lose Capital only when a rule or effect instructs you to do so.

### Capital Ledger

Record every Capital gain, spend, loss, and end-turn reduction as a transaction on the Capital Ledger. After each transaction, record the new running Balance. The final Balance entry is your current Capital.

Record the current Capital limit in the separate limit field. Update that field whenever Territory control or the total deckbuilding value in your Treasury changes. The Ledger is public information and uses no marker.

### Capital limit

> **Capital limit = Territories you control + total deckbuilding value of cards in your Treasury**

Capital may exceed the limit temporarily. At the end of every turn, if your Capital exceeds your current limit, reduce it to the limit. This check occurs at the end of the turn currently being played, including an opponent's turn during which you gained Capital.

### Treasury

During the Action Opportunity after movement, instead of playing a card for its Action effect, you may place one card from your hand face up in your **Treasury**.

- Treasury cards are outside normal card zones.
- They cannot be played or affected unless a rule specifically refers to the Treasury.
- Each Treasury card increases your Capital limit by its printed deckbuilding value.
- Treasury is not the Asset Bank and does not use Asset capacity.
- A card leaving Treasury immediately stops contributing to the Capital limit.

Treasury cards do not generate Capital by themselves.

### Deeds

Each Territory currently in the Gauntlet has one Deed. A Deed is either unowned or owned by a Financier.

When you buy an unowned Deed, take one Deed Card from the shared supply and place it beside that Territory on your side of the Gauntlet. In a Financier mirror, the side on which the Deed Card is placed identifies its owner.

When you buy out a Deed owned by an opposing Financier, move its Deed Card to your side of that Territory. When a Deed becomes unowned, return its card to the shared supply.

Deed ownership is independent of Territory occupation and control. Buying a Deed does not change Territory control unless an effect explicitly says so.

### Buying a Deed

During the Action Opportunity after movement, instead of playing a card for its Action effect, you may buy or buy out one Deed by paying its full cost.

Effects that permit multiple purchases resolve each purchase completely before calculating the next cost.

### Deed cost

> **Deed cost = min(Deeds you own + 1, 6) + position modifier + buyout premium**

The minimum cost is 1 Capital.

| **TERRITORY STATE FROM BUYER'S PERSPECTIVE** | **MODIFIER** |
|---|---:|
| You control it | -1 |
| You occupy it but do not control it | 0 |
| You neither control nor occupy it | +1 |

For an unowned Deed, the buyout premium is 0.

For a Deed owned by an opposing Financier:

> **Buyout premium = min(Deeds the opposing owner owns, 6)**

### Income

After the Capture step at the start of your turn, gain 1 Capital for each Deed you own.

Income may temporarily raise Capital above the current limit. Reduce excess Capital only at the end of the turn.

### Controlling Interest

When you own the Deeds to every Territory currently in the Gauntlet, you immediately win by **Controlling Interest**.

A Territory added to the Gauntlet has a normal Deed and expands the set required for Controlling Interest.

### Play the Market

During the Action Opportunity after movement, instead of playing a card for its Action effect, discard one card from hand and roll one die:

| **ROLL** | **RESULT** |
|---:|---|
| **1** | Put the card in your Graveyard; gain 0 Capital. |
| **2–3** | Gain 1 Capital. |
| **4–5** | Gain Capital equal to the card's deckbuilding value. |
| **6** | Gain Capital equal to twice the card's deckbuilding value. |

### Subsidize

Before dice are rolled in a battle involving you, you may spend Capital to add to your battle total.

| **BONUS** | **TOTAL COST** |
|---:|---:|
| **+1** | 1 Capital |
| **+2** | 3 Capital |
| **+3** | 6 Capital |
| **+4** | 10 Capital |

The progression continues without a fixed maximum. Each additional +1 costs one more Capital than the previous increment. Capital spent through Subsidize is lost regardless of the battle result.

### Additional Action Opportunities

When an effect tells you to take an extra action, gain one additional Action Opportunity that turn.

An additional Action Opportunity may be used for any normal Action replacement that is legal at that timing, including:

- playing a card for its Action effect;
- placing a card in Treasury during an after-movement Action Opportunity;
- buying or buying out a Deed during an after-movement Action Opportunity;
- Playing the Market during an after-movement Action Opportunity;
- using Hostile Takeover during an after-movement Action Opportunity;
- voluntarily removing a banked Asset.

An additional Action Opportunity does not grant movement.

## 3. Financier Leaders

### Banker

![Banker sketch](../../../../images/sketches/banker.png)

**Archetype:** Collateral, planned purchases, and flexible financing  
**Motto:** *Credit closes the distance.*

The Banker uses cards in hand or Treasury as collateral to complete Deed purchases with less available Capital.

#### Line of Credit

The first time on your turn that you would buy or buy out a Deed, you may use one card from your hand or Treasury as collateral.

- The collateral contributes payment equal to its deckbuilding value.
- It cannot contribute more than half the purchase cost, rounded down.
- You must pay the remaining cost with Capital.
- Put the collateral card in your Discard Pile after the purchase.
- Unused collateral value is lost.
- Line of Credit applies only to Deed purchases and buyouts, not Subsidize.

### Executive

![Executive sketch](../../../../images/sketches/executive.png)

**Archetype:** Offensive acquisition, occupation, and immediate control  
**Motto:** *Take the ground. Close the deal.*

The Executive may convert a battlefield victory into an immediate Deed purchase and change of control.

#### Hostile Takeover

During the Action Opportunity after movement, instead of playing a card for its Action effect, if you won a battle this turn that caused you to occupy an enemy-controlled Territory, you may buy or buy out that Territory's Deed.

- Treat the Territory as occupied but not controlled for the cost calculation.
- Apply any normal buyout premium.
- If the purchase succeeds, immediately take control of that Territory.

## 4. Financier-specific rules

### Ownership, occupation, and control

A Financier may own the Deed to a Territory occupied or controlled by either player. Deed ownership changes only when a purchase, buyout, or effect changes it.

### Collateral

Collateral is not a separate zone. Place a collateral card beneath the card or effect using it so its source and value remain visible.

- Line of Credit collateral goes to the Discard Pile after the purchase.
- Margin Loan collateral returns only after repayment or a qualifying battle victory; default puts both cards in the Graveyard.
- Leveraged Buyout collateral goes to the Graveyard after the purchase or instead of its normal battle destination.
- Collateral contributes payment value but does not become Capital unless an effect says otherwise.
- Unused collateral value is lost.

### Added Territories

A Territory added to the Gauntlet:

- has a Deed;
- counts toward Capital and Asset limits when controlled;
- generates income when its Deed is owned;
- expands the set required for Controlling Interest; and
- uses the normal capped Deed and buyout formulas.

### Self-tracking cards

- **Speculation** remains face up beside its chosen Territory and is neither an Asset nor an Overlay.
- **Capital Gains** is placed beneath its chosen Treasury card.
- **Margin Loan** holds its collateral beneath it while the loan remains unresolved.

These placements track only their own effects and do not create general-purpose zones.

### Tariffs

You cannot bank Tariffs while another copy you control is banked. During the turn Tariffs is banked, you cannot voluntarily cause it to leave play. Mandatory rules and opposing effects may still remove or affect it.

## 6. Canonical Financier card pool

The following entries are the canonical v0.6 Financier names, costs, uniqueness, card forms, and exact player-facing text.

### Speculation

**Cost:** 1

> **Action:** Choose one Territory you neither control nor occupy. Place this face up beside that Territory. At the start of your next turn, if you occupy or control that Territory, gain 2 Capital and discard this. Otherwise, put this in your Graveyard.
>
> **Battle:** If you initiated this battle, you may spend 1 Capital. If you do and win, gain 2 Capital during battle cleanup. If you do and do not win, put this in your Graveyard instead of its normal destination.

### Monetary Crisis

**Cost:** 2

> **Action:** Each player discards their hand, then draws two cards.
>
> **Battle:** During battle cleanup, each player with more than one card in hand chooses one of those cards and discards the rest.

### Liquidation

**Cost:** 2

> **Action:** Choose one card in your Treasury and put it in your Discard Pile. Gain Capital equal to its deckbuilding value, then you may immediately buy or buy out one Deed.
>
> **Battle:** Before dice are rolled, you may choose one card in your Treasury and put it in your Discard Pile. If you do, gain Capital equal to its deckbuilding value, then you may immediately Subsidize.

### Underwriting

**Cost:** 2  
**Card form:** Asset

> **Action:** Bank this as an Asset. After you lose a battle in which you used Subsidize, you may discard this. If you do, gain Capital equal to the bonus you purchased.
>
> **Battle:** After this battle, if you lose and used Subsidize, gain Capital equal to the bonus you purchased.

### Capital Gains

**Cost:** 3

> **Action:** Place this beneath one card in your Treasury. At the start of your next turn, after the Capture step and income, return that Treasury card to your hand and gain Capital equal to its deckbuilding value, then discard this. If you lose a battle before then, put both cards in your Discard Pile instead. If the chosen card leaves your Treasury before this effect resolves, discard this.
>
> **Battle:** During battle cleanup, if you won, choose one other card you used during this battle that would enter your Discard Pile or Graveyard. Place that card face up in your Treasury instead.

### Tariffs

**Cost:** 3  
**Card form:** Asset

> **Action:** Bank this as an Asset. Draw two cards, then take one additional Action Opportunity this turn.
>
> **Asset:** While this is banked, skip your normal draw. You cannot bank this while you control another banked Tariffs. You cannot voluntarily cause this to leave play during the turn it is banked.
>
> **Battle:** Your opponent may discard one card from hand. If they do not, add +1 to your battle total.

### Divestment

**Cost:** 3

> **Action:** Make one Deed you own unowned. Gain Capital equal to the number of Deeds you owned before doing so, then take one additional Action Opportunity this turn.
>
> **Battle:** Before dice are rolled, you may make one Deed you own unowned. If you do, gain Capital equal to the number of Deeds you owned before doing so, then you may immediately Subsidize.

### Margin Loan

**Cost:** 3  
**Card form:** Asset with collateral

> **Action:** Choose one other card in your hand or Treasury and place it beneath this as collateral. Bank this as an Asset. Gain Capital equal to the collateral card's deckbuilding value plus 2, then take one additional Action Opportunity this turn.
>
> **Loan:** At the start of your next turn, after the Capture step and income, choose one:
>
> - **Repay:** Pay Capital equal to the collateral card's deckbuilding value plus 3. Return the collateral card to your hand, then discard this.
> - **Default:** Put this and its collateral in your Graveyard.
>
> **Battle:** Before dice are rolled, you may place one other card from your hand or Treasury beneath this as collateral. If you do, gain Capital equal to its deckbuilding value, then you may immediately Subsidize. During battle cleanup, if you won, return the collateral card to your hand. Otherwise, put this and its collateral in your Graveyard.
>
> **Reminder:** If this leaves play before the loan is resolved, you default.

### Leveraged Buyout

**Cost:** 4

> **Action:** Buy or buy out one Deed. For this purchase, you may use any number of cards from your hand or Treasury as collateral. Each collateral card contributes payment equal to its deckbuilding value and is put in your Graveyard after the purchase. Collateral may pay the entire cost.
>
> **Battle:** During battle cleanup, if you won as the attacking player on a Territory whose Deed you do not own, you may immediately buy or buy out that Deed, treating the Territory as occupied. For this purchase, you may use any number of other cards you used in this battle as collateral. Each contributes payment equal to its deckbuilding value and is put in your Graveyard instead of its normal destination. Collateral may pay the entire cost.

### Foreclosure

**Cost:** 4

> **Action:** Choose one unoccupied Territory whose Deed you own that is adjacent to a Territory you control. Take control of the chosen Territory.
>
> **Battle:** If you initiated this battle on a Territory whose Deed you owned when the battle began and you win, capture that Territory immediately instead of occupying it.

### Property Dues

**Cost:** 4  
**Card form:** Asset

> **Action:** Bank this as an Asset. The first time each turn your opponent advances onto a Territory whose Deed you own, they choose one: discard one card from hand, or you gain 2 Capital.
>
> **Battle:** If this battle takes place on a Territory whose Deed you own, your opponent chooses one: discard one card from hand, or you gain 3 Capital during battle cleanup.

### Corner the Market

**Cost:** 5  
**Unique:** Maximum one copy per Playable Deck

> **Action:** Buy or buy out any number of Deeds. Resolve each purchase completely before calculating the cost of the next.
>
> **Battle:** During battle cleanup, if you won, you may buy or buy out any number of Deeds. Resolve each purchase completely before calculating the cost of the next.

## 7. Card-pool summary

| **COST** | **FINANCIER CARDS** |
|---:|---|
| **1** | Speculation |
| **2** | Monetary Crisis, Liquidation, Underwriting |
| **3** | Capital Gains, Tariffs, Divestment, Margin Loan |
| **4** | Leveraged Buyout, Foreclosure, Property Dues |
| **5** | Corner the Market — Unique |

## Appendix A. Financier quick reference

### Core formulas

> **Capital limit = Territories you control + total Treasury value**

> **Deed cost = min(Deeds you own + 1, 6) + position modifier + buyout premium**

> **Buyout premium = min(Deeds the opposing owner owns, 6)**

| **POSITION** | **MODIFIER** |
|---|---:|
| You control it | -1 |
| You occupy it without control | 0 |
| Neither | +1 |

### Turn reminders

1. Resolve the Capture step.
2. Gain 1 Capital per Deed owned and record the transaction on the Capital Ledger.
3. Resolve the normal Draw step.
4. During the Action Opportunity after movement, you may place a card in Treasury, buy one Deed, Play the Market, or use Hostile Takeover instead of playing a card for its Action effect.
5. At the end of every turn, reduce Capital to the current Capital limit if necessary and record that reduction.

### Subsidize

| **BONUS** | **TOTAL COST** |
|---:|---:|
| **+1** | 1 |
| **+2** | 3 |
| **+3** | 6 |
| **+4** | 10 |

### Reminders

- Record every Capital transaction and running Balance on the public Capital Ledger.
- Line of Credit can fund no more than half the purchase cost, rounded down.
- Deed ownership is independent of Territory occupation and control.
- Added Territories have normal Deeds.
- Controlling Interest requires every Deed currently in the Gauntlet.
- Additional Action Opportunities do not grant movement.

---

Gauntlet v0.6 © 2026 Tymon Scott. All rights reserved. Financier Faction Guide.
