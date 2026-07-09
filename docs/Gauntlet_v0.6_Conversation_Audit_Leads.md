# Gauntlet v0.6 Conversation Audit Leads

**Status:** Audit leads from prior Gauntlet conversations.  
**Purpose:** Preserve important discussion points that may not yet be fully reflected in the repo.

These are not automatically final rules. Treat them as leads to verify against source documents, card review decisions, and current design direction.

---

## v0.6 faction framework leads

### Parallel Progress principle

Prior discussion approved the principle that factions should create parallel progress: both players should usually be able to make meaningful progress toward at least one victory condition at the same time.

Status: **Documented/current** in design principles and working rules, but continue enforcing during faction and card review.

### Diplomats victory direction

Prior discussion favored Diplomats winning through ratified Proposals / Peace Treaty without requiring an enemy-Territory condition.

Status: **Documented/current** in the v0.6 Working Rules.

### Military role

Prior discussion accepted Military as the baseline conquest faction rather than giving every faction an equally conquest-focused identity.

Status: **Documented/current** in the v0.6 Working Rules.

### Arcane Rite of Crossing

Prior discussion favored Rite of Crossing using any Territory the opponent controlled immediately before the battle, rather than a narrower or more awkward enemy-Territory requirement.

Status: **Documented/current** in the v0.6 Working Rules.

---

## Digital tooling / deckbuilder leads

### Separate v0.5 and v0.6+ tool modes

Prior discussion concluded that the deckbuilder/tooling likely needs separate modes because v0.5.6-0.5.7 are pre-faction while v0.6+ changes significantly with factions and leaders.

Status: **Documented/current** in `deckbuilder/README.md` as intended upgrade path.

### v0.5.7 mode expectations

For v0.5.7 mode:

- no factions or leaders;
- all normal cards are available;
- validate deck size, point total, Territory rules, and unique cards;
- saved decks should be tagged by game version;
- old decks should not auto-migrate across v0.5 to v0.6.

Status: **Mostly documented/current** in `deckbuilder/README.md` and current deckbuilder code. Needs explicit v0.6+ mode planning later.

---

## Asset bank / pacing leads

### Asset bank goal

Prior discussion framed the v0.5.6 Asset bank change as intended to:

- shorten games;
- improve power scaling as players progress;
- avoid excessive snowballing;
- preserve comeback possibility.

Status: **Documented/current** in v0.6 Working Rules and playtest watchlist, but continue watching.

### Asset bank minimum-2 variant

A prior simulation discussion suggested a softer test variant: Asset bank limit equals Territories controlled, minimum 2.

Status: **Work-in-progress / not adopted**. Do not treat as current v0.6 rule unless explicitly revived.

---

## Multiplayer / v0.7 leads

### 4-player 2v2 concept

Prior discussion explored a v0.7 4-player variant with a two-tile-wide / 12-tile Gauntlet and two players on each side.

Possible prototype lead:

- 6-column x 2-row board;
- alternating individual turns;
- orthogonal movement;
- team-controlled Territories;
- each player has own deck, hand, discard, Graveyard, and Asset bank;
- team victory after two breakthroughs.

Status: **Conversation-only / v0.7+ lead**. Not yet captured in the v0.7 Parking Lot and should be added later if still desired.

### FFA / Arena variant

Prior discussion treated free-for-all as likely separate from 2v2, possibly under a `Gauntlet: Arena` style variant.

Status: **Conversation-only / v0.7+ lead**. Not currently v0.6 scope.

---

## Future faction leads

### Engineers / Overlays

Engineers as an Overlay-centered faction are documented in the v0.7 Parking Lot. The current principle is that Engineers may specialize in Overlays later, but other factions should not be barred from using Overlays in v0.6 when appropriate.

Status: **Documented/current** as v0.7+ parking-lot material.

### Legal / Scales reservation

Prior discussion noted that scales should be reserved for a possible future Legal faction and not used for Inquisition.

Status: **Documented/current** in Inquisition development notes within the v0.6 Working Rules.

---

## Card review process leads

### Neutral-pool impact check

Prior card review identified that moving a card out of Neutral must consider whether other factions lose important shared counterplay, emergency defense, pacing correction, comeback tools, or interaction.

Status: **Documented/current** in design guardrails and now repeated in the open questions tracker.

### Faction-mechanic interaction check

Prior card review identified that a faction-lock recommendation must check whether the card duplicates, bypasses, or creates strange interactions with that faction's mechanics.

Status: **Documented/current** in project index and open questions tracker.

---

## Playtest / data collection leads

Prior playtest-form design emphasized tracking:

- version;
- decks;
- winner and ending;
- elapsed time;
- player-turn count;
- battles and captures;
- reshuffles;
- final Graveyards;
- enjoyment, agency, pacing, replay interest;
- rules questions;
- most/least valuable card or Territory;
- whether a player felt unable to act;
- whether the winner was apparent long before the end.

Status: **Useful prior artifact / should verify in release files**. Consider bringing these metrics into future playtest forms or digital playtest logging.

---

## Current next audit tasks

1. Add the 4-player / multiplayer variant ideas to the v0.7 Parking Lot if still desired.
2. Merge the card review addendum into the main card review log.
3. Continue repo inventory for `.github/workflows`, release subfolders, and `src` subfolders.
4. Identify whether leader visual/archetype notes need their own durable design document.
