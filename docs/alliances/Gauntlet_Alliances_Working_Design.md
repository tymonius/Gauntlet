# Gauntlet: Alliances — Working Design Record

**Status:** exploratory future-mode design  
**Mode:** four players, fixed teams of two  
**Authority:** non-canonical working notes  
**Tracking:** [issue #1696](https://github.com/tymonius/Gauntlet/issues/1696)

This document preserves the current discussion around **Gauntlet: Alliances** so the design can be resumed later without reconstructing the reasoning from chat history.

The purpose is not to publish rules yet. The purpose is to preserve the strongest ideas, the problems they are intended to solve, and the questions that still need testing.

---

## 1. Design objective

The first 2v2 concept was too conservative: two ordinary six-Territory Gauntlets placed side by side, with individual turns and occasional lateral movement. That risked producing little more than two simultaneous 1v1 games.

The current direction is more ambitious:

> **Alliances should feel like one war fought across a two-Territory-wide front.**

Its distinct identity should come from:

- shared team maneuver;
- frontage versus concentration;
- allied co-occupation;
- reinforcement;
- 1v1, 2v1, and 2v2 battles;
- potentially concurrent engagements;
- passing and flanking;
- decisive team-level Rout; and
- a final breakthrough that requires the Alliance to open the whole enemy front rather than one player merely sprinting through a gap.

The desired strategic question is not simply “which lane do I push?” but:

> **Where does the Alliance concentrate its two players, and what part of the front does that choice expose?**

---

## 2. Battlefield geometry and terminology

### Working direction

Use a **2 × 6 battlefield** composed of two parallel six-Territory Gauntlet lines.

Established Gauntlet terminology should be preserved:

- **Column** — one six-Territory line running from one side of the Gauntlet to the other.
- **Rank** — the two side-by-side Territories at the same depth across the two columns.
- **Position** — one individual Territory space.
- **Front** — the active area where opposing Alliances are in contact; this may span one or more ranks and should not necessarily become a formal rules term until needed.

Diagram:

```text
               Alliance B side

             Column I   Column II
Rank 6          [ ]        [ ]
Rank 5          [ ]        [ ]
Rank 4          [ ]        [ ]
Rank 3          [ ]        [ ]
Rank 2          [ ]        [ ]
Rank 1          [ ]        [ ]

               Alliance A side
```

The term **column** must not be repurposed to mean a horizontal row; Gauntlet already uses it for the six-card line. The term **rank** was introduced specifically to avoid that ambiguity.

### Open question

Exactly how the twelve Territories are selected and arranged should be decided when the prototype is built. The simplest inheritance is probably three Territories contributed by each player, but the team-level setup procedure has not been tested.

---

## 3. Team turn structure and shared Movement

### Working direction

Rather than alternating individual turns as `A1 → B1 → A2 → B2`, give each **Alliance** a coordinated turn or at minimum a coordinated Movement phase.

During its Movement phase, an Alliance receives:

> **2 Movement, allocated freely between its two players.**

Examples:

- `1 + 1`: move each teammate once.
- `2 + 0`: move one teammate twice and leave the other stationary.
- `0 + 2`: same for the other player.
- the Alliance may spend fewer than 2 Movement.

This intentionally echoes Arena's useful “two movement points allocated among two forces” concept while applying it to two independent players rather than two forces controlled by one player.

### Why this matters

Shared Movement makes the teammate themselves a scarce operational resource. The Alliance cannot simultaneously maximize both flanks, chase an infiltrator, and mass for a local assault.

A deep player who consumes both Movement to exploit a breakthrough leaves the teammate stationary. A stack that wants to advance together generally consumes both Movement merely to move the combined position one rank.

This should make teamwork and tempo allocation central rather than incidental.

### Open question

Whether the *entire* Alliance turn should be simultaneous/coordinated, or only Movement, remains unresolved. A future prototype should test whether both players draw/play independently before a shared Movement phase or whether a more fully integrated Alliance turn is cleaner.

---

## 4. Movement geometry

### Working direction: diagonal movement

Diagonal movement is currently preferred over orthogonal-only movement because it makes the 2 × 6 board feel like a battlefield rather than two lanes connected by occasional side steps.

A player may spend 1 Movement to:

- **Advance** one rank toward the opposing side, either straight ahead or diagonally into the other column;
- **Shift** laterally into the other Position in the same rank; or
- **Withdraw** one rank toward their own side, either straight back or diagonally.

Forced Retreats and Routs should initially remain **straight backward in the same column** so defeat does not become free lateral redeployment.

### Why diagonals are valuable

Diagonal movement allows:

- a spread pair to converge while advancing;
- a stacked pair to fan out while advancing;
- rapid reinforcement;
- flanking around a concentrated enemy position;
- changing which opponent is likely to be contacted; and
- more fluid movement between the two columns.

Orthogonal-only movement was judged likely to preserve too much “two lanes with connectors” behavior.

---

## 5. Passing and frontage

### Abandoned direction: automatic rank-wide engagement

An earlier idea proposed that opposing players in different Positions of the same rank would “engage” or exert a rank-wide zone of control that prevented either from advancing past the other.

That solved literal slipping, but created two problems:

1. it made the battlefield harder to understand; and
2. it removed much of the downside of stacking both allies into one Position, because one force could effectively block the entire rank.

That direction is currently **not preferred**.

### Working direction: passing is allowed

A player physically blocks only the Position they occupy. Opponents in different columns may move past one another if the geometry permits.

This is intentional.

A spread formation:

```text
[ A1 ][ A2 ]
```

covers both approaches.

A concentrated formation:

```text
[A1+A2][    ]
```

creates major local strength but leaves the other column open.

The risk of being skirted is therefore the natural cost of concentration rather than something prevented by a global zone-of-control rule.

### Design principle

> **Covering the whole front should be the players' responsibility, not an automatic property of occupying one Position in a rank.**

---

## 6. Allied co-occupation and concentration

### Working direction

Two allied players may share the same Territory Position.

A shared Position represents deliberate concentration of force.

This should be powerful, potentially very powerful, because it enables 2v1 or 2v2 combat and makes a direct assault difficult to withstand.

The balancing cost should come primarily from geometry and team tempo rather than an arbitrary stacking penalty:

- both players are no longer covering both columns;
- moving the whole stack generally consumes both Movement;
- an enemy can exploit the open flank;
- concentrating both allies can expose rear Territory; and
- if both committed players lose together, they may both be subject to Rout.

### Open question

Two allied players is the likely hard capacity of one Position, but formal Position capacity has not been decided. Enemy co-occupation should occur only during battle resolution, not as a stable post-battle state.

---

## 7. Battles: 1v1, 2v1, and 2v2

### Working direction

Alliances should embrace multi-player battles rather than treating every battle as a strictly private 1v1.

Possible battle structures:

- 1 attacker vs 1 defender;
- 2 allies vs 1 opponent;
- 1 player vs 2 defending allies; and
- 2 allies vs 2 allies.

This is one of the strongest ways to make Alliances genuinely distinct from standard Gauntlet.

### Reinforcement concept

An allied player adjacent to an engagement should be able to **reinforce** or **join** the battle in some form.

However, the exact mechanism is unresolved.

Important variants to test:

1. **Support from adjacent Position** — the ally contributes something without moving their token.
2. **Physical reinforcement** — the ally must enter/share the contested Position to become a full participant.
3. **Movement-cost reinforcement** — joining consumes one of the Alliance's 2 Movement.
4. **Commitment-only reinforcement** — adjacency grants eligibility, but the ally spends cards/resources rather than Movement.

The current conceptual preference is stronger than a generic “adjacent ally gives +1.” The ally should feel like an actual participant, not a passive modifier.

### Early battle-model thought

One possible conservative prototype would preserve one lead player's normal Reserve/Tactic procedure while giving the reinforcing ally a smaller but meaningful contribution, such as a Gambit and/or extra die/advantage. This avoids four complete Reserve procedures making every 2v2 battle enormous.

This is **not locked**. The battle model requires explicit prototyping.

### Participation limit

A strong working constraint is:

> **A player may participate in at most one battle during an opposing or friendly Alliance turn.**

This makes the teammate a finite commitment. If A2 reinforces A1's battle, A2 cannot also reinforce or fight in another engagement that same turn.

---

## 8. Concurrent engagements

### Working direction

Alliances should explore creating multiple engagements during one Alliance Movement phase before resolving them.

Example:

```text
Column I            Column II
A1 → B1             A2 → B2
```

Possible outcomes include:

- two separate 1v1 battles;
- one ally abandoning their own engagement to reinforce the other;
- a 2v1 assault with the other flank left open;
- a 2v2 battle after both defending and attacking allies concentrate; or
- one battle while the second pair maneuver or hold.

The important point is that the teams should sometimes have to decide where to commit their second player **before knowing every result**.

### Why this matters

If battles resolve one at a time with free redeployment after each result, reinforcement decisions may become obvious and low-risk.

Concurrent commitment creates the intended question:

> **Can you hold here alone while I help there?**

### Open question

The exact declaration sequence is unresolved. A future prototype should test whether all movements are declared first, whether engagements lock players in place, and when reinforcement eligibility is checked.

---

## 9. Anti-tug-of-war mechanism: Rout

### Problem

Standard Gauntlet intentionally gives a defender an immediate chance to Counterattack an occupied Territory before capture. In a 2v2 format with reinforcement, that could produce even more repetitive back-and-forth unless a decisive team victory creates greater separation.

### Working direction

Introduce **Rout** as a team-level consequence:

> **If both members of an Alliance are defeated during the same opposing Alliance turn, each defeated player retreats one additional rank after ordinary battle Retreats resolve.**

So:

- one defeated player = ordinary local loss;
- both defeated players = the line breaks.

This may occur through:

- two simultaneous 1v1 losses;
- a 2v2 loss in which both teammates participated; or
- another combination in which both players were actually defeated during that Alliance turn.

### Why Rout is attractive

Rout uses distance rather than a new persistent Territory state.

A decisive coordinated victory can push both defenders far enough away that they cannot simply Counterattack both occupations on their next turn with only 2 shared Movement. This gives the attackers time to consolidate and lets the ordinary occupation/capture system provide the durable ratchet.

This avoids adding:

- breach markers;
- Territory damage;
- permanent locks;
- arbitrary capture immunity; or
- a round timer.

### Decision-making implication

Reinforcement becomes risky as well as helpful.

If B2 reinforces B1 and the resulting 2v2 is lost, both defenders may be defeated and therefore Routed. The team must decide whether to stake the whole front on the combined battle or preserve one player outside it.

Likewise, concentrating both attackers into one assault raises the stakes if both can be defeated together.

### Open questions

- Does a player count as “defeated” for Rout only if they were a formal battle participant?
- Can the same player be defeated twice in one Alliance turn?
- How does Rout work after a 2v1 battle if only one side had two participants?
- Does the extra Rout movement happen immediately or after all battles for the turn resolve?
- What happens if a straight-back Rout Position is occupied or off-board?

The preferred initial timing is **after all battles from that Alliance turn**, but this requires testing.

---

## 10. Preventing skirt-around races

### Problem

Once passing and diagonal movement are allowed, the game must not collapse into both teams simply slipping past one another and racing toward opposite ends.

The current solution is **not** to restore automatic zone of control. Instead, Territory control and the endgame gate should make penetration valuable but incomplete.

### Working direction: hostile Territory halts continued Advance

> **Entering an opposing-controlled Territory ends that player's forward movement. The player cannot Advance farther through hostile-controlled Territory until that Position is captured/consolidated.**

This means a player can flank an opponent, but cannot spend both Movement to sprint through multiple enemy-controlled ranks in one turn.

A penetrator must:

1. enter hostile Territory;
2. occupy it;
3. survive the response window;
4. capture it; and
5. only then continue deeper.

This allows the passed defender or their ally time to turn back, intercept, reinforce, or decide to press the opposite direction.

### Strategic consequence

Passing becomes a meaningful gamble rather than an exploit:

> **Do we chase the infiltrator, trust our teammate to contain them, or exploit the opening they left and push the opposite way?**

### Working direction: no lone-player Last Stand rush

A single player should not be able to weave through a gap and independently trigger the game-ending sequence while the rest of the front remains intact.

Current preferred gate:

> **An Alliance may initiate a Last Stand only while it controls both Territories in the enemy's final rank.**

Thus one deep infiltrator creates penetration, not victory. The team must ultimately open the whole enemy front.

### Intended progression

- **Penetration** — a player gets behind part of the opposing front.
- **Consolidation** — hostile Territory is occupied and captured.
- **Front control** — the Alliance controls both Positions across important ranks.
- **Breakthrough** — the Alliance controls both Territories in the enemy's final rank.
- **Last Stand** — the final team victory procedure becomes available.

This is intended to preserve passing and flanking without making racing the dominant strategy.

---

## 11. Formation strategy that should emerge naturally

The rules should not need formal “formation” cards or named stances. Three recognizable patterns should emerge from movement and occupancy alone.

### Line

```text
[ A1 ][ A2 ]
```

**Strength:** covers the whole front.  
**Liability:** no local numerical superiority.

### Concentration

```text
[A1+A2][    ]
```

**Strength:** powerful local 2v1/2v2 potential.  
**Liability:** open flank; expensive to move together; both players may be exposed to Rout if the combined battle fails.

### Staggered formation

```text
Rank 4   [ A1 ][    ]
Rank 3   [    ][ A2 ]
```

**Strength:** flexible reinforcement and penetration options.  
**Liability:** can be defeated piecemeal and may struggle to cover both approaches.

The tactical triangle is intended to be:

> **frontage vs concentration vs flexibility**

No one formation should be universally correct.

---

## 12. Territory control and player ownership

### Open question

Earlier discussion leaned toward **individual player control** of captured Territories rather than generic Alliance ownership because current Gauntlet ties personal Territory control into systems such as Asset Bank capacity and faction procedures.

However, this becomes more complicated once teammates jointly fight for and occupy a Position.

Questions to resolve:

- Which player controls a jointly captured Territory?
- Does the lead attacker take it?
- Can teammates choose the controller?
- Does the Territory count for both players for any team-mode purposes?
- Should only geometric/endgame checks use Alliance-wide control while economy remains individual?

A likely compromise is:

> **Territory control remains individually owned for player engines, while some Alliances rules check whether either teammate controls a Position when evaluating Alliance-wide board control.**

This is not yet locked.

---

## 13. Victory structure

### Earlier direction

An early 2v2 concept proposed requiring two separate Last Stand successes, one at each enemy end, effectively treating the two columns as two breakthrough targets.

### Current preferred direction

The newer front-based model suggests a better endgame gate:

> **Control both Territories in the enemy's final rank before any Last Stand may be initiated.**

This avoids letting one weak lane decide the game and makes the final breakthrough a genuine team achievement.

Exactly what happens after this gate is met remains unresolved:

- one shared Last Stand battle;
- two Last Stand battles;
- one attacker chosen to initiate the standard Last Stand;
- a 2v1 or 2v2 Last Stand depending on surviving defenders; or
- another bespoke climax.

The design goal is clear even though the procedure is not:

> **The Alliance must break the enemy front, not merely find one hole.**

---

## 14. Faction victories and compatibility

### Deferred from the first geometry test

Current Gauntlet faction victories and several faction systems assume one opposing player. Alliances creates two opponents and one teammate, which changes the meaning of many rules.

Before a real release, every faction, Leader, card, Territory, Deed, Mission, Rite, Proposal/Term, Purge, and other player/opponent reference will need a compatibility audit.

Major unresolved faction-victory question:

- Does one player's alternate victory win the whole Alliance the game?
- Does it count as a partial breakthrough or one team victory component?
- Do some factions require bespoke team adaptations?

The first prototype should strongly consider **temporarily disabling alternate faction victories** so the board, movement, cooperation, battle participation, Rout, and endgame geometry can be evaluated without conflating those questions.

This is a test boundary, not a recommendation to remove alternate victories from a published Alliances mode.

---

## 15. Design risks to watch

### Two games side by side

If teammates rarely reinforce, cross columns, share Positions, or affect one another's battles, the mode has failed its primary identity test.

### Unassailable stacks

If two allied players sharing one Position are too difficult to dislodge, concentration may become mandatory. Passing, diagonal flanking, open frontage, and Rout risk are intended to counter this.

### Constant skirt-around racing

If passing is too cheap, players may ignore combat. Hostile-Territory consolidation and the two-Position final-rank gate are intended to prevent this.

### Excessive tug-of-war

If every local victory is immediately reversed, Alliances will reproduce the oldest Gauntlet pacing problem at larger scale. Rout is the preferred first anti-yo-yo experiment.

### Battle bloat

Four full Reserve/Tactic procedures in every 2v2 fight could make battles slow and cognitively overloaded. The ally contribution model should create real participation without simply doubling standard battle procedure.

### Quarterbacking

Shared Movement and coordinated engagements naturally invite discussion. Tests should watch whether one stronger player begins effectively piloting both decks.

### Snowballing

Rout and coordinated concentration can accelerate territorial collapse. The game must still leave meaningful counterplay after a broken line.

### Rules burden

Alliances should feel richer because of geometry and teamwork, not because it introduces many tokens, special states, and exception rules.

---

## 16. First future prototype package

When Alliances is revisited, the first meaningful physical/TTS prototype should probably isolate the core team-battlefield questions before full faction adaptation.

Suggested prototype boundaries:

- four players, fixed teams of two;
- 2 × 6 battlefield;
- two Gauntlet columns and six ranks;
- 2 shared Movement per Alliance Movement phase;
- straight/diagonal Advance;
- lateral Shift;
- straight/diagonal voluntary Withdraw;
- straight forced Retreat;
- passing allowed;
- hostile-controlled Territory halts continued Advance until consolidated;
- allied co-occupation allowed;
- provisional 1v1 / 2v1 / 2v2 reinforcement model;
- at most one battle participation per player per Alliance turn;
- multiple engagements may be committed before resolution;
- Rout when both teammates are defeated during the same opposing Alliance turn;
- both enemy final-rank Territories required before Last Stand access;
- faction alternate victories disabled for the first geometry/pacing test unless needed to test a specific compatibility question.

### First-test questions

1. Does the board feel like one front rather than two lanes?
2. Is stacking powerful but risky enough?
3. Does passing create interesting penetration decisions rather than races?
4. Does diagonal movement improve maneuver without making interception impossible?
5. Does shared 2 Movement force meaningful team priorities?
6. Are 2v1 and 2v2 battles exciting without becoming slow?
7. Does concurrent engagement commitment create good cooperation decisions?
8. Does Rout create durable progress without making one coordinated loss catastrophic?
9. Does the final-rank gate keep the endgame team-focused?
10. How long does a game take compared with standard Gauntlet and Arena?

---

## 17. Current summary

The strongest current concept can be summarized as:

> **Gauntlet: Alliances is a 2v2 mode fought across two parallel Gauntlet columns. Each Alliance allocates two Movement between its players, who can move straight or diagonally, pass opponents, spread across the front, or stack together for local superiority. Allies can reinforce battles, producing 1v1, 2v1, and 2v2 engagements. Concentration is powerful but opens the other column. If both teammates are defeated in the same enemy operation, Rout pushes the line back far enough for territory gains to consolidate. Deep flanking is allowed, but hostile Territory slows penetration, and the Alliance must control both Positions in the enemy's final rank before a Last Stand can begin.**

This is a **working direction**, not a rules lock. The next step is deliberately deferred until Alliances becomes an active development track.
