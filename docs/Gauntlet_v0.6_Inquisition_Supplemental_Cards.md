# Gauntlet v0.6 Inquisition Supplemental Cards

**Status:** Authoritative working component specification for the v0.6 Inquisition Leader Cards, references, and sliding Conviction tracker.  
**Purpose:** Define exact player-facing text and production behavior for the Inquisition supplemental components.

Use this document with:

- `Gauntlet_v0.6_Working_Rules.md` for complete faction and general rules;
- `Gauntlet_v0.6_Leader_Design_Bible.md` for leader art direction;
- `Gauntlet_v0.6_Inquisition_Card_Pool.md` for the twelve playable cards;
- `../faction-sheets/inquisition.html` for the printable rendering.

Supplemental cards do not count toward deck size or deckbuilding value, are not shuffled into the deck, and are not cards in play.

---

## Component set

An Inquisition deck uses:

1. one selected Leader Card: **Grand Inquisitor** or **Witch Hunter**;
2. one **Inquisition Doctrine** reference;
3. one **Purge Reference**;
4. one shared **Conviction Tracker** placed beneath the Leader Card.

No token or separate marker is used. The Leader Card itself indicates Conviction.

The five supplemental cards and twelve playable cards total seventeen card faces, fitting on two standard 3 × 3 Letter-size sheets with one unused slot and no duplex alignment.

---

## Shared Leader Card text

Both leaders include:

> **Conviction:** Maximum 4. The first time each turn one or more opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction.
>
> **Condemnation:** In battles involving you, opposing played battle-drawn cards go to their Graveyard after the battle instead of discard.
>
> **Purification:** At the start of the opponent's turn, after their normal draw attempt, if they draw no cards because their deck and discard pile are empty, you win.

The references contain the complete Condemnation, Blasphemy, Purification, and Purge wording.

---

## Grand Inquisitor

**Faction:** Inquisition  
**Card type:** Supplemental Leader Card  
**Player-facing phrase:** *We judge. We purge.*

> **Conviction:** Maximum 4. The first time each turn one or more opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction.
>
> **Condemnation:** In battles involving you, opposing played battle-drawn cards go to their Graveyard after the battle instead of discard.
>
> **Final Judgment:** Once per turn after you win a battle, you may Purge immediately without using the Action opportunity. Reduce its Conviction cost by 1, minimum 1.
>
> **Purification:** At the start of the opponent's turn, after their normal draw attempt, if they draw no cards because their deck and discard pile are empty, you win.

### Production direction

- Use `images/grand inquisitor.png`.
- Preserve the tall black robes, black felt buckle hat, pale face, thurible, and tribunal atmosphere.
- Emphasize stillness, authority, and judgment.

---

## Witch Hunter

**Faction:** Inquisition  
**Card type:** Supplemental Leader Card  
**Player-facing phrase:** *You ran. I followed.*

> **Conviction:** Maximum 4. The first time each turn one or more opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction.
>
> **Condemnation:** In battles involving you, opposing played battle-drawn cards go to their Graveyard after the battle instead of discard.
>
> **Relentless Pursuit:** Once per turn, after an opponent loses a battle they initiated against you, you may spend 2 Conviction. If you do, end their turn, then move one space toward their Heartland. If this starts a battle, resolve it immediately; you are the attacker, and neither player may play an Action before it.
>
> **Purification:** At the start of the opponent's turn, after their normal draw attempt, if they draw no cards because their deck and discard pile are empty, you win.

### Production direction

- Use `images/witch hunter.png`.
- Preserve the worn brown buckle hat, forward lantern, travel coat, muddy boots, and field tools.
- Emphasize pursuit, exposure, and dangerous mobility.

---

## Inquisition Doctrine reference

**Card type:** Supplemental faction reference

> **Conviction:** Maximum 4. The first time each turn one or more opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction.
>
> **Condemnation:** In battles involving you, opposing played battle-drawn cards go to their owner's Graveyard after the battle instead of discard. Hand commitments already go to the Graveyard. Unplayed battle-drawn cards are discarded normally.
>
> **Blasphemy:** Whenever the opponent plays a card with the **Arcane** trait, gain 1 Conviction outside the normal once-per-turn limit, up to the maximum.
>
> The Arcane trait is distinct from Arcane faction allegiance.
>
> **Purification:** At the start of the opponent's turn, after their normal draw attempt, if they draw no cards because their deck and discard pile are empty, you win. Failed battle draws and card-effect draws do not trigger Purification.

---

## Purge Reference

**Card type:** Supplemental faction reference

> **Purge:** Instead of playing an Action card during the Action step, spend Conviction to choose one:

| Cost | Effect |
|---:|---|
| **1** | Send the top card of the opponent's discard pile to their Graveyard; or send up to two cards there with combined deckbuilding value 2 or less to their Graveyard. |
| **2** | Send one opposing Asset to its owner's Graveyard. |
| **3** | The opponent sends one card from hand to their Graveyard. |
| **4** | Look at the opponent's hand. Send one card to their Graveyard. |

> **Final Judgment:** After the Grand Inquisitor wins a battle, they may Purge once per turn without using the Action opportunity and reduce its Conviction cost by 1, minimum 1.

---

## Sliding Conviction Tracker

**Card type:** Supplemental resource tracker  
**Format:** Standard 2.5 × 3.5-inch card placed directly beneath either Leader Card.

### Use

The Leader Card slides vertically over the tracker:

- **0 Conviction:** Leader and tracker fully aligned; the tracker is covered.
- **1–4 Conviction:** Slide the Leader upward until its bottom edge aligns with the matching registration line.

The Leader Card's bottom edge is the pointer. No token or marker is used.

### Tracker face

The tracker should include:

- a clear **Inquisition Conviction** title;
- registration lines for **1**, **2**, **3**, and **4 Maximum Conviction**;
- a brief alignment instruction;
- black, charcoal, ash, iron, smoke, parchment, and candle-gold visual language.

### Physical testing watchlist

- Verify that all four raised positions are distinct.
- Confirm that the Leader Card remains stable and legible at 4 Conviction.
- Test sleeved and unsleeved use.
- Confirm ordinary handling does not shift the displayed value.
- Consider a shared oversized sleeve or player-board channel only if loose cards prove unreliable.

---

## Print-sheet integration

`faction-sheets/inquisition.html` contains:

- all twelve playable Inquisition cards;
- Grand Inquisitor;
- Witch Hunter;
- Inquisition Doctrine;
- Purge Reference;
- one sliding Conviction Tracker.

The source renders standard 2.5 × 3.5-inch cards on two Letter-size 3 × 3 sheets. Supplemental cards are open information and do not use the normal playable-card back.
