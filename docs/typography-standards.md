# Gauntlet Typography Guidance

Gauntlet has several typefaces available, but they are not a mandate to remap every surface into abstract typography roles. Established public surfaces should keep their proven treatment unless a redesign is intentional and visually reviewed.

## Shared typefaces

| Typeface | Typical use |
| --- | --- |
| Georgia | Primary public-site serif and structural Browser Rulebook title face. |
| Inter | Interface text and ordinary public-site copy. |
| P22 1722 Pro | Historical display face, including the Browser Rulebook wordmark, part labels, and Leader headings. |
| Adobe Caslon Pro | Editorial reading face used for Browser Rulebook prose. |
| P22 Declaration Pro | Rare decorative accent face. |

Fallbacks in `design-tokens.css` are resilience stacks, not instructions to substitute one face for another.

## Start Playing baseline

The v0.6.1 Start Playing surface established a simple Georgia/Inter treatment that should be preserved:

- Georgia for the large structural headings, faction names, Leader names, selected-choice headings, and hero lede.
- Inter for ordinary explanatory copy, controls, labels, metadata, and the rest of the interface.

Do not migrate Start prose to Caslon or option names to Inter merely to satisfy a generalized role taxonomy. Changes to this established hierarchy should be intentional visual design changes.

## Browser Rulebook baseline

The final-current v0.6.2 Browser Rulebook is the preferred browser typography implementation. Preserve its established four-face hierarchy unless a redesign is explicitly requested:

- **Georgia** for structural Rulebook titles and headings.
- **Adobe Caslon Pro** for the hero lede, rules prose, lists, and blockquotes.
- **P22 1722 Pro** for the Gauntlet wordmark, Rulebook title treatment, part labels, TOC part labels, and Leader headings.
- **Inter** for navigation, search, buttons, metadata, chapter numbers, how-it-works labels, complete-rules labels, anchors, and other interface machinery.

This is an intentional publication hierarchy, not accidental legacy drift. Do not flatten it to Georgia-only or remap it from generalized design-token roles.

P22 Declaration Pro remains available as a decorative accent face but is not part of the ordinary v0.6.2 Browser Rulebook hierarchy.

## Implementation rule

Before changing typography on an established public surface, compare against the last known-good rendered treatment or its CSS rather than inferring intent from token names. Shared tokens are resources; the rendered hierarchy of the surface is the authority for maintenance unless a redesign is explicitly intended.
