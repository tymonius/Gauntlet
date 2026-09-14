# Player's Guide Visual Pedagogy Map

This document is the layout and instructional-visual plan for the Gauntlet Player's Guide. It is not a second rules source. Rules meaning comes from `game-data/current-game.json` through the rules publication contract; this map describes how that meaning should be taught visually.

The governing editorial standard is `rulebook/publication/editorial-policy.md`.

## Objective

The finished Player's Guide should feel inviting, spacious, and finite while still teaching the shared game accurately on a first read.

The optimization target is **comprehension and momentum, not minimum page count**. A diagram, example, or callout earns its space when it lets a player understand a rule immediately instead of rereading dense prose.

The shared-game portion should aim for a comfortable first read of roughly 15–20 minutes. Page count is a layout consequence, not the primary metric.

## Visual status vocabulary

- **REUSE** — an existing visual/component already teaches the concept accurately enough to carry forward.
- **REVISE** — an existing visual/component is the right source but needs content, layout, or styling changes.
- **CREATE** — no adequate existing instructional visual has been identified.
- **OPTIONAL ART** — decorative or thematic art that improves pacing/identity but is not required to understand the rule.

## Existing instructional asset inventory

### Card anatomy renderer — REUSE

Source: `rulebook/card-anatomy.js`

The rulebook already has a purpose-built anatomy system. It should be the starting point for Chapter 2 rather than recreating a card anatomy graphic.

Current capabilities include:

- a live playable-card anatomy example rendered from the current production card face;
- a live Territory anatomy example rendered from the current production Territory face;
- labeled regions for art, title/value/badge, Action, Gambit, Tactic, Asset, and other visible card structure;
- current playable example: **Flanking Maneuver**;
- current Territory example: **Fortified Pass**;
- isolated rendering that does not require importing the full Deckbuilder application.

The Player's Guide should consume or adapt this component so the diagram stays synchronized with current card presentation.

### Arcane trait-mark example — REUSE

Source: `rulebook/card-anatomy.js`

The same component already produces a focused Arcane trait-mark example using the current production rendering of **Witchcraft**. This is the graphic the guide should reuse when explaining that some cards carry a sigil/trait mark such as **Arcane**.

This should remain a small supporting graphic, not become a second full card-anatomy diagram.

### Anatomy static fallbacks — REVISE / REPAIR

`rulebook/card-anatomy.js` currently names these fallback paths:

- `/rulebook/assets/figures/playable-card-anatomy.svg`
- `/rulebook/assets/figures/territory-card-anatomy.svg`
- `/rulebook/assets/figures/arcane-trait-mark.svg`

Those files are not present on `main` as of this inventory. The dynamic renderer remains reusable, but the broken fallback contract should be repaired separately before publication relies on fallback rendering.

Do not create new competing anatomy artwork merely to work around the missing fallback files.

## Recurring callout system

The Player's Guide should use a consistent set of callout roles:

- **Remember** — high-value retention point.
- **Example** — concrete application of the nearby rule.
- **Common mistake** — likely misunderstanding worth preventing explicitly.
- **At the table** — handling/procedure reminder.
- **Why this matters** — short explanation of an unintuitive distinction; use sparingly.

Callouts supplement the main explanation. Essential rules must remain in the normal reading path.

---

# Chapter-by-chapter map

## Cover / opening

### Purpose

Make the guide look like an invitation to play rather than a technical manual.

### Visuals

- **OPTIONAL ART:** one strong Gauntlet hero composition, faction-leader montage, or battlefield image.
- **CREATE:** very small visual path: **Learn the shared game → add your faction → start playing**.

### Layout note

Keep the opening sparse. The first instructional battlefield image should arrive almost immediately after the title rather than being delayed by several pages of front matter.

---

## Welcome to Gauntlet

### Teaching job

Give the reader the whole game in one mental picture before introducing vocabulary.

### Visuals

- **CREATE — miniature Gauntlet overview:** six Territories in one line, one player at each end, arrows indicating each player's forward direction.

### Callout

**Remember:** Move forward. Win battles. Hold enemy ground. Capture your way across the Gauntlet.

### Cognitive-load note

