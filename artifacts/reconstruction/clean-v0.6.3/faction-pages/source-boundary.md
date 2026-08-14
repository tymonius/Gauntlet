# Clean v0.6.3 Faction Pages source boundary

## Binding gameplay sources

The six faction pages render the six faction guides bound into complete clean-v0.6.3 authority set `64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49`:

- Military — `artifacts/reconstruction/clean-v0.6.3/faction-guides/military/Gauntlet_v0.6.3_Military_Faction_Guide.md` — `23a4260f793ebf5c09d6a62fc2d36d51290ca9ca28c03e3bfe349170eae1c91c`
- Diplomats — `artifacts/reconstruction/clean-v0.6.3/faction-guides/diplomat/Gauntlet_v0.6.3_Diplomat_Faction_Guide.md` — `99788e5aead16a06e8fc026929e3b362930ebba91a55d40881890a85ae8d4412`
- Financiers — `artifacts/reconstruction/clean-v0.6.3/faction-guides/financier/Gauntlet_v0.6.3_Financier_Faction_Guide.md` — `f5d07550bdc76db7c2ba6c5243e5539dadef1c27986250d6b89f4cdec6700f6b`
- Intelligence — `artifacts/reconstruction/clean-v0.6.3/faction-guides/intelligence/Gauntlet_v0.6.3_Intelligence_Faction_Guide.md` — `103d5bd4a6758ef3127fa71f19694b5ba428216b1d6c28b9db74fdb8e86d2328`
- Mystics — `artifacts/reconstruction/clean-v0.6.3/faction-guides/mystics/Gauntlet_v0.6.3_Mystics_Faction_Guide.md` — `b47623ba7a7537e0df5326ccd69967dee4bb7016b2a3b5c2a8d05d1c899e5f1a`
- Inquisition — `artifacts/reconstruction/clean-v0.6.3/faction-guides/inquisition/Gauntlet_v0.6.3_Inquisition_Faction_Guide.md` — `a489e08ec1daf094e521bc45acc43e119c137fe566cfd8bef2f4d2455e38e3bd`

At runtime the browser fetches the selected guide as raw bytes, verifies its certified SHA-256 digest, and only then passes the decoded Markdown to the clean Browser Rulebook Markdown renderer. The page adds navigation, search highlighting, anchors, faction color, and print presentation. It does not synthesize, summarize, normalize, or replace gameplay prose.

## Presentation sources

The reconstruction reuses the already-reconstructed clean Browser Rulebook `markdown.js`, `styles.css`, and `publication.css` only as renderer/presentation infrastructure. Those files are not faction content authority. The current public v0.6.1 `factions/` pages are product/layout precedent only; none of their prose is copied into these reconstructed pages.

The withdrawn v0.6.3 Rulebook, combined faction/component guide, release-candidate payloads, and historical public-candidate faction pages are not runtime inputs.

## Publication firewall

All seven HTML routes under `artifacts/reconstruction/clean-v0.6.3/faction-pages/` are `noindex,nofollow` and intentionally excluded from production analytics. The public `factions/` routes, `src/content/current.ts`, release lifecycle state, Deckbuilder, Start, print/TTS surfaces, and publication pointers remain untouched. v0.6.1 remains current/public and publication remains locked.
