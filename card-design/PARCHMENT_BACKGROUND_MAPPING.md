# Card parchment background mapping

The playable-card mockup system uses seven approved faction-specific parchment sources stored as base64-encoded WebP data under:

`images/artwork/card-backgrounds/`

- `neutral.webp.b64`
- `military.webp.b64`
- `diplomats.webp.b64`
- `financiers.webp.b64`
- `intelligence.webp.b64`
- `mystics.webp.b64`
- `inquisition.webp.b64`

The earlier combined sprite remains in the artwork directory for historical reference, but it is not used by the card mockup system. At only 240 × 336 pixels per faction frame, it did not retain enough watermark detail at print size.

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

`card-design.js` fetches each parchment source once, decodes it into an `image/webp` Blob, and assigns the resulting object URL to `--parchment-image` on every matching card. The object URL is cached for the life of the page, so window resizing only reruns card fitting and never reloads or replaces the parchment image.

The plain `--card-parchment` color is only a loading and failure fallback. A successfully loaded parchment is opaque, appears at full source opacity, and completely replaces that color. It is not blended, faded, washed, or placed on a translucent overlay.

The procedural paper wash previously supplied by `.card-interior::after` remains disabled because the approved parchment sources already contain their own paper texture and coloration.
