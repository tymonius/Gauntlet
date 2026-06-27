# Gauntlet v0.6 Card Migration Worksheet

**Status:** Working design worksheet  
**Purpose:** Begin moving from faction framework into card-pool development for v0.6.

This document is not a final card list, rulebook, or release manifest. It is a practical sorting sheet for deciding which existing cards should remain neutral, become faction-aligned, move to advanced play, be reworked, or be cut.

---

## 1. Current Objective

The next phase of development is to make the faction frameworks prove themselves through actual cards and test decks.

For each existing card, assign a working destination:

1. **Core Neutral** — broadly useful, understandable, and appropriate for the base game.
2. **Advanced Neutral** — mechanically useful but too complex, swingy, or specialized for starter/core play.
3. **Faction Candidate** — better as part of a faction package than the general neutral pool.
4. **Cut / Rework** — confusing, redundant, off-theme, or unhealthy in its current form.
5. **Needs Replacement** — fills an important mechanical slot, but the current execution should change.

The goal is not to perfect card text yet. The goal is to identify which cards belong to which design jobs.

---

## 2. Sorting Principles

### Core Neutral Cards

Core neutral cards should support the basic Gauntlet experience:

- movement,
- battle,
- occupation,
- capture,
- defense,
- card flow,
- simple Asset interaction,
- basic counterplay.

A core neutral card should generally be understandable without knowing a faction subsystem.

### Advanced Neutral Cards

Advanced neutral cards may remain available outside factions, but should not carry the beginner experience.

A card belongs here if it is:

- swingy,
- high-complexity,
- matchup-dependent,
- rules-dense,
- strategically interesting but not starter-friendly.

### Faction Candidates

A card should become faction-aligned if it strongly expresses one faction's identity or if it becomes healthier when constrained to decks built around that faction.

Faction identity guide:

| Faction | Card identity |
|---|---|
| Military | conquest, battle tempo, movement, force, morale, occupation pressure |
| Diplomats | negotiation, concessions, legitimacy, peace, recognition, soft control |
| Inquisition | condemnation, punishment, Graveyard pressure, purge, suppression |
| Arcane | ritual, sacrifice, forbidden knowledge, transformation, Graveyard use |
| Financiers | Capital, Treasury, Deeds, income, leverage, market pressure |
| Intelligence | hidden information, Missions, Intel, Surveillance, Interference, sabotage |

### Cut / Rework Cards

A card belongs here if its current version creates a design problem that is not solved simply by assigning it to a faction.

Common reasons:

- too much rules overhead,
- unclear timing,
- unfun denial,
- redundant with another cleaner card,
- too difficult to balance,
- off-theme name or fantasy,
- effect no longer fits v0.6 rules.

---

## 3. First-Pass Migration Table

This is a starting point based on the current v0.6 faction frameworks. It should be revised as each card is reviewed individually.

