# Gauntlet v0.6 Financier Faction Guide

> **Definitive v0.6 Financier faction source.** This guide governs all Financier-specific rules, leaders, Capital, Treasury, Deeds, Play the Market, Subsidize, Controlling Interest, supplemental references, strategy, terminology, and the canonical twelve-card pool. The adjacent DOCX and PDF are release-formatted editions of this source. General game rules remain in the v0.6 core rules.

Use this guide with the Gauntlet v0.6 core rules. General movement, battle, retreat, occupation, capture, deck construction, Assets, Overlays, card destinations, and ordinary breakthrough victory procedures remain in the core rulebook.

---

## Contents

| Section | Contents |
|---|---|
| **1. Financier overview** | Identity, victory, components, and setup |
| **2. Capital, Treasury, and Deeds** | Economy, purchases, market play, Subsidize, and Controlling Interest |
| **3. Financier leaders** | Banker and Executive |
| **4. Playing Financiers** | Strategy, strengths, limits, deckbuilding, and counterplay |
| **5. Financier-specific rules reference** | Timing, collateral, added Territories, and self-tracking |
| **6. Canonical Financier card pool** | All twelve cards with exact text |
| **7. Card-pool summary** | Curve, strategic threads, copies, and complexity |
| **Appendix A. Quick reference** | Core formulas, tables, and card list by cost |

## 1. Financier overview

Financiers turn cards, position, and ownership into delayed economic power. They may still win by running the Gauntlet, but they also threaten **Controlling Interest** by acquiring the Deed to every Territory currently in the Gauntlet.

> **Faction identity:** Build capacity before cash, use ownership before control, and decide when long-term investments should become immediate leverage.

| Element | Financier rule |
|---|---|
| **Victory** | Normal breakthrough or Controlling Interest. |
| **Resource** | Capital. Capital cannot fall below 0 and is limited by controlled Territory plus Treasury value. |
| **Economy** | Treasury raises the Capital limit; Deeds generate income; Play the Market converts cards into uncertain returns. |
| **Combat spending** | Subsidize converts Capital into an escalating battle bonus. |
| **Leaders** | Banker - collateral, purchase timing, flexible financing. Executive - offensive acquisition, occupation, immediate control. |
| **Faction pool** | 12 unique cards; curve 1 / 3 / 4 / 3 / 1 at costs 1-5. |
| **Statement card** | Corner the Market, cost 5, Unique - maximum one copy per deck. |

### Components and setup

A Financier deck uses:

1. one selected Leader Card: **Banker** or **Executive**;
2. one **Financier Reference** containing the Capital limit, Deed-cost formula, Play the Market table, Subsidize table, and Controlling Interest reminder;
3. one **Financier Ledger** or equivalent number record for current Capital and Deed ownership;
4. any Financier playable cards included through normal deck construction.

Capital and Deed ownership are tracked values, not currency tokens. Treasury cards remain face up near the Financier play area. The physical reference implementation may use a writable ledger, sliding number reference, or digital tracker, but it must show current Capital and Deed ownership publicly.

### Setup

- Choose Banker or Executive during deck construction.
- Place the selected Leader Card and Financier Reference near your play area.
- Set Capital to 0 unless a later setup rule says otherwise.
- Mark every Territory Deed as unowned.
- Begin with an empty Treasury.

---

## 2. Capital, Treasury, and Deeds

### Capital

Capital is a public tracked value. Gain, spend, and lose Capital only when a rule says so. Capital cannot fall below 0.

### Capital limit

> **Capital limit = Territories you control + total deckbuilding value of cards in your Treasury**

Heartlands do not count. Capital may temporarily exceed the limit during a turn. At the end of each turn, if your Capital exceeds your current limit, reduce it to the limit.

This timing creates temporary liquidity windows. A card may generate Capital and then lower the limit during the same effect; the excess remains spendable until the end of that turn.

### Treasury

During the Action phase after movement, instead of playing an Action card, place one card from hand face up in your Treasury.

- Treasury cards are outside every normal zone.
- They cannot be played or affected unless a rule specifically refers to Treasury.
- Each Treasury card increases your Capital limit by its printed deckbuilding value.
- Treasury is not the Asset Bank and does not use Asset-bank capacity.
- A card leaving Treasury immediately stops contributing to the Capital limit.

