# Card parchment background mapping

The playable-card mockup system uses one 3 × 3 base64-encoded WebP grid stored in four consecutive text chunks under:

`images/artwork/card-backgrounds/`

- `parchments-grid.webp.b64.0`
- `parchments-grid.webp.b64.1`
- `parchments-grid.webp.b64.2`
- `parchments-grid.webp.b64.3`

The complete grid is 1200 × 1680 pixels. Each occupied faction panel is 400 × 560 pixels. The earlier vertically stacked sprite remains in the artwork directory for historical reference but is not used; its 240 × 336 pixel panels did not retain enough watermark detail at card size.

## Grid mapping

| Faction | Grid position | CSS position |
| --- | --- | --- |
| Neutral | column 1, row 1 | `0% 0%` |
| Military | column 2, row 1 | `50% 0%` |
| Diplomats | column 3, row 1 | `100% 0%` |
| Financiers | column 1, row 2 | `0% 50%` |
| Intelligence | column 2, row 2 | `50% 50%` |
| Mystics | column 3, row 2 | `100% 50%` |
| Inquisition | column 1, row 3 | `0% 100%` |

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

`card-design.js` fetches the four chunks once, concatenates them in numeric order, decodes the complete WebP into a single `image/webp` Blob, and assigns the cached object URL to `--parchment-image`. Window resizing only reruns card fitting and never reloads or replaces the parchment.

The plain `--card-parchment` color is only a loading and failure fallback. The successfully loaded grid is opaque, appears at full source opacity, and completely replaces that color. It is not blended, faded, washed, or placed on a translucent overlay.

The procedural paper wash previously supplied by `.card-interior::after` remains disabled because the approved parchment sources already contain their own paper texture and coloration.
