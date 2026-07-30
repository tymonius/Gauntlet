## Scope

- [ ] Game rule, card, terminology, or release-data change
- [ ] Engine or UI implementation of an existing governed decision
- [ ] Tooling/documentation change with no game-design effect

## Decision provenance

**Decision ID(s):** `GNT-DEC-YYYY-MMDD-NNN`  
Use `N/A` only when this pull request cannot affect game behavior, canonical data, terminology, or a release surface.

**Why N/A is safe, when applicable:**

**Exact governing record or approved decision:**

> Quote the complete relevant text. Do not paraphrase.

**Governing source path and version:**

## Identity comparison

Complete this for each affected card or governed object.

| Field | Before | After / governing value |
|---|---|---|
| Name |  |  |
| ID |  |  |
| Cost |  |  |
| Trait / form |  |  |
| Action / rule text |  |  |
| Battle / other text |  |  |

## Supersession check

- [ ] I searched the decision registry for later decisions affecting this subject.
- [ ] I checked whether this change supersedes an older decision or subject.
- [ ] Obsolete names, IDs, and terminology have current-source guards where appropriate.
- [ ] Any unresolved conflict is quarantined rather than interpreted.

## Traceability

- [ ] `governance/decision-registry.json` is updated when a new decision is introduced.
- [ ] `governance/traceability.json` reflects every affected surface.
- [ ] Canonical data and rules/reference text agree.
- [ ] Engine implementation status is accurate.
- [ ] Deckbuilder status is accurate.
- [ ] Print/art status is accurate.
- [ ] Test status is accurate.

## Validation

- [ ] `npm run governance:check`
- [ ] `npm run typecheck`
- [ ] `npm test`

Describe tests derived from the governing record, including timing, optionality, duration, source restrictions, and destinations:

## Merge gate

- [ ] The **Governance Integrity** workflow passes.
- [ ] No subject is described as implemented unless canonical, rules-reference, engine, and test surfaces are complete.
