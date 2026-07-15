# Gauntlet Playtest Targets and Metrics

**Status:** Current development benchmark and data-collection guide.  
**Scope:** Simulation and human-playtest evaluation. This is not rules text and does not override a released ruleset.

---

## 1. Purpose

Gauntlet's original demonstrated failure mode was not that the game could not end, but that progress could be repeatedly overturned until the game became long, repetitive, and strategically exhausted.

Playtesting should therefore evaluate more than win rate. It should measure:

- whether the game reaches a natural ending;
- whether territorial progress remains meaningful;
- whether the losing player retains real counterplay;
- whether battles remain consequential rather than repetitive;
- whether card economy remains functional through the endgame;
- whether faction systems create parallel pressure without becoming solitaire.

Simulation results are diagnostic evidence, not a substitute for human playtesting. Automated agents may misvalue cards, overfight, underfight, or fail to model bluffing and deliberation accurately.

---

## 2. Turn-count terminology

Simulation reports count **individual player turns**, not full rounds.

Examples:

- 50 player-turns is approximately 25 turns per player.
- 70 player-turns is approximately 35 turns per player.
- 100 player-turns is approximately 50 turns per player.

Every report should state whether a number means individual turns or full rounds.

---

## 3. Preliminary pacing targets

These are development targets, not automatic failure thresholds.

- **Median game length:** approximately 50–70 player-turns.
- **Most games:** approximately 35–90 player-turns.
- **90th percentile:** preferably below approximately 100 player-turns.
- **Turn-limit or unresolved games:** below 5% in simulation batches that use a limit.
- **100+ turns:** acceptable as an unusual, memorable struggle; concerning as a routine result.
- **Battle count:** favor approximately 20–30 consequential battles over 40+ repetitive border clashes.

Elapsed physical time must also be recorded. A turn containing a battle takes substantially longer than a simple movement or Action turn, so turn count alone is not enough.

---

## 4. Historical card-lifecycle result

An instrumented simulation pass found that sending both hand commitments and played battle-drawn cards to the Graveyard caused severe late-game deck collapse. In one representative 50-turn game, the two players ended with 24–25 cards each in the Graveyard and numerous incomplete battle draws.

A 2,000-seed paired comparison then tested:

- **Old rule:** all played Battle cards go to the Graveyard.
- **Current lifecycle direction:** cards committed from hand go to the Graveyard; cards played from battle draw go to discard unless an effect says otherwise.

The current direction nearly eliminated battles in which neither player could use a card and preserved a much larger recyclable card pool. It slightly increased average game length, but the improvement in battle quality and card availability was substantial.

**Durable conclusion:**

> Hand commitment should remain costly and intentional. Battle draw should remain a renewable tactical resource unless a card explicitly changes destination.

This conclusion is already reflected in the v0.5.7 rules baseline and should be preserved during v0.6 migration.

---

## 5. Asset-bank evaluation

The rule **Asset bank limit = Territories controlled** was adopted because it is simple, visible, and makes territorial progress increase infrastructure capacity.

Simulation identified a real risk:

- games became shorter;
- the winner's engine scaled faster;
- the losing player was sometimes punished twice by losing both territory and banked Assets;
- comeback rates fell and blowout rates increased in the tested agents.

A **minimum-2 Asset bank** variant reduced that snowball effect in simulation, but it was not adopted. The current rule remains the exact Territory-controlled limit.

Playtests should explicitly record:

- maximum Assets reached by each player;
- forced Asset discards caused by lost Territories;
- whether Asset-bank contraction felt strategically appropriate or merely punitive;
- whether a player lost meaningful ability to act after falling behind;
- comeback frequency after one player first reached a major territorial lead.

Do not silently introduce the minimum-2 variant. Treat it as a reserved comparison test only.

---

## 6. Required quantitative metrics

Record, where practical:

### Game structure

- rules version;
- player names or agent types;
- deck names and leaders/factions;
- winner;
- victory type;
- elapsed time;
- player-turn count;
- full-round count, if useful;
- battle count;
- capture count;
- counterattack count;
- Heartland battles;
- repeated battles on the same position;
- longest repeated-position sequence.

### Card economy

- starting deck count and total deckbuilding value for each player;
- reshuffles per player;
- final hand, deck, discard, Graveyard, and Asset-bank sizes;
- smallest recyclable pool reached: deck + discard;
- turn when recyclable cards first fell below 15, 10, and 5;
- incomplete normal draws;
- incomplete battle draws;
- unique cards seen;
- cards sent to Graveyard from hand commitment;
- cards sent to Graveyard from battle draw or card effects;
- cards recovered from discard or Graveyard.

### Territorial and Asset scaling

- maximum Territories controlled;
- maximum Assets banked;
- forced Asset discards;
- number of turns spent occupying but not controlling enemy Territory;
- number of successful and failed counterattacks;
- largest territorial deficit overcome by the eventual winner.

### Faction systems

For each faction, record relevant progress and resource history:

