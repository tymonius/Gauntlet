# Rulebook design proofs

Internal, non-production visual proofs for the v0.6.1 Rulebook design pass tracked in issues #333 and #353.

## Approval gate

The full Rulebook, Reference Guide, reader PDF, editable document, production booklet, and live Browser Rulebook must not be rebuilt from this design until the representative proofs are visually approved.

## Current proof set

`build_proofs.py` generates one coherent twelve-page half-letter specimen rather than a stack of unrelated sample pages:

1. front cover;
2. contents and reading guide;
3. Part I opener;
4. introductory learn-to-play page;
5. representative shared-rules page;
6. Part III opener;
7. Military faction opener;
8. dedicated General Leader page;
9. quick-reference page;
10. dense timing-and-destinations reference page;
11. publication notes and colophon; and
12. toner-saving back cover.

The workflow also renders:

- a reader-facing mockup showing the finished half-letter pages as covers and facing interior spreads;
- a real twelve-page saddle-stitch imposition on six Letter-landscape sheet sides, intended for duplex printing with short-edge flip;
- the twelve individual finished pages;
- a separate restrained-color player-facing Rulebook proof; and
- desktop and mobile Browser Rulebook specimens using the same hierarchy while retaining the site's screen-native behavior.

Generated PDFs and screenshots exist only in the Actions artifact. The proof sources do not replace production release files or player-facing pages.

## Revised design basis

### Page and printing

- Finished print page: 5.5 × 8.5 inches.
- Booklet stock: Letter landscape, duplex, short-edge flip, folded and saddle-stitched.
- Mirrored margins with a larger inner allowance at the fold.
- Grayscale is the default print condition because current playtest copies are expected to be produced primarily on home laser printers.
- The normal print back cover uses the toner-saving treatment rather than a full dark page.
- A separate player-facing PDF proof restores restrained site and faction color accents.
- Front-cover artwork is contained within its plate rather than cropped to fill it.
- Footer page numbers sit at the outside edge, separated from the section label.

### Typography roles

- **Georgia:** principal publication titles, chapter titles, headings, and structural display language so the Rulebook visibly belongs to gauntlet.run.
- **Adobe Caslon Pro:** sustained print reading, explanatory copy, rules prose, TOC entry text, Part-index descriptions, faction-stat values, and body-like legal or publication metadata.
- **P22 1722 Pro:** Part labels, table-of-contents Part labels, faction names, Leader names, and selected card names. It is not the default title face.
- **P22 Declaration Pro:** large non-essential decorative language only—flavor overlines, Leader mottos, and short cover lines. Its visual baseline is shifted slightly downward to align properly with surrounding type. It is not used for labels, Roman numerals, rules, or lookup text.
- **Inter:** restricted to true utility typography such as running heads, folios, compact labels, procedural numerals, navigation, and short machine-like markers. It is no longer the default for body-like TOC, index, faction-stat, colophon, or legal copy.

Font files are not stored in the repository. The proofs load the existing Adobe Fonts project and use the approved fallback stacks when that service is unavailable.

## Artwork status

The current repository sketches have opaque white backgrounds. For layout review only, the proof applies grayscale and multiply blending so the white rectangles recede against the paper.

This is **not** the final asset treatment. The hero sketch and every Leader sketch used in the finished Rulebook require true transparent backgrounds. Those source images must be edited and replaced as image assets before production publication. The proof must not be considered artwork-complete while it still depends on multiply blending.

## Review standard

Automated checks establish that:

- all twelve pages render at half-letter size;
- the reader mockup and imposed booklet render at Letter landscape;
- Inter is actually loaded where assigned;
- artwork loads;
- required publication and legal text is present;
- no page or spread mechanically overflows; and
- desktop and mobile browser specimens have no horizontal overflow.

These checks do not constitute design approval. The individual pages, reader-facing spreads, imposed sheets, grayscale behavior, color edition, typography, and actual-size reference pages must still be reviewed visually before full-document production begins.
