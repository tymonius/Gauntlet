# Rulebook design proofs

Internal, non-production visual proofs for the v0.6.1 Rulebook design pass tracked in issues #333 and #353.

## Approval gate

The full Rulebook, Reference Guide, reader PDF, editable document, imposed booklet, and live Browser Rulebook must not be generated from or replaced by this design until the representative proofs are visually approved.

## Proof set

The proof workflow expands the compressed proof payloads with `build_proofs.py`, then renders:

- `print-proof.html` — eight half-letter pages: front cover, contents/reading guide, introductory page, shared-rules page, faction opener, Leader page, quick-reference page, and back cover;
- `browser-proof.html` — responsive translation of the same hierarchy and components for screen reading; and
- `proof.css` — shared proof-only typography, color, spacing, rules-panel, faction, Leader, reference, cover, and page-furniture grammar.

The expanded files and generated PDF/screenshots exist only in the workflow workspace and uploaded review artifact. Generated proof artifacts are not committed and do not alter production release files.

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

## Review standard

Automated checks establish only that the pages render at the intended dimensions, contain the required content and artwork, and do not mechanically overflow. They do not constitute design approval. The proof artifact must be reviewed visually at actual size before the design proceeds to full-document production.
