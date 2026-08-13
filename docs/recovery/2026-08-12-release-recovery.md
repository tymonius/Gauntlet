# Gauntlet Release Recovery — Preservation Record

**Incident date:** 2026-08-12  
**Recovery baseline:** v0.6.1  
**Status:** Active recovery record

## Preservation invariant

No existing Gauntlet release artifact, adopted design work, artwork, implementation, test, workflow, or publication evidence may be deleted, overwritten in place, or reconstructed from memory as part of this recovery.

Historical publication states are evidence. Clean releases must be reconstructed from preserved evidence plus explicitly verified decisions, never by rewriting the historical packages to make them appear correct retroactively.

## Immutable commit anchors

The following refs were created before containment changes so the exact states remain directly addressable:

| Preservation ref | Commit | Meaning |
|---|---|---|
| `archive/v061-last-current-pre-v062-cutover` | `bb6b7f954bd190e0c940c82017ad20cf68487e9c` | Last exact v0.6.1-current state immediately before the v0.6.2 publication cutover |
| `archive/v062-initial-publication` | `9bf5a7f14c1f152b69bdb39d6c209a3f15f46612` | Initial v0.6.2 publication merge state |
| `archive/v062-final-current-pre-v063-cutover` | `4436004a11b97704758dd0300f7eef969e6b78f9` | Final v0.6.2-current state immediately before v0.6.3 publication |
| `archive/v063-initial-publication` | `7baf03ff4a80dfe84642ac30c67c2cd4202942de` | Initial v0.6.3 publication merge state |
| `archive/v063-post-ui-hotfixes` | `feb53d48f254355a07d092f6ba68162241d22e9d` | v0.6.3 state after the immediate public UI restoration hotfixes |
| `archive/recovery-2026-08-12-main-precontainment` | `feb9329180db0dd98946314f4794d58af204f970` | Exact `main` state at the start of recovery containment |
| `archive/pr585-v062-rollback-green` | `9caa08de79f075b2ca3484c583e621c0f4d9e5bc` | Fully green superseded v0.6.2 rollback implementation and validation evidence |

These refs are recovery evidence and must not be repurposed or force-moved.

## Release lifecycle during containment

- **v0.6.1:** current temporary safety baseline.
- **v0.6.2:** withdrawn; original publication artifacts remain preserved; clean reconstruction required.
- **v0.6.3:** withdrawn; original publication artifacts remain preserved; clean reconstruction required.

Withdrawal does not mean that every change in a release is rejected. It means that the published package cannot be treated wholesale as a trustworthy canonical authority.

## Recovery classifications

Every audited artifact or decision will receive one of these classifications:

1. **Immutable evidence** — exact historical material; never edited.
2. **Verified good** — reviewed and established as correct; eligible for direct reuse and lock protection.
3. **Correct but superseded** — correct for its historical release but intentionally changed later.
4. **Suspect** — contains potentially useful/correct information but cannot be trusted wholesale.
5. **Known defective** — confirmed erroneous, incomplete, or misclassified.
6. **Unresolved** — conflicting evidence, missing provenance, or a gap requiring an explicit decision.

Memory alone is never sufficient provenance. A remembered decision without recoverable evidence is `unresolved` until its source is found or the decision is deliberately made again.

## Reconstruction rule

Clean v0.6.2 must be constructed as:

> locked v0.6.1 foundation + individually verified v0.6.2 deltas + explicit resolutions of identified gaps

Clean v0.6.3 must be constructed as:

> locked clean v0.6.2 + individually verified v0.6.3 deltas + explicit resolutions of identified gaps

The defective published v0.6.2 or v0.6.3 Rulebooks must not be used as document skeletons.

## Known forward work that must remain recoverable

Recovery must not discard later work merely because the public release is temporarily v0.6.1. This includes, at minimum:

- later card artwork and artwork mappings;
- intelligent card-art placement/cropping work;
- card metadata/title/value-medallion layout refinements;
- enlarged card inspection / lightbox work;
- complete Territory catalog work;
- Proposal / Treaty Article prototype and provenance work;
- later browser/UI polish;
- later tests, validators, workflows, digital-engine work, and Rules Arbiter work;
- adopted v0.6.2 and v0.6.3 mechanics and card changes pending individual audit.

The preservation refs above provide exact recovery points even where containment temporarily repoints a current/default file to v0.6.1.

## Next preservation deliverables

Before any clean release reconstruction, add:

- a machine-readable artifact inventory with cryptographic hashes;
- a v0.6.2 change ledger with per-decision provenance and downstream impact;
- a v0.6.3 change ledger with per-decision provenance and downstream impact;
- a gap/conflict register;
- CI protection for locked historical and verified-good artifacts.
