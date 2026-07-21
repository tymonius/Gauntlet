# Gauntlet Development History and Superseded Directions

**Status:** Historical design rationale and do-not-revive reference.  
**Scope:** Major demonstrated problems, adopted redesign principles, and superseded alternatives. Current rules remain authoritative in release files and v0.6 working documents.

---

## 1. Why the v0.5 rebuild happened

The v0.4-era game was not abandoned because the central concept lacked promise. Real multiplayer playtests demonstrated that the core loop became too stalemate-prone and difficult to manage.

The main problems were:

- defender and homeland bonuses created severe choke points;
- movement progress was frequently erased;
- battles were strategically underprepared but mechanically overloaded;
- too many random battle cards could be played at once;
- persistent effects and timing exceptions accumulated;
- partial success did not reliably create lasting progress;
- nothing inside the game naturally forced a long stalemate to become decisive.

The v0.5 redesign was therefore a controlled rebuild intended to preserve Gauntlet's identity while replacing the movement, battle, capture, and card-lifecycle systems that caused demonstrated failure.

---

## 2. Core identity preserved from the earlier game

The rebuild retained:

- a short, linear Gauntlet built from player-selected Territories;
- tactical advance and retreat across contested ground;
- pre-game deck construction by card count and point value;
- cards used for both broader strategy and battle tactics;
- hidden information and face-down commitments;
- persistent effects through prepared or banked cards;
- a final breakthrough battle at the opponent's end;
- a broad political, military, financial, intelligence, and supernatural thematic vocabulary.

The goal was not to turn Gauntlet into a different genre. It was to make territorial progress and card decisions matter more reliably.

---

## 3. Adopted v0.5 core redesign

The following directions became the v0.5 baseline and should not be casually reopened without new evidence.

### No movement rolls

Movement rolls were removed. A player now makes intentional movement choices rather than repeatedly rolling to see whether progress occurs.

### Occupation before capture

Winning on enemy ground does not normally capture it immediately.

- The attacker occupies the Territory.
- The defender receives a normal counterattack window.
- If the Territory is not retaken, it is captured at the start of the occupying player's next turn.

This makes progress meaningful while preserving immediate counterplay.

### Simplified battle commitment

The battle sequence was rebuilt around:

- an optional card committed from hand;
- a battle draw;
- a limited number of battle-drawn cards played;
- simultaneous reveal and resolution;
- dice and modifiers after card effects;
- clear card destinations.

This preserved the excitement of drawing several cards for battle while preventing the old multi-card effect pileups.

### One Action or Battle card play per turn

The normal card-play limit is one Action or Battle card per turn unless an effect explicitly permits more.

### Hand limit 3

The small hand keeps decisions constrained and makes hand commitment meaningful.

### Hand commitment and battle draw have different costs

- Cards committed from hand normally go to the Graveyard.
- Cards played from battle draw normally go to discard.

This preserves the cost of prepared certainty while keeping the random battle draw renewable.

### Homeland Advantage and Heartland defense

Homeland Advantage means the defender wins tied battle totals while defending a space they control.

Heartland defense separately grants +1 and stacks with Homeland Advantage.

### Asset bank scaling

The fixed persistent-effect area became the Asset bank.

- Asset bank limit equals Territories controlled.
- Occupied Territories do not count until captured.
- Heartlands do not count.
- Losing control may force the player to discard down.

This links territorial progress to infrastructure and power scaling.

### Assets, Conditions, and Overlays

Persistent effects were separated conceptually:

- **Assets** belong to a player and compete for Asset-bank capacity.
- **Conditions** affect a player or persist until a specified event.
- **Overlays** belong visibly to a specific Territory.

The current v0.6 cleanup direction is to reduce Conditions where Assets, Overlays, or immediate resolution are cleaner.

---

## 4. Superseded or rejected core directions

Do not treat these as current rules merely because they appear in earlier conversations or design notes.

### Round limit as the normal solution

Rejected for the core game.

A fixed round limit with a control-based tiebreak was considered, but the preference was to solve long games through gameplay design rather than an external and arbitrary timer.

A round limit may still be appropriate for a scenario, tournament format, faction effect, or optional module, but it is not the default anti-stalemate solution.

### Breach / exhaustion markers

Rejected as too much tracking burden.

Ideas involving breached Territories, accumulated exhaustion, or damage markers were considered as ways to make repeated battles leave lasting progress. They were not adopted because occupation, capture, card attrition, and the Asset bank offered cleaner mechanisms using existing game objects.

### Foothold marker or counterattack bonus

Foothold was considered as a pacing tool during the occupation window. It was deliberately held in reserve and not added to v0.5.6 or the current v0.6 baseline.

### Immediate capture after every attacking win

Rejected as too drastic for the normal rule. Immediate capture remains appropriate for specific costly cards, leader abilities, or special effects.

### Failed counterattack automatically causes capture

Considered as a low-complexity pacing patch, but not adopted as the baseline. The normal start-of-turn capture schedule remains current unless an effect overrides it.

### Fixed two- or three-Asset maximum

Superseded by the Territory-scaled Asset bank.

### Minimum-2 Asset bank

Produced promising simulation results as a softer anti-snowball variant, but was not adopted. The current rule uses the exact number of Territories controlled.

### All played Battle cards to the Graveyard

Superseded after simulation demonstrated severe deck collapse and low-agency endgames.

### Unlimited or broad multi-card battle play

Superseded by limited hand commitment and limited battle-draw play.

### Active Effects terminology

Superseded. Use **Asset**, **Asset bank**, **Condition**, and **Overlay** as applicable.

### Heartland cards

Superseded for v0.6. Heartlands are board endpoints, not cards or Territories.

---

## 5. Version milestones

### v0.5.3 — Attrition / card-lifecycle baseline

Established the revised battle-card destination structure and a playable full rules package.

### v0.5.4 — Last Stand / Heartland patch

Added stronger final defense through Heartland-specific rules.

### v0.5.5 — Human Playtest Errata

Addressed Conscription, Watchtower, Fortifications, Embargo, and other issues found in human play.

### v0.5.6 — Asset Bank Patch

Linked Asset-bank capacity to Territories controlled and standardized Asset/Condition terminology.

### v0.5.7 — Core Cleanup Patch

Removed likely faction-specific cards from default core play and clarified several digitally discovered rules issues.

The exact release files and canonical data remain authoritative for those versions.

---

## 6. Faction-development lesson

The core redesign established a recurring guardrail:

> Factions should add distinct strategic identity without reintroducing the scattered timing burden and stalemate behavior that caused the v0.4 failure.

Faction systems must remain connected to movement, battle, occupation, capture, card economy, and visible progress. They should not become six unrelated minigames layered on top of an already complex core.

---

## 7. When to reopen a superseded direction

A rejected or superseded idea may be reconsidered only when:

- a current playtest demonstrates a specific problem;
- the old idea directly addresses that problem;
- the added tracking burden is measured against simpler alternatives;
- the proposal is treated as a controlled experiment rather than silently restored;
- the result is recorded in current repo documentation.

Historical appearance in conversation is not evidence that the idea remains current.
