# Gauntlet Typography System

**Status:** Active governing supplement  
**Parent framework:** [Gauntlet Visual Identity & Design System](Gauntlet_Visual_Identity_and_Design_System.md)  
**Live specimen:** [Typography specimen page](../typography/)

This document records the approved working type families, their roles, usage boundaries, implementation tokens, and the tests required before exact print and digital sizes are locked. It governs typography across cards, printed components, the rulebook, the website, browser tools, the digital implementation, packaging, and promotional material.

Font files are not stored or distributed in the repository. Website use is served through the existing Adobe Fonts project.

---

## 1. Family selection

**LOCKED family selection; PROVISIONAL initial production sizes**

| Role | Typeface | Primary uses |
|---|---|---|
| Brand lettering | Custom Gauntlet wordmark | Final logo and approved wordmark lockups only |
| Historical display | P22 1722 Pro | Card titles, selected historical headings, compact brand title text |
| Structural web display | Georgia | Website page and section headings that require reliable screen rendering |
| Reading and editorial | Adobe Caslon Pro | Card rules, rulebook body text, references, explanatory copy, captions, notes, examples, and callouts |
| Expressive flavor | P22 Declaration Pro | Short overlines, accent words, decorative sublines, and limited printed flavor treatments |
| Interface and utility | Inter | Navigation, controls, filters, labels, metadata, tables, validation, counters, and compact data |

P22 1722 Pro and P22 Declaration Pro are not interchangeable display faces. P22 1722 Pro carries repeatable title identity; Declaration is a scarce decorative accent.

---

## 2. Shared implementation tokens

The shared browser tokens are defined in [`design-tokens.css`](../design-tokens.css):

