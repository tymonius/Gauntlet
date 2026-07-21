# Gauntlet v0.6 Digital Migration Audit

**Status:** Initial implementation audit  
**Purpose:** Identify what can be retained from the legacy pre-v0.6 TypeScript prototype, what must change for the canonical v0.6.0 game, and the order in which the migration should proceed.

This audit is subordinate to the canonical source hierarchy in the repository README. Shared rules come from `releases/v0.6.0/Gauntlet_v0.6.0_Rulebook.md`; faction-specific behavior comes from the definitive faction guides; exact Neutral and Territory text comes from their governing Markdown pools; generated canonical data is derived from those sources.

The legacy `src/` and `data/` directories are implementation provenance, not current rules authority.

---

## 1. Executive conclusion

The digital game should **not** be restarted from scratch.

The existing project already contains useful infrastructure for:

- versioned game state;
- deterministic action application;
- turn and priority tracking;
- public and private player views;
- board spaces, occupation, control, and delayed capture;
- staged battles;
- normal hands and temporary Battle Hands;
- hand commitments and Battle-Hand selections;
- card destinations, including Discard Pile and Graveyard;
- Asset Bank limits and discard-down choices;
- event logging;
- legal-action affordances;
- an effect registry;
- CLI and local browser development interfaces; and
- automated tests.

The correct approach is a **controlled v0.6 port** that preserves these architectural pieces while replacing stale setup, board-end, victory, card-content, and faction assumptions.

---

## 2. Audit classifications

Each subsystem is classified as one of the following:

- **Retain:** architecture and behavior are substantially compatible.
- **Adapt:** architecture is useful, but canonical behavior or terminology must change.
- **Replace:** the current implementation encodes an obsolete rule.
- **Add:** canonical v0.6 behavior is not represented.
- **Defer:** not required for the first deterministic v0.6 core milestone.

---

## 3. System-by-system audit

