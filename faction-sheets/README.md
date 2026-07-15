# Gauntlet v0.6 Faction Sheets

**Status:** Working print-and-play sources for developing v0.6 faction packages and supplemental cards.

These browser-printable sheets are separate from the versioned v0.5 deckbuilder. They may use active v0.6 exact-text documents before canonical v0.6 data exists.

## Available sheets

- [`military.html`](military.html) — the twelve-card Military faction pool, General, Commandant, and the shared sliding Command tracker.

## Printing

1. Serve the repository from its root, for example with `python3 -m http.server 8000`.
2. Open `/faction-sheets/military.html`.
3. Print at **100% scale** on Letter paper.
4. Disable browser headers and footers.
5. Enable background graphics.
6. Cut cards to **2.5 × 3.5 inches**.

The sheets use a 3 × 3, nine-card page grid. Supplemental cards are open-information references and do not use the normal playable-card back.

## Military Command tracker

Place the Command tracker directly beneath the selected Military Leader Card:

- fully aligned and covered: **0 Command**;
- slide the Leader upward until its lower edge reaches the first line: **1 Command**;
- slide it to the second line: **2 Command**.

The Leader Card itself is the indicator. No separate Command token is required.

## Sources of truth

- `docs/Gauntlet_v0.6_Military_Card_Pool.md` governs playable Military exact text.
- `docs/Gauntlet_v0.6_Working_Rules.md` governs Command and Orders.
- `docs/Gauntlet_v0.6_Military_Supplemental_Cards.md` governs the Military leader and tracker component specification.
- `docs/Gauntlet_v0.6_Leader_Design_Bible.md` governs leader art direction.

The HTML is a production rendering source, not independent canonical game data. When rules text changes, update the authoritative document first and then synchronize the sheet.
