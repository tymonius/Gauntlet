# Gauntlet Visual Identity & Design System

**Status:** Active working framework  
**Purpose:** Establish one coherent visual and interaction language for Gauntlet across cards, printed components, the rulebook, the website, browser tools, the digital implementation, the playmat, packaging, and promotional material.

This document defines the system architecture, decision framework, shared foundations, production deliverables, and implementation sequence. It does not replace production-specific specifications.

Related governing references:

- [Visual Design Language](Gauntlet_Visual_Design_Language.md) — approved card, component, faction-color, emblem, and layout decisions.
- [Illustration Art Direction](Gauntlet_Illustration_Art_Direction.md) — shared visual-world standards for characters, architecture, technology, environments, and scenes.
- [Illustration Color Addendum](Gauntlet_Illustration_Color_Addendum.md) — approved color-richness standard for illustrations.
- [Illustration Environmental Detail Guardrails](Gauntlet_Illustration_Environmental_Detail_Guardrails.md) — flags, signage, visible writing, scene density, and card-scale clarity.
- [Leader Design Bible](Gauntlet_v0.6_Leader_Design_Bible.md) — individual Leader silhouette, prop, pose, portrait, and miniature direction.

When a detailed production specification conflicts with this framework, resolve the conflict explicitly in the relevant governing document rather than allowing two parallel systems to persist.

---

## 1. Decision status

Every major design-system decision should be marked with one of three states:

- **LOCKED** — approved and expected to remain stable unless physical testing or production reveals a specific failure.
- **PROVISIONAL** — the direction is approved, but exact values, assets, or implementation details remain subject to prototype testing.
- **OPEN** — no final direction has been selected.

This framework records both approved principles and unresolved work. A section may contain a locked principle while leaving its exact production values open.

---

## 2. System objective

Gauntlet should look and behave like one product regardless of where a player encounters it.

A player moving between a printed card, the rulebook, the Deckbuilder, the Rules Arbiter, the digital game, and the website should recognize the same:

- typographic hierarchy;
- color relationships;
- faction identity;
- shape and border grammar;
- icon style;
- spacing rhythm;
- terminology;
- information hierarchy;
- material and illustration treatment;
- interaction states.

Consistency does not require every medium to imitate printed parchment literally. Each medium should translate the same underlying system according to its functional needs.

---

## 3. Core identity principles

### 3.1 Powder-and-parchment, not medieval fantasy

**LOCKED**

The visual identity should evoke a founding-document, gunpowder-era world of declarations, maps, ledgers, dispatches, neoclassical civic power, frontier conflict, secret correspondence, ritual practice, and early scientific experimentation.

Avoid visual drift toward:

- generic medieval-fantasy logos and blackletter;
- Gothic cathedral or crusader imagery as a universal style;
- steampunk machinery and brass clutter;
- modern military interfaces;
- themed-restaurant parchment effects;
- excessive scrollwork, shields, swords, crowns, and heraldic furniture used without a game-specific purpose.

### 3.2 Historical character with modern usability

**LOCKED**

The system may draw from eighteenth-century printed and engrossed documents, engraved currency, legal instruments, field maps, ledgers, and proclamations. It must still meet modern standards for legibility, hierarchy, accessibility, responsive behavior, and production reliability.

Historical influence should shape proportion, rhythm, material, and ornament. It should not justify cramped rules text, low contrast, unclear icons, or difficult interfaces.

### 3.3 Graphic identity and illustration remain distinct

**LOCKED**

The graphic system identifies faction, component type, hierarchy, state, and interaction. The illustration system communicates character, place, atmosphere, story, and material reality.

Faction colors belong primarily to borders, headings, icons, trackers, interfaces, and other player-facing graphic elements. They are not mandatory wardrobe colors for characters.

### 3.4 One grammar, multiple channels

**LOCKED**

Cards, rulebook pages, website sections, tool panels, digital-game zones, and packaging should share a recognizable grammar without forcing identical layouts onto unlike formats.

