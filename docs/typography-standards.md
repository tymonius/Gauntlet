# Gauntlet Typography Standards

These are role assignments, not interchangeable serif options. A fallback appearing in a font stack does not change the role of that token.

## Canonical roles

| Role | Typeface/token | Intended use |
| --- | --- | --- |
| Structural web display | Georgia — `--font-display-web` | Public website `h1`/`h2`/`h3` structure and other large structural web headings. |
| Historical display | P22 1722 Pro — `--font-display-historical` | Card titles, the Gauntlet wordmark, and selected historically styled display text. P22 1722 Pro is used at its actual 400 weight; do not synthesize bold. |
| Reading/editorial | Adobe Caslon Pro — `--font-reading` | Rules, editorial prose, learning text, and other sustained reading. Normal prose uses 400; stronger Caslon weights and italics are reserved for hierarchy/emphasis such as subheads, strong emphasis, reminders, notes, examples, captions, and asides. |
| Flavor/accent | P22 Declaration Pro — `--font-flavor` | Rare decorative flavor: short accent words, title accents, and selected overlines. It is not a structural heading, reading, or interface face. |
| Interface | Inter — `--font-interface` | Navigation, controls, labels, metadata, utility text, filters, status text, and choice UI. Interface weights may vary for hierarchy. |

## Structural website headings

Georgia remains the structural website-heading face. Do not replace ordinary website headings with P22 1722 Pro or Declaration merely because those faces are more historical.

Do not allow browser-default heading/`strong` behavior to turn structural Georgia into unintended bold Georgia. Set the intended heading weight explicitly. The current large public-web heading treatment uses `font-weight: 500`, which preserves the regular Georgia appearance rather than making bold Georgia the default display face.

## Historical and decorative faces

P22 1722 Pro and P22 Declaration Pro are intentionally scarce. Their scarcity is part of the hierarchy:

- P22 1722 Pro identifies card-title/historical-display/wordmark roles.
- Declaration provides decorative flavor and accent, not ordinary structure.
- A heading should remain structurally clear without relying on Declaration text.

## Reading versus interface text

Use Caslon when the user is reading prose to learn rules, understand the game, or follow editorial explanation. Use Inter when the user is operating the interface: choosing, filtering, navigating, reading labels or metadata, or responding to status/UI feedback.

A component can therefore contain more than one typography role. For example, a chooser section may have a Georgia structural heading, Inter option labels and controls, and Caslon explanatory prose.

## Fallbacks are not roles

The canonical stacks in `design-tokens.css` include fallbacks for resilience. In particular, Georgia appears as a fallback for P22 1722 Pro, Adobe Caslon Pro, and P22 Declaration Pro. That does **not** mean those tokens are alternate ways to request Georgia. Use the token for the semantic role you intend.

## Implementation rule

Prefer these shared role tokens over page-local aliases for new work and migrations. Legacy pages may still contain local `--serif` / `--sans` definitions; those are implementation debt, not a competing typography standard.
