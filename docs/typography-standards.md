# Gauntlet Typography Guidance

Gauntlet's typography system should follow the hierarchy proven by the final-current v0.6.2 Browser Rulebook. That implementation gives each typeface a distinct job instead of treating the available serif faces as interchangeable stylistic options.

Established public surfaces may preserve a proven local treatment when it differs from this baseline. A maintenance change should not silently remap an established surface merely to make it conform to a generalized token scheme.

## Canonical type roles

| Role | Typeface / token | Primary use |
| --- | --- | --- |
| Structural display | Georgia — `--font-display-web` | Major document and website headings, chapter/section titles, and other large structural hierarchy. |
| Reading / editorial | Adobe Caslon Pro — `--font-reading` | Rules prose, explanatory prose, lists, blockquotes, and other sustained reading. |
| Heritage display | P22 1722 Pro — `--font-display-historical` | Gauntlet wordmark, principal historical/document-title treatments, part labels, Leader headings, and similarly deliberate heritage display text. |
| Interface | Inter — `--font-interface` | Navigation, search, controls, buttons, metadata, chapter numbers, utility labels, anchors, status text, and other operational UI. |
| Flavor accent | P22 Declaration Pro — `--font-flavor` | Rare decorative accents only. It is not the normal structural, reading, or interface face. |

These roles are modeled directly on the final-current v0.6.2 Browser Rulebook.

Fallbacks in `design-tokens.css` are resilience stacks, not alternate role assignments. Georgia appearing as a fallback for Caslon or P22 does not make those faces interchangeable.

## v0.6.2 Browser Rulebook baseline

The final-current v0.6.2 Browser Rulebook is the reference implementation for the canonical hierarchy. Preserve this treatment unless a redesign is explicitly requested:

- **Georgia** for structural Rulebook titles and headings.
- **Adobe Caslon Pro** for the hero lede, rules prose, lists, and blockquotes.
- **P22 1722 Pro** for the Gauntlet wordmark, principal Rulebook title treatment, part labels, TOC part labels, and Leader headings.
- **Inter** for navigation, search, buttons, metadata, chapter numbers, how-it-works labels, complete-rules labels, anchors, and other interface machinery.

This four-face hierarchy is intentional publication design, not legacy drift. Do not flatten it to Georgia-only, substitute one serif for another because it appears in a fallback stack, or reinterpret the hierarchy solely from generic HTML element names.

P22 Declaration Pro is available to the project but is not part of the ordinary v0.6.2 Browser Rulebook hierarchy.

## Weight and emphasis

Typeface choice and weight both carry hierarchy.

- **P22 1722 Pro:** use its actual regular display treatment (`400`) unless a separately reviewed design calls for something else. Do not synthesize bold merely because the element is a heading or `<strong>`.
- **Adobe Caslon Pro:** ordinary reading text should remain a normal reading weight. Italic, semibold, or bold treatments should communicate real emphasis or subhierarchy rather than become the default body treatment.
- **Georgia:** structural headings may use moderate weight for hierarchy, as in the v0.6.2 Rulebook; avoid allowing browser-default boldness to dictate the design accidentally.
- **Inter:** stronger weights are appropriate for compact interface hierarchy such as buttons, chapter numbers, labels, metadata, and navigation.

## Choose type by function, not by element

The same HTML element can serve different visual roles on different surfaces. Choose the typeface from what the text is doing:

- A long explanatory paragraph belongs in the **reading/editorial** role.
- A navigation item, control, status message, or metadata line belongs in the **interface** role.
- A major section heading belongs in the **structural display** role.
- A deliberately historical title, wordmark, part label, or Leader-name treatment may belong in the **heritage display** role.
- Decorative flavor should remain scarce enough that it reads as an accent.

Do not use P22 1722 Pro simply because something is large, Caslon simply because something is serif text, or Inter simply because something is clickable.

## Start Playing exception

The established Start Playing design predates this canonical Rulebook hierarchy and uses a simpler Georgia/Inter treatment. Preserve that proven surface unless Start is intentionally redesigned:

- **Georgia** for large structural headings, faction names, Leader names, selected-choice headings, and the hero lede.
- **Inter** for ordinary explanatory copy, controls, labels, metadata, and the rest of the interface.

Therefore, aligning the project typography guide with the v0.6.2 Rulebook does **not** mean mechanically converting Start prose to Caslon or replacing its established Georgia treatment with P22 1722 Pro.

## Implementation rule

Before changing typography on an established surface:

1. identify the last known-good rendered treatment or CSS;
2. identify the function of the text being changed;
3. use the v0.6.2 Rulebook hierarchy as the default model when no stronger established surface precedent exists;
4. preserve a proven surface-specific exception unless the change is an intentional redesign; and
5. visually review typography changes rather than relying on token names or automated assertions alone.

Shared type tokens are resources and vocabulary. They should make intentional typography easier to express, not force every existing surface into an identical font map.
