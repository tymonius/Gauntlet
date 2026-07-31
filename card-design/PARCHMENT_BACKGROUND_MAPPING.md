# Card parchment background mapping

The playable-card mockup system uses seven separate approved full-resolution parchment sources stored as base64-encoded WebP data under:

`images/artwork/card-backgrounds/`

- `neutral.webp.b64`
- `military.webp.b64`
- `diplomats.webp.b64`
- `financiers.webp.b64`
- `intelligence.webp.b64`
- `mystics.webp.b64`
- `inquisition.webp.b64`

These are the separate high-resolution sources created before the temporary low-resolution sprite and grid implementations. The sprite, grid, and grid chunks remain historical artifacts only and are not used by the card mockup system.

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

`card-design.js` fetches only the source required by each faction, decodes its base64 text into the original `image/webp` bytes, and caches one object URL per faction. It does not draw the image onto a canvas, crop it into an intermediate panel, alter its pixels, normalize contrast, or re-encode it.

`card-parchment.css` displays that untouched source with `background-size: cover` and `background-position: center center`. The browser scales the image proportionally until either its height or width fills the card interior. Any small excess on the opposite axis is cropped symmetrically around the card midpoint, while the source aspect ratio is preserved.

There is no faction-specific scale, offset, opacity adjustment, blend mode, filter, tint, or procedural wash. Window resizing changes only the browser's display scale and never regenerates the image.

The plain `--card-parchment` color is only a loading and failure fallback. A successfully loaded parchment is opaque, appears at full source opacity, and completely replaces that fallback.

The procedural paper wash previously supplied by `.card-interior::after` remains disabled because the approved parchment sources already contain their own paper texture and coloration.
