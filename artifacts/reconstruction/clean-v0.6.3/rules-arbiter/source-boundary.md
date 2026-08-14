# Clean v0.6.3 Rules Arbiter — source boundary

This reconstruction is a downstream review surface. It is **not** the current public Rules Arbiter and it does not publish v0.6.3.

Rules content is restricted to:

- `artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md` — SHA-256 `7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643`;
- `artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json` — SHA-256 `641c813366a8bcb52f9cb505ada640994d416024deed1f71a6ec59fb24ed2c4c`;
- complete authority set `64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49`.

The public v0.6.1 Rules Arbiter supplies product/operational precedent only: four ruling classes, source-first adjudication, session-consistent provisional rulings, citations, and optional interaction logging.

The withdrawn `v0.6.3/rules-arbiter/` implementation and `rules-assistant/*v063*` candidate files are UX/deployment evidence only. Their candidate corpus, system-prompt gameplay assertions, and 19 hand-written deterministic rulings are explicitly forbidden as semantic inputs.

This reconstruction therefore contains **no deterministic v0.6.3 rulings** and no gameplay-specific answer text in the worker prompt. Game-specific answers must be retrieved from the bound clean sources. The worker remains separately deployable and is not routed through the current public `rules-assistant/worker-entry.js`.

Formal-playtest QR/session linking is intentionally not reactivated here because that downstream playtest surface has not yet been rebuilt from the clean chain. Ordinary session continuity and review logging may use the existing Rules Arbiter persistence schema when an isolated worker is configured with a database.
