# Gauntlet v0.7.0 — Tabletop Simulator Workshop publication

This file prepares the text and final publication checklist for the v0.7.0 Tabletop Simulator Workshop item. It does **not** indicate that the mod has passed QA or is ready to publish.

## Draft Workshop title

**Gauntlet — v0.7.0**

## Draft Workshop description

Gauntlet is a two-player tactical card-and-territory game about deck construction, hidden battle commitments, territorial control, faction asymmetry, and running the Gauntlet.

This Tabletop Simulator implementation provides the physical play surface for Gauntlet v0.7.0: playable Decks, Leader Cards, Territories, faction-specific supplemental components, Player Tokens, battle dice, hand zones, and the six-position Gauntlet.

Choose a faction and Leader through one of the included starter Bags, unpack one starter per player, arrange the six selected Territories into the Gauntlet, and complete normal opening setup from the current Gauntlet Rulebook.

Rules are player-operated. The v0.7.0 mod is intended to reproduce the physical game accurately rather than automate battle resolution or faction rules.

## Controls and setup notes

1. Seat the two players as **Red** and **Blue**.
2. Each player chooses one starter Bag. The Bag contains that starter's playable Deck, Leader Card, three Territories, and the production-ready supplemental components required by its faction.
3. Unpack both starter Bags.
4. Arrange the six chosen Territories on the six center snap points in the order determined by normal Gauntlet setup.
5. Place each Player Token at the appropriate starting end after setup.
6. Complete Draw Pile, Hand, Reserve, Leader/faction area, and other opening setup directly from the current Rulebook.
7. Use the built-in battle die for each player. Battle resolution, card movement, Territory capture/rotation, faction systems, and victory checks remain manual.

## What is included

- two-player Tabletop Simulator table;
- Red and Blue hand zones;
- six Gauntlet Territory snap positions;
- Red and Blue Player Tokens;
- one battle d6 per player;
- generated starter Bags for the current Leader/starter catalog;
- playable card Decks with faction backs;
- Leader Cards;
- landscape Territories;
- production-ready faction supplemental components assembled at their declared starter quantities.

The exact generated inventory is governed by the v0.7.0 TTS manifests and release-readiness report rather than this prose list.

## Before publishing

The final Workshop item must not be published until all of the following are true:

- `npm run tts:release:strict` passes for the v0.7.0 package;
- `tts/release-qa/v0.7.0.json` records completed table/setup, faction-component, and full-game QA;
- `approvedForWorkshop` is explicitly `true` in that QA record;
- `npm run tts:save:promote` produces the final `Gauntlet_v0.7.0_TTS_Mod.json` save;
- all v0.7.0 custom-object network assets have been uploaded to their public host;
- the final save is loaded successfully from a clean TTS client without relying on locally cached custom assets.

## Preview image

**Pending.** The Workshop preview image is a separate visual asset and must be selected or created explicitly before publication. Do not substitute an automatically generated preview during release packaging.

## After publishing

1. Subscribe to the public Workshop item from a clean client.
2. Load the subscribed item and verify every hosted face/back/image resolves.
3. Recheck player perspectives, Territory orientation, supplemental manipulation, and starter Bag contents in the public copy.
4. Record the public Workshop URL in the v0.7.0 release/site documentation.
5. Only then treat the Workshop publication item in issue #851 as complete.
