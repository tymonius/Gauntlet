# Deckbuilder rendered-card preview validation

Temporary implementation note for PR review.

- `node --check` passes for `deckbuilder/rendered-card-preview.js`.
- `node --check` passes for the revised `deckbuilder/mobile-card-preview.js`.
- The Deckbuilder already applies the v0.6.4 candidate overlay in `starter-decks.js`: 15 candidate cards, one retired v0.6.3 card, 142 active cards total.
- The rendered preview uses `card-design/card-review-render.html?card=<stable-id>`, the same production-render path used by Card Reference.
- Card and artwork inspection use the shared `card-reference/card-inspection.js` implementation.