Do not explain Front Line, Occupation, Capture timing, or Last Stand procedure here. The visual is an orientation anchor, not a compressed rules chart.

---

## 1. The Battlefield and How You Win

### Teaching job

Establish the spatial model and distinguish token position from Territory control.

### Primary visual — CREATE

**Full battlefield/control diagram**

Show:

- all six Territories;
- each player's three starting Territories;
- each Player Token at its own end;
- forward/backward directions from both perspectives;
- Territory orientation as the visible indication of control;
- the initial boundary between the two players' controlled Territory groups.

### Supporting callout

**Remember — Position is not control**

- Your token shows where you are.
- Territory orientation shows who controls that ground.

### Victory preview — CREATE

A compact two-route panel:

1. **Control the entire Gauntlet** — capture opposing Territories in order until your Front Line spans the battlefield.
2. **Last Stand** — drive the opponent beyond their end and defeat them in the resulting Last Stand battle.

Keep this conceptual. Chapter 8 owns the detailed procedure.

### Common mistake

Do not visually imply that only the opponent-end Territory matters. The territorial route must look like a contiguous advance across the battlefield.

---

## 2. Cards and Your Play Area

### Teaching job

Make the game's card vocabulary concrete without turning the chapter into a glossary wall.

### Primary visual — REUSE

**Playable card anatomy from `rulebook/card-anatomy.js`**

Use the existing current-production anatomy treatment rather than designing a duplicate.

### Secondary visual — REUSE

**Territory card anatomy from `rulebook/card-anatomy.js`** where useful to distinguish Territory structure from playable-card structure.

### Supporting visual — REUSE

**Arcane trait-mark crop from Witchcraft** to demonstrate how a trait/sigil appears on an otherwise normal card.

### Play-area visual — CREATE

Show the player's normal zones spatially:

- Draw Pile
- Hand
- Discard Pile
- Graveyard
- Asset Bank

Then show Gambit, Reserve, and Tactic as temporary battle areas rather than ordinary persistent zones.

### Callouts

**Remember — one use at a time:** using a card as a Gambit does not also apply its Action text.

**Common mistake — Hand vs Reserve:** Reserve is a temporary battle zone, not an extension of Hand.

### Layout note

Let readers point from a term in the prose directly to a labeled place on the card or table. Do not repeat long textual definitions immediately beside a diagram that already carries the same information.

---

## 3. Setting Up

### Teaching job

Turn setup into a sequence a first-time player can execute while reading.

### Primary visual — CREATE

**Setup strip**, preferably 5–6 panels:

1. choose faction and Leader / take the starter package;
2. draw four cards, discard one face up, keep three;
3. arrange three different Territories after seeing the opening Hand;
4. join the two three-Territory groups into the six-Territory Gauntlet;
5. place each token at its own end;
6. determine the first player.

### Callout

**At the table:** setup token placement is not movement and does not count as entering a Territory.

### Optional art

Small faction symbols or starter-package components may add identity, but they should not interrupt the left-to-right setup sequence.

---

## 4. Your Turn

### Teaching job

Make the six-phase structure memorable while keeping the one-normal-Action rule clear.

### Primary visual — CREATE

**Turn-flow strip:**

**Capture → Draw → Opening → Movement → Denouement → Cleanup**

Each phase gets a short one-line gloss, not a second paragraph of rules.

### Supporting visual — CREATE

Show the single normal Action as a choice that can be spent in **Opening OR Denouement**, rather than drawing an Action box inside both phases and accidentally implying two Actions.

### Common mistake

**You do not get one Action before moving and another after moving.** You normally get one Action total and choose whether to use it during Opening or Denouement.

### Editorial note

Avoid the old shorthand “Capture. Draw. Act. Move.” It collapses the meaningful Opening/Movement/Denouement relationship and teaches the wrong timing model.

---

## 5. Movement

### Teaching job

Make normal movement feel simple while clearly showing when movement turns into battle.

### Primary visual — CREATE

**Three movement choices** around one token:

- Advance
- Hold
- Fall Back

### Secondary visual — CREATE

**Entering the opponent's Position starts a battle**

Before/after panels should show:

