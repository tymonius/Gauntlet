# Gauntlet Typography Guidance

Gauntlet has several typefaces available, but they are not a mandate to remap every surface into abstract typography roles. Established public surfaces should keep their proven treatment unless a redesign is intentional and visually reviewed.

## Shared typefaces

| Typeface | Typical use |
| --- | --- |
| Georgia | Primary public-site and browser-document serif. |
| Inter | Interface text and ordinary public-site copy. |
| P22 1722 Pro | Available historical display face for deliberately styled uses such as card-title or specimen work. |
| Adobe Caslon Pro | Available editorial/print serif when a surface intentionally calls for it. |
| P22 Declaration Pro | Rare decorative accent face. |

Fallbacks in `design-tokens.css` are resilience stacks, not instructions to substitute one face for another.

## Start Playing baseline

The v0.6.1 Start Playing surface established a simple Georgia/Inter treatment that should be preserved:

- Georgia for the large structural headings, faction names, Leader names, selected-choice headings, and hero lede.
- Inter for ordinary explanatory copy, controls, labels, metadata, and the rest of the interface.

Do not migrate Start prose to Caslon or option names to Inter merely to satisfy a generalized role taxonomy. Changes to this established hierarchy should be intentional visual design changes.

## Browser Rulebook

The v0.6.1 Browser Rulebook historically added a special publication layer that mixed Georgia, Adobe Caslon Pro, P22 1722 Pro, and Inter. That historical implementation is useful provenance, but it is not a requirement for the current browser Rulebook.

The current browser treatment is intentionally simpler:

- Georgia for the document itself: headings, body rules text, part labels, Leader headings, and other book-like content.
- Inter for navigation, search, buttons, metadata, chapter numbers, and other interface elements.

This simplification applies to the browser Rulebook. It does not redefine typography for printed cards, production PDFs, specimens, or other deliberately styled artifacts.

## Implementation rule

Before changing typography on an established public surface, compare against the last known-good rendered treatment or its CSS rather than inferring intent from token names. Shared tokens are resources; the rendered hierarchy of the surface is the authority for maintenance unless a redesign is explicitly intended.