For example:

- a card title, rulebook heading, and website section title may share display-type characteristics without using the same size or line break;
- a faction border color may become an interface accent or tab indicator rather than a full-screen background;
- a printed cartouche may translate into a restrained digital badge rather than a literal ornamental plaque.

### 3.5 Function before decoration

**LOCKED**

Every border, panel, icon, divider, badge, texture, and ornament should support identity, hierarchy, state, or navigation. Decoration that competes with gameplay information should be removed.

---

## 4. Design-system architecture

The Gauntlet system is organized into five layers.

### 4.1 Brand assets

- primary wordmark;
- compact mark or monogram;
- one-color and reversed variants;
- favicon, app icon, social avatar, and small-size variants;
- card-back wordmark treatment;
- optional tagline and lockups.

### 4.2 Foundations

- typography;
- core neutral palette;
- faction palettes;
- semantic UI colors;
- spacing scale;
- line weights;
- corner and shape rules;
- surface and texture rules;
- icon construction rules;
- illustration presentation rules;
- accessibility standards.

### 4.3 Reusable components

- card frames and headers;
- rules panels and section labels;
- buttons and links;
- tabs and filters;
- badges and resource counters;
- callout boxes;
- tables and lists;
- navigation patterns;
- form controls;
- tooltips and status messages;
- diagrams, legends, and captions;
- token, tracker, and standee templates.

### 4.4 Channel applications

- playable cards and supplemental components;
- rulebook and reference sheets;
- website and browser tools;
- digital game client;
- playmat;
- print-and-play sheets;
- packaging and retail presentation;
- social, newsletter, press, and convention graphics.

### 4.5 Production assets and tokens

The system should eventually expose exact reusable values and assets rather than requiring each implementation to sample or recreate them independently.

Examples include:

- named color values for screen and print;
- typography styles and minimum sizes;
- standard spacing values;
- border and keyline weights;
- SVG emblem and icon files;
- approved textures;
- CSS custom properties;
- Illustrator or InDesign styles;
- export dimensions and naming conventions.

---

## 5. Brand system

### 5.1 Wordmark

**PROVISIONAL direction; OPEN final asset**

The primary wordmark should feel familiar to viewers of the Declaration of Independence without copying its title. The lettering should suggest a founding declaration charged with forward movement.

Current direction:

- custom historical lettering built from a controlled typographic base rather than generated fantasy calligraphy;
- an enlarged, ornamental initial **G**;
- supporting letters that remain compact, legible, and reproducible;
- eventual integration of a forward-moving stroke beginning at the G's crossmember, forming the crossbars of the **A** and **E**, and terminating in a restrained right-pointing arrow;
- no generic fantasy shields, crowns, gloves, swords, banners, or metallic beveling.

The movement stroke should be added only after the core lettering is approved.

### 5.2 Compact mark

**OPEN**

A compact mark is required for locations where the full wordmark cannot remain legible, including:

- favicons;
- mobile headers;
- app icons;
- token backs;
- small footers;
- social avatars;
- tiny digital references.

The compact mark may derive from the wordmark's G, but it must be evaluated as an independent small-size symbol rather than merely cropped from the full logo.

### 5.3 Brand asset package

The final logo package should include:

- horizontal primary wordmark;
- compact mark;
- black, white, and one-color versions;
- full-detail and simplified small-size versions;
- SVG master files;
- transparent PNG exports;
- print-ready vector exports;
- safe-area and minimum-size specifications;
- incorrect-use examples.

---

## 6. Typography framework

### 6.1 Roles

Gauntlet should use a small, intentional type family rather than unrelated fonts selected per artifact.

Required roles:

1. **Brand lettering** — the custom Gauntlet wordmark only.
2. **Display face** — card titles, major page titles, rulebook section openings, faction names, and prominent labels.
3. **Reading face** — card rules, rulebook body text, reference material, long-form website copy, and explanatory content.
4. **Interface face** — controls, filters, forms, metadata, compact tables, counters, and small digital labels.