Treasury does not generate Capital by itself. It determines how much Capital you can retain and provides collateral or investments for Financier effects.

### Deeds

Each Territory has one Deed. A Deed is either unowned or owned by a Financier. Heartlands do not have Deeds.

During the Action phase after movement, instead of playing an Action card, buy one Deed by spending Capital. A Deed owned by an opposing Financier may be bought out and transferred.

### Deed cost

> **Deed cost = min(Deeds you own + 1, 6) + position modifier + buyout premium**

Minimum cost: 1 Capital.

| Territory state from buyer perspective | Modifier |
|---|---:|
| You control it | -1 |
| You occupy but do not control it | 0 |
| You neither control nor occupy it | +1 |

Buyout premium is 0 for an unowned Deed. For a Deed owned by an opposing Financier:

> **Buyout premium = min(Deeds the opposing owner owns, 6)**

The base cost rises from 1 through 6 and then remains 6. The opposing-owner premium also stops increasing after 6.

### Income

At the start of your turn, after captures, gain 1 Capital for each Deed you own.

Income can temporarily raise Capital above the current limit. Excess is reduced only at end of turn, so it may be used for purchases, Subsidize, repayment, or card effects during that turn.

### Controlling Interest

When you own the Deeds to every Territory currently in the Gauntlet, immediately win by **Controlling Interest**.

This victory is public and dynamic. A Territory added by Manifest Destiny has a normal Deed and expands the set required for Controlling Interest.

### Play the Market

During the Action phase after movement, instead of playing an Action card, discard one card from hand and roll one die:

| Roll | Result |
|---:|---|
| 1 | Send the card to the Graveyard; gain 0 Capital. |
| 2-3 | Gain 1 Capital. |
| 4-5 | Gain Capital equal to the card's value. |
| 6 | Gain Capital equal to twice the card's value. |

Play the Market is the faction's baseline source of volatile cash. It costs the Action opportunity and the discarded card, and a roll of 1 permanently removes the investment.

### Subsidize

Before dice are rolled in a battle involving you, spend Capital for a battle bonus:

| Bonus | Total cost |
|---:|---:|
| +1 | 1 |
| +2 | 3 |
| +3 | 6 |
| +4 | 10 |

The progression continues without a fixed maximum; each additional +1 costs one more Capital than the previous increment. Capital spent through Subsidize is lost regardless of the battle result.

### Extra actions

When an effect tells you to **take an extra action**, gain one additional Action opportunity that turn. It may be used for anything you could normally do instead of playing an Action card, including:

- playing an Action card;
- placing a card in Treasury;
- buying or buying out a Deed;
- Playing the Market;
- using Hostile Takeover when eligible;
- voluntarily removing a banked Asset.

An extra action does not grant movement unless the effect specifically says so.

---

## 3. Financier leaders

### Banker

![Banker sketch](../../../../images/sketches/banker.png)

**Style:** collateral, planned purchases, flexible financing, Treasury conversion.

The Banker arranges financing before the table realizes a deal is possible. The leader uses high-value cards in hand or Treasury as collateral, closing purchases with less available Capital while accepting real card loss and reduced future capacity.

Choose the Banker when you want to build a broad financial position, time purchases carefully, and convert cards into ownership without depending on a battlefield victory first.

#### Line of Credit

> **The first time on your turn that you would buy or buy out a Deed, you may use one card from hand or Treasury as collateral. Collateral contributes Capital equal to its deckbuilding value, cannot fund more than half the purchase cost, and is discarded after the purchase. Unused value is lost. Line of Credit applies only to Deed purchases and buyouts, not Subsidize.**

Banker priorities:

- place cards in Treasury whose value justifies the lost hand flexibility;
- use Line of Credit to advance purchase timing, not merely to replace Capital you could easily retain;
- decide whether hand collateral or Treasury collateral is the more expensive sacrifice;
- preserve enough capacity after liquidation or collateral to hold future income;
- use Corner the Market and Leveraged Buyout for major transactions without making them required pieces.

### Executive

![Executive sketch](../../../../images/sketches/executive.png)

