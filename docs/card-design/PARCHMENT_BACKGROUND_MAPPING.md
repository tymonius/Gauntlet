# Card parchment background mapping

The playable-card mockup system uses seven separate full-resolution PNG originals under:

`images/artwork/card-backgrounds/`

- `neutral-parchment-v2.png`
- `military-parchment-v2.png`
- `diplomats-parchment-v2.png`
- `financiers-parchment-v2.png`
- `intelligence-parchment-v2.png`
- `mystics-parchment-v2.png`
- `inquisition-parchment-v2.png`

These PNGs are the active parchment sources for the browser card reference, Deckbuilder previews and print views, and shared card renderers. The older base64 WebPs, multipart transport files, sprites, grids, extracted panels, and contrast-normalized variants remain historical artifacts only and are not used by the card mockup system.

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

`card-design.js` resolves and preloads the PNG for each faction, then assigns that direct image URL to `--parchment-image`. It does not decode base64, create an intermediate Blob or object URL, draw the image onto a canvas, alter contrast, re-encode the file, or generate a card-sized raster.

`card-parchment.css` displays the source with `background-size: cover` and `background-position: center center`. The browser scales the image proportionally until either its height or width fills the card interior. Any small excess on the opposite axis is cropped symmetrically around the card midpoint, while the source aspect ratio is preserved.

There is no faction-specific scale, offset, opacity adjustment, blend mode, filter, tint, or procedural wash. Window resizing changes only the browser's display scale and never regenerates the image.

The plain `--card-parchment` color is only a loading and failure fallback. A successfully loaded parchment is opaque, appears at full source opacity, and completely replaces that fallback.

The procedural paper wash previously supplied by `.card-interior::after` remains disabled because the approved parchment sources already contain their own paper texture and coloration.
