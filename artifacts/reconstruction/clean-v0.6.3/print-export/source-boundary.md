# Clean v0.6.3 print/export source boundary

## Binding sources

This reconstruction is bound to complete clean-v0.6.3 authority set `64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49`.

The certified Rulebook is `artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md`, SHA-256 `7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643`.

The six certified faction guides are the complete-authority Military, Diplomats, Financiers, Intelligence, Mystics, and Inquisition guides. Their exact paths and SHA-256 digests are pinned in `manifest.json` and checked against the complete authority manifest.

Card/Territory print and export material comes only from `artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json`, SHA-256 `641c813366a8bcb52f9cb505ada640994d416024deed1f71a6ec59fb24ed2c4c`. Starter print and export material comes only from `artifacts/reconstruction/clean-v0.6.3/downstream/starter-decks.json`, SHA-256 `4c0ebe201584fc709623e37bb31630394294830dbe7b0f75ba43ae61bce33d64`.

The clean Browser Rulebook Markdown renderer at `artifacts/reconstruction/clean-v0.6.3/browser-rulebook/markdown.js`, SHA-256 `8cfea16f3176ff999e7e5242f7328d6f90391584fa388091285170c4600364ce`, is presentation infrastructure only and is not rules authority.

## Generated material

CI materializes nine print documents: the certified Rulebook, all six certified faction guides, a Card and Territory Reference generated directly from the clean canonical records, and a Starter Deck Catalog generated directly from the twelve approved starter records and canonical card/Territory identities.

The Rulebook and faction-guide Markdown copies are normalized-text identical to their certified Markdown inputs: only line-ending/final-newline normalization is permitted. The two structured print references do not invent gameplay prose; they format exact canonical effect text and exact approved starter composition/strategy records.

CI also creates three machine-readable exports: byte-identical JSON exports of clean canonical data and approved starter Decks, plus a clean-v0.6.3 deck-interchange schema using canonical card and Territory IDs and certified construction limits.

The generated HTML and nine PDFs are CI review artifacts only. They are uploaded from `artifacts/reconstruction/clean-v0.6.3/print-export/generated/`; generated payloads are not committed and this step is not release publication.

## Explicitly excluded withdrawn candidate material

Historical `artifacts/v0.6.3/print-candidate/`, `artifacts/v0.6.3/release-candidate/`, and `releases/v0.6.3/` are not print/export input sources.

The withdrawn First Game Guide, Returning-player Changes handout, Player Mat, Formal Playtest Sheet, Faction Teaching Cards, Active-Player Marker, Rulebook Booklet padding treatment, and combined Tableside Pack are not reconstructed here because the certified clean authority set does not contain equivalent approved source documents. Their old existence is structural evidence only, not authority.

## Publication boundary

No public print center, public Deckbuilder, public Start page, `releases/v0.6.3/`, lifecycle state, analytics configuration, or current-version pointer changes in this slice. v0.6.1 remains current/public and publication remains locked.
