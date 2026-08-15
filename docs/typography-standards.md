# Gauntlet Typography Standard

Gauntlet uses the typography hierarchy proven by the final-current v0.6.2 Browser Rulebook as the **sitewide standard**. The typefaces have distinct functional roles and are not interchangeable stylistic options.

The standard applies across current public web surfaces. Layouts and component design may differ by surface, but typography should express the same hierarchy unless a deliberate, reviewed exception is documented.

## Canonical type roles

| Role | Typeface / token | Primary use |
| --- | --- | --- |
| Structural display | Georgia — `--font-display-web` | Major page, document, section, chapter, card, and panel headings; structural hierarchy. |
| Reading / editorial | Adobe Caslon Pro — `--font-reading` | Normal public-site prose, rules text, explanatory and teaching copy, lists, blockquotes, descriptions, and other sustained reading. |
| Heritage display | P22 1722 Pro — `--font-display-historical` | Gauntlet wordmark, principal historical/document-title treatments, part labels, Leader headings/names where presented as display text, card-title display, and similarly deliberate heritage display. |
| Interface | Inter — `--font-interface` | Navigation, search, form controls, buttons, compact labels, metadata, status text, utility text, chapter numbers, anchors, and other operational UI. |
| Flavor accent | P22 Declaration Pro — `--font-flavor` | Rare decorative accents only. It is not a normal structural, reading, or interface face. |

These are the authoritative sitewide roles. They are not merely descriptive of the Rulebook; the Rulebook is the reference implementation from which the standard is derived.

Fallbacks in `design-tokens.css` are resilience stacks, not alternate role assignments. Georgia appearing as a fallback for Caslon or P22 does not make those faces interchangeable.

## Italic companions and designed exceptions

Italic is part of the hierarchy, not a generic afterthought. Georgia Italic and Adobe Caslon Pro Italic serve different functions because their roman companions serve different functions.

- **Georgia Italic** is the normal companion to Georgia roman inside structural display. It may be used when a heading contains a related but contrasting phrase or line that should feel softer, more expressive, or subordinate without becoming a different display role. The Start-page treatment `Your first game / starts here.` is the model: Georgia roman establishes the structure and Georgia Italic carries the companion phrase.
- **Adobe Caslon Pro Italic** is the reading/editorial subordinate voice. It is appropriate for reminder text, callout prose, captions, asides, quiet explanatory notes, and other secondary reading text that should remain clearly part of the prose system rather than becoming interface chrome.
- Neither italic treatment should be applied mechanically to every second line, every note, or every subordinate element. The content still has to perform the corresponding structural or editorial function.

These defaults **do not override deliberately designed display pairings**. P22 Declaration Pro remains available as a rare flavor accent and may intentionally pair with Georgia when a composition has been specifically designed around that contrast. The homepage `Run the / Gauntlet.` hero is the canonical example: `Run the` remains Georgia while `Gauntlet.` is Declaration Pro. Existing reviewed Declaration treatments, including the homepage hero and Declaration overlines, take precedence over the Georgia-Italic default and must not be normalized away merely to satisfy the general italic rule.

Likewise, a documented P22 1722 or Declaration treatment should remain intact when it is serving a deliberate heritage or flavor role. The italic companion rules are defaults for otherwise-unassigned structural and editorial emphasis, not a migration rule for replacing approved typography.

## Inter is deliberately scarce

Inter is **not** the default website or body typeface. It should be minimized and reserved for text that is genuinely interface-like or utilitarian.

Appropriate Inter uses include:

- primary and secondary navigation;
- buttons and form controls;
- search interfaces;
- short overlines, kickers, compact labels, and metadata;
- status, validation, and utility messages;
- compact statistics and machine-like values;
- chapter numbers, anchors, and similar navigational machinery.

Ordinary paragraphs, descriptions, explanatory text, teaching copy, faction descriptions, Leader descriptions, card/deck explanations, and other content intended to be **read** should normally use Adobe Caslon Pro instead.

