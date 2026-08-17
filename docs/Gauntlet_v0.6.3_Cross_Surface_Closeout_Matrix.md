# Gauntlet v0.6.3 Cross-Surface Closeout Matrix

**Status:** Normative pre-publication closeout gate  
**Release tracker:** [#528](https://github.com/tymonius/Gauntlet/issues/528)  
**Card-text tracker:** [#405](https://github.com/tymonius/Gauntlet/issues/405)

This matrix governs the last comparison pass between the merged v0.6.3 source candidate, browser surfaces, Rules Arbiter candidate, executable digital candidate, competitive starter catalog, and printed-material candidate. Passing this gate means v0.6.3 is ready for an explicit publication/cutover PR; it does **not** itself publish the release.

| ID | Surface | Scenario | Required result |
|---|---|---|---|
| CS-001 | Authority | Integrated canonical identity | The integrated candidate identifies itself as `v0.6.3-candidate`. |
| CS-002 | Authority | Card count | All canonical/release/browser candidate data represents exactly 128 playable cards. |
| CS-003 | Authority | Territory count | All canonical/release/browser candidate data represents exactly 25 Territories. |
| CS-004 | Authority | Faction count | The candidate represents six factions. |
| CS-005 | Authority | Leader count | The candidate represents twelve Leaders. |
| CS-006 | Authority | Proposal count | The candidate represents nine Proposals. |
| CS-007 | Authority | Previous release | v0.6.2 remains identified as the published predecessor. |
| CS-008 | Authority | Candidate boundary | No candidate surface claims v0.6.3 is already published. |
| CS-009 | Canonical data | Browser equality | Browser candidate JSON exactly equals the integrated canonical candidate. |
| CS-010 | Canonical data | Release equality | Source release-candidate JSON exactly equals the integrated canonical candidate. |
| CS-011 | Setup | Opening selection | Setup is draw four, discard one face up, keep three. |
| CS-012 | Setup | Territory timing | Territory arrangement follows opening selection. |
| CS-013 | Setup | Initiative timing | Initiative is determined after Territory arrangement. |
| CS-014 | Setup | Starting Position | Player Tokens begin on the Territories at their own ends. |
| CS-015 | Setup | Placement semantics | Setup placement is neither movement nor entering a Territory. |
| CS-016 | Victory | Final Territory | Capturing the opponent-end Territory wins immediately. |
| CS-017 | Victory | Last Stand | Forcing the opponent to make a Last Stand and winning the resulting battle is the second normal Run-the-Gauntlet route. |
| CS-018 | Victory | Separate movement | Last Stand access requires a separate legal movement sequence rather than prior final-Territory capture/control. |
| CS-019 | Terminology | Deck | Player-facing v0.6.3 uses `Deck` / `Draw Pile`, not `Playable Deck`. |
| CS-020 | Terminology | Battle card roles | Dual-role battle text uses `Gambit/Tactic`; retired `Battle`/`Activate` headings do not return. |
| CS-021 | Shared cards | Inherent banking | Asset cards use the shared inherent Bank Action. |
| CS-022 | Shared cards | Additional Tactics | Reserve remains the default source under the shared additional-Tactic procedure. |
| CS-023 | Shared cards | Bind cleanup | Default bound-card cleanup remains represented in executable/deterministic rules. |
| CS-024 | Shared cards | Reveal interference | Reveal-stage interference ordering remains represented in executable/deterministic rules. |
| CS-025 | Card migration | Second Line | Stable ID `neutral-reserves` resolves to **Second Line**. |
| CS-026 | Territory migration | Smuggler's Run | Stable ID `territory-smuggler-s-pass` resolves to **Smuggler's Run**. |
| CS-027 | Card lifecycle | Margin Loan | Persistent Margin Loan blocks the normal start-of-turn draw while it remains banked. |
| CS-028 | Mechanics revision | Protracted Siege | Final candidate surfaces retain the adopted v0.6.3 Protracted Siege treatment. |
| CS-029 | Starters | Catalog size | Exactly twelve recommended v0.6.3 starter Decks are present. |
| CS-030 | Starters | Deck legality | Every recommended starter is exactly 30 cards / 60 Deckbuilding Value and faction-legal. |
| CS-031 | Starters | Territory legality | Every recommended starter has three different legal Territories and no more than one Arena. |
| CS-032 | Starters | Strategic order | Recommended Territory order is explicitly strategy guidance, not a setup lock. |
| CS-033 | Starters | Competitive baseline | Starter optimization targets competitive strength/strategic expression, not teaching simplicity or coverage quotas. |
| CS-034 | Starters | Regression locks | Forward Doctrine contains Shock and Awe; Hostile Expansion retains Fealty; aggregate starter use remains 109 titles. |
| CS-035 | Browser | Candidate labeling | Development pages identify v0.6.3 and remain `noindex` before publication. |
| CS-036 | Browser | Current setup/victory | Rulebook, start, reference, and Deckbuilder surfaces show current setup and both normal victory routes. |
| CS-037 | Browser | Canonical source | Reference and Deckbuilder consume the v0.6.3 candidate data rather than published v0.6.2 data. |
| CS-038 | Rules Arbiter | Isolated corpus | The v0.6.3 Arbiter uses its own candidate corpus and candidate worker entry. |
| CS-039 | Rules Arbiter | Deterministic rulings | The candidate retains all 19 deterministic v0.6.3 rulings. |
| CS-040 | Rules Arbiter | Public boundary | Public Rules Arbiter widget/worker continue to serve v0.6.2 before cutover. |
| CS-041 | Digital | Version adapter | `src/content/v063.ts` remains version-locked to the v0.6.3 candidate. |
| CS-042 | Digital | Setup/victory execution | Executable candidate helpers cover opening selection, arrangement, starting placement, final-Territory capture, and Last Stand. |
| CS-043 | Digital | Shared card execution | Executable candidate helpers cover inherent banking, additional Tactics, Bind cleanup, reveal interference, and Margin Loan. |
| CS-044 | Digital | Published boundary | `src/v062/` and `src/content/v062.ts` remain unchanged by closeout. |
| CS-045 | Source package | Assembly | The complete v0.6.3 source release candidate is reproducibly assembled and validated. |
| CS-046 | Source package | Print readiness status | After the merged print candidate exists, source deployment metadata reports the print package ready without claiming publication. |
| CS-047 | Print | Output count | The print candidate contains all 11 expected PDFs plus the print manifest. |
| CS-048 | Print | Fixed page counts | Reference is 4 pages, Player Mat 1, Formal Playtest Sheet 2, Faction Teaching Cards 3, Active-Player Marker 1, and Tableside Pack 22. |
| CS-049 | Print | Rulebook package | Rulebook reader and booklet geometry/imposition remain valid. |
| CS-050 | Print | Operational wording | Printed aids use current v0.6.3 setup, victory, terminology, and Financier starting-Capital language. |
| CS-051 | Print | Visual regressions | The tracked visual-regression gate passes for long-form banners, compact Reference pagination, and booklet Leader-plate sources. |
| CS-052 | Print | Source link | Print manifest identifies the merged v0.6.3 source package as its source. |
| CS-053 | Public boundary | Release directory | `releases/v0.6.3/` does not exist during closeout. |
| CS-054 | Public boundary | Root site | Root/current site still identifies v0.6.2 as canonical before publication. |
| CS-055 | Public boundary | Digital default | `src/content/current.ts` still exports v0.6.2 before publication. |
| CS-056 | Public boundary | Rules Arbiter default | Public widget and worker entry still route v0.6.2 before publication. |
| CS-057 | Public boundary | Historical release | Immutable `releases/v0.6.2-withdrawn/` and `/v0.6.2/` are not modified by closeout. |
| CS-058 | Validation | Component gates | Final card, player-facing, canonical, browser, starter, Arbiter, digital, source-package, and print validators all pass together. |
| CS-059 | Validation | Executable tests | v0.6.3 digital and Rules Arbiter regression suites pass in the same closeout workflow. |
| CS-060 | Publication | Exit condition | A green closeout authorizes the separate publication/cutover PR; no public default changes occur in this PR. |

## Exit requirement

The closeout gate is green only when all 60 scenarios are represented, all component validators and focused candidate test suites pass on the same commit, canonical data is identical across the integrated/browser/release candidate copies, the source and print packages agree on release identity and component counts, and every public default remains v0.6.2.

After this gate merges, the next rollout step is a single explicit **v0.6.3 publication/cutover** change that materializes the immutable release package and switches public defaults together.