One typeface may serve more than one role when testing shows that it performs well. The wordmark lettering should not automatically become a general-purpose display or body font.

### 6.2 Typographic principles

**LOCKED**

- Rules and instructional text use mixed case and left alignment.
- Full justification is not used for card rules or narrow digital columns.
- Small capitals may identify mechanical labels, but labels remain readable words rather than icon-only abbreviations.
- Bold is reserved for defined terms, numbers, and genuinely important instructions.
- Display typography may carry historical character; body and interface typography prioritize sustained reading.
- Digital tools may use a cleaner interface companion while preserving the same hierarchy and proportions.

### 6.3 Required specimens before selection

**OPEN**

Final font choices should be tested using:

- short and long card titles;
- dense dual-use card rules;
- Leader abilities;
- Territory text;
- rulebook headings, procedures, examples, and tables;
- website hero and section headings;
- Deckbuilder filters, card lists, and validation messages;
- mobile screen widths;
- actual-size printed cards and reference sheets.

The design guide should record licenses and embedding restrictions without distributing font files.

---

## 7. Color framework

### 7.1 Core neutral palette

**PROVISIONAL**

The shared palette should include named values for:

- primary dark ink;
- secondary muted ink;
- pale ivory;
- warm natural parchment;
- deeper parchment or aged-paper support tone;
- bronze or brass accent;
- dark neutral field for card backs and high-contrast applications;
- borders and divider lines;
- light and dark surfaces.

Textures and gradients should not substitute for clear base colors.

### 7.2 Faction palette

**LOCKED identity; OPEN exact values**

| Faction | Graphic color identity |
|---|---|
| Military | Crimson red |
| Diplomats | Royal blue |
| Financiers | Emerald green |
| Mystics | Deep violet |
| Inquisition | Antique gold / ochre |
| Intelligence | Charcoal / near-black |

Neutral materials use parchment, warm gray, ivory, and bronze rather than a seventh saturated faction color.

Each faction requires:

- primary screen value;
- dark and light supporting values;
- print-safe CMYK target;
- high-contrast text pairing;
- low-ink and monochrome treatment;
- color-blind validation;
- hover, selected, disabled, and subtle-background digital variants.

### 7.3 Semantic colors

**OPEN**

Digital interfaces also need colors for states such as:

- valid / success;
- warning;
- error / illegal state;
- information;
- selected;
- disabled;
- face down / hidden;
- inactive;
- unresolved / pending.

Semantic colors must remain distinguishable from faction colors through context, shape, labels, or placement. A red error state, for example, should not be mistaken for Military identity.

---

## 8. Shape and border language

### 8.1 General form

**PROVISIONAL**

The system should favor disciplined, document-like geometry:

- rectangles and bands;
- thin engraved rules;
- restrained cartouches for compact data;
- square or subtly softened internal corners;
- standard rounded physical card corners;
- consistent border and keyline relationships;
- clear alignment and repeated spacing.

Avoid:

- ornate fantasy plaques;
- irregular scroll shapes used as default containers;
- excessive bevels and metallic effects;
- unrelated corner styles across tools and documents;
- decorative frames that reduce usable content area.

### 8.2 Shape families to standardize

**OPEN**

The final system should define reusable shapes for:

- primary panels;
- secondary panels;
- title bands;
- badges;
- numeric medallions or cartouches;
- buttons;
- tabs;
- callouts;
- icon containers;
- faction headers;
- diagram labels;
- token and tracker fields.

The same family should be translated across print and screen rather than recreated independently.

---

## 9. Surface and material language

### 9.1 Approved material cues

**PROVISIONAL**

Gauntlet may draw from:

- laid or natural paper;
- black and dark-brown ink;
- engraved lines;
- warm wood;
- dark leather;
- bronze or brass;
- wax, seals, ledgers, maps, and dispatches where contextually appropriate.

