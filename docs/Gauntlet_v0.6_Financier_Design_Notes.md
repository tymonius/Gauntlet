# Gauntlet v0.6 Financier Design Notes

**Status:** Active design rationale and package-audit record for the selected twelve-card Financier pool.  
**Exact text source:** `Gauntlet_v0.6_Financier_Card_Pool.md`

---

## 1. Faction identity

Financiers convert cards, position, and ownership into delayed economic power. Their core tensions are:

- investment versus immediate readiness;
- liquidity versus Capital capacity;
- ownership versus territorial control;
- leverage versus solvency;
- income growth versus tactical spending;
- pursuing Controlling Interest without abandoning the normal Gauntlet.

Financiers should remain Action-hungry, board-dependent, and vulnerable while investments mature. Their cards may create conditional or costly ways to compress Actions, but the package should not make Treasury deposits, Deed purchases, and tactical play simultaneously routine.

---

## 2. Leaders as lenses

### Banker

The Banker values:

- Treasury construction and protection;
- efficient collateral;
- planned purchases;
- delayed liquidity;
- converting stored value into portfolio growth.

The Banker should not be reduced to a passive engine. Deed prices and Controlling Interest still pull the Banker into territorial decisions.

### Executive

The Executive values:

- winning offensive battles;
- occupation timing;
- buying contested Deeds;
- turning ownership into control or immediate capture;
- converting battle commitments into economic position.

The Executive should not become a Military substitute. Economic preparation and ownership remain necessary for the strongest conversions.

---

## 3. Strategic threads

The selected pool supports several overlapping approaches:

1. **Treasury and liquidity** — Capital Gains, Liquidation, Margin Loan, Leveraged Buyout.
2. **Property acquisition and control** — Divestment, Leveraged Buyout, Foreclosure, Property Dues, Corner the Market.
3. **Risk, insurance, and leverage** — Speculation, Underwriting, Margin Loan, Capital Gains.
4. **Economic pressure** — Tariffs, Monetary Crisis, Property Dues.
5. **Portfolio timing** — Liquidation, Divestment, Leveraged Buyout, Corner the Market.

No thread contains enough mandatory pieces to dictate a full deck. Most cards connect at least two threads.

---

## 4. Package audit result

The package matches the default faction curve exactly:

| Cost | Count |
|---:|---:|
| 1 | 1 |
| 2 | 3 |
| 3 | 4 |
| 4 | 3 |
| 5 | 1 |

- **Card count:** 12
- **Total unique-card value:** 36
- **Average cost:** 3.00

The package passed the initial design-guide audit after the following revisions:

- **Tariffs:** prohibited simultaneous banked copies and player-controlled same-turn debt evasion.
- **Foreclosure:** restricted remote control to an unoccupied Territory adjacent to controlled Territory.
- **Margin Loan:** leaving play before resolution now causes default.
- **Speculation:** clarified that the Battle penalty applies only when the Capital wager was made.
- **Capital Gains:** clarified what happens if the selected Treasury card leaves before maturity.
- **Leveraged Buyout:** Battle collateral now enters the Graveyard instead of receiving its normal destination.
- **Extra actions:** defined as full additional Action opportunities rather than only additional Action-card plays.
- **Deed costs:** capped both base scaling and opposing-owner buyout premium at 6 after Manifest Destiny adds further Territories.

---

## 5. Important interaction decisions

### Manifest Destiny and Deeds

A Territory added by Manifest Destiny is a normal Territory with a Deed. It affects:

- Capital and Asset-bank limits when controlled;
- income when its Deed is owned;
- the set of Deeds required for Controlling Interest;
- normal movement, control, capture, and board geometry.

Deed costs stop scaling after the sixth Deed so additional Territories remain expensive without producing unbounded purchase costs.

### Collateral

Collateral is not a separate zone. A collateral card is placed beneath the card or effect using it and follows that effect's instructions.

Leveraged Buyout collateral is permanently sacrificed to the Graveyard. Margin Loan collateral may be recovered only by successful repayment or, for the Battle mode, by winning the battle.

### Self-tracking cards

The pool intentionally uses explicit physical tracking in three places:

- Speculation beside a Territory;
- Capital Gains beneath a Treasury card;
- collateral beneath Margin Loan.

These are exceptions justified by visible risk and should not become a general Financier card pattern without further testing.

---

## 6. Initial package-testing priorities

### Action compression

Test whether Tariffs, Divestment, and Margin Loan together allow the Financier to develop Treasury, acquire Deeds, and play tactical cards without retaining the intended Action pressure.

### Hand pressure

Test repeated Monetary Crisis copies against several archetypes. The Treasury asymmetry is intended; preventing the opponent from ever assembling a hand is not.

### Property Dues stacking

Test multiple banked copies. A future safeguard may limit the number of Property Dues triggers from one advance if stacked copies create excessive punishment.

### Divestment loops

Test selling and immediately repurchasing the same controlled Deed. The current line generally produces only a small Capital gain, but interactions with purchase effects may improve it.

### Leveraged Buyout collateral volume

Test with Neutral effects that allow additional Battle-card plays. The interaction should reward a deliberately constructed battle without making such cards mandatory partners.

### Foreclosure counterplay

Confirm that adjacency, occupation, Deed buyouts in mirrors, and visible ownership provide enough warning and response.

### Underwriting floor

Confirm that Underwriting remains worthwhile in decks that do not Subsidize every battle and does not become a dead draw too often.

### Corner the Market finish

Confirm that the cost-5 statement card creates visible preparation and a dramatic conversion turn rather than an abrupt, unanswerable win.

---

## 7. Approval checkpoint

The twelve-card Financier package is approved for initial package-level playtesting, subject to the watchlist above. Individual costs and exact numbers remain provisional until testing establishes:

- average purchase timing;
- Capital generation and spending rates;
- frequency of Controlling Interest wins;
- leader-specific inclusion patterns;
- repeat-copy pressure;
- interaction with the completed Neutral pool;
- physical tracking burden in real tabletop play.
