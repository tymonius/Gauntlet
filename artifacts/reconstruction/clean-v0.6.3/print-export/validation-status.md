# Clean v0.6.3 print/export validation status

Status before merge: **candidate**.

The clean print/export bundle is bound to complete authority set `64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49` and its approved downstream canonical/starter outputs.

Validation requires:
- exact hashes for the certified Rulebook, six certified faction guides, clean canonical data, approved starter Decks, and clean Markdown renderer;
- normalized-text identity for the Rulebook and six faction-guide print copies;
- exact canonical text for all 128 playable cards and 25 Territories in the generated reference;
- all twelve approved starter Decks, independently recomputed at 30 cards / 60 value with legal allegiance, Unique, Territory, and Arena constraints;
- three JSON exports: byte-identical canonical data, byte-identical approved starter Decks, and a canonical-ID deck interchange schema;
- nine print-ready PDFs generated from the clean material, each independently loadable with its page count/hash recorded;
- no production analytics in generated HTML;
- no dependency on withdrawn v0.6.3 print/release candidates; and
- unchanged v0.6.1 public/current and publication locks.

The workflow uploads the generated package for review; generated print/export payloads are not committed into a release directory. Publication remains locked.
