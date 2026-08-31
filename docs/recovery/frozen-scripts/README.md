# Frozen recovery scripts

This directory contains byte-for-byte historical script snapshots retained as recovery evidence.

They are **not active tooling** and must not be executed or imported by current build/release paths. Their blob identities are locked by `config/release-locks.json` and verified by the release-history integrity workflow.

Current maintained scripts belong under `scripts/`. Historical recovery snapshots belong here so the active tooling directory does not imply they are supported entrypoints.