| Subsystem | Classification | Current prototype | Canonical v0.6 requirement | Migration work |
|---|---|---|---|---|
| Project/tooling | Retain | TypeScript, Vitest, Node development scripts | Versioned deterministic rules implementation | Keep; update package scripts only as needed |
| Game version | Adapt | Free-form `version: string` | Every game, Deck, save, replay, and log identifies v0.6.0 rules/content | Introduce explicit supported-ruleset identifier and reject mixed legacy content |
| Game phases | Adapt | `turn_start`, before-action, movement, battle, after-action, cleanup | Capture, Draw, Action Opportunity, Movement, deferred Action Opportunity, Cleanup | Rename/refine phases so Capture and Draw are separately testable; preserve action-window structure |
| Player setup | Replace | Two generic players with arbitrary card and Territory IDs | Faction, one Leader, legal Playable Deck, three Territories, supplemental components | Replace setup contract and validation |
| Deck validation | Add | Minimal fixture validation | 30+ cards, max 60 value, Neutral + selected faction only, Unique limits, exactly three different Territories, max one Arena | Consume generated v0.6 canonical data and report complete validation errors |
| Factions | Add | Not modeled | Six canonical factions with rules, resources, supplemental components, and additional victories where applicable | Add faction identity and faction-owned state |
| Leaders | Add | Not modeled | One of two Leaders per faction, face up throughout game, Leader abilities and components | Add Leader ID, Leader state, Orders/abilities, legal action generation |
| Supplemental components | Add | Not modeled | Trackers, Proposals, Treaty Articles, Deeds, Missions, Rites, references, and other faction/Leader components | Introduce typed supplemental zones/components outside the Playable Deck |
| Board layout | Adapt | Six Territories plus physical `heartland` endpoint spaces | Six Territories plus positions immediately before and beyond each end | Replace `heartland` spaces with explicit off-column positions; retain indexed standard lane |
| Starting positions | Replace | Tokens begin on Heartland spaces | Tokens begin immediately before the Territory at their end | Update board construction and movement tests |
| Territory reveal | Replace | Spaces may begin hidden and be revealed during play | All six Territories are revealed simultaneously during setup and remain face up unless an effect says otherwise | Remove default exploration reveal flow; retain support for effects that conceal/reveal later |
| Movement | Adapt | Adjacent movement with phase restrictions | Advance, Hold, or Withdraw; additional movement resolves one position at a time; tokens cannot pass through each other | Add explicit Hold and Withdraw; model before/beyond positions and movement interruption by battle |
| Battle trigger | Retain/Adapt | Moving into opponent-occupied space begins battle | Entering any occupied position or explicit effect begins battle | Generalize location beyond Territory spaces, especially Last Stand |
| Battle stages | Retain/Adapt | Enter, hand commit, battle draw, selection, reveal, effects, dice, result, cleanup | Begin-battle effects; attacker then defender hand commitment; attacker then defender forms Battle Hand and chooses; reveal; effects; dice; result; cleanup | Rename stages and enforce canonical sequential priority/order |
| Normal hand | Retain | Private hand and hand commitments | Opening hand three, normal hand limit three, Action use and optional Battle commitment | Add Cleanup discard-to-three and exact draw rules |
| Battle Hand | Adapt | Temporary battle-draw array | Separate temporary Battle Hand formed by drawing three; choose up to one; unchosen cards remain separate until cleanup | Rename data and API from `battleDraw` to `battleHand`; preserve origin tracking |
| Partial draws | Retain | Draw-as-many-as-possible behavior exists | If Draw Pile cannot complete draw, reshuffle Discard Pile and continue; already-drawn cards are not shuffled back; draw as many as possible if still short | Verify implementation and add canonical examples/tests |
| Hand commitment destination | Retain | Hand-played Battle cards normally go to Graveyard | Committed-from-hand cards go to Graveyard | Preserve invariant and test cancellation exceptions |
| Battle Hand destination | Retain/Adapt | Battle-drawn selected and unselected cards recycle | Chosen and unchosen Battle Hand cards go to Discard Pile | Rename terminology; verify every destination override |
| Cancellation | Adapt | Some cancellation/target framework exists | Default canceled hand commitment returns to hand; canceled Battle-Hand card goes to Discard unless effect states otherwise | Centralize canonical default cancellation destinations |
| Negation | Add/Adapt | Partial effect handlers | Negated card has no effect but remains used and follows normal destination | Distinguish negation from cancellation in state and effects |
| Effect repeat/copy | Adapt | Effect registry supports limited repeated effects | Canonical one-layer restrictions, choices/costs repeated, source destinations/status applied once | Add explicit resolution context and recursion-depth guard |
| Dice | Adapt | One die, rerolls, modifiers | Advantage/disadvantage dice pools, chosen result, rerolls/result changes, then numerical modifiers | Add net advantage/disadvantage model and deterministic random requests |
| Defender's Advantage | Adapt | Tie policy is `reroll` or `defender` | Defender wins ties only when defending a Territory they control, and during Last Stand | Compute from battle context rather than store a broad static policy |
| Last Stand bonus | Add | No separate concept | Defender has Defender's Advantage and +1 during Last Stand | Add battle kind/context and modifier source |
| Battle result | Retain/Adapt | Winner/loser, retreats, occupation | Losing player retreats one position; winning attacker occupies contested Territory; winning defender remains | Generalize retreat direction and off-column positions |
| Withdrawal | Add | Not clearly distinct from retreat | Voluntary withdrawal has attacker/defender-specific movement and is not retreat | Add explicit action/effect resolution separate from forced retreat |
| Territory control | Retain | Controller independent of occupant | Facing determines controller; control does not require occupation | Preserve |
| Occupation | Retain/Adapt | Occupant field and unresolved attack handling | Defender continues to occupy contested Territory during unresolved attack | Verify transient two-token battle representation does not prematurely replace occupation |
| Capture | Retain/Adapt | Delayed capture at start of capturing player's next turn | Capture is the first step of every turn and precedes Draw; rotate Territory; resolve capture effects and victory checks before Draw | Move into explicit Capture phase/pipeline and represent orientation |
| Counterattack window | Retain | Delayed capture naturally permits one opponent turn | Controller may drive occupier away before occupier's next Capture step | Preserve and add matched physical examples |
| Territory orientation | Add | Controller stored, but facing/orientation not explicit | Territory faces controller and rotates on capture; Overlays rotate with it | Add orientation or derive it unambiguously from controller for interface/rendering |
| Asset Bank | Retain/Adapt | Bank, limit based on controlled Territories, forced discard choice | Asset limit equals controlled Territories; occupied enemy Territory does not count; immediate discard-down; optional discard-an-Asset uses Action Opportunity | Preserve limit logic; add voluntary Asset discard action and canonical timing |
| Overlays | Add | Not modeled | Persistent Territory attachments; top active; lower dormant; timers pause; rotate with Territory; ownership persists | Add attachment stack and Overlay lifecycle before faction/card completion |
| Running the Gauntlet | Replace | Occupying opponent Heartland immediately wins | Force opponent beyond final Territory, capture final Territory, advance beyond column, then win Last Stand | Replace old endpoint and victory evaluator completely |
| Last Stand | Add | Not modeled | Separate battle beyond Gauntlet after final Territory is captured; defender +1 and wins ties; defender victory sends attacker back to final Territory | Add explicit Last Stand initiation, battle context, outcome, and retry loop |
| Shared victory evaluator | Adapt | Central evaluator exists | Standard Last Stand victory plus faction additional victory conditions | Keep registry/central hook; replace `opponent_heartland_occupied` reason and support multiple typed routes |
| Military victory | Add | Not modeled | Standard run-the-Gauntlet victory only | Implement during Military faction phase |
| Diplomat victory | Add | Not modeled | Peace Treaty | Defer until Diplomats implementation, but reserve typed victory route |
| Financier victory | Add | Not modeled | Controlling Interest | Defer until Financiers implementation, but reserve typed victory route |
| Intelligence victory | Add | Not modeled | Special Operation | Defer until Intelligence implementation, but reserve typed victory route |
| Mystic victory | Add | Not modeled | Ritual | Defer until Mystics implementation, but reserve typed victory route |
| Inquisition victory | Add | Not modeled | Purification | Defer until Inquisition implementation, but reserve typed victory route |
| Card IDs/content | Replace | Legacy pre-v0.6 starter data and partial hard-coded effects | Generated v0.6 canonical IDs/text/metadata | Generate engine-facing content from canonical data; no independent manual copy |
| Effect registry | Retain/Adapt | Registry keyed to legacy effect behavior | Registry keyed to canonical IDs and timing/effect primitives | Preserve pattern; replace registrations incrementally |
| Unsupported effects | Add | Missing behavior may simply be absent | Unsupported/manual effects must be explicit in game state and interfaces | Add support status and manual-resolution annotation |
| Legal-action generation | Retain/Adapt | Engine exposes some legal Action/Battle options | Engine is sole legality authority for all actions, faction abilities, targets, and supplemental choices | Expand; remove UI-side reconstruction |
| Hidden information | Retain/Adapt | Public/private views and per-card visibility exist | Hands, face-down commitments, Battle Hands, Missions, and faction-specific hidden state must be player-specific | Preserve boundary; add leakage tests for every new hidden zone |
| Event log | Retain/Adapt | Structured game events | Versioned deterministic replay log with random requests/results and private visibility | Add action IDs, ruleset/content hashes, and deterministic random records |
| Save/load | Defer/Add | Prototype state can be serialized informally | Versioned saves; no silent legacy migration | Add after canonical core transitions stabilize |
| CLI | Retain as dev tool | Guided local runner and session logs | Useful for deterministic debugging, not production UI | Port after core types compile |
| Browser GUI | Retain as dev shell | Local server with guided actions | Interface must consume engine legal actions and player-specific views only | Reconnect after core API migration; do not encode v0.6 legality in GUI |
| Multiplayer/networking | Defer | Not implemented | Remote play eventually | Wait until deterministic local v0.6 games and replays are stable |
| Alternate board variants | Defer | Type includes dual lane and cross layouts | v0.6 target is standard 1x6 two-player game | Remove from immediate acceptance criteria; retain extensibility only if it does not complicate core |