| Card | Working destination | Notes |
|---|---|---|
| Rallying Cry | Core Neutral | Basic morale / battle support candidate. Keep simple if retained. |
| New Recruits | Core Neutral | Basic card-flow or reinforcement concept. Likely starter-friendly. |
| Supplies | Core Neutral | Basic sustain / resource support. Good neutral utility concept. |
| Reinforcements | Core Neutral | Core combat recovery or board-pressure concept. |
| Stand Ground | Core Neutral | Basic defensive identity. Should remain easy to understand. |
| Entrenchment | Core Neutral | Basic defensive setup. Watch overlap with Military Commandant. |
| Fortifications | Core Neutral | Basic defensive battle card. Keep wording tight. |
| Palisade Wall | Core Neutral | Simple defense/terrain-adjacent protection candidate. |
| Valor | Core Neutral | Straightforward battle modifier / morale concept. |
| Counterintelligence | Core Neutral | Important general counterplay against Intelligence-style effects. Keep broad enough for non-Intelligence decks. |
| Scouting Report | Core Neutral | Basic hidden-information access. Should remain simpler than Intelligence Surveillance. |
| Sabotage | Core Neutral | Basic anti-Asset / anti-engine interaction. Could also support Intelligence later, but broad counterplay is useful. |
| Rousing Speech | Core Neutral | General comeback or morale tool. Watch efficiency. |
| Illegal Occupation | Core Neutral | Useful general answer to occupation/Asset-powered board pressure. |
| Conscription | Core Neutral | Basic scaling/card-access tool. Watch timing and complexity. |
| Embargo | Core Neutral or Diplomats candidate | General pressure card now; may fit Diplomats if tied to negotiation/soft control. |
| Fealty | Core Neutral or Diplomats candidate | Could remain neutral if simple loyalty/defense; could become Diplomat if tied to legitimacy. |
| Decoys | Core Neutral or Intelligence candidate | Useful basic trick card. Could remain neutral if simple; Intelligence if tied to hidden information. |
| Strategic Withdrawal | Core Neutral | Important tactical retreat / counterplay card. Fits core Gauntlet. |
| Redemption | Core Neutral | General recovery concept. Watch Graveyard interaction with Arcane/Inquisition. |
| Contraband | Core Neutral or Financier/Intelligence candidate | Could stay neutral as illicit utility; may later fit Financier or Intelligence depending effect. |
| Manifest Destiny | Advanced Neutral or Military candidate | Strong conquest fantasy, but name/theme/power may need rework. Likely not starter neutral. |
| Protracted Siege | Advanced Neutral or Military/Inquisition candidate | Strong strategic pressure concept. Watch game length and feel-bad. |
| Siege Weaponry | Advanced Neutral or Military candidate | Battle/occupation pressure. Could become Military if too aggressive for neutral pool. |
| Armistice | Advanced Neutral or Diplomats candidate | Strong Diplomat flavor. Likely healthier as Diplomat card or advanced neutral. |
| Capital Punishment | Cut / Rework or Inquisition candidate | Name and effect likely need review. Could become Inquisition with a different title. |
| Revolution | Advanced Neutral or Diplomats/Inquisition candidate | Potentially swingy board-state reversal. Needs careful review. |
| Attrition | Advanced Neutral or Inquisition candidate | Graveyard/long-game pressure. Could become Inquisition if too punishing as neutral. |
| Blockade | Advanced Neutral or Diplomats/Financiers candidate | Economic/positional denial. Watch stalling. |
| Shock and Awe | Advanced Neutral or Military candidate | Splashy combat tempo. Likely too dramatic for starter neutral if strong. |
| Arcane Knowledge | Arcane candidate | Directly expresses Arcane identity. Likely faction-aligned. |
| Necromancy | Arcane candidate | Graveyard use and forbidden power. Strong Arcane fit. |
| Witchcraft | Arcane candidate | Arcane trait / ritual-adjacent identity. Strong Arcane fit. |
| Assassins | Intelligence candidate | Covert action / targeted disruption. Strong Intelligence fit. |
| Spies | Intelligence candidate | Direct Intelligence identity. Likely core faction card. |
| Treason | Intelligence or Diplomats/Inquisition candidate | Covert betrayal, legitimacy collapse, or suppression angle. Needs faction decision. |
| Capital Gains | Financier candidate | Direct Capital/economic identity. Strong Financier fit. |
| Monetary Crisis | Financier candidate | Economic disruption. Strong Financier fit; watch feel-bad. |
| Tariffs | Financier or Diplomats candidate | Economic pressure / policy pressure. Likely Financier unless Diplomats need trade leverage. |
| Sedition | Inquisition or Intelligence candidate | Suppression/betrayal theme. Likely Inquisition if framed as condemned dissent. |
| Scorched Earth | Inquisition or Military candidate | Punitive destruction or harsh warfare. Needs feel-bad review. |
| The Black Edict | Inquisition candidate | Strong Inquisition identity. Needs clean, non-real-world-symbolic framing. |
| Tyranny | Inquisition candidate | Suppression/control identity. Watch oppressive feel. |
| War Crimes | Cut / Rework or Inquisition candidate | Name likely too blunt/player-facing. Could be renamed for Inquisition or removed. |
| Assimilation | Military or Inquisition/Diplomats candidate | Could be conquest integration, ideological control, or legitimacy. Needs theme decision. |
| Brothers in Arms | Military candidate | Clear Military morale/cohesion card. |
| Invasion | Military candidate | Direct conquest pressure. Strong Military fit. |
| Liberation | Military or Diplomats candidate | Could be Military morale or Diplomat legitimacy. Needs framing. |
| Militias | Military candidate | Force generation / local defense. Strong Military fit. |
| Patriotism | Military or Diplomats candidate | Morale/legitimacy overlap. Needs faction role decision. |
| Resistance | Military or Intelligence/Diplomats candidate | Could be defensive Military, covert Intelligence, or legitimacy pressure. Needs effect review. |

