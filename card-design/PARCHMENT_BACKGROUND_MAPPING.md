# Card parchment background mapping

The playable-card mockup system uses one 3 × 3 base64-encoded WebP grid stored in four consecutive text chunks under:

`images/artwork/card-backgrounds/`

- `parchments-grid.webp.b64.0`
- `parchments-grid.webp.b64.1`
- `parchments-grid.webp.b64.2`
- `parchments-grid.webp.b64.3`

The complete grid is 1200 × 1680 pixels. Each occupied faction panel is 400 × 560 pixels. The earlier vertically stacked sprite remains in the artwork directory for historical reference but is not used; its 240 × 336 pixel panels did not retain enough watermark detail at card size.

## Grid mapping and visibility calibration

`card-design.js` extracts each occupied grid panel into its own opaque WebP Blob before assigning it to a card. This prevents the browser from repeatedly sampling and positioning the entire 3 × 3 grid for every card.

The approved sources vary substantially in line strength. The extracted panels therefore receive source-specific contrast normalization around each panel's own average paper color. This darkens weak watermark lines without changing opacity, applying a color wash, or substituting a new paper tone.

| Faction | Grid position | Contrast factor |
| --- | --- | ---: |
| Neutral | column 1, row 1 | `1.10` |
| Military | column 2, row 1 | `1.40` |
| Diplomats | column 3, row 1 | `1.50` |
| Financiers | column 1, row 2 | `1.12` |
| Intelligence | column 2, row 2 | `1.48` |
| Mystics | column 3, row 2 | `1.42` |
| Inquisition | column 1, row 3 | `1.00` |

Inquisition remains unadjusted because its marks already read clearly at card size. The Neutral treatment remains deliberately restrained.

## Supported selectors

Cards may select their parchment through either the established card class, a faction class, or a normalized `data-faction` value:

- Neutral: `.neutral-card`, `.faction-neutral`, `[data-faction="neutral"]`
- Military: `.military-card`, `.faction-military`, `[data-faction="military"]`
- Diplomats: `.diplomat-card`, `.diplomats-card`, `.faction-diplomats`, `[data-faction="diplomats"]`
- Financiers: `.financier-card`, `.financiers-card`, `.faction-financiers`, `[data-faction="financiers"]`
- Intelligence: `.intelligence-card`, `.faction-intelligence`, `[data-faction="intelligence"]`
- Mystics: `.mystic-card`, `.mystics-card`, `.faction-mystics`, `[data-faction="mystics"]`
- Inquisition: `.inquisition-card`, `.faction-inquisition`, `[data-faction="inquisition"]`

## Rendering behavior

`card-design.js` fetches the four chunks once, concatenates them in numeric order, and decodes the complete grid. Each faction panel is then cropped at its exact native 400 × 560 dimensions, contrast-normalized, encoded as an opaque WebP, and cached as a faction-specific object URL. Window resizing only reruns card fitting and never reloads, repositions, or regenerates the parchment panels.

The plain `--card-parchment` color is only a loading and failure fallback. A successfully extracted panel is opaque, appears at full opacity, and completely replaces that color. It is not blended, faded, washed, or placed on a translucent overlay.

The procedural paper wash previously supplied by `.card-interior::after` remains disabled because the approved parchment sources already contain their own paper texture and coloration.
