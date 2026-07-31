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

Individual cards may reduce the watermark strength without modifying the approved source artwork by overriding:

```css
--parchment-opacity: 0.72;
```

The default is `1`, preserving the approved source coloration and marking strength.