---

## 4. Immediate Work Plan

### Step 1: Neutral Pool Triage

Start by reviewing the proposed **Core Neutral** cards.

Questions for each card:

- Does this card teach or reinforce the core Gauntlet experience?
- Is it simple enough for starter play?
- Does it create useful interaction?
- Does it overlap too much with a faction's special identity?
- Would the game be worse if this card were absent from the neutral pool?

### Step 2: Advanced Neutral Triage

Review each advanced neutral candidate.

Questions:

- Is this card interesting enough to keep outside factions?
- Does it create too much rules overhead for the base game?
- Would it be healthier as a faction card?
- Does it slow the game or create stalls?

### Step 3: Faction Candidate Review

For each faction, identify the first rough faction package.

Minimum useful target for early testing:

- 2 leader cards,
- faction reference rules,
- 8-12 faction cards or faction-aligned existing cards,
- 1-2 rough sample decks.

### Step 4: First Test Decks

Build ugly, practical test decks before polishing card text.

The goal is to answer:

> Does this faction create the decisions it promises?

---

## 5. Faction Package Starting Points

These are not final card lists. They are starting clusters for card review.

### Military

Likely candidates:

- Assimilation
- Brothers in Arms
- Invasion
- Liberation
- Militias
- Patriotism
- Resistance
- Siege Weaponry
- Shock and Awe
- Manifest Destiny

Military cards should make conquest feel active, forceful, and tactical without making the faction simply overpower every battle.

### Diplomats

Likely candidates:

- Armistice
- Fealty
- Embargo
- Revolution
- Liberation
- Patriotism
- Tariffs

Diplomat cards should reshape incentives, convert conflict into legitimacy, and create meaningful choices rather than simply preventing battles.

### Inquisition

Likely candidates:

- Sedition
- Scorched Earth
- The Black Edict
- Tyranny
- Attrition
- Capital Punishment, likely renamed
- War Crimes, likely renamed or cut

Inquisition cards should feel severe and punishing without making the opponent feel unable to play the game.

### Arcane

Likely candidates:

- Arcane Knowledge
- Necromancy
- Witchcraft

Arcane will likely need additional new cards because the current pool has fewer obvious Arcane candidates than the faction framework requires.

### Financiers

Likely candidates:

- Capital Gains
- Monetary Crisis
- Tariffs
- Contraband
- Blockade

Financier cards should turn position into leverage and leverage into victory pressure without becoming pure bookkeeping.

### Intelligence

Likely candidates:

- Assassins
- Spies
- Treason
- Decoys
- Counterintelligence, probably remains neutral but may be important for Intelligence counterplay
- Scouting Report, probably remains neutral but overlaps with Intelligence identity
- Sabotage, probably remains neutral but overlaps with Intelligence identity

Intelligence cards will need Mission requirements. The faction will live or die on whether those Missions are fun to pursue.

---

## 6. Do Not Do Yet

Do not finalize card text yet.

Do not design the complete faction card pool yet.

Do not add Day/Night text or other v0.7 module hooks.

Do not redesign every neutral card at once.

Do not polish wording before the card's role is clear.

First, decide what job each card is supposed to do.
