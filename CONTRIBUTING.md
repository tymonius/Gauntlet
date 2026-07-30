# Contributing to Gauntlet

## Development checks

Before opening a pull request:

```bash
npm run governance:check
npm run typecheck
npm test
```

## Rules, cards, terminology, and release data

Read [`governance/README.md`](governance/README.md) before changing game behavior or canonical content.

Every binding change requires:

- a stable `GNT-DEC-YYYY-MMDD-NNN` decision ID;
- the exact governing source update;
- a traceability entry or update;
- explicit status for every affected surface;
- tests derived from the canonical record;
- a completed provenance section in the pull request.

Do not implement from conversation memory, an old generated reference, or a working draft. Do not resolve conflicting sources by inference. Quarantine the affected behavior until the conflict has a recorded decision.

Historical release directories are immutable except for an explicitly approved archival correction.
