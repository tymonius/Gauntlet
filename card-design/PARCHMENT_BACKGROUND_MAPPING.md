# Card parchment background mapping

The playable-card mockup system uses the approved parchment sprite at:

`images/artwork/card-backgrounds/parchments.webp`

Sprite order, from top to bottom:

1. Neutral
2. Military
3. Diplomats
4. Financiers
5. Intelligence
6. Mystics
7. Inquisition

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

The plain `--card-parchment` color is only a load-failure fallback. The approved WebP is an opaque background image at full opacity and completely replaces that fallback whenever it loads. It is not blended with the fallback, faded, or placed on a translucent overlay.

The original procedural paper wash previously supplied by `.card-interior::after` is disabled because the approved parchment sources already contain their own paper texture and coloration.
