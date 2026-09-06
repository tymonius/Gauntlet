# Frozen recovery scripts

This directory contains byte-for-byte historical script snapshots retained as recovery evidence.

They are **not active tooling** and must not be executed or imported by current build/release paths. Their blob identities are locked by `config/release-locks.json` and verified by the release-history integrity workflow.

Current maintained scripts belong under `scripts/`. Historical recovery snapshots belong here so the active tooling directory does not imply they are supported entrypoints.

The `v0.6.2/` directory contains both pre-recovery snapshots and the final guarded tooling retained when the withdrawn release was removed from active development. Current release-state validation enforces the withdrawal through `config/release-lifecycle.json`; these snapshots only preserve the historical implementation.

The `v0.6.3/` directory also preserves the retired card-normalization and candidate-authority pipeline. Those scripts document how the withdrawn candidate was assembled; they do not define current rules or supported release commands.

Retired downstream-reconstruction scripts remain here even when their original intermediate source paths no longer exist. Their purpose is historical traceability, not executable recovery from the maintained tree.

The withdrawn browser-development builder, refiners, and validator are likewise preserved as one historical pipeline. They target the removed development site and are not part of the maintained browser architecture.

Orphaned v0.6.3 editorial synchronizers and candidate validators are retained here when they have no maintained caller. Their assertions describe intermediate review states and must not be treated as current rules or release gates.

Uncalled clean-v0.6.3 authority, Rulebook, digital, Deckbuilder, and certification builders or validators are frozen on the same basis. Explicit workflow-backed publication and forensic-audit commands remain under active tooling until their owning workflows are redesigned or retired.
