# Gauntlet v0.6 Open Questions

**Status:** Active tracker for unresolved v0.6 questions, contradictions, and tabled design decisions.

This file is for questions that should not be treated as final decisions yet. When an item is decided, move the result into the relevant source-of-truth file and remove or close the item here.

---

## Recently closed audit items

### Card review log merge

**Status:** Closed.

- Assimilation corrected in the main card review log from Military faction card to Advanced Neutral / Watchlist.
- Insurrection added to the main card review log.
- Invasion marked as tabled pending audit completion.
- The dated addendum remains as an audit artifact but no longer needs to be treated as the active correction layer.

---

## Highest-priority audit items

### Invasion

**Status:** Tabled.

Questions:

- Should Invasion remain Neutral as a shared offensive tempo tool?
- If Invasion becomes Military, does it duplicate Command / Orders too directly?
- If Invasion remains Neutral, can Military stack it with Onward, Rally, Rout, or leader abilities too efficiently?
- Should Invasion be Core Neutral, Advanced Neutral / Watchlist, or redesigned?

---

## Card migration review guardrails

Before moving any neutral card into a faction, answer:

1. What shared tool leaves the neutral pool?
2. Do other factions still need that tool for counterplay, pacing, emergency defense, comeback potential, or basic interaction?
3. Does the destination faction already do this through its core mechanic?
4. Does the card duplicate, bypass, or create strange rules interactions with that faction's mechanic?
5. Should the card instead remain Advanced Neutral, be renamed, be split into neutral and faction versions, or be redesigned?

---

## Faction-system audit items

### Diplomats

- v0.6 keeps the current Terms / Influence / Peace Treaty framework stable.
- The full economy and Proposal overhaul is parked for v0.6.1.
- Sanctions are a candidate Diplomat faction-card family, especially for Blockade / Embargo-like effects.
- Open question: should Sanctions also exist for Financiers through economic leverage, or should Diplomat Sanctions remain distinct?
- Open question: should Demilitarized Zone be a Proposal, a faction card, an Overlay, or some combination?

### Military

- Watch whether Military receives too many ways to bypass normal capture timing.
- Watch Command max 2.
- Watch Rout chain-battle turns.
- Watch Fortify immediate capture.
- Watch overlap with neutral cards such as Assimilation and Invasion.

### Inquisition

- Watch Condemnation plus Attrition / Insurrection / hard-cancel effects.
- Watch whether Purification is viable without making ordinary battles feel hopeless.
- Watch anti-Arcane Heresy pressure so Arcane is pressured but not hard-countered.

### Arcane

- Track which cards need the Arcane trait.
- Check whether Insurrection-style reshuffle effects undercut Arcane Graveyard pressure too much.
- Final names for Rites, Invocation, Transmutation, and leader abilities are still open.

### Financiers

- Watch Capital accumulation speed, Deed income snowballing, and buyout premiums.
- Decide whether collateral from Line of Credit should go to discard or Graveyard.
- Consider whether Sanctions-like cards belong partly in Financiers via economic pressure.

### Intelligence

- Mission requirements need to be written for Intelligence cards.
- Assassins needs a difficult Mission hook later.
- Watch Intelligence card density around reveal, hand knowledge, cancellation, Sabotage, Treason, Scouting Report, and Special Operation.
- Watch whether Interference stays disruptive rather than destructive and avoids overlapping too much with Inquisition.

---

## Repo/process questions

- Continue repo file inventory for `.github/workflows`, `src` subfolders, and any release-package binary file names still truncated in screenshots.
- Decide whether addendum files should remain as dated audit artifacts or be removed after the audit stabilizes.
- Decide whether the v0.6 Working Rules should absorb low-risk items from `Gauntlet_v0.6_Rules_Cleanup.md` so there is only one active rules source.
- Decide whether prior conversation leads should be promoted from `Gauntlet_v0.6_Conversation_Audit_Leads.md` into durable design docs, parked for v0.7, or closed as already documented.
