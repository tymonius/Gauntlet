# Clean v0.6.3 Deckbuilder source boundary

## Binding sources
All Deck construction substance comes from `artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json`, SHA-256 `641c813366a8bcb52f9cb505ada640994d416024deed1f71a6ec59fb24ed2c4c`, derived from complete authority set `64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49`.

Approved starter compositions and strategy records come only from `artifacts/reconstruction/clean-v0.6.3/downstream/starter-decks.json`, SHA-256 `4c0ebe201584fc709623e37bb31630394294830dbe7b0f75ba43ae61bce33d64`.

The browser fetches both inputs as raw bytes and verifies SHA-256 before parsing them. It does not parse historical Markdown, the withdrawn v0.6.3 release payloads, or the public v0.6.1 Deckbuilder for gameplay data.

## Construction scope
The clean Deckbuilder reconstructs faction and Leader choice, Neutral plus selected-faction card legality, card quantities, Unique enforcement, minimum 30 cards, maximum 60 Deckbuilding Value, exactly three different Territories, maximum one Arena, approved starter loading, and the clean Start query handoff.

The current public `deckbuilder/` and historical `v0.6.3/deckbuilder/` are UX evidence only. They are not runtime authority or content inputs.

## Publication and print/export boundary
Public `deckbuilder/`, `src/content/current.ts`, release lifecycle state, and publication pointers remain unchanged. Printable card faces, backs, Leader/faction supplemental components, duplex sheet pairing, and release export artifacts are intentionally absent from this slice. v0.6.1 remains current/public and publication remains locked.