1. attacker moves toward defender;
2. attacker enters defender's Position;
3. battle begins immediately and that movement sequence ends.

### Remember

Unused movement from the sequence that initiated the battle is lost. Moving again afterward requires a new legal movement sequence.

### Why this matters

This rule is the foundation for understanding the later Last Stand requirement, so the visual language used here should be reused in Chapter 8.

---

## 6. Battles

### Teaching job

Teach the game's densest shared procedure without presenting it as a wall of nine numbered rules.

### Primary visual — CREATE

**Battle sequence flowchart**

1. Onset
2. Set Gambits
3. Form Reserves
4. Reveal Gambits
5. Choose Tactics
6. Reveal Tactics
7. Roll and compare battle totals
8. Determine the result
9. Aftermath / clear battle cards

### Mandatory commitment-order treatment

The visual must explicitly show **attacker first, defender second** during both hidden commitments:

**Set Gambits**

`Attacker commits or passes → Defender commits or passes`

**Choose Tactics**

`Attacker commits or passes → Defender commits or passes`

Do not depict these as simultaneous choices. The defender's ability to commit after seeing whether the attacker committed is a real positional advantage and part of normal battle play.

### Secondary visual — CREATE

**Battle table layout** showing:

- attacker / defender;
- each player's Gambit position;
- each player's three-card Reserve;
- selected Tactic;
- contested Territory and any relevant face-up Assets/Overlays.

### Supporting visual — CREATE

**Advantage / Disadvantage dice example**

- N Advantage → roll N + 1, keep highest;
- N Disadvantage → roll N + 1, keep lowest;
- opposing instances cancel one-for-one.

Use one small worked example instead of several abstract paragraphs.

### Callouts

**At the table:** at Onset, check the contested Territory and relevant face-up persistent effects before moving on.

**Remember:** Gambits come from Hand; Tactics come from Reserve.

**Remember:** normal clearing sends Gambits to Graveyard, while Tactics and remaining Reserve go to Discard.

### Cognitive-load note

This chapter should receive more visual space than its raw word count would suggest. Battle is a signature system; understanding the sequence once is more important than making the chapter physically short.

---

## 7. Taking and Holding Ground

### Teaching job

Make the difference between winning a position now and controlling the Territory later impossible to miss.

### Primary visual — CREATE

**Occupation → hold → Capture → Front Line advances** multi-panel sequence:

1. attacker wins onto an opposing Territory;
2. token occupies that Territory, but the Territory still faces/ belongs to the defender;
3. occupier survives until a later Capture step;
4. the next opposing Territory immediately beyond the Front Line rotates and joins the occupier's controlled Front Line.

### Secondary visual — CREATE

**Deep Occupation / contiguous Front Line**

Show a token farther ahead than its Front Line while the unbroken control chain remains behind it.

### Common mistake

**Winning a battle on a Territory does not normally capture it immediately.**

### Example

If your token is two enemy Territories beyond your Front Line, the next normal Capture still advances the Front Line by only one Territory. You do not skip the intervening Territory.

### Why this matters

This is the core mental model behind both territorial victory and Counterattacks. Give it enough space to be understood visually rather than compressing Position, Occupation, control, Front Line, and Capture into one paragraph.

---

## 8. Running the Gauntlet

### Teaching job

Show the two shared victory routes as distinct conclusions to the same battlefield struggle.

### Route 1 visual — CREATE

**Control the entire Gauntlet**

Use a short sequence showing the Front Line expanding contiguously across the opponent's three Territories. The final opposing Territory is visibly the completion of the chain, not a special isolated target.

Caption concept:

> You begin controlling your own three Territories. Capture the opponent's Territories in order until your Front Line spans all six.

### Route 2 visual — CREATE

**Last Stand sequence**

1. defender loses while on their own end Territory;
2. defender retreats beyond the Gauntlet;
3. attacker remains on the final Territory;
4. the previous movement sequence is over;
5. a new legal movement sequence lets the attacker Advance beyond the end;
6. Last Stand battle begins.

### Callouts

**Remember:** forcing a Last Stand requires a new legal movement sequence.