**Style:** offensive acquisition, occupation timing, immediate control, hostile expansion.

The Executive treats a battlefield victory as a transaction window. By purchasing the contested Deed before the normal counterattack cycle resolves, the leader converts aggression into both legal ownership and immediate territorial control.

Choose the Executive when you want to prepare Capital for attacks, turn an occupied Territory into an immediate acquisition, and use Deed ownership as part of a conventional breakthrough plan.

#### Hostile Takeover

> **During the Action phase after movement, instead of playing an Action card, if you won a battle this turn that caused you to occupy an enemy Territory, you may buy that Territory's Deed. Treat it as occupied but not controlled for cost. Normal buyout premiums apply. If the purchase succeeds, immediately control that Territory.**

Executive priorities:

- enter the battle with enough Capital or collateral to complete the purchase afterward;
- remember that Hostile Takeover still uses the after-movement Action opportunity;
- distinguish winning the battle from closing the acquisition; failure to afford the Deed leaves normal occupation and counterattack rules in place;
- use Foreclosure and Property Dues to make earlier ownership matter on the board;
- avoid spending so much on Subsidize that the takeover cannot be completed.

---

## 4. Playing Financiers

The central Financier decision is **liquidity versus control**.

Every card in Treasury, every Capital expenditure, and every Deed purchase changes what can be done now and what can be sustained later. The faction is strongest when it builds visible capacity but retains enough tactical flexibility to contest the board.

### Strengths

- converts cards and controlled Territory into a scalable Capital limit;
- creates an alternate victory that remains tied to every Territory in the Gauntlet;
- can turn economic preparation into battle bonuses through Subsidize;
- gains long-term income from Deeds even when it does not control those Territories;
- uses ownership, collateral, liquidation, and repayment to create unusual purchase timing;
- offers both a planned financing leader and an aggressive acquisition leader.

### Limits

Financiers remain:

- Action-hungry: Treasury deposits, Deed purchases, Play the Market, and many card effects compete for the same opportunities;
- board-dependent: controlled Territory raises both Capital and Asset capacity, while Controlling Interest requires every Territory Deed;
- vulnerable during investment: cards in Treasury cannot be played normally, and collateral or liquidation can permanently reduce future options;
- mediocre in direct combat without spending Capital or selecting appropriate Neutral cards;
- exposed to pressure before income and capacity mature;
- capable of overextending economically by buying ownership without enough positional control.

### Strategic threads

| Thread | Cards |
|---|---|
| Treasury and liquidity | Capital Gains; Liquidation; Margin Loan; Leveraged Buyout |
| Property acquisition and control | Divestment; Leveraged Buyout; Foreclosure; Property Dues; Corner the Market |
| Risk, insurance, and leverage | Speculation; Underwriting; Margin Loan; Capital Gains |
| Economic pressure | Tariffs; Monetary Crisis; Property Dues |
| Portfolio timing | Liquidation; Divestment; Leveraged Buyout; Corner the Market |

The pool is a strategic vocabulary, not a set of required packages. A Banker deck can use aggressive cards, an Executive deck can build Treasury, and either leader can pursue normal breakthrough rather than Controlling Interest.

### Building a Financier deck

- Include enough low-cost Neutral movement, battle, and card-flow tools that economic setup does not consume every turn.
- Decide how much value can safely leave the hand for Treasury without making battles too predictable or weak.
- Treat high-cost Financier cards as distinct ambitions: mass acquisition, ownership-to-control conversion, or recurring property pressure.
- Do not assume every Deed card belongs in the same deck. Ownership, liquidity, risk, and pressure can support different strategies.
- Retain a normal breakthrough plan. Opponents can contest Deeds, add Territories with Manifest Destiny, or force Capital into defense.

### Playing against Financiers

- pressure them before Treasury and Deed income mature;
- watch current Capital, Capital limit, owned Deeds, and visible collateral before choosing whether to fight or advance;
- force Capital spending through repeated battles so purchases are delayed;
- occupy a Territory to block Foreclosure and deny the controlled-position discount;
- remove or suppress banked Assets before Tariffs, Underwriting, or Property Dues generate repeated value;
- remember that Treasury cards are unavailable for ordinary play and that collateral permanently reduces resources;
- in a Financier mirror, buy out key Deeds before the opponent can assemble Controlling Interest.

