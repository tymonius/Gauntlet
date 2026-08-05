# Gauntlet v0.6.2 Wave E Test Matrix

**Status:** Normative Wave E regression matrix  
**Tracker:** [Issue #504](https://github.com/tymonius/Gauntlet/issues/504)  
**Published release:** v0.6.1 remains canonical until v0.6.2 release cutover

Wave E connects the merged v0.6.2 rules and component sources to two executable consumers: the versioned Rules Arbiter candidate and the digital rules layer. Each scenario below must remain represented by an executable test, deterministic ruling, validator assertion, or explicit source-parity gate.

| ID | Surface | Scenario | Required result |
|---|---|---|---|
| WE-001 | Corpus | Candidate corpus version | Reports `v0.6.2-candidate`. |
| WE-002 | Corpus | Published version boundary | Candidate reports v0.6.1 separately as the published version. |
| WE-003 | Corpus | Canonical base inheritance | Builds from immutable v0.6.1 canonical data through the Wave D builder. |
| WE-004 | Corpus | Shared rules source | Includes the Wave A shared-rules candidate. |
| WE-005 | Corpus | Shared reference source | Includes the Wave A shared reference. |
| WE-006 | Corpus | Faction/component source | Includes the Wave B normative component source. |
| WE-007 | Corpus | Compatibility source | Includes the Wave B inherited compatibility audit. |
| WE-008 | Corpus | Teaching source | Includes the Wave C first-game and tableside source. |
| WE-009 | Corpus | Citation remapping | No candidate source citation points to the v0.6.1 canonical JSON fallback. |
| WE-010 | Corpus | Card pool | Exposes 128 playable titles. |
| WE-011 | Corpus | Territory pool | Exposes 25 Territories. |
| WE-012 | Corpus | Proposal pool | Exposes nine Proposals. |
| WE-013 | Turn | Phase order | Capture → Draw → Opening → Movement → Denouement → Cleanup. |
| WE-014 | Turn | Normal Action | One normal Action per turn. |
| WE-015 | Turn | Opening Action | Normal Action may be taken during Opening. |
| WE-016 | Turn | Denouement Action | Normal Action may be saved for Denouement. |
| WE-017 | Turn | Phase capacity | No more than one Action in a phase without express permission. |
| WE-018 | Turn | Additional Action | Additional Action changes total availability, not phase capacity. |
| WE-019 | Movement | Advance | Advance spends one available Position of movement. |
| WE-020 | Movement | Hold | Hold ends the current Movement sequence. |
| WE-021 | Movement | Fall Back | Fall Back is ordinary Movement. |
| WE-022 | Movement | Pending battle | Entering the opposing Position creates a pending battle. |
| WE-023 | Movement | Sequence termination | Pending battle ends the current Movement sequence. |
| WE-024 | Movement | Lost allowance | Unused movement is lost when pending battle is created. |
| WE-025 | Movement | Accepted Terms | Accepted Terms do not restore lost movement. |
| WE-026 | Control | Front Line definition | Control is contiguous from the player's own end. |
| WE-027 | Control | Position distinction | Token Position may extend beyond controlled Front Line. |
| WE-028 | Control | No isolated control | Immediate-capture effects cannot skip opposing Territory. |
| WE-029 | Capture | Next Territory | Capture adds only the next opposing Territory beyond Front Line. |
| WE-030 | Capture | Token support | Token must be on or beyond each Territory added. |
| WE-031 | Capture | Normal limit | Normal Capture adds at most one Territory per turn. |
| WE-032 | Battle | Pending state | Terms occur before Onset. |
| WE-033 | Battle | Accepted Terms | Accepted Terms prevent battle and Onset. |
| WE-034 | Battle | Accepted aftermath | No Aftermath occurs when battle never reaches Onset. |
| WE-035 | Battle | Refused Terms | Refused Terms proceed to Onset unless their effect prevents battle. |
| WE-036 | Battle | Defensive Edge | Eligible defender wins tied battle totals. |
| WE-037 | Battle | Last Stand | Last Stand normally grants Defensive Edge. |
| WE-038 | Battle | Removed Edge | Effect or Arena may remove Defensive Edge. |
| WE-039 | Battle | Tiebreak Roll | Remaining tie uses a separate unmodified roll. |
| WE-040 | Battle | Repeated tie | Further tied Tiebreak Rolls are rerolled. |
| WE-041 | Withdrawal | Before Onset | Prevents battle and Aftermath. |
| WE-042 | Withdrawal | After Onset | Completes remaining non-result Aftermath. |
| WE-043 | Withdrawal | Card cleanup | Post-Onset withdrawal clears committed cards normally. |
| WE-044 | Withdrawal | No result | Withdrawal produces no winner or loser. |
| WE-045 | Withdrawal | Attacker geometry | Attacker returns to attack origin. |
| WE-046 | Withdrawal | Defender geometry | Defender moves one Position toward own end. |
| WE-047 | Withdrawal | Defender only | Attacker remains and occupies when applicable. |
| WE-048 | Withdrawal | Mutual | Both withdraw with no Occupation from withdrawal. |
| WE-049 | Retreat | Losing player | Loser retreats toward own end. |
| WE-050 | Retreat | Result consequences | Win, loss, Occupation, and result effects remain active. |
| WE-051 | Military | Invasion allegiance | Invasion is Military, cost 4, and appears once. |
| WE-052 | Military | Invasion movement | Additional movement is lost on pending battle and not restored by Terms. |
| WE-053 | Diplomats | Détente | Cost 3, one banked, triggers only on already-ratified acceptance. |
| WE-054 | Diplomats | Gunboat destinations | Accepted to Discard; refusal-set Gambit to Graveyard when cleared. |
| WE-055 | Financiers | Compound Interest | Cost 4 and resolves after normal Draw with nonempty Treasury. |
| WE-056 | Financiers | Financial Capacity | Two-phase Action permission requires Treasury value greater than controlled Territories. |
| WE-057 | Intelligence | Extraordinary Rendition | Cost 4, one banked, binds opposing Hand card. |
| WE-058 | Intelligence | Rendition discard priority | Rendition is discarded before other controlled Assets if able. |
| WE-059 | Mystics | Nature's Altar | Cost 4 with Action, Battle, and Overlay modes. |
| WE-060 | Mystics | Altar control tether | Same-turn Rite completion requires control at completion timing. |
| WE-061 | Mystics | Guardians scaling | Protection values are 1/2/3/4. |
| WE-062 | Inquisition | Martyrdom | Cost 5, Unique, Aftermath response does not prevent battle loss. |
| WE-063 | Inquisition | Purge timing | Purge Faction Action is legal during Opening or Denouement once per turn. |
| WE-064 | Arbiter | Versioned route | `/api/v062/rules` is distinct from published `/api/rules`. |
| WE-065 | Arbiter | Health metadata | Candidate health exposes version, published version, and deterministic case count. |
| WE-066 | Arbiter | Wrong version | v0.6.1 request to candidate endpoint receives 409. |
| WE-067 | Arbiter | Written rule | Direct rule answer is labeled `written_rule`. |
| WE-068 | Arbiter | Clarification | Compelled synthesis may be labeled `clarification`. |
| WE-069 | Arbiter | Provisional ruling | Genuine gap is labeled and binding for current game. |
| WE-070 | Arbiter | Out of scope | Nongame question is not answered as a rule. |
| WE-071 | Arbiter | Deterministic priority | High-risk known interactions bypass model generation. |
| WE-072 | Arbiter | Model fallback | Model failure degrades to direct candidate source lookup. |
| WE-073 | Arbiter | Source integrity | Explicit/inferred answer cites candidate sources. |
| WE-074 | Arbiter | Obsolete terminology | Candidate answers do not use Action Opportunity or defender advantage as current terms. |
| WE-075 | Arbiter | Session continuity | Provisional ruling metadata may persist with the interaction. |
| WE-076 | Cross-surface | Card parity | Digital content and Arbiter corpus use the same Wave D builder. |
| WE-077 | Cross-surface | Terms parity | Arbiter and digital layer agree accepted Terms prevent Onset. |
| WE-078 | Cross-surface | Tie parity | Arbiter and digital layer agree on Defensive Edge and Tiebreak Roll. |
| WE-079 | Cross-surface | Control parity | Arbiter and digital layer distinguish Position from Front Line control. |
| WE-080 | Boundary | Published sources | No file under `releases/v0.6.1/` is modified by Wave E. |

## Exit requirement

Wave E is complete only when all 80 scenarios are covered, the full repository test chain passes, the candidate endpoint remains version-separated from the published Arbiter, and the digital candidate consumes the same effective v0.6.2 data as the player-facing Wave D surfaces.
