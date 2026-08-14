# Clean v0.6.3 Deckbuilder validation status

Status before merge: **candidate**.

The Deckbuilder reconstruction is bound to complete authority set `64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49` through the validated clean downstream data.

Validation requires:
- exact canonical-data SHA-256 and approved starter-deck SHA-256;
- runtime raw-byte verification before parsing;
- exactly 128 playable cards, 25 Territories, six factions, and twelve Leaders;
- the clean 30-card minimum, 60-value maximum, three-Territory requirement, and one-Arena maximum;
- Neutral plus selected-faction card legality and Unique copy enforcement;
- all 12 approved starter Decks resolving exactly against the clean card and Territory pool;
- clean Start handoff into this Deckbuilder;
- noindex/no production analytics;
- no print/export implementation claim; and
- unchanged v0.6.1 public/current pointers.

Merging this candidate reconstructs Deck construction only. It does not publish v0.6.3.
