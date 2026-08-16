# Gauntlet Tabletop Simulator save publisher

The TTS save publisher is the first layer that turns Gauntlet's generated manifests and hosted release assets into a loadable Tabletop Simulator save definition.

It is intentionally a **review scaffold**, not yet the final published mod. Game rules remain manual and faction-specific supplemental trackers/components are still a separate implementation layer.

## Build

```bash
npm run tts:package
```

That command runs, in order:

1. the current-release playable-card, Territory, Leader, and starter-deck build;
2. hosted release-asset staging; and
3. the TTS save publisher.

The save publisher can also be run separately after the first two stages:

```bash
npm run tts:save
```

## Outputs

The publisher writes:

- `tts/generated/<current-release>/Gauntlet_<current-release>_TTS_Review_Scaffold.json`
- `tts/generated/current/Gauntlet_TTS_Review_Scaffold.json`

Generated output remains ignored by Git. Pull-request CI includes the save inside the existing `gauntlet-current-tts-card-assets` Actions artifact.

## Source authority

The publisher does not choose a release independently. It resolves the same current release used by the TTS card pipeline, then consumes:

- `starter-deck-manifest.json` produced from the current published starter data;
- the staged `Gauntlet_*_TTS_Release_Assets.json` hosted-asset manifest; and
- only HTTPS URLs mapped by that manifest.

The save therefore does not hard-code a release number, card count, Territory count, Leader count, starter count, or GitHub Release asset filename.

## TTS object translation

Playable Decks use `DeckCustom` with the deterministic CardIDs already emitted by the raster manifests. Each referenced sheet becomes a TTS `CustomDeck` entry using:

- `FaceURL`
- the selected player's faction `BackURL`
- `NumWidth`
- `NumHeight`
- `BackIsHidden: true`
- `UniqueBack: false`

Neutral cards in a starter still receive that starter's faction back. The save publisher never chooses a back from the individual card's allegiance.

Leader Cards and Territories use the same hosted-manifest mapping rather than rebuilding image URLs independently.

## Starter kits

Every starter in the current release becomes a selectable bag containing exactly the pieces already defined by the starter manifest:

- the complete playable Deck;
- the selected Leader Card; and
- the three selected Territories.

The bag description records the starter summary and recommended Territory order. Starter bags are laid out dynamically, so adding or removing future starter Decks does not require a table-layout count constant.

## Review table

The current scaffold creates:

- a two-player RPG table;
- Red and Blue hand zones;
- one built-in d6 per player;
- one built-in player token per player; and
- six center-line snap points for the Gauntlet.

Players choose one starter kit each, unpack the kit, arrange the six selected Territories on the center snap points, and then perform normal opening setup from the current Rulebook.

## Current boundary

This scaffold deliberately does **not** yet claim to be the complete playable Workshop mod. It does not yet supply faction-specific supplemental components such as resource trackers, alternate-victory trackers, or other secondary pieces required by individual faction systems.

Those components should be implemented as the next component family and then composed into the final save publisher. Rules automation remains out of scope unless separately designed and approved; the TTS mod should first provide an accurate digital tabletop for the current physical rules.

## Review checklist

Before promoting the scaffold into the published mod, verify in Tabletop Simulator that:

- every starter bag unpacks into the correct Deck, Leader, and Territories;
- playable-card faces use the correct shared face sheets;
- all playable cards in each Deck use that player's faction back, including Neutral cards;
- Leader faces and backs are correct;
- Territory faces, backs, orientation, and center snap points are usable;
- Red and Blue hand zones face the correct players;
- dice and player tokens behave normally; and
- the save contains no broken or unpublished network asset URLs.

The hosted TTS assets themselves must already exist on the current GitHub Release before an in-game load test can render the custom objects successfully.