A piece of text does not become interface text merely because it appears inside a card, chooser, link, or interactive component. Classify the text by what the reader is doing with it.

## v0.6.2 Browser Rulebook reference implementation

The final-current v0.6.2 Browser Rulebook is the reference implementation of the hierarchy:

- **Georgia** for structural Rulebook titles and headings.
- **Adobe Caslon Pro** for the hero lede, rules prose, lists, and blockquotes.
- **P22 1722 Pro** for the Gauntlet wordmark, principal Rulebook title treatment, part labels, TOC part labels, and Leader headings.
- **Inter** for navigation, search, buttons, metadata, chapter numbers, how-it-works labels, complete-rules labels, anchors, and other interface machinery.

This hierarchy is intentional publication design, not legacy drift. Do not flatten it to Georgia-only, substitute one serif for another because it appears in a fallback stack, or allow Inter to become the default body face merely because a page is interactive.

P22 Declaration Pro is available to the project but is not part of the ordinary v0.6.2 Browser Rulebook hierarchy.

## Weight and emphasis

Typeface choice, style, and weight all carry hierarchy.

- **P22 1722 Pro:** use its actual regular display treatment (`400`) unless a separately reviewed design calls for something else. Do not synthesize bold merely because an element is a heading or `<strong>`.
- **Adobe Caslon Pro:** ordinary reading text should remain at a normal reading weight. Italic is the preferred subordinate editorial voice for genuine reminders, callouts, captions, and asides; semibold or bold should communicate real emphasis rather than become the default body treatment.
- **Georgia:** structural headings may use moderate weight for hierarchy, as in the v0.6.2 Rulebook. Georgia Italic may pair with Georgia roman inside one deliberate heading composition. Avoid allowing browser-default boldness to dictate the design accidentally.
- **Inter:** stronger weights are appropriate for compact interface hierarchy such as buttons, numbers, labels, metadata, and navigation.
- **Declaration Pro:** preserve reviewed flavor/display uses. Do not replace an intentional Declaration treatment merely because Georgia Italic could also provide contrast.

## Choose type by function, not by element

The same HTML element can serve different roles on different surfaces. Choose the typeface from what the text is doing:

- A paragraph or description intended to be read belongs in the **reading/editorial** role.
- A reminder, aside, caption, or quiet callout that remains prose may use **Caslon Italic** as a subordinate reading voice.
- Navigation, controls, status, metadata, compact labels, and utility text belong in the **interface** role.
- A major section or panel heading belongs in the **structural display** role; a companion phrase within that structure may use **Georgia Italic**.
- A deliberately historical title, wordmark, part label, Leader-name treatment, or card-title treatment may belong in the **heritage display** role.
- Decorative flavor should remain scarce enough that it reads as an accent, but an existing designed Declaration pairing is a valid deliberate exception rather than typography drift.

Do not use P22 1722 Pro simply because something is large, Caslon simply because something is serif text, Inter simply because something is clickable, or italic simply because something is secondary.

## Sitewide implementation

For current public web surfaces, the default hierarchy is therefore:

- **Georgia** establishes structure, with **Georgia Italic** available for a paired structural phrase.
- **Caslon** carries the reading experience and should account for most ordinary prose, with **Caslon Italic** supplying selected subordinate editorial text.
- **P22 1722** supplies deliberate heritage/display moments.
- **Inter** handles the interface around the content and should remain visually scarce.
- **Declaration** appears only as an intentional accent, including approved Georgia + Declaration compositions such as the homepage hero.

Different surfaces should remain visually distinct through layout, spacing, density, imagery, color, and interaction—not by inventing separate body-font systems.

## Implementation rule

Before changing typography on a current public surface:

1. identify the function of the text being changed;
2. apply the canonical sitewide role above;
3. check the v0.6.2 Browser Rulebook when the intended hierarchy is unclear;
4. preserve any genuinely deliberate exception—including reviewed Declaration pairings—when it is documented and visually justified; and
5. visually review typography changes rather than relying on token names or automated assertions alone.

The shared type tokens are the canonical vocabulary for these roles.