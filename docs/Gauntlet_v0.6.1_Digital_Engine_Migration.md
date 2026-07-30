# Gauntlet v0.6.1 Digital Engine Migration

**Status:** Active implementation plan  
**Source rules:** `releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md` and the six definitive v0.6.1 faction guides  
**Legacy engine:** v0.6.0 TypeScript state engine under `src/`

The v0.6.1 digital migration is a rules-engine change, not a terminology replacement. The current engine was completed against the v0.6.0 sequence and must remain testable while the v0.6.1 path is introduced.

---

## 1. Current v0.6.0 engine contract

The existing engine models battles through these stages:

1. `enter`
2. `hand_commit`
3. `battle_draw`
4. `battle_play_selection`
5. `special_reveal`
6. `normal_reveal`
7. `effects`
8. `dice`
9. `resolution`
10. `cleanup`

A participant currently stores:

- one `handCommit`;
- a `battleDraw` collection;
- one or more `battleDrawPlayed` cards;
- a snapshot called `initialBattleHand`;
- pass flags for the Hand commitment and Battle Hand play; and
- draw and play limits tied to the Battle Hand.

The public/private view layer exposes actions named:

- `commit_battle_hand_card`;
- `pass_battle_hand_commit`;
- `draw_battle_cards`;
- `play_battle_draw_card`; and
- `pass_battle_draw_play`.

Many card, faction, Territory, cancellation, information, cleanup, and replay handlers inspect those fields directly. They cannot be safely migrated by renaming the user-facing strings alone.

---

## 2. Required v0.6.1 engine contract

The authoritative battle sequence is:

1. `opening_effects`
2. `set_gambits`
3. `form_reserves`
4. `reveal_gambits`
5. `choose_tactics`
6. `reveal_tactics`
7. `resolve_battle`
8. `aftermath`

A v0.6.1 participant needs:

- an optional Gambit set from Hand;
- a temporary Reserve drawn after Gambits are set;
- zero or more separately identified Tactics chosen from Reserve or added from another permitted source;
- independent Gambit and Tactic pass/completion state;
- normal limits of one Gambit and one Tactic, with effect-driven increases;
- face state, reveal state, negation state, replacement history, source, role, and destination for each card in battle; and
- enough information to return a removed or replaced card to its actual source.

Normal destinations are role-based:

- Gambit → Graveyard;
- Tactic → Discard Pile;
- remaining Reserve → Discard Pile.

A card-specific rule may override the destination.

---

## 3. Migration constraints

### Preserve v0.6.0 while the revision is incomplete

The existing `loadV06CanonicalContent()` and v0.6.0 tests remain available. The new `loadV061CanonicalContent()` reads the v0.6.1 canonical source and validates the new battle metadata without silently changing existing game initialization.

### Version-gate behavior

New battle state, actions, views, and cleanup must be selected from `game.version`. A v0.6.0 game must continue to resolve through the old procedure until the v0.6.1 path is complete enough to replace it deliberately.

### Do not infer card behavior from prose at runtime

Canonical player-facing text remains the source of truth, but executable handlers must state their timing, targets, source restrictions, role restrictions, destinations, and unresolved-effect requirements explicitly.

### Keep physical role and printed heading separate

A card with a printed **Battle** effect may enter battle as either a Gambit or Tactic. Its physical role determines normal destination and role-sensitive interactions. Printed heading determines eligibility and effect text.

---

## 4. Implementation stages

### Stage A — canonical source and versioned contracts

- [x] Add typed v0.6.1 canonical battle metadata.
- [x] Add and test `loadV061CanonicalContent()` alongside the v0.6.0 loader.
- [ ] Add v0.6.1 battle state, participant, role, source, and public-view contracts.
- [ ] Add pure tests for normal limits, sequence, visibility, and role-based destinations.

### Stage B — core v0.6.1 battle procedure

- [ ] Initialize a v0.6.1 battle at `opening_effects` with fixed attacker and defender roles.
- [ ] Resolve or pass opening effects before allowing Gambits.
- [ ] Set Gambits in the applicable order.
- [ ] Form Reserves only after both Gambit choices finish.
- [ ] Reveal and resolve Gambits with explicit early priority and alternating shared timing.
- [ ] Choose all Tactics simultaneously per player in the applicable order.
- [ ] Reveal and resolve Tactics.
- [ ] Resolve pre-dice effects, dice, winner, retreat/occupation, and the ordered Aftermath.
- [ ] Apply role-based cleanup and remaining-Reserve cleanup.

### Stage C — views and player actions

- [ ] Add versioned actions for set/pass Gambit, form Reserve, choose/pass Tactics, and resolve reveal stages.
- [ ] Expose only legal choices to the priority player.
- [ ] Keep the player's own Reserve private and inspectable.
- [ ] Hide opposing face-down Gambits and Tactics except from authorized viewers.
- [ ] Keep face-up early reveals in battle until their normal resolution stage.

### Stage D — shared interaction systems

- [ ] Replacement cards inherit role and source requirements.
- [ ] Revisions do not reopen Surveillance, Interference, or reveal windows.
- [ ] Additional Tactics added after reveal enter face up and resolve only if timing remains.
- [ ] Negated cards remain in battle and keep normal destinations.
- [ ] Effect-caused withdrawal ends the battle without winner, loser, or retreat triggers.
- [ ] Aftermath resolves in the rulebook's nine-step order.
- [ ] Follow-up movement begins a new movement sequence and, when allowed, a new battle.

### Stage E — faction systems

- [ ] Military Command gain and Order timing.
- [ ] Diplomat opening Terms and mirror priority.
- [ ] Financier before-dice and Aftermath interactions.
- [ ] Intelligence separate Gambit and Tactic Surveillance/Interference windows.
- [ ] Mystics Rites, Invocation, Transmutation, Convergence, and Ritual completion/interruption.
- [ ] Inquisition Condemnation, Conviction, Purges, and Aftermath timing.

### Stage F — exact card migration

Migrate handlers by affected interaction family rather than alphabetically:

1. basic battle modifiers and advantage/disadvantage;
2. information and early reveal;
3. cancellation and negation;
4. replacement, revision, and additional Tactics;
5. withdrawal and battle-ending effects;
6. retreat, occupation, capture, and follow-up movement;
7. card destinations and Graveyard/Discard interactions;
8. copied and replayed effects;
9. Assets and Overlays used during battle; and
10. source-specific or faction-specific exceptions.

Every migrated handler must be tested against the exact v0.6.1 card text and at least one interaction with another timing family.

---

## 5. Completion gates

The digital engine is not v0.6.1-complete until all of the following pass:

- no v0.6.1 game state or player view exposes Battle Hand or hand-commitment terminology;
- the eight authoritative battle stages occur in order;
- normal Gambit, Tactic, and Reserve destinations are correct;
- attacker/defender roles persist through the Aftermath;
- withdrawal creates no winner or loser;
- all six faction procedures pass dedicated tests;
- all 122 playable titles either have an executable handler or are explicitly verified as requiring no special handler;
- all 25 Territories pass v0.6.1 interaction tests;
- public/private views reveal no hidden information improperly;
- deterministic replays preserve the same state and event log; and
- the complete TypeScript suite passes under both retained v0.6.0 fixtures and new v0.6.1 fixtures.

Only after these gates pass may the release manifest set `digital_engine_sync_confirmed` to `true`.
