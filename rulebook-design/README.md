# Rulebook design proofs

Internal visual proofs for the approved v0.6.1 Rulebook design pass tracked in issues #333 and #353.

## Approval status

The representative proof set has been visually approved and may now serve as the design basis for the full Rulebook, Reference Guide, reader PDF, editable document, production booklet, and live Browser Rulebook rebuild.

These proof sources still do not replace production release files or player-facing pages by themselves. They define the approved publication system that the production rebuild must carry forward.

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

Generated PDFs and screenshots exist only in the Actions artifact.

## Approved design basis

### Page and printing

- Finished print page: 5.5 × 8.5 inches.
- Booklet stock: Letter landscape, duplex, short-edge flip, folded and saddle-stitched.
- Mirrored margins with a larger inner allowance at the fold.
- Grayscale is the default print condition because current playtest copies are expected to be produced primarily on home laser printers.
- The normal print back cover uses the toner-saving treatment rather than a full dark page.
- A separate player-facing PDF restores restrained site and faction color accents.
- Front-cover artwork is contained within its plate rather than cropped to fill it.
- Footer page numbers sit at the outside edge, separated from the section label.

### Typography roles

- **Georgia:** principal publication titles, chapter titles, headings, and structural display language so the Rulebook visibly belongs to gauntlet.run.
- **Adobe Caslon Pro:** sustained print reading, explanatory copy, rules prose, TOC entry text, Part-index descriptions, faction-stat values, and body-like legal or publication metadata.
- **P22 1722 Pro:** Part labels, table-of-contents Part labels, faction names, Leader names, and selected card names. It is not the default title face.
- **P22 Declaration Pro:** large non-essential decorative language only—flavor overlines, Leader mottos, and short cover lines. Its visual baseline is shifted slightly downward to align properly with surrounding type. It is not used for labels, Roman numerals, rules, or lookup text.
- **Inter:** restricted to true utility typography such as running heads, folios, compact labels, procedural numerals, navigation, and short machine-like markers. It is no longer the default for body-like TOC, index, faction-stat, colophon, or legal copy.

Font files are not stored in the repository. The proofs load the existing Adobe Fonts project and use the approved fallback stacks when that service is unavailable.

## Approved artwork treatment

The current repository hero and Leader sketches have opaque white or cream source backgrounds. The approved v0.6.1 publication treatment uses grayscale or neutral rendering, increased contrast where needed, and `mix-blend-mode: multiply` so those high-key source fields visually disappear into the Rulebook's light paper surfaces while the drawn lines remain visible.

This is a deliberate rendering treatment rather than true alpha transparency. It is acceptable because every approved placement uses a controlled light paper background in the print, color-PDF, and Browser Rulebook systems. The sketches must not be moved onto dark, saturated, photographic, or otherwise uncontrolled backgrounds without first producing genuine transparent assets.

True transparent-background PNGs remain a desirable future asset cleanup, but they are no longer a blocker for the v0.6.1 production rebuild.

## Verification standard

Automated checks establish that:

- all twelve pages render at half-letter size;
- the reader mockup and imposed booklet render at Letter landscape;
- Inter is actually loaded where assigned;
- artwork loads;
- required publication and legal text is present;
- no page or spread mechanically overflows; and
- desktop and mobile browser specimens have no horizontal overflow.

Visual approval has been granted for the publication system demonstrated by this package. The production rebuild should preserve this hierarchy, spacing, typography, artwork treatment, grayscale behavior, restrained color edition, and booklet geometry unless a later review explicitly supersedes them.