### 9.2 Restraint

**LOCKED**

Material cues should remain subtle enough that text and controls feel clean. Avoid heavy fake aging, torn edges, repeated stains, noisy parchment overlays, embossed gradients, and decorative texture that interferes with legibility or compression.

Digital interfaces should suggest tactile materials through color, line, depth, and selective texture—not simulate a physical desk on every screen.

---

## 10. Iconography and emblems

### 10.1 Faction emblems

Detailed concepts remain governed by the [Visual Design Language](Gauntlet_Visual_Design_Language.md). Final production assets must form one coherent family.

**OPEN final vector assets**

All faction emblems should be:

- free-standing single-color symbols;
- readable at small card-icon size;
- comparable in visual weight and negative space;
- usable in monochrome and low-ink contexts;
- usable with or without a surrounding container;
- recognizable without faction color.

### 10.2 Functional icon family

**OPEN**

A shared icon family is needed for recurring game and interface concepts, including as appropriate:

- Action;
- Battle;
- Asset;
- Overlay;
- Territory control;
- movement;
- retreat and withdrawal;
- card draw;
- Discard Pile and Graveyard;
- faction resources;
- Proposals, Missions, Rites, Deeds, Orders, and other supplemental systems;
- hidden, revealed, inactive, canceled, and pending states.

Functional icons should supplement written labels where clarity matters. They should not silently replace canonical terminology.

### 10.3 Icon construction rules

The final icon guide should define:

- fill versus outline use;
- stroke weight;
- corner sharpness;
- optical size corrections;
- minimum size;
- clear space;
- light and dark variants;
- active, inactive, selected, and disabled states.

---

## 11. Layout, spacing, and hierarchy

### 11.1 Shared hierarchy

**LOCKED**

Every medium should clearly separate:

1. identity or title;
2. component or section classification;
3. primary content;
4. supporting instructions or explanation;
5. metadata and production information.

Mechanically important information should remain in predictable positions within each component family.

### 11.2 Spacing system

**OPEN exact scale**

A standard spacing scale should govern:

- card padding;
- rulebook columns;
- website sections;
- tool panels;
- form controls;
- captions;
- icon-to-label relationships;
- component safe areas.

The scale may use different absolute units in print and screen while retaining the same proportional rhythm.

### 11.3 Density

**LOCKED**

Do not solve dense content by indiscriminately shrinking type. First revise wording, remove redundant ornament, improve hierarchy, or adjust the component's approved content proportions.

All print components must be tested at final physical size. All digital interfaces must be tested at desktop and mobile widths.

---

## 12. Illustration integration

### 12.1 Presentation rules

The illustration guides govern subject matter and world accuracy. This system governs how illustrations enter layouts.

The final identity guide should specify:

- full-bleed versus framed use;
- standard artwork-window proportions;
- crop and focal-point requirements;
- minimum safe area around faces, weapons, hands, headwear, and important silhouettes;
- shadow and depth treatment;
- caption style;
- responsive behavior;
- color-grading limits;
- reuse across cards, web, rulebook, packaging, and social formats.

### 12.2 Full-image preservation

**LOCKED for approved hero and showcase assets**

Prominent artwork should not be casually cropped when the full composition and silhouette are part of the approved design. Responsive implementations should preserve visible extremities and intentional overflow wherever practical.

### 12.3 Faction color relationship

**LOCKED**

Illustration palettes remain scene- and character-driven. Faction identity is carried primarily by the surrounding graphic system.

---

## 13. Card and component application

The [Visual Design Language](Gauntlet_Visual_Design_Language.md) governs current card-specific decisions. The design-system work must turn those principles into tested production templates.

Required template families include:

