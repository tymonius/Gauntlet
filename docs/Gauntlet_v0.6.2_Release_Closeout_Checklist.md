# Gauntlet v0.6.2 Release Closeout Checklist

**Tracker:** [#506](https://github.com/tymonius/Gauntlet/issues/506)  
**Release tracker:** [#470](https://github.com/tymonius/Gauntlet/issues/470)  
**Returning-player changes:** [#503](https://github.com/tymonius/Gauntlet/issues/503)

## 1. Final source reconciliation

- [x] All five propagation waves merged.
- [x] Machine-readable release manifest created.
- [x] Initial returning-player source assembled from merged candidate sources.
- [x] Default Begin-a-Rite timing corrected to Denouement; Nature's Altar remains the Opening exception.
- [ ] Extract and verify exact v0.6.1 old wording for every material comparison.
- [ ] Compare final shared rules against immutable v0.6.1 rules and reference.
- [ ] Compare all faction and Leader text against immutable v0.6.1 sources.
- [ ] Compare all 128 effective card titles, 25 Territories, and nine Proposals.
- [ ] Compare all twelve starter Decks and construction guidance.
- [ ] Resolve only accidental inconsistencies supported by adopted sources.
- [ ] Record any newly discovered genuine design gap without silently deciding it.

## 2. Returning-player documentation

- [x] At-a-glance section drafted.
- [x] Setup and starter-Deck section drafted.
- [x] Turn, Movement, battle, and Front Line sections drafted.
- [x] Faction sections drafted.
- [x] Seven-card slate and notable compatibility patches drafted.
- [x] Mechanical, terminology, clarification, and test-revision labels included.
- [x] Returning-player checklist drafted.
- [ ] Verify old/new wording against final canonical sources.
- [ ] Edit to a five-minute scan without omitting material changes.
- [ ] Produce website/release-page presentation.
- [ ] Produce printable/PDF-friendly output if the release pipeline supports it cleanly.
- [ ] Link from release page and playtest communication.

## 3. Publishable package

- [ ] Materialize final v0.6.2 canonical JSON.
- [ ] Assemble final rulebook Markdown and rendered rulebook outputs.
- [ ] Assemble final compact reference.
- [ ] Assemble faction, Leader, Proposal, Territory, and card component sources.
- [ ] Assemble first-game, tableside, and faction-summary materials.
- [ ] Assemble twelve starter Decks and validation output.
- [ ] Generate Deckbuilder/browser-tool data.
- [ ] Generate TTS and card-media source assets from the 128-card pool.
- [ ] Create immutable `releases/v0.6.2-withdrawn/` package.
- [ ] Confirm `releases/v0.6.1/` is unchanged.

## 4. Public cutover

- [ ] Switch website release metadata to v0.6.2.
- [ ] Switch Deckbuilder and browser-tool defaults to v0.6.2.
- [ ] Switch public Rules Arbiter default from v0.6.1 to v0.6.2.
- [ ] Preserve explicit versioned access to historical v0.6.1 behavior.
- [ ] Switch digital default content/rules version to v0.6.2.
- [ ] Update links, downloads, and structured metadata.
- [ ] Change release manifest to `published: true` only in the cutover commit.
- [ ] Verify no mixed public defaults remain.

## 5. Final validation

- [ ] All 368 Wave A-E scenarios pass.
- [ ] All 48 release-closeout scenarios pass.
- [ ] Full TypeScript typecheck passes.
- [ ] Full Vitest suite passes.
- [ ] Governance and conversation-audit checks pass.
- [ ] v0.6.1 source and browser-tool guards pass.
- [ ] Starter Deck validation passes.
- [ ] TTS source checks pass for the published v0.6.2 pool.
- [ ] Card-media source checks pass for the published v0.6.2 pool.
- [ ] Rulebook generation and package publication workflows pass.
- [ ] Public website, downloads, Rules Arbiter, and browser tools report v0.6.2.
- [ ] Published artifacts are manually spot-checked from player-facing links.

## 6. Closeout record

- [ ] Release notes distinguish adopted revisions, clarifications, test revisions, and unresolved investigations.
- [ ] Migration guidance is complete.
- [ ] #503 is closed after the returning-player handout is published.
- [ ] #506 is closed after package and cutover verification.
- [ ] #470 is closed only after publication is verified.
