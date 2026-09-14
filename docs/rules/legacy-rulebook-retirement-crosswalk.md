# Legacy Rulebook retirement crosswalk

This document records the reviewed coverage proof for `rulebook/player-facing/current-rulebook.md`. It does **not** retire or redirect `/rulebook/`; it establishes that the old monolithic Rulebook does not need to remain a separate mechanical authority once retirement is approved.

## Proof model

- Every top-level legacy section is inventoried in order.
- Every non-editorial section is SHA-256 fingerprinted against the exact reviewed prose. Any edit invalidates validation until the mapping is re-reviewed.
- Mechanical and procedural sections declare registered rule dependencies from `config/rules-surface-contract.json`.
- The active Comprehensive Rules remain the direct technical successor and must cover the complete registered rule graph.
- Teaching successors are validated as active Player's Guide or Faction Guide sections where a player-facing replacement exists.
- The legacy Glossary is replaced by the Comprehensive Rules term registry and Definitions/Index part.

This is a **structural and authority-graph proof**, not an automated semantic interpretation of English prose. Its reliability comes from binding the human-reviewed mapping to exact source fingerprints and invalidating it whenever that prose changes.

## Coverage

| Legacy section | Classification | Authority dependencies | Successor |
| --- | --- | ---: | --- |
| GAUNTLET | editorial | 0 | No rules successor required |
| Welcome to Gauntlet | mechanical | 4 | Player's Guide (welcome, battlefield-and-victory, factions); Comprehensive Rules |
| How to Use This Rulebook | editorial | 0 | No rules successor required |
| Game at a Glance | mechanical | 12 | Player's Guide (turn, movement, battles, ground); Comprehensive Rules |
| How to Win | mechanical | 5 | Player's Guide (battlefield-and-victory, run-the-gauntlet); Comprehensive Rules |
| Golden Rules | mechanical | 1 | Comprehensive Rules |
| Part I — Learn to Play | editorial | 0 | No rules successor required |
| 1. Components | mechanical | 4 | Player's Guide (cards-and-play-area, setup); Comprehensive Rules |
| 2. Cards, Zones, and the Play Area | mechanical | 8 | Player's Guide (cards-and-play-area, battles, turn); Comprehensive Rules |
| 3. Setup | mechanical | 4 | Player's Guide (setup); Comprehensive Rules |
| 4. Your Turn | mechanical | 8 | Player's Guide (turn, movement, ground); Comprehensive Rules |
| 5. Actions, Faction Features, Leader Abilities, and Assets | mechanical | 6 | Player's Guide (turn, cards-and-play-area); Comprehensive Rules |
| 6. Movement and Position | mechanical | 4 | Player's Guide (movement); Comprehensive Rules |
| 7. Battles | mechanical | 20 | Player's Guide (battles); diplomats Faction Guide (features); Comprehensive Rules |
| 8. Front Line, Occupation, and Capture | mechanical | 6 | Player's Guide (ground); Comprehensive Rules |
| 9. Running the Gauntlet | mechanical | 6 | Player's Guide (run-the-gauntlet); Comprehensive Rules |
| Part II — Complete Shared Rules | editorial | 0 | No rules successor required |
| 10. Constructing a Deck | mechanical | 5 | Player's Guide (deckbuilding); mystics Faction Guide (components); Comprehensive Rules |
| 11. Detailed Card and Timing Rules | mechanical | 18 | Comprehensive Rules |
| 12. Overlays and Other Shared Card Rules | mechanical | 3 | Player's Guide (cards-and-play-area); Comprehensive Rules |
| Part III — Factions | mechanical | 4 | Player's Guide (factions); Comprehensive Rules |
| 13. Military | mechanical | 3 | military Faction Guide (meet, resource, features, victory, leaders); Comprehensive Rules |
| 14. Diplomats | mechanical | 7 | diplomats Faction Guide (meet, resource, features, victory, leaders); Comprehensive Rules |
| 15. Financiers | mechanical | 6 | financiers Faction Guide (meet, resource, features, victory, leaders); Comprehensive Rules |
| 16. Intelligence | mechanical | 7 | intelligence Faction Guide (meet, resource, features, victory, leaders); Comprehensive Rules |
| 17. Mystics | mechanical | 6 | mystics Faction Guide (meet, resource, features, victory, leaders); Comprehensive Rules |
| 18. Inquisition | mechanical | 5 | inquisition Faction Guide (meet, resource, features, victory, leaders); Comprehensive Rules |
| Part IV — Reference | editorial | 0 | No rules successor required |
| Quick Turn Reference | procedural | 6 | Player's Guide (turn); Comprehensive Rules |
| Quick Battle Reference | procedural | 10 | Player's Guide (battles); Comprehensive Rules |
| Glossary | reference | term registry | Comprehensive Rules |
| Copyright and Playtest Use | editorial | 0 | No rules successor required |

## Retirement boundary

Passing this crosswalk means the legacy Rulebook is mechanically redundant with the active rules architecture. Actual route retirement, redirects, navigation changes, release/booklet implications, and archival handling remain a separate explicit change.
