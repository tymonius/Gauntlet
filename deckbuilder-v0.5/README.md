# Gauntlet v0.5 Deckbuilder

A lightweight static browser tool for building and validating pre-faction Gauntlet decks.

## Current scope

The current mode targets the v0.5 playtest line and loads canonical v0.5.6 data from:

- `releases/v0.5.6/Gauntlet_v0.5.6_Canonical_Data.json`

It supports:

- searching and filtering available cards;
- adding duplicate main-deck cards;
- tracking deck size and point total;
- selecting exactly three different Territories;
- enforcing the one-Arena maximum;
- enforcing unique-card limits from canonical data;
- generating random legal test decks;
- saving, loading, and deleting decks in browser storage;
- copying decklists as text;
- importing and exporting deck JSON;
- printable card and Territory layouts for browser print-to-PDF.

## File structure

The implementation is intentionally small and framework-free:

- `index.html` — application structure and controls;
- `styles.css` — base tokens and shared styling;
- `components.css` — consolidated builder, browser, validation, deck-list, and responsive component styling;
- `app.js` — core state, canonical-data loading, validation, persistence, text/JSON export, and baseline rendering;
- `features.js` — compact browsers, random-deck generation, and print/PDF features.

The former sequence of small cleanup and print-override files has been consolidated into `components.css` and `features.js` so the active implementation is easier to understand and maintain.

## Running locally

Because the app fetches JSON data from the repository, open it through a local web server rather than directly from the filesystem.

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/deckbuilder-v0.5/
```

## Version policy

Saved decks include a `gameVersion` and `ruleset` field. A deck should be viewed and edited in the mode for which it was built rather than silently migrated.

The intended upgrade path is a shared UI shell with a separate v0.6+ data and validation mode once factions, leaders, card legality, and canonical v0.6 data are stable. The current v0.5 mode should remain available as a legacy playtest tool.
