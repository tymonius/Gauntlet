# Gauntlet v0.6.2 Release Closeout Test Matrix

**Status:** Normative pre-cutover closeout matrix  
**Tracker:** [#506](https://github.com/tymonius/Gauntlet/issues/506)  
**Release tracker:** [#470](https://github.com/tymonius/Gauntlet/issues/470)

This matrix governs the transition from the merged v0.6.2 candidate to the published release. Before cutover, it must confirm that v0.6.1 remains the public default. At cutover, the same gates must be updated together rather than independently.

| ID | Surface | Scenario | Required result |
|---|---|---|---|
| RC-001 | Manifest | Version identity | Manifest identifies v0.6.2 and candidate version v0.6.2-candidate. |
| RC-002 | Manifest | Previous release | Manifest identifies v0.6.1 as the previous published release. |
| RC-003 | Manifest | Pre-cutover status | Manifest is release-candidate and published is false. |
| RC-004 | Manifest | Propagation record | PRs 493, 496, 500, 502, and 505 are recorded. |
| RC-005 | Manifest | Scenario total | Wave counts total 368 scenarios. |
| RC-006 | Manifest | Public defaults | All public defaults remain v0.6.1 before cutover. |
| RC-007 | Manifest | Atomic cutover | Rules Arbiter, website, browser tools, and digital defaults must switch together. |
| RC-008 | Boundary | Unresolved decisions | Military alternate victory, Peace Treaty threshold, Leader taxonomy, and unadopted balance work remain unresolved. |
| RC-009 | Comparison | Shared rules | Returning-player source covers the six-phase turn. |
| RC-010 | Comparison | Action timing | Returning-player source covers Opening, Denouement, and same-phase capacity. |
| RC-011 | Comparison | Movement | Returning-player source covers Advance, Hold, and Fall Back. |
| RC-012 | Comparison | Pending battle | Returning-player source covers pending battle, Terms, and Onset. |
| RC-013 | Comparison | Accepted Terms | Returning-player source states attacker withdrawal baseline and no Aftermath. |
| RC-014 | Comparison | Ties | Returning-player source covers Defensive Edge and separate Tiebreak Roll. |
| RC-015 | Comparison | Control | Returning-player source distinguishes Position and contiguous Front Line. |
| RC-016 | Comparison | Exit events | Returning-player source distinguishes retreat, withdrawal, and Fall Back. |
| RC-017 | Starters | Full legal pool | Returning-player source explains rebuilt Leader starters. |
| RC-018 | Starters | Construction limits | Returning-player source preserves 30 cards and value 60. |
| RC-019 | Starters | Basic/Advanced | Retired classification is described as no longer restricting construction. |
| RC-020 | Military | Adopted changes | Invasion migration, Orders, timing, and Front Line compatibility are represented. |
| RC-021 | Diplomats | Adopted changes | Proposal roles, rewards, Leverage, Détente, and notable card revisions are represented. |
| RC-022 | Financiers | Adopted changes | Starting Capital test, Financial Capacity, Denouement timing, and Compound Interest are represented. |
| RC-023 | Intelligence | Adopted changes | Rendition, Denouement procedures, Mission Control, and timing terminology are represented. |
| RC-024 | Mystics | Default timing | Begin a Rite and Begin the Ritual are normal Denouement Faction Actions. |
| RC-025 | Mystics | Altar exception | Nature's Altar alone grants the general Opening Begin-a-Rite exception. |
| RC-026 | Mystics | Guardians | Protection scaling 1/2/3/4 is represented. |
| RC-027 | Inquisition | Purge | Purge two-phase permission and once-per-turn limit are represented. |
| RC-028 | Inquisition | Final Judgment | Direct Aftermath Purge remains a no-Action Faction Ability. |
| RC-029 | Components | Seven-card slate | All seven new or migrated titles, costs, and allegiances are listed. |
| RC-030 | Components | Neutral compatibility | Landslide and inherited Neutral timing/control patches are represented. |
| RC-031 | Components | Arenas | Arenas remove Defensive Edge and use Tiebreak Roll. |
| RC-032 | Components | Proposals | Receiving-player wording and ratification rewards are represented. |
| RC-033 | Classification | Mechanical | Mechanical changes are visibly distinguished. |
| RC-034 | Classification | Terminology | Terminology changes are visibly distinguished. |
| RC-035 | Classification | Clarification | Clarifications are visibly distinguished. |
| RC-036 | Classification | Test revision | Financier starting Capital is identified as a test revision. |
| RC-037 | Editorial | Player orientation | Handout is organized around table behavior, not propagation waves. |
| RC-038 | Editorial | Standalone use | Handout contains a compact returning-player checklist. |
| RC-039 | Editorial | Non-exhaustive | Handout summarizes notable compatibility patches without becoming a full card changelog. |
| RC-040 | Digital | Rite timing parity | Digital default Begin-a-Rite timing is Denouement. |
| RC-041 | Digital | Altar permission | Digital Nature's Altar helper permits the special Opening use. |
| RC-042 | Validation | Dedicated command | package.json exposes test:v062-release-closeout. |
| RC-043 | Validation | Main chain | npm test runs the release-closeout validator. |
| RC-044 | Validation | Earlier waves | Closeout does not remove any Wave A-E validator. |
| RC-045 | Boundary | Immutable v0.6.1 | No file under releases/v0.6.1 is modified during candidate closeout. |
| RC-046 | Package | Candidate data | v0.6.2 effective canonical data remains the single candidate component source. |
| RC-047 | Publication | Explicit switch | Manifest cannot report published while any public default remains v0.6.1. |
| RC-048 | Publication | Verified close | #470 closes only after package publication and public-version verification. |

## Pre-cutover exit requirement

The pre-cutover closeout stage passes when all 48 scenarios are represented, the returning-player source and manifest agree with merged canonical sources, accidental propagation defects are corrected, all earlier validators remain green, and v0.6.1 remains the public default.

## Publication exit requirement

The release may be marked published only when the final package exists, generated artifacts are synchronized, public defaults switch atomically to v0.6.2, all tests pass after cutover, and publication is verified from player-facing surfaces.