**Remember:** the defender normally has Defensive Edge and separately adds +1 to their battle total.

**Common mistake:** you do not need to control or capture the opponent's final Territory before forcing a Last Stand.

### Layout note

Use the same movement-arrow language introduced in Chapter 5 so the player recognizes “new movement sequence” visually instead of learning a second notation.

---

## 9. The Six Factions

### Teaching job

Provide opponent literacy and interest without making readers learn six operating manuals.

### Repeating visual structure — REUSE / REVISE

Use existing faction symbols and approved Leader portraits where available. Each faction block should repeat the same information hierarchy:

- faction symbol / name;
- one-sentence identity;
- the extra resource or progression system;
- alternate victory, if any;
- “what to watch for”;
- brief conceptual line for each Leader.

### Optional supporting mini-visuals — CREATE only when useful

A tiny icon/track may help communicate the shape of a faction system, but do not reproduce the operating procedure that belongs in its Faction Guide.

Potential concepts:

- Military — Command / Orders
- Diplomats — Influence / Proposals
- Financiers — Capital / Deeds
- Intelligence — Intel / Operation Progress
- Mystics — selected Rites / Ritual
- Inquisition — Conviction / Purification

### Layout note

This chapter should be highly skimmable. Repetition of layout is a feature: once the reader understands one faction block, they should know where to look in all six.

---

## 10. Building a Deck

### Teaching job

Make construction requirements easy to verify without turning deckbuilding into another learning chapter.

### Primary visual — CREATE

**Deckbuilding checklist** derived from current authority:

- one faction;
- one Leader;
- at least 30 playable cards;
- no more than 60 total card value;
- Neutral + chosen-faction cards only;
- Unique limit as applicable;
- three different Territories;
- no more than one Arena.

### Optional supporting visual

A tiny starter-deck summary may help connect “recommended first game” to later custom construction, but the Deckbuilder itself remains the main construction tool.

---

## Where to Go From Here

### Teaching job

End the guide without making the player feel there is another large reading assignment.

### Primary visual — CREATE

**Escalation path:**

`Player's Guide → Your Faction Guide → Reference Cards → Rules Arbiter / Comprehensive Rules`

The first arrow means “what to learn next”; the later arrows mean “what to consult when needed,” not “read all of this before playing.”

---

# Priority order for implementation

If the guide is laid out incrementally, prioritize by comprehension value rather than chapter order:

1. Battlefield / Position-vs-control overview.
2. Reuse the existing card anatomy + Arcane mark treatment.
3. Turn flow with one-Action-before-or-after-Movement logic.
4. Battle sequence with mandatory attacker-first Gambit/Tactic commitment order.
5. Occupation → Capture → Front Line sequence.
6. Last Stand sequence with separate movement.
7. Setup strip.
8. Play-area / zone diagram.
9. Movement choices / battle-start diagram.
10. Faction overview blocks.
11. Deckbuilding checklist.
12. “Where to go next” path.

## Visual reuse before new production

Before commissioning or generating final art for any item above:

1. search existing rulebook components and approved production assets;
2. verify that the existing visual still matches current authority;
3. classify it as REUSE or REVISE;
4. create a new instructional visual only when no existing source can teach the concept clearly.

This prevents the new publication architecture from recreating the same explanatory assets in multiple incompatible forms.

## Publication review checklist

Before a chapter is considered visually ready:

- Does every instructional visual match current authority and its semantic rule dependencies?
- Is the visual adjacent to the passage it explains?
- Does it reduce mental reconstruction or rereading?
- Does it preserve meaningful sequence and hidden/public information?
- Does it accidentally imply simultaneity where order matters?
- Does it keep Position separate from control and Occupation separate from Capture?
- Does it keep Hand separate from Reserve and Gambit separate from Tactic?
- Does it keep Opening and Denouement distinct while showing one normal Action total?
- Does territorial victory look contiguous rather than focused on a standalone far-end Territory?
- Does the Last Stand visual make the new-movement requirement visible?
- Is any decorative art helping pacing/identity rather than crowding out instructional material?

The goal is not to make the Player's Guide look shorter. The goal is to make it **feel easier because the reader understands each idea when they encounter it**.
