# Gauntlet

Gauntlet is a two-player strategic card game about competing institutions fighting for control of a shared battlefield.

## Current release

The current canonical playtest release is **v0.6.3**.

Player-facing entry points:

- [Start Playing](https://gauntlet.run/start/)
- [Browser Rulebook](https://gauntlet.run/rulebook/)
- [Factions](https://gauntlet.run/factions/)
- [Deckbuilder](https://gauntlet.run/deckbuilder/)
- [Card Reference](https://gauntlet.run/card-reference/)
- [Rules Arbiter](https://gauntlet.run/rules-arbiter/)
- [Current release](https://gauntlet.run/v0.6.3/)
- [Changelog](https://gauntlet.run/changelog/)

## Typography

Current public web surfaces follow the typography hierarchy established by the final-current v0.6.2 Browser Rulebook:

- **Georgia** for structural display and headings;
- **Adobe Caslon Pro** for ordinary reading, rules, explanatory, and teaching prose;
- **P22 1722 Pro** for deliberate heritage display such as the Gauntlet wordmark, part/Leader display, and card-title treatments;
- **Inter** only for genuine interface and utility text such as navigation, buttons, form controls, compact labels, metadata, status, and search;
- **P22 Declaration Pro** only for rare decorative accents.

Inter is intentionally minimized and is not the default site/body face. See [`docs/typography-standards.md`](docs/typography-standards.md) for the canonical implementation guidance.

## Repository notes

Release lifecycle and authority metadata live under `config/`. Current player-facing release artifacts live under `releases/v0.6.3-reconstructed/`; preserved historical and recovery material remains in its versioned/archive locations.

The project uses layered CI. Pull-request merge gates are intentionally narrower than full regression coverage; see [`docs/ci-quality-system.md`](docs/ci-quality-system.md).