---

## 4. Critical obsolete assumptions to remove first

The following legacy assumptions are dangerous because they can make the prototype appear playable while enforcing the wrong game:

1. **Heartland is a board space.**  
   Canonical v0.6 uses positions immediately before and beyond each end of the Territory column. Last Stand is a battle, not a location named Heartland.

2. **Occupying the opponent's endpoint wins immediately.**  
   Victory requires forcing the opponent beyond the Gauntlet, capturing the final Territory, advancing beyond it, and winning Last Stand.

3. **Territories are hidden and revealed during movement.**  
   Canonical setup reveals all six simultaneously.

4. **The game can start without faction and Leader packages.**  
   A canonical Deck includes faction, Leader, Playable Deck, Territories, and required supplemental components.

5. **Battle draw is merely an extra draw from the normal hand system.**  
   The canonical term and object are a separate temporary **Battle Hand**.

6. **Tie policy can be assigned generally to a defender.**  
   Defender's Advantage depends on control of the contested Territory or Last Stand context.

7. **Numerical die modifiers are the whole dice system.**  
   v0.6 requires advantage/disadvantage pools and an explicit result-modification order.

8. **A card/effect missing from the engine is silently unavailable.**  
   Unsupported behavior must be visible and auditable.

---

## 5. Recommended migration sequence

