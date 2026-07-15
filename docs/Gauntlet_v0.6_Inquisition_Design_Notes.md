# Gauntlet v0.6 Inquisition Design Notes

**Status:** Active rationale and playtest guide for the completed twelve-card Inquisition package.  
**Purpose:** Record the faction's strategic vocabulary, leader integration, intended weaknesses, package rationale, and testing priorities without duplicating the authoritative exact card text.

Use `Gauntlet_v0.6_Inquisition_Card_Pool.md` for exact card text and `Gauntlet_v0.6_Working_Rules.md` for the general faction framework.

---

## Core identity

> The Inquisition turns the opponent's chosen commitments into evidence, then decides whether to suppress those threats temporarily or remove them permanently.

The central faction decision is:

> Spend Conviction to control the present danger, or preserve it for a harsher judgment later.

The faction should feel oppressive, selective, and morally self-contradictory. It publicly condemns forbidden methods while retaining the ability to appropriate them through Heresy.

---

## Strategic threads

### Evidence and commitment

Confession, Accusation, Penance, Tyranny, and Burning at the Stake pressure what the opponent reveals, commits, discards, or keeps in hand. The Inquisition should not possess Intelligence's broad surveillance toolkit; its information effects are coercive and punitive rather than observational.

### Suppression or destruction

Tyranny suppresses an immediate threat. Purge, Excommunication, Guilt by Association, Act of Faith, and Burning at the Stake permanently remove resources. The player repeatedly decides whether present control or long-term Purification matters more.

### Conviction allocation

Penance can create Conviction, Divine Mercy converts prior condemnation back into Conviction, and Tyranny, Heresy, Hellfire, Purge, Final Judgment, and Relentless Pursuit compete to spend it. Conviction should remain scarce enough that these options cannot all be used freely.

### Judgment after defeat

No Martyrs and Burning at the Stake turn an opponent's loss into additional punishment. The package may safely coexist with future profitable-loss mechanics because the Inquisition has a narrow thematic answer rather than a universal prohibition.

### Purification pressure

Accusation, Excommunication, Guilt by Association, Act of Faith, and Hellfire accelerate literal deck exhaustion. Purification remains an actual exhaustion victory, not a separate point threshold.

### Heresy and forbidden methods

Blasphemy rewards the Inquisition when the opponent uses Arcane-trait cards. Heresy allows the Inquisition itself to commit the ultimate contradiction by using a condemned opposing Battle effect. The card is intentionally volatile, public, matchup-dependent, and expensive.

---

## Deck-size counterplay

A large low-cost deck is a legitimate attempt to resist Purification. The Inquisition's intended response is not to invalidate that construction automatically.

- The revised 1-Conviction Purge may remove one 2-cost card or two 1-cost cards, while retaining the option to remove the top discard card regardless of value.
- Excommunication scales between one premium target and several cheap targets.
- Hellfire attacks raw card quantity directly.
- If the opponent sacrifices too much card quality to resist exhaustion, the Inquisition should pursue normal breakthrough victory instead.

Testing should confirm that oversized decks are resistant rather than immune, and that the Inquisition can exploit their reduced tactical ceiling conventionally.

---

## Leader lenses

### Grand Inquisitor

Final Judgment rewards battle victory with an immediate discounted Purge. The Grand Inquisitor values cards that create a destructive post-victory sequence while still requiring resource planning.

Key interpretations:

- Preserve at least 1 Conviction before a likely victory to use the discounted Purge.
- Use Tyranny or Hellfire only as heavily as needed to secure the battle.
- Use Excommunication, Act of Faith, and Burning at the Stake to compound permanent losses.
- Decide whether Divine Mercy's immediate Conviction is worth undoing Purification progress.

### Witch Hunter

Relentless Pursuit converts a successful defense into an immediate counterattack for 2 Conviction. The Witch Hunter values cards that strengthen defense, suppress recovery, deepen retreat, and preserve exactly enough Conviction to pursue.

Key interpretations:

- Use Divine Mercy or Penance to reach the 2-Conviction threshold.
- Avoid overspending on Tyranny or Hellfire when pursuit is strategically stronger.
- Use No Martyrs to prevent the defeated attacker from profiting from loss or retreat.
- Treat Purification pressure as a constraint on the opponent while advancing conventionally.

The same cards remain viable for both leaders, but resource reservation and timing change substantially.

---

## Intended weaknesses

The Inquisition should retain:

- limited unconditional raw battle power;
- conditional and opponent-influenced Conviction generation;
- limited mobility and no routine capture acceleration;
- a slow alternate victory vulnerable to oversized decks and Graveyard recovery;
- dependence on exposed cards, populated discard piles, and opponent commitments;
- vulnerability to disciplined opponents who commit minimally or deny useful targets;
- no blanket ability to prevent recovery or control every opposing zone.

The faction package must not turn the Inquisition into a better Military faction, a better Intelligence faction, or an unavoidable hard-control deck.

---

## Package rationale

The selected curve is 1 / 3 / 4 / 2 / 2, with total value 37 and average cost 3.08.

Two cost-5 cards are justified because they inspire different constructions:

- **Heresy** is a high-variance appropriation card whose ceiling depends on the opponent's condemned Battle effects.
- **Hellfire** is a flexible Conviction sink that divides power between the current battle and direct exhaustion pressure.

Neither card is required for the faction to function, and neither is Unique by default.

The package deliberately contains only one cost-1 card. Accusation expresses faction identity economically without becoming mandatory Conviction generation or consistency infrastructure.

---

## Balance watchlist

### Divine Mercy

Watch for automatic inclusion in both leaders. The card simultaneously provides a cost-2 +2 Battle effect and converts one condemned card into 2 Conviction. The drawback may matter much less to conventional Witch Hunter strategies than to Purification-focused decks.

First fallback adjustment if needed: the opponent chooses which card returns from their Graveyard rather than reducing the reward.

### Tyranny

Watch whether targeted negation is too universally useful despite the cost-4 price, Asset slot, Action commitment, and repeated Conviction expenditure.

### Burning at the Stake

Watch whether removing the highest-value hand card is too punishing against compact premium decks, especially when repeated through multiple copies or combined with hand-reveal effects.

### Confession

Verify special-reveal timing physically and digitally. Confirm that replacing the Inquisition player's hand commitment does not create an additional commitment or Battle-card play.

### No Martyrs

Verify the boundary between beneficial loss/retreat triggers, ordinary retreat, harmful consequences, already-established effects, and effects controlled by another player.

### Heresy

Test copied-effect eligibility, source-dependent wording, cancellation effects, and its one-level exception to the anti-recursion rule. The legal maximum chain is Heresy into one copied-effect card into one final Battle effect.

---

## Playtest matrix

Run both leaders against:

1. a 30-card premium deck near the 60-value limit;
2. a larger mixed-cost deck;
3. a 60-card cost-1 stress-test deck;
4. a duplicate-heavy deck;
5. a singleton-heavy deck;
6. Arcane-trait-heavy construction;
7. profitable-loss and retreat-trigger strategies;
8. Asset-heavy and hand-control-resistant decks.

Track:

- normal breakthrough wins versus Purification wins;
- turn and battle count;
- opposing cards sent to the Graveyard by source;
- Conviction gained, spent, and wasted at maximum;
- frequency of each Purge option;
- resource reserved for Final Judgment or Relentless Pursuit;
- Divine Mercy, Tyranny, and Burning at the Stake inclusion and use rates;
- failed or low-value Heresy targets;
- Hellfire allocation between battle bonus and deck destruction;
- whether either leader produces a clearly solved card package.