- ordinary Neutral cards;
- ordinary faction cards;
- Assets;
- Overlays;
- Territories;
- Leader Cards;
- Proposals and ratified reverses;
- Missions, Rites, Deeds, Orders, and other faction components;
- double-sided supplemental references;
- universal standard card back;
- state-changing or information-bearing reverses;
- token, tracker, standee, and print-sheet layouts.

Each family should share the same underlying typography, border, icon, spacing, and metadata system while adapting to its specific function.

---

## 14. Rulebook and editorial application

**OPEN production template**

The rulebook and reference materials need a shared editorial system for:

- covers and title pages;
- section openings;
- subsection hierarchy;
- **How it works** explanations and **Complete rules**;
- numbered procedures;
- examples;
- notes, warnings, and edge cases;
- diagrams and captions;
- tables;
- glossary entries;
- cross-references;
- page furniture and folios;
- printable reference cards and sheets.

The rulebook should feel authoritative and readable, not like a decorative manuscript. Historical character should be concentrated in headings, rules, ornaments, and selected page furniture rather than applied uniformly to body text.

---

## 15. Website and browser-tool application

**OPEN migration plan; existing interfaces remain functional references**

The website, Deckbuilder, Card Reference, Rules Arbiter, playtest tools, and future interfaces should share:

- brand header and navigation treatment;
- typography styles;
- color variables;
- faction accents;
- buttons and links;
- cards and panels;
- form controls;
- tables and lists;
- badges;
- modals and drawers;
- validation and status messages;
- responsive spacing and breakpoints;
- focus, hover, selected, loading, error, and disabled states.

The web system should eventually expose reusable CSS variables and components rather than duplicating near-identical values across separate stylesheets.

Accessibility requirements include:

- keyboard navigation;
- visible focus states;
- sufficient color contrast;
- text alternatives for meaningful imagery;
- labels that do not depend on color alone;
- reduced-motion support;
- responsive text and control sizes.

---

## 16. Digital game application

**OPEN**

The digital implementation should translate the same system into a game-state interface for:

- player identity and faction;
- the six-Territory Gauntlet;
- hands, Decks, Discard Piles, Graveyards, and Asset banks;
- face-down and revealed cards;
- battle commitments and Battle Hands;
- pending choices and response windows;
- movement, occupation, capture, retreat, and Last Stand states;
- faction resources and supplemental components;
- logs, tooltips, help, and Rules Arbiter access.

Digital state should be communicated through more than color. Facing, labels, icons, borders, opacity, and motion may all support state recognition.

---

## 17. Physical components, playmat, and packaging

### 17.1 Physical components

**OPEN production system**

The shared design language should cover:

- faction and state tokens;
- resource trackers;
- control markers;
- Overlay and condition markers where needed;
- Leader standees and future miniature bases;
- punchboard and print-and-play sheets;
- storage labels and component organization.

### 17.2 Playmat

The playmat should use the shared zone, typography, icon, color, and border language while remaining subordinate to the cards and pieces placed on it.

### 17.3 Packaging and promotion

Future packaging and promotional material should use the same wordmark, type hierarchy, palette, illustration treatment, and component photography standards.

Required eventual assets include:

- box front, back, sides, and spine;
- component spread;
- sell sheet;
- convention signage;
- social-sharing images;
- newsletter graphics;
- press-kit assets;
- release thumbnails;
- retailer or crowdfunding images.

Existing approved hero and gameplay artwork may be reused where appropriate rather than commissioning redundant paintings.

---

## 18. Production deliverables

The design system is not complete until it produces reusable assets and templates.

### 18.1 Brand

- wordmark and compact mark suite;
- safe-area and minimum-size guide;
- favicon, app icon, social avatar, and sharing-image templates.

### 18.2 Foundations

- final font selections and licenses;
- typographic scale and styles;
- core, faction, and semantic color specifications;
- spacing scale;
- border, keyline, and corner standards;
- texture and material assets;
- accessibility results.

### 18.3 Icons

- final faction emblems;
- functional icon family;
- resource and state icons;
- SVG masters and raster exports;
- usage guide.