### Milestone 0 — freeze the legacy prototype

- Mark existing legacy tests and fixtures as `legacy-v0.5` where practical.
- Preserve the last known behavior for provenance.
- Do not make new v0.6 behavior pass by weakening legacy assertions without documenting why.

### Milestone 1 — versioned canonical content adapter

- Define the engine-facing v0.6 schema.
- Load generated canonical v0.6 data.
- Validate IDs and counts against the generated release manifest.
- Record rules version and content fingerprint in game state.
- Expose support status for each card, Territory, faction rule, Leader ability, and supplemental component.

**Exit criterion:** the engine can load and validate canonical v0.6 Deck packages without starting a game.

### Milestone 2 — canonical setup and board topology

- Add faction/Leader/supplemental setup types.
- Replace Heartland spaces with before-column and beyond-column positions.
- Reveal all Territories during setup.
- Place tokens before their own end.
- Preserve Territory controller and orientation.

**Exit criterion:** canonical setup produces a valid public/private initial state for two legal Decks.

### Milestone 3 — canonical turn skeleton

- Implement explicit Capture, Draw, Action Opportunity, Movement, deferred Action Opportunity, and Cleanup transitions.
- Enforce opening hand, normal draw, partial draw, reshuffle, and hand limit.
- Add Hold and Withdraw.

**Exit criterion:** two players can take non-battle turns indefinitely with deterministic logs and correct zones.

### Milestone 4 — canonical shared battle engine

- Port sequential hand commitments and Battle-Hand formation.
- Rename legacy battle-draw state and actions.
- Add begin-battle timing.
- Add advantage/disadvantage.
- Add canonical negation, cancellation, copy/repeat, and destinations.
- Verify Defender's Advantage from battle context.

**Exit criterion:** a no-card battle and representative Neutral-card battles match physical examples exactly.

### Milestone 5 — occupation, capture, running, and Last Stand

- Verify occupation during unresolved attacks.
- Port retreat and add withdrawal.
- Confirm delayed capture and counterattack windows.
- Implement final-Territory force-back sequence.
- Implement Last Stand initiation, +1, tie rule, outcomes, and repeat attempts.
- Replace standard victory evaluator.

