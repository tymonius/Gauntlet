# Gauntlet v0.7.0 — Tabletop Simulator Workshop publication

This file records the published v0.7.0 Tabletop Simulator Workshop item, its player-facing copy, publication gate, and post-publication verification.

## Workshop item

- **Steam Workshop ID:** `3790840635`
- **Workshop URL:** https://steamcommunity.com/sharedfiles/filedetails/?id=3790840635
- **Current visibility:** public
- **Created:** 2026-08-27
- **Published:** 2026-08-27
- **Final hosted save:** https://gauntlet.run/tts/v0.7.0/Gauntlet_v0.7.0_TTS_Mod.json
- **Primary listing image:** production CSS-composited universal black Gauntlet card back
- **Secondary listing image:** approved Tabletop Simulator gameplay screenshot

The public subscribed Workshop copy was loaded and smoke-tested successfully after publication; hosted assets resolved and no publication-specific breakage was found.

## Workshop title

**Gauntlet — v0.7.0**

## Workshop description

Gauntlet is a two-player tactical card-and-territory game about deck construction, hidden battle commitments, territorial control, faction asymmetry, and running the Gauntlet.

This Tabletop Simulator implementation provides the physical play surface for Gauntlet v0.7.0: playable Decks, Leader Cards, Territories, the shared Universal Reference, faction-specific supplemental components, Player Tokens, battle dice, hand zones, and the six-position Gauntlet.

Choose a faction and Leader through one of the included starter Bags, unpack one starter per player, arrange the six selected Territories into the Gauntlet, and complete normal opening setup from the current Gauntlet Rulebook.

Rules are player-operated. The v0.7.0 mod is intended to reproduce the physical game accurately rather than automate battle resolution or faction rules. The Financiers' Capital Ledger is interactive for transaction entry and running-balance bookkeeping, while the separate Capital Limit tracker remains a physical sliding tracker.

## Controls and setup notes

1. Seat the two players as **White** and **Green**.
2. Each player chooses one starter Bag. Pull its contents in setup order: Leader, trackers, reference cards, other faction supplementals, playable Deck, three-Territory stack, Player Token, and battle die.
3. Unpack both starter Bags.
4. Arrange the six chosen Territories on the six center snap points in the order determined by normal Gauntlet setup.
5. Place each Player Token at the appropriate starting end after setup.
6. Complete Draw Pile, Hand, Reserve, Leader/faction area, and other opening setup directly from the current Rulebook.
7. Use the built-in battle die for each player. Battle resolution, card movement, Territory capture/rotation, faction systems, and victory checks remain manual.

## What is included

- two-player Tabletop Simulator table;
- White and Green hand/reserve zones;
- six Gauntlet Territory snap positions;
- one faction-colored Player Token per player;
- one faction-colored battle d6 per player;
- generated starter Bags for the current Leader/starter catalog;
- playable card Decks with the universal black standard back;
- Leader Cards with faction-color component backs;
- landscape Territories with the universal black standard back;
- one shared two-sided Universal Reference Card in every starter Bag;
- production-ready faction supplemental components assembled at their declared starter quantities.

The exact generated inventory is governed by the v0.7.0 TTS manifests and release-readiness report rather than this prose list.

## Publication gate — completed

The v0.7.0 Workshop item was published only after all of the following were true:

- `npm run tts:release:strict` passes for the v0.7.0 package;
- `tts/release-qa/v0.7.0.json` records completed table/setup, faction-component, and focused handling QA;
- `approvedForWorkshop` is explicitly `true` in that QA record;
- `npm run tts:save:promote` produces the final `Gauntlet_v0.7.0_TTS_Mod.json` save;
- all v0.7.0 custom-object network assets have been uploaded to their public host;
- the final save is loaded successfully from a clean TTS client without relying on locally cached custom assets.

## Listing images

The Workshop listing uses the production CSS-composited **universal black Gauntlet card back** as its primary image. The approved Tabletop Simulator gameplay screenshot remains as a secondary gallery image. The production card-back image comes from the same browser-rendered CSS composition used by the TTS card-asset exporter; it is not an image-generation mockup.

## Post-publication verification

1. Public Workshop item published at the permanent URL above. — **Complete**
2. Subscribed public Workshop copy loaded from Tabletop Simulator. — **Complete**
3. Hosted faces, backs, environment art, Leaders, Territories, and faction components resolved in the subscribed copy. — **Complete**
4. Public-copy smoke test found no publication-specific breakage. — **Complete**
5. Workshop URL linked from the public site/release documentation. — **Tracked in the final site/documentation closeout.**

## Pending v0.7.1 update

The existing Workshop item will be updated in place to v0.7.1 after the stable v0.7.1 TTS promotion gate passes. The permanent Workshop ID remains `3790840635`; no replacement listing is planned.

The v0.7.1 Workshop update adds the six-Rite Mystics package and the Deckbuilder → TTS Deck Code importer while preserving the existing two-player table and manual-rules play model. The final public title will become **Gauntlet — v0.7.1**.

The stable v0.7.1 release uses delta QA: unchanged table and non-Mystics faction-component behavior inherits the completed v0.7.0 Workshop QA evidence, while changed surfaces are re-tested against the stable v0.7.1 artifact. The update must not be published until `tts/release-qa/v0.7.1.json` is complete, `approvedForWorkshop` is true, and `npm run tts:save:promote` has produced the final v0.7.1 mod save.