### 18.4 Print templates

- ordinary card fronts;
- special card and component fronts;
- card backs and reverses;
- rulebook template;
- reference-sheet template;
- token and standee sheets;
- print-and-play imposition and bleed standards.

### 18.5 Digital library

- shared CSS variables or design tokens;
- reusable UI component styles;
- icon package;
- responsive image rules;
- implementation examples for the website and tools;
- digital-game state specifications.

### 18.6 Asset management

- canonical file naming;
- source versus export folders;
- versioning rules;
- RGB and CMYK exports;
- standard dimensions;
- attribution and license records;
- manifest entries for approved production assets.

---

## 19. Implementation roadmap

### Phase 1 — Audit and foundations

- inventory current fonts, colors, borders, icons, textures, and component patterns;
- identify inconsistencies across cards, website, tools, rulebook, and print materials;
- lock the system's principles, terminology, and status labels;
- define the production test set.

### Phase 2 — Wordmark and core tokens

- complete the primary wordmark and compact mark;
- select the typography family;
- standardize the core and faction palettes;
- define spacing, border, keyline, corner, and material rules;
- publish initial digital and print tokens.

### Phase 3 — Card-front system

- build a Neutral dual-use card template;
- test one short-text and one text-heavy card at actual size;
- adapt the template to faction cards, Assets, Overlays, Territories, and Leaders;
- resolve art-to-rules proportions, metadata, and production tolerances.

### Phase 4 — Backs, emblems, and icons

- complete the universal card back;
- design Proposal and other necessary reverses;
- finalize faction emblems;
- create the functional icon and state family;
- validate monochrome, color-blind, low-ink, and small-size use.

### Phase 5 — Website and tool migration

- consolidate shared CSS variables and components;
- update the website header, panels, buttons, typography, and faction treatments;
- migrate the Deckbuilder, Card Reference, Rules Arbiter, playtest tools, and other interfaces;
- preserve responsive and accessibility behavior.

### Phase 6 — Rulebook and printed-material system

- create the editorial template;
- standardize procedures, callouts, examples, diagrams, tables, and references;
- update print-and-play sheets and supplemental components;
- create instructional graphics after the governing v0.6.1 procedures are locked.

### Phase 7 — Physical components and packaging

- design tokens, trackers, standees, and miniature-base markings;
- apply the system to the playmat;
- develop packaging and product-presentation assets;
- create promotional and press derivatives.

### Phase 8 — Quality control and maintenance

- test actual-size print legibility;
- test desktop and mobile interfaces;
- validate accessibility and color reproduction;
- document exceptions;
- keep the system synchronized as rules, components, and production needs change.

---

## 20. Immediate working priorities

The next visual-design work should proceed in this order:

1. complete the Gauntlet wordmark and compact mark;
2. define the initial typography and core color specimens;
3. build the Neutral card-front prototype using short and dense rules examples;
4. adapt the card-front system across component families;
5. design the universal card back and required reversible components;
6. finalize faction emblems and functional icons;
7. begin website, tool, and rulebook migration only after the foundations are stable enough to prevent repeated rework.

The playmat may be developed in parallel, but its zone, typography, icon, and shape choices should be reconciled with this system before final production.

---

## 21. Open questions register

The following are currently open or provisional and should be resolved through specimens and prototypes:

- final wordmark and compact mark;
- final display, reading, and interface typefaces;
- exact core, faction, and semantic color values;
- final faction emblems;
- functional icon family;
- spacing scale;
- panel, badge, cartouche, button, and tab shapes;
- texture and material assets;
- card-front production templates;
- card backs and reversible components;
- rulebook and reference templates;
- shared website and tool component library;
- digital-game state language;
- token, tracker, standee, and miniature-base system;
- packaging and promotional templates;
- asset naming, source, export, and versioning standards.

Approved decisions should move from this register into the relevant governing section and receive a **LOCKED** or **PROVISIONAL** status.