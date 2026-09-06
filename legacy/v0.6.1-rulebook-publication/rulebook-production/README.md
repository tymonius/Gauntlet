# Rulebook production rebuild

This directory extends the publication system approved in PR #357. It does not define a new Rulebook design.

## Binding design source

The following files are the literal production template:

- `../rulebook-design/build_proofs.py`
- `../rulebook-design/proof.css`
- `../rulebook-design/render_proofs.mjs`

Production pages must preserve the approved page architecture, typography, spacing, proportions, artwork placement, cover treatment, Part openers, faction opener, Leader page, reference layouts, folios, running heads, and spread rhythm.

## Fidelity gate

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

The checkpoint has passed pixel-fidelity, half-letter geometry, artwork, typography, Governance Integrity, and the repository test suite. It remains part of CI so later production work cannot silently drift from the approved format.

## Complete production renderer

The complete renderer is intentionally split into three layers:

- `build_rulebook.py` reads the canonical `releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md`, converts its supported Markdown structures into semantic source tokens, and embeds the approved cover and back-cover templates.
- `paginate_rulebook.mjs` composes those tokens into the approved half-letter page components, manages deliberate recto starts and booklet padding, keeps headings with following material, builds dedicated faction and Leader pages, fills the final contents page numbers, and constructs saddle-stitch imposition.
- `render_rulebook.mjs` validates source parity, required chapters and Leaders, image loading, page geometry, overflow, isolated headings, page-count divisibility, and booklet ordering before rendering review artifacts.

The review artifact contains:

- the restrained-color half-letter reader PDF;
- the grayscale-compatible color booklet PDF imposed on Letter landscape;
- every individual reader page;
- every logical reader-facing spread;
- every imposed sheet side in color; and
- every imposed sheet side under grayscale preflight.

A successful automated render is not visual approval. The full artifact must still be inspected page by page and spread by spread, followed by an actual-size duplex print, fold, and assembly test before the release PDFs or public links are replaced.

## Maintained scope

The live Browser Rulebook remains the governing player-facing content source. Browser changes are cosmetic only. DOCX and the separate grayscale Rulebook are retired.
