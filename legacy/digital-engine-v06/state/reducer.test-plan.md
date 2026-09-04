# Reducer Test Plan

Initial reducer tests should verify these cases.

## draw_card

- active player can draw during `turn_start`
- drawing advances phase from `turn_start` to `action_before_movement`
- inactive player cannot draw
- draw count must be positive
- drawing from a short deck only draws available cards

## reveal_space

- controller can reveal their own face-down Territory
- player cannot reveal opponent-controlled Territory
- already revealed space rejects reveal

## move_player

- active player can move one adjacent space during `movement`
- non-adjacent movement is rejected
- movement decrements movement remaining
- entering an opponent-occupied space changes phase to `battle`
- entering an opponent-controlled empty Territory marks capture pending

## end_turn

- only active player can end turn
- active player rotates
- turn increments
- new active player gets action and movement reset
