# Clean v0.6.3 Start source boundary

## Binding sources
Rules substance comes only from the certified clean-v0.6.3 Rulebook at `artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md`, SHA-256 `7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643`, inside complete authority set `64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49`.

Starter selection and strategy records come only from `artifacts/reconstruction/clean-v0.6.3/downstream/starter-decks.json`, SHA-256 `4c0ebe201584fc709623e37bb31630394294830dbe7b0f75ba43ae61bce33d64`, already validated against the certified clean-v0.6.3 authority.

The browser fetches both sources as raw bytes and verifies SHA-256 before rendering them. The Start learning view extracts the Rulebook's own `Welcome to Gauntlet`, `Game at a Glance`, `How to Win`, and every Part I `How it works` passage. It does not synthesize, summarize, normalize, or replace gameplay prose.

## Presentation and downstream handoff
The clean Browser Rulebook Markdown renderer is renderer infrastructure, not rules authority. Public `site.css` and `start/styles.css` are copied only as a v0.6.1 UI baseline. Historical `v0.6.3/start/` is UX evidence only and is not a runtime content source.

The clean Start handoff now targets `artifacts/reconstruction/clean-v0.6.3/deckbuilder/` and passes only the selected approved faction ID, Leader ID, `starter=1`, and `source=start`. The Deckbuilder independently verifies its own canonical inputs; Start does not transmit gameplay data or bypass that verification.

## Publication boundary
Public `start/`, the public Deckbuilder, `src/content/current.ts`, lifecycle state, print/export surfaces, and publication pointers remain unchanged. Clean Deckbuilder integration is present; print/export handoff remains intentionally absent. v0.6.1 remains current/public and publication remains locked.