**Exit criterion:** a complete factionless/Neutral-only game can end only through the canonical Last Stand route.

### Milestone 6 — shared persistent systems

- Complete Asset actions and limit enforcement.
- Add Territory orientation to views.
- Implement Overlay stacks, dormancy, ownership, rotation, and removal.
- Add explicit manual-resolution fallback.

**Exit criterion:** all shared v0.6 rules are represented before faction-specific implementation begins.

### Milestone 7 — factions one at a time

Implement in canonical roadmap order:

1. Military
2. Diplomats
3. Financiers
4. Intelligence
5. Mystics
6. Inquisition

For each faction:

- both Leaders;
- faction resource/tracker;
- supplemental components;
- all faction actions and timing windows;
- all twelve faction cards;
- additional victory condition, if any;
- private-information tests;
- one complete recommended starter Deck replay; and
- explicit support status for anything still manual.

### Milestone 8 — interfaces and playtest telemetry

- Port CLI to v0.6 legal actions.
- Port browser GUI without duplicating legality.
- Add save/load and deterministic replay.
- Export playtest metrics and support/manual-resolution warnings.
- Add local hot-seat mode.

Remote play remains out of scope until local deterministic games are stable.

---

## 6. First implementation PRs after this audit

Recommended small-PR sequence:

1. **Add explicit v0.6 ruleset/content identifiers and support-status types.**
2. **Add canonical Deck-package validation from generated v0.6 data.**
3. **Replace Heartland board spaces with before/beyond positions.**
4. **Add canonical setup with faction, Leader, Territories, and supplemental components.**
5. **Split Capture and Draw into explicit turn phases.**
6. **Rename battle-draw state to Battle Hand without changing lifecycle behavior.**
7. **Add advantage/disadvantage dice resolution.**
8. **Replace immediate endpoint victory with final-Territory and Last Stand state.**
9. **Add Overlay state and shared rules.**
10. **Begin Military as the first complete faction implementation.**

PRs 1–8 produce the first useful canonical-core game. PRs should remain independently testable and should avoid mixing content migration with interface redesign.

---

## 7. Acceptance criteria for the v0.6 canonical-core milestone

The shared engine is ready for faction implementation only when all of the following are true:

- a game cannot initialize with an illegal v0.6 Deck package;
- setup reveals six Territories and places both tokens before the column;
- the engine records v0.6.0 rules and content identity;
- every normal turn follows Capture → Draw → Action Opportunity → Movement → deferred Action Opportunity → Cleanup;
- partial draws and reshuffles match the rulebook;
- hands discard to three during Cleanup;
- players may Advance, Hold, or Withdraw legally;
- entering an occupied position begins a battle;
- commitments and Battle Hands occur in canonical attacker/defender order;
- hand commitments go to Graveyard and all Battle-Hand cards normally go to Discard;
- cancellation and negation remain distinct;
- advantage/disadvantage, rerolls, result changes, and modifiers resolve in canonical order;
- Defender's Advantage applies only in the correct contexts;
- occupation, control, capture, and counterattack timing are distinct;
- Asset limits and immediate discard-down are enforced;
- Overlays can be represented without faction code;
- the defender can be forced beyond the final Territory;
- the final Territory must be captured before Last Stand can be initiated;
- Last Stand grants the defender Defender's Advantage and +1;
- an attacking Last Stand win ends the game;
- a defending Last Stand win returns the attacker to the final Territory and play continues;
- unsupported effects are explicitly marked rather than silently ignored;
- public/private views reveal no hidden information improperly; and
- deterministic logs can replay representative shared-rule games.

---

## 8. Decision

Resume development from the existing TypeScript architecture.

Treat the legacy implementation as a tested structural prototype, not as the rules baseline. Port the canonical v0.6 shared game first, then implement factions one complete package at a time. Do not build further production-facing GUI or remote-play features until the canonical-core acceptance criteria are satisfied.