```css
--font-display-historical: "p22-1722-pro", Georgia, "Times New Roman", serif;
--font-display-web: Georgia, "Times New Roman", serif;
--font-reading: "adobe-caslon-pro", Georgia, "Times New Roman", serif;
--font-flavor: "p22-declaration-pro", Georgia, "Times New Roman", serif;
--font-interface: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

These role names should be reused across the website and browser tools rather than redefining type families by artifact.

---

## 3. P22 1722 Pro

**LOCKED role; PROVISIONAL scale and spacing**

Use for:

- ordinary card titles;
- long and short title stress tests;
- selected historical headings where a card-like identity is appropriate;
- the compact “Gauntlet” title in the website header until the final wordmark replaces it.

Rules:

- normal weight 400 is the default;
- do not synthesize bold;
- hierarchy should come from size, placement, color, and surrounding structure;
- do not add artificial distressing;
- do not use 1722 and another near-identical historical title face interchangeably;
- the italic is available for limited secondary display use, but it should not become the standard card-title treatment.

Long titles require a controlled fallback system based on tested size steps, not arbitrary per-card shrinking. The standard title size remains the default whenever the complete title fits comfortably. A title is reduced only after a true fit failure at the standard size.

The first 100% print review established that **Counterintelligence fits at the same 17 pt specimen title size used for Rallying Cry and New Recruits**. It should therefore remain at the standard size and should not trigger the long-title fallback.

---

## 4. Adobe Caslon Pro

**LOCKED role; PROVISIONAL scale and line spacing**

Available web styles:

- 400 normal and italic;
- 600 normal and italic;
- 700 normal and italic.

### 4.1 Normal styles

Use 400 for sustained rules and editorial reading. Use 600 for subheads, defined procedure labels, and moderate emphasis. Use 700 only for concise headings, defined terms, numbers, and genuinely important instructions.

Do not solve dense card text by indiscriminately reducing Caslon. First revise wording, remove redundant decoration, improve hierarchy, or adjust approved content proportions.

The first printed specimen supports the following provisional card-text scale:

- **7.1 pt** is the normal specimen body size and should be the default starting point;
- **6.1 pt** is the minimum fallback demonstrated by Counterintelligence;
- the minimum is used only when the complete text cannot otherwise fit after wording, hierarchy, spacing, and layout have been addressed;
- the minimum must never become the routine body size merely because a card is classified as dense.

The 6.1 pt specimen remained readable in the first print review, but it was visibly small. It therefore establishes a floor, not a target.

### 4.2 Italic styles

**LOCKED expressive role**

Caslon italic is the preferred secondary editorial voice for:

- reminders;
- notes;
- examples;
- callouts;
- captions;
- non-governing explanatory asides;
- short flavor or contextual passages where Declaration would be too decorative.

Caslon italic should communicate “supporting explanation” rather than “optional information.” Mechanically necessary text must remain fully legible and cannot depend on font style alone for its status.

Use normal Caslon for the governing rule and italic Caslon for the supporting layer. A short italic lead-in such as **Reminder**, **Note**, or **Example** may be set in 600 italic when additional hierarchy is needed.

On cards, reminder text should use the **same size and leading as the surrounding rules text**. Italics provide sufficient subordination; reminder text should not also be reduced merely to make it appear secondary. A reminder on a normal-density card therefore uses the normal body size, while a reminder on a genuinely minimum-size card uses the same minimum size as that card’s other rules text.

Avoid:

- long pages set entirely in italic;
- italicizing every piece of reminder text without another structural cue;
- using italic as the sole distinction between rules with different authority;
- excessive bold italic;
- using Declaration for ordinary reminders or notes.

---

## 5. Georgia and Declaration pairing

**LOCKED roles; PROVISIONAL per-page treatments**

Georgia remains the dependable structural heading face on the website. Declaration may accompany it in three controlled patterns:

1. **Primary pattern:** short Declaration overline above a complete Georgia heading.
2. **Feature pattern:** one Declaration accent word within a Georgia feature title.
3. **Secondary pattern:** Georgia heading with a short Declaration subline.

Do not use decorative initials or split the first word between typefaces. Declaration text should wrap responsively when space is genuinely insufficient and remain on one line when the container permits.

Declaration carries flavor, not essential navigation or interface meaning.

---

## 6. Inter

**LOCKED role; PROVISIONAL component scale**

Use Inter for:

- navigation and links;
- buttons and form controls;
- filter chips and tabs;
- metadata and production labels;
- costs, values, complexity, and card classifications where a utility face is appropriate;
- compact tables, counters, validation, and status messages;
- digital-game state labels.

Inter should preserve modern usability rather than imitate historical print. Uppercase and tracking are acceptable for short utility labels, but not for paragraphs or long instructions.

The first physical card specimen confirmed that the Action/Battle labels, cost, and footer metadata remained highly legible at their tested sizes. No enlargement is required solely for legibility, though final placement and hierarchy remain part of the card-front design process.

---

## 7. Hierarchy principles

**LOCKED**

- Rules and instructional text use mixed case and left alignment.
- Full justification is not used for card rules or narrow digital columns.
- Small capitals or uppercase may identify short mechanical labels, but the label remains a readable word.
- Bold is reserved for defined terms, numbers, and genuine priority.
- Italic is a supporting editorial voice, not a substitute for structural hierarchy.
- Historical character is concentrated in titles and selected accents; sustained reading and interaction prioritize clarity.
- Digital tools may translate print hierarchy without literally imitating parchment or card frames.
- No information may depend on typeface, italics, weight, or color alone when accessibility requires an additional label or structural cue.

---

## 8. Current specimen and test set

The internal [typography specimen page](../typography/) currently tests:

- P22 1722 Pro with short, typical, long, and multiword titles;
- P22 1722 Pro italic as a limited secondary display option;
- Adobe Caslon Pro at 400, 600, and 700;
- Caslon italic reminders, notes, and editorial callouts;
- Georgia paired with Declaration overlines, accent words, and sublines;
- Inter controls, labels, metadata, and validation states;
- 2.5 × 3.5 inch Neutral card specimens using **Rallying Cry**, **Counterintelligence**, and **New Recruits**.

The specimen page is an evaluation tool, not an approved card-front template.

The first printed review produced these specimen revisions:

- Counterintelligence now uses the standard 17 pt title size;
- normal body text remains 7.1 pt in the specimen;
- 6.1 pt is retained only as the demonstrated minimum fallback for dense text;
- New Recruits reminder text now matches its 7.1 pt body text;
- Inter labels and metadata remain unchanged because they printed clearly.

---

## 9. Required validation before locking sizes

The initial card values remain provisional until the typography is tested in the following additional contexts:

- more short and long card titles;
- sparse and dense dual-use card rules;
- reminder-bearing cards;
- Leader abilities;
- Territory text;
- faction-specific supplemental components;
- rulebook headings, procedures, examples, notes, tables, and captions;
- Deckbuilder filters, card lists, validation, and print output;
- website desktop and mobile widths;
- additional actual-size printed cards and reference sheets;
- low-ink and grayscale printing;
- accessibility and minimum-size review.

The card-title fallback steps, preferred rules size, minimum rules size, leading, paragraph spacing, label size, and reminder treatment should be locked together after the card-front prototype establishes the actual available text area.

---

## 10. Next typography decisions

1. Print the revised Rallying Cry, Counterintelligence, and New Recruits specimens at 100% to confirm the first-review corrections.
2. Test at least one card that genuinely fails at the standard 17 pt title size and define controlled fallback steps.
3. Test additional dense cards to confirm whether 7.1 pt can remain viable more often once the final card-front proportions are established.
4. Determine whether Action and Battle labels remain Inter or move to a Caslon small-cap treatment based on the full visual frame rather than legibility alone.
5. Apply the proven hierarchy to the first Neutral card-front design rather than treating the specimen frame as final.
6. Translate the same type styles into reusable rulebook and browser-tool components.
