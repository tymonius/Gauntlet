# Gauntlet v0.5 Deckbuilder

A lightweight static browser tool for building and validating pre-faction Gauntlet decks.

## Current scope

This first version targets the v0.5 playtest line, beginning with `v0.5.6`.

It supports:

- Loading the canonical v0.5.6 card and Territory data from `releases/v0.5.6/Gauntlet_v0.5.6_Canonical_Data.json`
- Searching and filtering available cards
- Adding duplicate main-deck cards
- Tracking main-deck card count and point total
- Selecting exactly three different Territories
- Enforcing the maximum one-Arena Territory rule
- Enforcing unique-card limits listed in the canonical data
- Saving, loading, and deleting decks in browser local storage
- Copying decklists as text
- Exporting and importing deck JSON
- Opening a print layout suitable for browser print-to-PDF

## Running locally

Because the app fetches JSON data from the repository, open it through a local web server rather than directly from the filesystem.

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/deckbuilder/
```

## Design notes

This is intentionally built without a framework. The v0.5 tool is small enough that plain HTML, CSS, and JavaScript are easier to maintain and adapt during playtesting.

The intended upgrade path is to keep the shared UI shell and add a separate v0.6+ rules/data mode once factions and leaders are stable.

Saved decks include a `gameVersion` and `ruleset` field. Decks from one version should be viewed and edited in that version's mode rather than automatically migrated.
