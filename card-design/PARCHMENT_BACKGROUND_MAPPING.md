# Card parchment background mapping

The playable-card mockup system uses separate faction parchment sources stored as base64-encoded WebP data under:

`images/artwork/card-backgrounds/`

The five sources already rendering correctly remain unchanged:

- `neutral.webp.b64`
- `military.webp.b64`
- `diplomats.webp.b64`
- `intelligence.webp.b64`
- `inquisition.webp.b64`

Financiers and Mystics use replacements made directly from the newly supplied full-resolution originals:

- `financiers-uploaded.webp.b64.00` through `.03`
- `mystics-uploaded.webp.b64.00` through `.01`

The numbered text files are transport chunks only. `card-design.js` concatenates them before decoding one complete WebP for the faction. The replacements retain the originals' full 1061 × 1482 pixel dimensions. They were not resized, cropped, contrast-adjusted, filtered, sharpened, or drawn through a browser canvas.

The older sprite, grid, extracted panels, and contrast-normalized variants remain historical artifacts only and are not used by the card mockup system.

## Supported selectors

Cards select their parchment through either the established card class, a faction class, or a normalized `data-faction` value:

- Neutral: `.neutral-card`, `.faction-neutral`, `[data-faction="neutral"]`
- Military: `.military-card`, `.faction-military`, `[data-faction="military"]`
- Diplomats: `.diplomat-card`, `.diplomats-card`, `.faction-diplomats`, `[data-faction="diplomats"]`
- Financiers: `.financier-card`, `.financiers-card`, `.faction-financiers`, `[data-faction="financiers"]`
- Intelligence: `.intelligence-card`, `.faction-intelligence`, `[data-faction="intelligence"]`
- Mystics: `.mystic-card`, `.mystics-card`, `.faction-mystics`, `[data-faction="mystics"]`
- Inquisition: `.inquisition-card`, `.faction-inquisition`, `[data-faction="inquisition"]`

## Rendering behavior

`card-design.js` fetches only the source parts required by each faction, concatenates multipart sources in numeric order, decodes the base64 text into `image/webp` bytes, and caches one object URL per faction. It does not draw the image onto a canvas, crop it into an intermediate panel, alter contrast, or generate a card-sized raster.

`card-parchment.css` displays the source with `background-size: cover` and `background-position: center center`. The browser scales the image proportionally until either its height or width fills the card interior. Any small excess on the opposite axis is cropped symmetrically around the card midpoint, while the source aspect ratio is preserved.

There is no faction-specific scale, offset, opacity adjustment, blend mode, filter, tint, or procedural wash. Window resizing changes only the browser's display scale and never regenerates the image.

The plain `--card-parchment` color is only a loading and failure fallback. A successfully loaded parchment is opaque, appears at full source opacity, and completely replaces that fallback.

The procedural paper wash previously supplied by `.card-interior::after` remains disabled because the approved parchment sources already contain their own paper texture and coloration.