---

## 5. Financier-specific rules reference

### Ownership, occupation, and control

Deed ownership is independent of Territory control and occupation. A Financier may own the Deed to a Territory controlled or occupied by either player. Buying a Deed does not change control unless Hostile Takeover, Foreclosure, or another effect says so.

### Buying and buying out

A normal Deed purchase uses one Action opportunity and resolves one Deed. Pay the full cost, then mark the Deed owned by the buyer. A buyout transfers an opposing Financier's Deed and includes the opposing-owner premium. Effects that permit several purchases resolve each purchase fully before the next cost is calculated.

### Collateral

Collateral is not a separate zone. Place the collateral card beneath the card or effect using it so its source and value remain visible.

- Line of Credit collateral goes to discard after the purchase.
- Margin Loan collateral returns only after repayment or a Battle-mode victory; default sends both cards to the Graveyard.
- Leveraged Buyout collateral goes to the Graveyard after the purchase or instead of its normal battle destination.
- Collateral contributes payment value but does not itself become Capital unless an effect specifically says so.
- Unused collateral value is lost.

### Capital above the limit

Gaining Capital above the limit is legal during any turn. Do not reduce it immediately. Check at the end of the turn currently being played, even if the Financier gained the Capital during the opponent's turn.

### Added Territories and Manifest Destiny

A Territory added to the Gauntlet is a normal Territory unless its effect says otherwise. Manifest Destiny therefore:

- has a Deed;
- counts toward Capital and Asset-bank limits when controlled;
- generates income when its Deed is owned;
- expands the set of Deeds required for Controlling Interest;
- uses the capped Deed and buyout formulas.

### Self-tracking cards

- **Speculation** remains face up beside the chosen Territory and is neither an Asset nor an Overlay.
- **Capital Gains** is placed beneath the chosen Treasury card to identify the investment.
- **Margin Loan** holds its collateral beneath it while the loan remains unresolved.

These placements track their own effects and do not create general-purpose zones.

### Tariffs and leaving play

You cannot bank Tariffs while another copy you control is banked. During the turn Tariffs is banked, you cannot cause it to leave play. Opposing effects may still remove, suppress, or otherwise affect it normally.

---

## 6. Canonical Financier card pool

The following entries are the canonical v0.6 Financier names, costs, complexity, uniqueness, card forms, and exact player-facing text.

### Speculation

**Cost:** 1  
**Complexity:** Advanced

> **Action:** Choose one revealed Territory you neither control nor occupy. Place Speculation face up beside that Territory. At the start of your next turn, if you occupy or control that Territory, gain 2 Capital and discard Speculation. Otherwise, place Speculation in your Graveyard.
>
> **Battle:** If you initiated this battle, you may spend 1 Capital. If you spend Capital this way and win, gain 2 Capital during battle cleanup. If you spend Capital this way and do not win, place Speculation in your Graveyard instead of its normal destination.

*Play note: Speculation is not an Asset or Overlay and does not alter the chosen Territory. It remains face up only to track its own effect.*

### Monetary Crisis

**Cost:** 2  
**Complexity:** Basic

> **Action:** Each player discards their hand, then draws two cards.
>
> **Battle:** During battle cleanup, each player with more than one card in hand chooses one of those cards and discards the rest.

*Play note: Treasury preparation lets the Financier shelter selected value before using a formally symmetrical effect.*

### Liquidation

**Cost:** 2  
**Complexity:** Advanced

> **Action:** Choose one card in your Treasury and place it in your discard pile. Gain Capital equal to its value, then you may immediately buy or buy out one Deed.
>
> **Battle:** Before dice are rolled, you may choose one card in your Treasury and place it in your discard pile. If you do, gain Capital equal to its value, then you may immediately Subsidize.

*Play note: Liquidation converts long-term Capital capacity into immediate spending power.*

### Underwriting

**Cost:** 2  
**Complexity:** Advanced  
**Card form:** Asset