- Command gained/spent and Orders used;
- Diplomat Terms by Proposal, including accepted, refused, imposed, lost, no-winner, and repeated already-ratified offers;
- Treaty Articles ratified, the turn each was ratified, and Peace Treaty attempts or victories;
- Influence available before each offer, staked, returned, lost, recovered by Political Capital, and remaining after resolution;
- Influence gained separately from accepted newly ratified Proposals, imposed newly ratified Proposals, Clemency, Nonbinding Resolution, Blockade, and any other source;
- Influence spent through Leverage in each battle, including mean, median, maximum single spend, and battle result;
- Proposal stakes by tier, including acceptance rate, refusal rate, loss rate, and net Influence change for stakes 0, 1, and 2;
- cards sent to the Graveyard through Political Capital and Influence recovered per use;
- Conviction gained separately from the normal post-battle trigger, Blasphemy, Penance, Divine Mercy, Burning at the Stake, and any other source;
- Conviction spent separately on each Purge option, Final Judgment, Relentless Pursuit, Tyranny, Heresy, Hellfire, and any other effect;
- number of Purges at costs 1, 2, 3, and 4, including which 1-Conviction mode was chosen;
- cards sent to the Graveyard through Condemnation, each Purge option, Excommunication, Guilt by Association, Act of Faith, Burning at the Stake, Hellfire, and other Inquisition effects;
- Divine Mercy uses, value of cards returned, and whether the immediate benefit affected the battle or later Purge sequence;
- Final Judgment and Relentless Pursuit opportunities, uses, and resulting board or card-economy impact;
- Purification attempts or victories, the turn the opponent's recyclable pool first reached zero, and whether the Inquisition instead won by breakthrough;
- starting deck count of Inquisition opponents, especially 30-card compact decks, mixed larger decks, and 60-card low-cost decks;
- Rites begun, interrupted, and completed;
- Capital, Treasury, Deeds, purchases, and buyouts;
- Intel gained/spent, Missions completed/failed/aborted, and Special Operation attempts.

---

## 7. Required qualitative questions

After a human game, ask both players:

- Was the game fun?
- Did you feel able to make meaningful decisions throughout?
- Did the game feel too slow, too fast, or appropriately paced?
- Did battles feel consequential or repetitive?
- Was the winner apparent long before the game ended?
- Did you ever feel unable to act?
- Did territorial progress feel durable enough?
- Did Asset-bank contraction feel fair?
- Were faction goals visible and understandable?
- Did alternate victory progress remain interactive?
- For Diplomat games, did accepting and refusing each feel reasonable in some situations?
- For Diplomat games, did Proposal stakes feel like meaningful political risk rather than a routine payment?
- Did gaining Influence equal to an accepted Proposal's stake feel like satisfying political momentum or runaway snowballing?
- Did the possibility of Leverage make refusal tense without making the result feel predetermined?
- Did the Diplomat face meaningful choices between saving Influence for future Proposals and spending it in the current battle?
- Did the Senator's card sacrifice feel appropriately costly for the Influence preserved?
- Did Peace Treaty pressure remain credible while the Diplomat was losing ground?
- For Inquisition games, did preserving Conviction for Purges or leader abilities compete meaningfully with spending it on faction cards?
- Did Condemnation make played battle-draw cards feel consequential without making battle participation feel futile?
- Did the opponent feel able to respond through deck construction, commitment restraint, Graveyard recovery, territorial pressure, or conventional aggression?
- Did Purification feel like a real approaching victory rather than an arbitrary counter or an impossible threat?
- Against a large low-cost deck, did the Inquisition naturally pivot toward running the Gauntlet?
- Were Blasphemy and Arcane-trait interactions clear and fair?
- Did Grand Inquisitor and Witch Hunter feel strategically distinct with the same card pool?
- Were the two Inquisition reference cards and Conviction tracker faster to use than consulting the rules document?
- Which card, Territory, leader ability, or faction mechanic felt most valuable?
- Which felt least valuable or least worth remembering?
- Which interaction required a ruling?
- Would you want to play the same matchup again?

---

## 8. Reporting standards

Simulation summaries should include:

- sample size;
- agent policy;
- decks and board setup;
- random-seed policy;
- mean, median, 75th percentile, 90th percentile, and maximum game length;
- turn-limit rate;
- matchup win rates;
- distribution of victory types;
- relevant card-economy and territorial metrics;
- known modeling limitations.

Do not rely on averages alone. A mixture of many short games and a few extreme stalls can produce a misleading average.

---

## 9. Current playtest priorities

1. Test v0.6 faction systems against the same core baseline rather than changing multiple core systems at once.
2. Measure whether the Asset bank still accelerates games without making comebacks functionally impossible.
3. Verify that the current battle-card lifecycle prevents endgame deck collapse in human play.
4. Compare General and Commandant, and then both leaders within every other faction.
5. Test the revised Diplomat economy Proposal by Proposal, including stake-tier acceptance, accepted-ratification Influence, imposition rewards, failed stakes, Senator recovery, Leverage spending, and repeated offers.
6. Test both Inquisition leaders against compact premium decks, mixed larger decks, and 60-card low-cost decks; measure Purification pressure, conventional breakthrough, Purge selection, Conviction allocation, and the Divine Mercy / Tyranny / Burning at the Stake watchlist.
7. Verify that the Grand Inquisitor, Witch Hunter, doctrine reference, Purge reference, and Conviction tracker remain legible and fast to use at standard card size.
8. Confirm that alternate victories create visible parallel pressure and do not encourage disengagement from the Gauntlet.
9. Use the digital prototype to automate telemetry only after its rules implementation matches the selected physical ruleset.
