# Frozen recovery scripts

This directory contains byte-for-byte historical script snapshots retained as recovery evidence.

They are **not active tooling** and must not be executed or imported by current build/release paths. Their blob identities are locked by `config/release-locks.json` and verified by the release-history integrity workflow.

Current maintained scripts belong under `scripts/`. Historical recovery snapshots belong here so the active tooling directory does not imply they are supported entrypoints.

The `v0.6.2/` directory contains both pre-recovery snapshots and the final guarded tooling retained when the withdrawn release was removed from active development. Current release-state validation enforces the withdrawal through `config/release-lifecycle.json`; these snapshots only preserve the historical implementation.

The `v0.6.3/` directory also preserves the retired card-normalization and candidate-authority pipeline. Those scripts document how the withdrawn candidate was assembled; they do not define current rules or supported release commands.
