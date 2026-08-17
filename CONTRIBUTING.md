# Contributing to Gauntlet

## Development checks

Before opening a pull request:

```bash
npm run governance:check
npm run typecheck
npm test
```

## Issue lifecycle

Open issues are a working queue, not an archive or a substitute for a decision record.

Every open issue must have a current top-level triage comment containing the marker `<!-- gauntlet-triage -->` and exactly one of these statuses:

- **Actionable now** — concrete work can proceed without waiting for new evidence, a design decision, or an external dependency. The triage comment must name the **Next step**.
- **Blocked** — meaningful progress should wait for a named dependency. The triage comment must state **Blocked on** and **Resume when**.

When the tracked work is complete, superseded, duplicated, or no longer planned, close the issue with the appropriate GitHub state reason rather than leaving it open as project memory.

Refresh the triage comment whenever the status, blocker, or next step changes. The automated issue-triage audit also treats a triage record older than 14 days as stale so long-lived issues must be consciously reviewed rather than silently forgotten.

## Rules, cards, terminology, and release data

Read [`governance/README.md`](governance/README.md) before changing game behavior or canonical content.

Every binding change requires:

- a stable `GNT-DEC-YYYYMMDD-NNN` decision ID;
- the exact governing source update;
- a traceability entry or update;
- explicit status for every affected surface;
- tests derived from the canonical record;
- a completed provenance section in the pull request.

Do not implement from conversation memory, an old generated reference, or a working draft. Do not resolve conflicting sources by inference. Quarantine the affected behavior until the conflict has a recorded decision.

Historical release directories are immutable except for an explicitly approved archival correction.