> **Action:** Bank Underwriting as an Asset. After you lose a battle in which you used Subsidize, you may discard Underwriting. If you do, gain Capital equal to the bonus you purchased.
>
> **Battle:** After this battle, if you lose and used Subsidize, gain Capital equal to the bonus you purchased.

*Play note: Underwriting changes how much Capital you are willing to risk without fully refunding larger Subsidize purchases.*

### Capital Gains

**Cost:** 3  
**Complexity:** Advanced

> **Action:** Place Capital Gains beneath one card in your Treasury. At the start of your next turn, after captures and income, return that Treasury card to your hand and gain Capital equal to its value, then discard Capital Gains. If you lose a battle before then, place both cards in your discard pile instead. If the chosen card leaves your Treasury before this effect resolves, discard Capital Gains.
>
> **Battle:** During battle cleanup, if you won, choose one other card you played during this battle that would enter your discard pile or Graveyard. Place that card face up in your Treasury instead.

*Play note: The Action form matures an investment; the Battle form turns a successful commitment into Treasury capacity.*

### Tariffs

**Cost:** 3  
**Complexity:** Advanced  
**Card form:** Asset

> **Action:** Bank Tariffs as an Asset. Draw two cards, then take an extra action this turn.
>
> **Asset:** While Tariffs is banked, skip your normal draw. You cannot bank Tariffs while you control another banked Tariffs. You cannot cause Tariffs to leave play during the turn it is banked.
>
> **Battle:** Your opponent may discard one card from their hand. If they do not, add +1 to your battle total.

*Play note: Tariffs advances cards and tempo now, then remains as visible debt until removed on a later turn or by an opposing effect.*

### Divestment

**Cost:** 3  
**Complexity:** Advanced

> **Action:** Make one Deed you own unowned. Gain Capital equal to the number of Deeds you owned before doing so, then take an extra action.
>
> **Battle:** Before dice are rolled, you may make one Deed you own unowned. If you do, gain Capital equal to the number of Deeds you owned before doing so, then you may immediately Subsidize.

*Play note: Divestment abandons income and Controlling Interest progress to fund a different purchase or battle.*

### Margin Loan

**Cost:** 3  
**Complexity:** Advanced  
**Card form:** Asset with collateral

> **Action:** Choose one other card in your hand or Treasury and place it beneath Margin Loan as collateral. Bank Margin Loan as an Asset. Gain Capital equal to the collateral card's value plus 2, then take an extra action.
>
> **Loan:** At the start of your next turn, after captures and income, choose one: **Repay the loan:** Pay Capital equal to the collateral card's value plus 3. Return the collateral card to your hand, then discard Margin Loan. **Default:** Place Margin Loan and its collateral in your Graveyard.
>
> **Battle:** Before dice are rolled, you may place one other card from your hand or Treasury beneath Margin Loan as collateral. If you do, gain Capital equal to its value, then you may immediately Subsidize. During battle cleanup, if you won, return the collateral card to your hand. Otherwise, place Margin Loan and its collateral in your Graveyard.
>
> **Reminder:** If Margin Loan leaves play before the loan is resolved, you default.

*Play note: Margin Loan offers immediate liquidity but risks permanent card loss and repayment with interest.*

### Leveraged Buyout

**Cost:** 4  
**Complexity:** Advanced

> **Action:** Buy or buy out one Deed. For this purchase, you may use any number of cards from your hand or Treasury as collateral. Each collateral card contributes Capital equal to its value and is placed in your Graveyard after the purchase. Collateral may pay the entire cost.
>
> **Battle:** During battle cleanup, if you won as the attacker on a Territory whose Deed you do not own, you may immediately buy or buy out that Deed, treating the Territory as occupied. For this purchase, you may use any number of other cards you played in this battle as collateral. Each contributes Capital equal to its value and is placed in your Graveyard instead of its normal destination. Collateral may pay the entire cost.

*Play note: Leveraged Buyout converts cards committed to the plan into immediate ownership at the cost of permanent loss.*

### Foreclosure

**Cost:** 4  
**Complexity:** Advanced

> **Action:** Choose one unoccupied Territory whose Deed you own that is adjacent to a Territory you control. Take control of that Territory.
>
> **Battle:** If you initiated this battle on a Territory whose Deed you owned when the battle began and you win, capture that Territory immediately instead of occupying it.

