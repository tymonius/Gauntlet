# Gauntlet v0.7.0 — Universal Reference Copy

> **Player-aid copy, not shared-rule authority.** This file is deliberately authored for compact table lookup. It is audited against the complete v0.7.0 authorities and does not define mechanics independently.
>
> Audit authorities: `rulebook/player-facing/current-rulebook.md` and `game-data/current-game.json`.
>
> Recheck against: Your Turn; Movement and Position; Onset; Battle Sequence and Outcome; The Aftermath; Withdrawal and Retreat; Front Line, Occupation, and Capture; Running the Gauntlet.

## Front — Turn & Battle

### Turn Sequence

1. **Capture** — Capture a Territory / Advance Front Line, if applicable.
2. **Draw** — Draw 1 card.
3. **Opening** — You may take your Action here.
4. **Movement** — Advance, Hold, or Fall Back. Resolve any battle immediately.
5. **Denouement** — If you did not take your Action in Opening, you may take it here.
6. **Cleanup** — Resolve end-of-turn effects and discard down to your Hand limit.

You take **1 Action total per turn**, during either Opening or Denouement. Each phase permits at most **1 Action**, even when you gain Additional Actions.

### Movement

Resolve movement **one Position at a time**. When movement initiates a battle, that movement sequence ends and any unused movement from it is lost.

### Before the Battle

When movement enters the opponent's Position, it initiates a battle and immediately enters **Onset**. Establish the attacker, defender, contested Position, and attacker's previous Position. If the battle proceeds, resolve remaining Onset effects before setting Gambits.

### Battle Sequence

1. **Onset**
2. Set **Gambits**.
3. Set Hands aside and form **3-card Reserves**.
4. Reveal Gambits.
5. Choose **Tactics**.
6. Reveal Tactics.
7. Determine the **Outcome**.
8. Resolve the **Aftermath**.

## Reverse — Results & Control

### Outcome

Higher battle total wins. **Defensive Edge** wins ties. Otherwise, each player rolls 1 unmodified die; higher roll wins; reroll ties.

### Battle Result

- Losing attacker → returns to the Position they entered from.
- Losing defender → retreats 1 Position toward their own end.
- Winning attacker → takes the contested Position.
- Winning defender → remains there.

### Battle Cards

**Gambits → Graveyard.** Tactics and cards remaining in Reserve → **Discard Pile**.

### Withdrawal

During Onset, withdrawal ends the battle sequence: no Gambits, battle result, or Aftermath. After Onset has completed and the battle proceeds to Gambits, a later withdrawal finishes the remaining non-result Aftermath steps and clears committed battle cards using their standard destinations.

### Front Line & Capture

**Front Line** = your continuous line of controlled Territories from your own end.

At the start of your turn, if you occupy an opponent's Territory, rotate that Territory card to face you to capture it. If doing so would create a non-continuous line of controlled Territories, instead capture the next Territory past your Front Line: **Advance Front Line 1**.

Capture changes control of at most **1 Territory per turn**. **Occupation** alone does not change control.

### Run the Gauntlet

**Capture the Territory at the opponent's end**, or force the opponent to make a **Last Stand** and win the resulting battle.

### Last Stand

A Last Stand can be forced while you occupy the final Territory, before you capture it. After the opponent retreats beyond their end, force them to make a Last Stand with a **new legal Advance beyond the Gauntlet**.

The defender has **Defensive Edge**.

