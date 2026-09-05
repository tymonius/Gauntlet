# Validation Test Plan

These are the first setup cases the eventual test runner should cover.

## Valid setup

- two players
- distinct player ids
- non-empty decks
- exactly three Territories each
- valid starting player
- opening hand less than or equal to deck size

## Invalid setup

- missing version
- more or fewer than two players
- duplicate player ids
- empty deck
- fewer than three Territories
- more than three Territories
- duplicate Territory selections
- starting player not in setup
- negative opening hand size
- non-integer opening hand size
- opening hand larger than deck