*Play note: Foreclosure converts visible ownership into board control while preserving adjacency and occupation counterplay.*

### Property Dues

**Cost:** 4  
**Complexity:** Advanced  
**Card form:** Asset

> **Action:** Bank Property Dues as an Asset. The first time each turn your opponent advances onto a Territory whose Deed you own, they choose one: discard one card from their hand; or you gain 2 Capital.
>
> **Battle:** If this battle takes place on a Territory whose Deed you own, your opponent chooses one: discard one card from their hand; or you gain 3 Capital during battle cleanup.

*Play note: Property Dues makes ownership economically relevant to the opponent without preventing movement or battle.*

### Corner the Market

**Cost:** 5  
**Complexity:** Advanced  
**Unique:** Maximum one copy per deck

> **Action:** Buy or buy out any number of Deeds. Fully resolve each purchase before calculating the cost of the next.
>
> **Battle:** During battle cleanup, if you won, you may buy or buy out any number of Deeds. Fully resolve each purchase before calculating the cost of the next.

*Play note: Corner the Market removes the normal one-purchase bottleneck without generating Capital or discounting Deeds.*

---

## 7. Card-pool summary

### Pool profile

| Cost | Cards |
|---:|---|
| 1 | Speculation |
| 2 | Monetary Crisis; Liquidation; Underwriting |
| 3 | Capital Gains; Tariffs; Divestment; Margin Loan |
| 4 | Leveraged Buyout; Foreclosure; Property Dues |
| 5 | Corner the Market |
| **Total** | **12 unique cards; total unique-card value 36; average cost 3.00** |

### Selecting cards

- A Treasury-focused Banker may value Capital Gains, Liquidation, Margin Loan, and Leveraged Buyout, while still needing movement and battle support.
- An aggressive Executive may value Speculation, Underwriting, Foreclosure, Property Dues, and the Battle mode of Leveraged Buyout.
- Monetary Crisis and Tariffs form an economic-pressure direction without requiring Deed concentration.
- Divestment and Corner the Market reward portfolio timing but should not be assumed to belong in every Controlling Interest deck.
- Choose cards for the decisions you want to create, not merely because they mention Capital, Treasury, or Deeds.

### Unique and copies

Corner the Market is Unique: maximum one copy per deck. The other Financier cards use the normal v0.6 copy rules. Tariffs additionally prohibits controlling two banked copies at once, but multiple copies may still be included in a legal deck.

### Complexity

Monetary Crisis is Basic. The remaining pool is Advanced because it uses delayed resolution, collateral, self-tracking, purchase timing, alternate destinations, or dynamic costs. Complexity is player aid, not an additional game rule.

### Initial testing priorities

- Action compression from Tariffs, Divestment, and Margin Loan;
- repeated Monetary Crisis hand pressure;
- multiple Property Dues triggers;
- Divestment sell-and-rebuy lines;
- Leveraged Buyout with additional Battle-card plays;
- Capital Gains preserving high-value cards;
- Foreclosure counterplay;
- Underwriting's standalone floor;
- physical tracking burden;
- whether Corner the Market produces a visible, dramatic finish.

---

## Appendix A. Financier quick reference

### Core formulas

> **Capital limit = Territories you control + total Treasury value**

> **Deed cost = min(Deeds you own + 1, 6) + position modifier + buyout premium**

> **Buyout premium = min(Deeds the opposing owner owns, 6)**

| Position | Modifier |
|---|---:|
| Control | -1 |
| Occupy without control | 0 |
| Neither | +1 |

### Turn reminders

1. Resolve captures.
2. Gain 1 Capital per Deed owned.
3. Draw normally unless an effect such as Tariffs changes the draw.
4. Move and use Action opportunities normally.
5. At end of turn, reduce Capital to the current limit if necessary.

### Card list by cost

- **Cost 1:** Speculation
- **Cost 2:** Monetary Crisis; Liquidation; Underwriting
- **Cost 3:** Capital Gains; Tariffs; Divestment; Margin Loan
- **Cost 4:** Leveraged Buyout; Foreclosure; Property Dues
- **Cost 5:** Corner the Market
