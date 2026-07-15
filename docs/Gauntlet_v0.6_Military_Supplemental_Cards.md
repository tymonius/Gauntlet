# Gauntlet v0.6 Military Supplemental Cards

**Status:** Authoritative working component specification for the v0.6 Military Leader Cards and Command tracker.  
**Purpose:** Define the exact player-facing text, physical relationship, and production behavior of Military's supplemental cards.

Use this document with:

- `Gauntlet_v0.6_Working_Rules.md` for Command and Order rules;
- `Gauntlet_v0.6_Leader_Design_Bible.md` for leader art direction;
- `Gauntlet_v0.6_Military_Card_Pool.md` for the twelve playable Military cards;
- `../faction-sheets/military.html` for the current printable rendering.

Supplemental cards do not count toward deck size or deckbuilding value, are not shuffled into the deck, and are not cards in play.

---

## Component set

A Military deck uses:

1. one selected Leader Card: **General** or **Commandant**;
2. one shared **Military Command Tracker** placed beneath that Leader Card.

Military requires no separate Orders card, Command token, or first-victory marker. Each Leader Card contains its three Orders and the shared Command rule.

---

## Shared Leader Card rule

Both Military Leader Cards include:

> **Command:** Maximum 2. The first time each turn you win a battle, gain 1. Spend Command to use Orders.

The Leader Card also identifies the faction, leader name, and the three Orders available to that leader.

---

## General

**Faction:** Military  
**Card type:** Supplemental Leader Card  
**Player-facing phrase:** *Forward. Again.*

> **Command:** Maximum 2. The first time each turn you win a battle, gain 1. Spend Command to use Orders.

### Orders

> **Onward — 1 Command:** Move one additional space this turn. This movement may initiate a battle.
>
> **Rally — 1 Command:** Before dice are rolled in a battle you initiated, add +1 to your battle total.
>
> **Rout — 2 Command:** After you win a battle you initiated, move one space toward the opponent's Heartland. This movement may initiate another battle.

### Production direction

- Use `images/general.png`.
- Preserve the mounted white horse, dark blue coat, red sash, and raised saber as the dominant read.
- The composition should emphasize forward motion and aggressive command.

---

## Commandant

**Faction:** Military  
**Card type:** Supplemental Leader Card  
**Player-facing phrase:** *We hold. They break.*

> **Command:** Maximum 2. The first time each turn you win a battle, gain 1. Spend Command to use Orders.

### Orders

> **Entrench — 1 Command:** Before dice are rolled in a battle you did not initiate, add +1 to your battle total.
>
> **Repel — 1 Command:** After you win a battle you did not initiate, the defeated opponent retreats one additional space, if able.
>
> **Fortify — 2 Command:** After you win a battle while occupying an enemy Territory, capture that Territory immediately.

### Production direction

- Use `images/commandant.png`.
- Preserve the rigid stance, baton or cane, broad officer silhouette, and fortified-ground read.
- The composition should emphasize discipline, control, and immovability rather than forward motion.

---

## Military Command Tracker

**Card type:** Supplemental resource tracker  
**Format:** Standard 2.5 × 3.5-inch card, designed to sit directly beneath either Military Leader Card.

### Printed instruction

> Place beneath your Leader Card. Cover this card at 0 Command. Slide the Leader upward until its bottom edge reaches the current Command line.

### Use

The selected Leader Card slides vertically over the Command Tracker:

- **0 Command:** the Leader Card and tracker are fully aligned; the tracker is covered;
- **1 Command:** slide the Leader Card upward until its bottom edge aligns with the **1 Command** registration line;
- **2 Command:** slide it farther upward until its bottom edge aligns with the **2 Full Command** registration line.

The bottom edge of the Leader Card is the resource pointer. No separate Command marker is used.

### Tracker face

The tracker should include:

- a clear **Military Command** title;
- a lower **1 Command** registration line;
- an upper **2 Full Command** registration line;
- the compact printed instruction above;
- Military blue, brass, and restrained field-map or command-standard visual language.

The tracker should not repeat the full Command rule or the leader-specific Orders. Those remain on the selected Leader Card.

### Physical testing watchlist

- Verify that the Leader Card remains stable and legible at both raised positions.
- Confirm that the two registration positions are visually unambiguous even though the lower value remains visible at 2 Command.
- Test sleeved and unsleeved use.
- Confirm that ordinary handling does not accidentally shift the displayed Command value.
- Consider a shared oversized sleeve or simple player-board channel only if loose cards prove unreliable in playtesting.

---

## Print-sheet integration

`faction-sheets/military.html` contains:

- all twelve playable Military cards;
- the General Leader Card;
- the Commandant Leader Card;
- one shared Military Command Tracker.

The source renders standard 2.5 × 3.5-inch cards on Letter-size 3 × 3 sheets. The leader and tracker cards are supplemental open-information components and do not use the normal playable-card back. The leader portraits are loaded from the top-level `images/` directory.
