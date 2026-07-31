# Rulebook production rebuild

This directory extends the publication system approved in PR #357. It does not define a new Rulebook design.

## Binding design source

The following files are the literal production template:

- `../rulebook-design/build_proofs.py`
- `../rulebook-design/proof.css`
- `../rulebook-design/render_proofs.mjs`

Production pages must preserve the approved page architecture, typography, spacing, proportions, artwork placement, cover treatment, section openers, faction opener, Leader page, reference layouts, folios, running heads, and spread rhythm.

## Current fidelity gate

`build_fidelity_gate.py` creates an eight-page checkpoint:

1. approved front cover;
2. approved contents page;
3. approved Part I opener;
4. approved Game at a Glance page;
5. a new Setup page populated from the current canonical v0.6.1 Rulebook;
6. approved Part III opener;
7. approved Military faction opener; and
8. approved General Leader page.

Seven pages are reused unchanged from the approved proof. The fidelity workflow renders those pages in both the approved proof and the production checkpoint and requires their PNG hashes to match exactly. The new Setup page must use the same approved components, typography, dimensions, and overflow constraints.

This checkpoint exists to prevent another full-document implementation from drifting into a different publication format.

## Next gate

The complete Rulebook must not be generated until this representative checkpoint is visually approved. After approval, the same page-building functions and stylesheet will be extended section by section, with explicit checks for orphaned headings, logical facing-page spreads, booklet divisibility, grayscale compatibility, and physical duplex assembly.

The live Browser Rulebook remains the governing player-facing content source. Browser changes are cosmetic only. DOCX and the separate grayscale Rulebook are retired.
