# Rulebook design proofs

Internal, non-production visual proofs for the v0.6.1 Rulebook design pass tracked in issues #333 and #353.

## Approval gate

The full Rulebook, Reference Guide, reader PDF, editable document, and imposed booklet must not be generated from this design until the representative proofs are approved.

## Proofs

- `print-proof.html` — eight half-letter pages: front cover, contents/reading guide, introductory page, shared-rules page, faction opener, Leader page, quick-reference page, and back cover.
- `browser-proof.html` — responsive translation of the same hierarchy and components for screen reading.
- `proof.css` — shared proof-only typography, color, spacing, rules-panel, faction, Leader, reference, cover, and page-furniture grammar.

## Locked design basis

- Finished print page: 5.5 × 8.5 inches.
- Future imposed booklet: Letter landscape, duplex, short-edge flip, folded/saddle-stitched.
- Mirrored margins with a larger inner margin for the fold/binding edge.
- P22 1722 Pro: selected historical print display.
- Adobe Caslon Pro: sustained reading, rules, notes, and reference copy.
- Georgia: browser structural headings.
- P22 Declaration Pro: short, rare accent lines only.
- Inter: utility labels, navigation, tables, folios, and metadata.
- Hero sketch: integrated front-cover artwork.
- Complete copyright and playtest-use statement: back cover.

Font files are not stored in the repository. Browser proofs load the existing Adobe Fonts project and retain approved fallback stacks through `design-tokens.css`.
