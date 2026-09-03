# Gauntlet v0.6.1 Rulebook Publication Record

**Publication system approved:** PR #357  
**Complete production implementation:** PR #434  
**Physical booklet verification:** August 4, 2026  
**Publication integration:** PR #488

## Maintained outputs

The v0.6.1 Rulebook is maintained in three player-facing forms:

1. `releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.pdf` — 76-page half-letter color reader edition.
2. `releases/v0.6.1/Gauntlet_v0.6.1_Rulebook_Booklet.pdf` — 38 imposed Letter-landscape sides representing 19 duplex sheets.
3. `rulebook/` — responsive Browser Rulebook rendered directly from the canonical Markdown source.

The imposed booklet is full color but remains usable when printed in grayscale. The editable DOCX and separate grayscale-home-print Rulebook are retired and are not maintained outputs.

## Physical verification

The imposed booklet was printed at actual size on Letter paper in landscape, duplexed with **flip on short edge**, folded, assembled, and reviewed successfully.

The physical test confirmed:

- correct front and back cover placement;
- correct sheet-side and page ordering;
- correct orientation after duplex printing;
- usable fold and inner margins;
- no clipping at the trim or fold edges;
- readable body text and small utility text;
- clean restrained-color reproduction; and
- sufficient contrast and separation in grayscale.

## Automated validation

The maintained production workflow verifies:

- complete canonical source parity;
- 76 half-letter reader pages;
- 38 imposed Letter-landscape booklet sides;
- page dimensions and page-count divisibility;
- booklet ordering;
- overflow and isolated-heading prevention;
- all twelve dedicated Leader pages and artwork loading;
- approved typography and representative-page fidelity;
- color and grayscale review output; and
- Browser Rulebook presentation at desktop and mobile viewports.

## Publication rule

The canonical Markdown source remains authoritative. The reader PDF, imposed booklet PDF, and Browser Rulebook are derived outputs and must be regenerated after any accepted rules change that affects v0.6.1. Future releases should inherit this production system rather than reintroducing DOCX maintenance or a separate grayscale edition.
