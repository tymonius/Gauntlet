# Rulebook design proofs

Internal, non-production visual proofs for the v0.6.1 Rulebook design pass tracked in issues #333 and #353.

## Approval gate

The full Rulebook, Reference Guide, reader PDF, editable document, production booklet, and live Browser Rulebook must not be rebuilt from this design until the representative proofs are visually approved.

## Iteration 2 proof set

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
12. back cover.

The workflow also renders:

- a reader-facing mockup showing the finished half-letter pages as covers and facing interior spreads;
- a real twelve-page saddle-stitch imposition on six Letter-landscape sheet sides, intended for duplex printing with short-edge flip;
- the twelve individual finished pages;
- a toner-saving alternative back cover; and
- desktop and mobile Browser Rulebook specimens using the same hierarchy while retaining the site's screen-native behavior.

Generated PDFs and screenshots exist only in the Actions artifact. The proof sources do not replace production release files or player-facing pages.

## Revised design basis

### Page and printing

- Finished print page: 5.5 × 8.5 inches.
- Booklet stock: Letter landscape, duplex, short-edge flip, folded and saddle-stitched.
- Mirrored margins with a larger inner allowance at the fold.
- Grayscale is the default print condition because current playtest copies are expected to be produced primarily on home laser printers.
- Color remains available on the Browser Rulebook and other screen surfaces where it carries useful identity without toner cost.
- The dark back cover remains a design option, accompanied by a toner-saving alternative for routine playtest printing.

### Typography roles

- **Georgia:** principal publication titles, chapter titles, headings, and structural display language so the Rulebook visibly belongs to gauntlet.run.
- **Adobe Caslon Pro:** sustained print reading, explanatory copy, rules prose, and reference notes.
- **P22 1722 Pro:** Part labels, table-of-contents Part labels, faction names, Leader names, and selected card names. It is not the default title face.
- **P22 Declaration Pro:** larger non-essential decorative language only—flavor overlines, Leader mottos, and short cover lines. It is not used for labels, Roman numerals, rules, or lookup text.
- **Inter:** running heads, folios, labels, tables, navigation, metadata, and other utility text. The render workflow installs and verifies Inter rather than relying silently on a system fallback.

Font files are not stored in the repository. The proofs load the existing Adobe Fonts project and use the approved fallback stacks when that service is unavailable.

## Artwork status

The current repository sketches have opaque white backgrounds. For layout review only, the proof applies grayscale and multiply blending so the white rectangles recede against the paper.

This is **not** the final asset treatment. The hero sketch and every Leader sketch used in the finished Rulebook require true transparent backgrounds. Those source images must be edited and replaced as image assets before production publication. The proof must not be considered artwork-complete while it still depends on multiply blending.

## Review standard

Automated checks establish that:

- all twelve pages render at half-letter size;
- the reader mockup and imposed booklet render at Letter landscape;
- Inter is actually loaded for utility text;
- artwork loads;
- required publication and legal text is present;
- no page or spread mechanically overflows; and
- desktop and mobile browser specimens have no horizontal overflow.

These checks do not constitute design approval. The individual pages, reader-facing spreads, imposed sheets, grayscale behavior, and actual-size reference pages must still be reviewed visually before full-document production begins.
