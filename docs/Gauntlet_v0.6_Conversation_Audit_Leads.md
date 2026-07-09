# Gauntlet v0.6 Conversation Audit Leads

**Status:** Audit leads from prior Gauntlet conversations.  
**Purpose:** Preserve important discussion points that may not yet be fully reflected in the repo.

These are not automatically final rules. Treat them as leads to verify against source documents, card review decisions, and current design direction.

---

## v0.6 faction framework leads

### Faction and leader naming evolution

Earlier faction framing used:

- Military — General / Commandant
- Diplomats — Ambassador / Senator
- Inquisition — Grand Inquisitor / Witch Hunter
- Magic — Alchemist / Spirit Walker or Shaman
- Financiers — Banker / Executive
- Intelligence — Ranger or Spy

Current v0.6 framing is:

- Military — General / Commandant
- Diplomats — Ambassador / Senator
- Inquisition — Grand Inquisitor / Witch Hunter
- Arcane — Alchemist / Spirit Walker
- Financiers — Banker / Executive
- Intelligence — Ranger / Spymaster

Status: **Documented/current** in the Working Rules for current names. This lead preserves the older naming history so stale references like Magic or Spy can be normalized rather than accidentally revived.

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

## Deck construction / product structure leads

### Deck construction and supplemental cards

Prior discussion clarified:

- a deck is at least 30 playable cards;
- deck value cap is 60;
- leaders, reference cards, Proposal lists, Order lists, resource trackers, and similar cards are supplemental cards;
- supplemental cards do not count toward deck size or deck value.

Status: **Documented/current** in the v0.6 Working Rules.

### Starter product / card-pool packaging

Prior discussion suggested the complete game will eventually ship the full card pool with enough multiples. A starter pack might include the core pool plus Military and maybe one other faction.

Status: **Conversation-only / product lead**. Not a v0.6 rules decision. Current v0.6 Working Rules intentionally assume all six factions are part of the v0.6 playtest release.

---

## Digital tooling / deckbuilder leads

### Standalone browser deckbuilder requirements

Prior discussion requested a standalone browser deckbuilder with:

- card database;
- faction and leader selection;
- Territory picker;
- deck size and value tracking;
- saved decks;
- load/edit support;
- print-ready PDF/export path.

Status: **Partly documented/current**. The current deckbuilder covers the v0.5 pre-faction tool; v0.6+ faction/leader mode is still future implementation.

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

### Cross-board / central Arena variant

Prior discussion explored a 4-player cross variant where lanes meet at a central Arena, with both large-cross and small-cross layouts considered.

Status: **Conversation-only / v0.7+ lead**. Not currently v0.6 scope.

### FFA / Arena variant

Prior discussion treated free-for-all as likely separate from 2v2, possibly under a `Gauntlet: Arena` style variant. Alliances were discussed as a possible issue but not decided.

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

Status: **Partly documented/current**. Release contributing notes request version, decks, winner, elapsed time, player-turn count, fun/slow/confusing/unfair notes, and interactions requiring rulings. The richer form metrics should be preserved for future digital logging or playtest-form updates.

---

## Leader archetype / visual design leads

Prior discussion began matching leaders to historical or fictional archetypes to shape character design. This is not rules text, but it affects faction art direction, symbols, leader names, and component design.

Status: **Conversation-only lead now promoted to `docs/Gauntlet_v0.6_Leader_Archetype_and_Visual_Notes.md`.**

---

## Current next audit tasks

1. Add the 4-player / multiplayer variant ideas to the v0.7 Parking Lot if still desired.
2. Continue repo inventory for `.github/workflows` and `src` subfolders.
3. Decide whether leader visual/archetype notes should stay v0.6-adjacent or move to a broader art-direction document.
4. Continue checking prior conversation leads against the actual repo before resuming card review at Invasion.
