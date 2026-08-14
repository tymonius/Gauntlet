# Clean v0.6.3 current-release metadata — source boundary

This directory reconstructs the **candidate current-release metadata** required by issue #590. It does not publish v0.6.3 and does not change which release is current.

## Binding sources

- Complete clean authority set: `artifacts/reconstruction/clean-v0.6.3/complete-authority/authority-set.json`
- Clean downstream data manifest: `artifacts/reconstruction/clean-v0.6.3/downstream/manifest.json`
- Every reconstructed surface manifest enumerated by `surface-registry.json`
- Certified Rulebook SHA-256: `7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643`
- Clean canonical-data SHA-256: `641c813366a8bcb52f9cb505ada640994d416024deed1f71a6ec59fb24ed2c4c`
- Approved starter-decks SHA-256: `4c0ebe201584fc709623e37bb31630394294830dbe7b0f75ba43ae61bce33d64`
- Complete authority-set ID: `64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49`

The registry preserves each reconstruction slice's own status field. It does not rewrite old manifests merely because their PRs have since merged. Cross-surface parity is established by resolving every registered manifest and requiring that each binds the same complete authority-set ID.

## Historical metadata is evidence only

`releases/v0.6.1/Gauntlet_v0.6.1_Manifest.json` may inform stable metadata shape only. `releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json` is withdrawn historical evidence and is explicitly forbidden as v0.6.3 metadata authority. In particular, its old public-default and eleven-PDF claims are not inherited.

## Publication boundary

`release-candidate.json` is a **candidate-not-current** record. v0.6.1 remains current/public. This slice does not modify `config/release-lifecycle.json`, `config/release-locks.json`, `src/content/current.ts`, `releases/v0.6.3/`, or any public website/Worker surface.

The candidate records the intended v0.6.3 defaults only as the state *after a separately authorized cutover*. Publication remains locked. After an authorized publication merge, issue #590 still requires live verification of gauntlet.run and production Workers; publication is not complete until both checks pass.
