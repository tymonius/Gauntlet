# Gauntlet v0.6.0 — Faction Framework Release

**Release date:** July 20, 2026  
**Status:** Canonical pre-release playtest edition

Gauntlet v0.6.0 establishes the first complete faction framework and replaces all earlier rules and card packages as the canonical version for playtesting.

## Release contents

- A newly authored official rulebook built from canonical source text rather than earlier PDFs.
- Six complete factions in the canonical order:
  1. Military
  2. Diplomats
  3. Financiers
  4. Intelligence
  5. Mystics
  6. Inquisition
- Two Leaders per faction, with Leader-specific rules and supplemental components.
- 122 playable card designs:
  - 50 Neutral cards
  - 72 faction cards
- 25 Territories, including four Arenas.
- Canonical structured data generated from the audited Markdown sources.
- Updated printable faction sheets, supplemental cards, trackers, Deeds, Proposals, Treaty Articles, Rites, and references.

## Core game

The Gauntlet is a column of six face-up Territories. Each player begins immediately before their end of the Gauntlet.

A Territory is captured at the start of a turn when the active player occupies it without controlling it. Occupation and control remain distinct, giving the controller an opportunity to counterattack before capture.

To run the Gauntlet, a player must:

1. defeat the opponent on their final Territory;
2. occupy and later capture that Territory;
3. advance beyond the Territory column; and
4. defeat the opponent in their Last Stand.

During a Last Stand, the defender has Defender's Advantage and adds +1 to their battle total.

## Card system

Cards may contain multiple printed effects. The way a card is used determines which effect resolves:

- play it during an Action Opportunity for its Action effect;
- commit it from hand or choose it from a Battle Hand for its Battle effect; or
- use it as directed by another rule.

Cards committed from hand normally go to the Graveyard. Cards in Battle Hands normally go to the Discard Pile.

## Factions

### Military

Military gains Command from battle victories and spends it on Leader-specific Orders. The General emphasizes offensive movement and pursuit; the Commandant emphasizes defense, retreat pressure, and immediate capture.

### Diplomats

Diplomats stake Influence to offer Terms before battle. Accepted Terms ratify Treaty Articles; refused Terms lead to battle and may be imposed through victory. Five different ratified Proposals complete the Peace Treaty.

### Financiers

Financiers build a Treasury, accumulate Capital, and buy Deeds independently of Territory control. Owning every Deed currently in the Gauntlet achieves Controlling Interest.

### Intelligence

Intelligence completes hidden Missions to gain Intel and Operation Progress. Surveillance and Interference reveal or disrupt opposing battle choices. A ready Special Operation provides an additional victory condition.

### Mystics

Mystics use no faction resource. They complete three public Rites, unlocking Invocation and Transmutation before winning through Ritual. All Mystics cards have the Arcane trait.

### Inquisition

Inquisition gains Conviction when opposing cards enter the Graveyard after battle and when Arcane cards are used. Conviction powers Purges. Emptying both the opponent's Draw Pile and Discard Pile at their normal Draw step achieves Purification.

## Online access

The Gauntlet project repository, current release materials, and browser tools are available at **[tymonius.github.io/Gauntlet](https://tymonius.github.io/Gauntlet/)**.

Build, validate, save, export, randomize, and print v0.6 Decks with the **[Gauntlet Deckbuilder](https://tymonius.github.io/Gauntlet/deckbuilder/)**.

## Canonical sources

The v0.6.0 rulebook, Neutral pool, Territory pool, and six definitive faction guides are the authoritative player-facing sources. `Gauntlet_v0.6.0_Canonical_Data.json` is generated directly from those audited documents and must not be edited independently.

Earlier release files remain available for historical reference but are obsolete for current play.
