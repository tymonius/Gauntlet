# Arcane Knowledge Replay Capability Audit

**Generated from:** v0.6.0 canonical card data and current TypeScript sources on this branch.

This report inventories every printed Battle effect, where its card ID appears in the engine, and whether those implementation files contain virtual-card filtering. It is evidence for replacing Arcane Knowledge’s incomplete hard-coded replay allowlist; it does not itself declare an effect replay-safe.

Battle effects inventoried: **111**

## Summary by timing tag

- **aftermath:** 24
- **board-change:** 15
- **cleanup:** 38
- **dice:** 3
- **formation:** 6
- **other:** 7
- **pre-reveal:** 12
- **reveal:** 43
- **targeted:** 28

## Card matrix

### Contingency Plan (`neutral-contingency-plan`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** If your opponent controls more Territories than you, add +1 to your battle total.
- **TypeScript files containing the ID:** 10
  - `src/cards/playability.ts:41` — `'neutral-contingency-plan': battleAndAction('neutral-contingency-plan', 'asset_bank'),`
  - `src/effects/battle.ts:219` — `return participantCardCount(participant, 'neutral-contingency-plan') > 0`
  - `src/effects/battle.ts:230` — `const count = participantCardCount(participant, 'neutral-contingency-plan');`
  - `src/effects/battle.ts:236` — `source: 'neutral-contingency-plan',`
  - `src/state/apply-neutral.ts:52` — `import { applyContingencyPlanAssetLimitDraw } from './neutral-contingency-plan';`
  - `src/state/apply-neutral.ts:534` — `? activeBankedAssetCopies(game, action.playerId, 'neutral-contingency-plan')`
  - `src/state/index.ts:81` — `export * from './neutral-contingency-plan';`
  - `src/state/inquisition-act-of-faith.test.ts:17` — `const FIRST = 'neutral-contingency-plan';`
  - `src/state/inquisition-burning-at-the-stake.test.ts:18` — `const LOW = 'neutral-contingency-plan';`
  - `src/state/inquisition-excommunication.test.ts:17` — `const ONE = 'neutral-contingency-plan';`
  - `src/state/inquisition-guilt-by-association.test.ts:16` — `const MATCHING = 'neutral-contingency-plan';`
  - `src/state/neutral-contingency-plan.test.ts:7` — `import { CONTINGENCY_PLAN } from './neutral-contingency-plan';`
  - `src/state/neutral-contingency-plan.ts:4` — `export const CONTINGENCY_PLAN = 'neutral-contingency-plan';`
- **Virtual/effect-only sites in those files:** 8
  - `src/effects/battle.ts:37` — `.find((played) => played?.cardId === target.targetCardId && played.owner === target.targetOwner && !played.canceled && !played.virtual);`
  - `src/effects/battle.ts:55` — `...participant.battleDrawPlayed.filter((played) => !played.virtual).map((played) => played.cardId),`
  - `src/effects/battle.ts:71` — `.filter(({ played }) => !played.virtual && played.origin === 'battle_draw')`
  - `src/effects/battle.ts:83` — `if (played.virtual || played.fromInitialBattleHand === false) continue;`
  - `src/effects/battle.ts:102` — `.filter(({ played }) => !played.virtual && played.origin === 'battle_draw')`
  - `src/effects/battle.ts:352` — `const cards = loser.battleDrawPlayed.filter((played) => !played.virtual).map((played) => played.cardId);`
  - `src/state/inquisition-guilt-by-association.test.ts:132` — `it('offers titles from physical opposing cards used in battle, including canceled cards but excluding virtual effects', () => {`
  - `src/state/inquisition-guilt-by-association.test.ts:164` — `virtual: true,`

### Counterintelligence (`neutral-counterintelligence`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** Add +1 to your battle total. Until the normal reveal, opposing effects cannot look at or reveal your face-down cards used in this battle.
- **TypeScript files containing the ID:** 23
  - `src/cards/playability.ts:42` — `'neutral-counterintelligence': battleAndAction('neutral-counterintelligence', 'asset_bank'),`
  - `src/effects/battle.ts:254` — `return participantHasCard(context.battle.attacker, 'neutral-counterintelligence')`
  - `src/effects/battle.ts:255` — `|| participantHasCard(context.battle.defender, 'neutral-counterintelligence');`
  - `src/effects/battle.ts:262` — `count: participantCardCount(participant, 'neutral-counterintelligence'),`
  - `src/effects/battle.ts:267` — `source: 'neutral-counterintelligence',`
  - `src/state/index.ts:84` — `export * from './neutral-counterintelligence';`
  - `src/state/inquisition-act-of-faith.test.ts:18` — `const SECOND = 'neutral-counterintelligence';`
  - `src/state/inquisition-burning-at-the-stake.ts:18` — `} from './neutral-counterintelligence';`
  - `src/state/inquisition-confession.ts:15` — `} from './neutral-counterintelligence';`
  - `src/state/inquisition-excommunication.test.ts:18` — `const OTHER_ONE = 'neutral-counterintelligence';`
  - `src/state/inquisition-guilt-by-association.test.ts:17` — `const OTHER = 'neutral-counterintelligence';`
  - `src/state/inquisition-purge.ts:16` — `import { counterintelligenceBlocksHandInspection } from './neutral-counterintelligence';`
  - `src/state/intelligence-action-cards.ts:14` — `} from './neutral-counterintelligence';`
  - `src/state/intelligence-battle.ts:13` — `import { counterintelligenceBlocksFaceDownBattleCardInspection } from './neutral-counterintelligence';`
  - `src/state/intelligence-intercepted-orders-battle.ts:21` — `} from './neutral-counterintelligence';`
  - `src/state/intelligence-reactive-assets.ts:14` — `} from './neutral-counterintelligence';`
  - `src/state/intelligence-simple-battle-effects.ts:12` — `} from './neutral-counterintelligence';`
  - `src/state/intelligence-spies-battle.ts:16` — `} from './neutral-counterintelligence';`
  - `src/state/neutral-counterintelligence.test.ts:24` — `} from './neutral-counterintelligence';`
  - `src/state/neutral-counterintelligence.ts:10` — `export const COUNTERINTELLIGENCE = 'neutral-counterintelligence';`
  - `src/state/neutral-illegal-occupation.test.ts:11` — `import { counterintelligenceAssetActive } from './neutral-counterintelligence';`
  - `src/state/neutral-illegal-occupation.test.ts:15` — `const COUNTERINTELLIGENCE = 'neutral-counterintelligence';`
  - `src/state/neutral-palisade-wall.test.ts:13` — `const COUNTERINTELLIGENCE = 'neutral-counterintelligence';`
  - `src/state/neutral-palisade-wall.ts:10` — `import { counterintelligenceAssetActive } from './neutral-counterintelligence';`
  - `src/state/neutral-scouting-report.test.ts:12` — `import { COUNTERINTELLIGENCE } from './neutral-counterintelligence';`
  - `src/state/neutral-scouting-report.ts:16` — `} from './neutral-counterintelligence';`
  - `src/state/reducer.ts:24` — `import { counterintelligenceBlocksFaceDownBattleCardInspection } from './neutral-counterintelligence';`
- **Virtual/effect-only sites in those files:** 19
  - `src/effects/battle.ts:37` — `.find((played) => played?.cardId === target.targetCardId && played.owner === target.targetOwner && !played.canceled && !played.virtual);`
  - `src/effects/battle.ts:55` — `...participant.battleDrawPlayed.filter((played) => !played.virtual).map((played) => played.cardId),`
  - `src/effects/battle.ts:71` — `.filter(({ played }) => !played.virtual && played.origin === 'battle_draw')`
  - `src/effects/battle.ts:83` — `if (played.virtual || played.fromInitialBattleHand === false) continue;`
  - `src/effects/battle.ts:102` — `.filter(({ played }) => !played.virtual && played.origin === 'battle_draw')`
  - `src/effects/battle.ts:352` — `const cards = loser.battleDrawPlayed.filter((played) => !played.virtual).map((played) => played.cardId);`
  - `src/state/inquisition-burning-at-the-stake.ts:154` — `return Boolean(card && card.cardId === BURNING_AT_THE_STAKE && !card.canceled && !card.negated && !card.virtual);`
  - `src/state/inquisition-confession.ts:199` — `&& !card.virtual);`
  - `src/state/inquisition-guilt-by-association.test.ts:132` — `it('offers titles from physical opposing cards used in battle, including canceled cards but excluding virtual effects', () => {`
  - `src/state/inquisition-guilt-by-association.test.ts:164` — `virtual: true,`
  - `src/state/neutral-illegal-occupation.test.ts:137` — `it('ignores canceled, negated, virtual, defensive, and non-counterattack copies', () => {`
  - `src/state/neutral-illegal-occupation.test.ts:142` — `played('player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-palisade-wall.test.ts:191` — `it('ignores canceled, negated, virtual, and targetless Battle copies', () => {`
  - `src/state/neutral-palisade-wall.test.ts:192` — `for (const override of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-palisade-wall.ts:47` — `&& !card.virtual,`
  - `src/state/neutral-scouting-report.ts:190` — `&& !card.virtual,`
  - `src/state/neutral-scouting-report.ts:234` — `if (opponent.handCommit?.faceDown && !opponent.handCommit.canceled && !opponent.handCommit.virtual) {`
  - `src/state/neutral-scouting-report.ts:242` — `if (!card.faceDown || card.canceled || card.virtual) return;`
  - `src/state/neutral-scouting-report.ts:266` — `if (!target?.faceDown || target.canceled || target.virtual) {`

### Fealty (`neutral-fealty`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** Ignore one disadvantage affecting you during this battle. If you have no disadvantage, add +1 to your battle total instead.
- **TypeScript files containing the ID:** 15
  - `src/cards/playability.ts:78` — `'neutral-fealty': battleAndAction('neutral-fealty', 'asset_bank'),`
  - `src/state/apply-neutral.ts:94` — `import { applyFealtyBattleEffects } from './neutral-fealty';`
  - `src/state/diplomat-terms.test.ts:21` — `{ id: 'player_2', name: 'Opponent', deck: ['neutral-fealty','o2','o3','o4'], territories: ['o-t1','o-t2','o-t3'] },`
  - `src/state/index.ts:106` — `export * from './neutral-fealty';`
  - `src/state/intelligence-simple-battle-effects.ts:16` — `} from './neutral-fealty';`
  - `src/state/neutral-conscription.test.ts:13` — `const FEALTY = 'neutral-fealty';`
  - `src/state/neutral-contraband.test.ts:20` — `const FEALTY = 'neutral-fealty';`
  - `src/state/neutral-counterworks.test.ts:16` — `const FEALTY = 'neutral-fealty';`
  - `src/state/neutral-court-martial.test.ts:14` — `import { FEALTY } from './neutral-fealty';`
  - `src/state/neutral-court-martial.ts:16` — `} from './neutral-fealty';`
  - `src/state/neutral-fealty.test.ts:16` — `} from './neutral-fealty';`
  - `src/state/neutral-fealty.test.ts:20` — `id: 'neutral-fealty-test',`
  - `src/state/neutral-fealty.ts:11` — `export const FEALTY = 'neutral-fealty';`
  - `src/state/neutral-invasion.test.ts:10` — `const FEALTY = 'neutral-fealty';`
  - `src/state/neutral-resourcefulness.test.ts:22` — `const FEALTY = 'neutral-fealty';`
  - `src/state/neutral-strategic-withdrawal.test.ts:14` — `const ASSET = 'neutral-fealty';`
- **Virtual/effect-only sites in those files:** 5
  - `src/state/neutral-court-martial.test.ts:176` — `played(COURT_MARTIAL, 'player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-court-martial.ts:57` — `&& !card.virtual,`
  - `src/state/neutral-resourcefulness.test.ts:230` — `played(FORCED_MARCH, 'player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-strategic-withdrawal.test.ts:264` — `it('does not trigger from canceled, negated, or virtual copies or when no other used card exists', () => {`
  - `src/state/neutral-strategic-withdrawal.test.ts:268` — `played(STRATEGIC_WITHDRAWAL, 'player_1', 'battle_draw', { virtual: true }),`

### Forced March (`neutral-forced-march`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** If you are the attacking player, add +1 to your battle total.
- **TypeScript files containing the ID:** 8
  - `src/cards/playability.ts:79` — `'neutral-forced-march': battleAndAction('neutral-forced-march', 'discard'),`
  - `src/content/v06.test.ts:31` — `deck: ['neutral-rallying-cry', 'neutral-new-recruits', 'neutral-forced-march'],`
  - `src/content/v06.test.ts:37` — `deck: ['neutral-rallying-cry', 'neutral-new-recruits', 'neutral-forced-march'],`
  - `src/state/apply-neutral.ts:165` — `} from './neutral-forced-march';`
  - `src/state/index.ts:107` — `export * from './neutral-forced-march';`
  - `src/state/neutral-forced-march.test.ts:11` — `import { FORCED_MARCH } from './neutral-forced-march';`
  - `src/state/neutral-forced-march.test.ts:15` — `id: 'neutral-forced-march-test',`
  - `src/state/neutral-forced-march.ts:11` — `export const FORCED_MARCH = 'neutral-forced-march';`
  - `src/state/neutral-invasion.test.ts:9` — `const FORCED_MARCH = 'neutral-forced-march';`
  - `src/state/neutral-resourcefulness.test.ts:23` — `const FORCED_MARCH = 'neutral-forced-march';`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/neutral-resourcefulness.test.ts:230` — `played(FORCED_MARCH, 'player_1', 'battle_draw', { virtual: true }),`

### New Recruits (`neutral-new-recruits`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** Add +1 to your battle total.
- **TypeScript files containing the ID:** 7
  - `src/cards/playability.ts:80` — `'neutral-new-recruits': battleAndAction('neutral-new-recruits', 'discard', true),`
  - `src/content/v06.test.ts:31` — `deck: ['neutral-rallying-cry', 'neutral-new-recruits', 'neutral-forced-march'],`
  - `src/content/v06.test.ts:37` — `deck: ['neutral-rallying-cry', 'neutral-new-recruits', 'neutral-forced-march'],`
  - `src/state/apply-neutral.ts:171` — `} from './neutral-new-recruits';`
  - `src/state/index.ts:108` — `export * from './neutral-new-recruits';`
  - `src/state/neutral-new-recruits.test.ts:11` — `import { applyNewRecruitsBattleEffects, NEW_RECRUITS } from './neutral-new-recruits';`
  - `src/state/neutral-new-recruits.test.ts:20` — `id: 'neutral-new-recruits-test',`
  - `src/state/neutral-new-recruits.ts:14` — `export const NEW_RECRUITS = 'neutral-new-recruits';`
  - `src/state/views.ts:45` — `import { canResolveNewRecruitsAction, NEW_RECRUITS } from './neutral-new-recruits';`
- **Virtual/effect-only sites in those files:** 3
  - `src/state/views.ts:115` — `if (!played || played.virtual) return undefined;`
  - `src/state/views.ts:123` — `.filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled && !card.virtual);`
  - `src/state/views.ts:190` — `battleDrawPlayed: participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => revealPlayedCardToViewer(card, viewer)!).filter(Boolean),`

### Pathfinders (`neutral-pathfinders`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** If this battle is on a Territory with an active printed effect, add +1 to your battle total.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:81` — `'neutral-pathfinders': battleAndAction('neutral-pathfinders', 'discard', true),`
  - `src/state/apply-neutral.ts:177` — `} from './neutral-pathfinders';`
  - `src/state/index.ts:109` — `export * from './neutral-pathfinders';`
  - `src/state/neutral-audit-regressions.test.ts:4` — `import { PATHFINDERS, preparePathfindersAction } from './neutral-pathfinders';`
  - `src/state/neutral-pathfinders.test.ts:11` — `import { applyPathfindersBattleEffects, PATHFINDERS } from './neutral-pathfinders';`
  - `src/state/neutral-pathfinders.test.ts:17` — `id: 'neutral-pathfinders-test',`
  - `src/state/neutral-pathfinders.ts:14` — `export const PATHFINDERS = 'neutral-pathfinders';`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Rallying Cry (`neutral-rallying-cry`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** Add +1 to your battle total.
- **TypeScript files containing the ID:** 29
  - `src/cards/playability.ts:82` — `'neutral-rallying-cry': battleAndAction('neutral-rallying-cry', 'discard'),`
  - `src/content/v06.test.ts:19` — `expect(canonical.cardsById.get('neutral-rallying-cry')?.battle).toBe('Add +1 to your battle total.');`
  - `src/content/v06.test.ts:31` — `deck: ['neutral-rallying-cry', 'neutral-new-recruits', 'neutral-forced-march'],`
  - `src/content/v06.test.ts:37` — `deck: ['neutral-rallying-cry', 'neutral-new-recruits', 'neutral-forced-march'],`
  - `src/state/apply-neutral.ts:183` — `} from './neutral-rallying-cry';`
  - `src/state/index.ts:110` — `export * from './neutral-rallying-cry';`
  - `src/state/neutral-armistice.test.ts:14` — `const RALLYING_CRY = 'neutral-rallying-cry';`
  - `src/state/neutral-assimilation.test.ts:25` — `deck: [ASSIMILATION, ASSIMILATION, 'neutral-rallying-cry'],`
  - `src/state/neutral-assimilation.test.ts:33` — `deck: [ASSIMILATION, 'neutral-rallying-cry'],`
  - `src/state/neutral-audit-regressions.test.ts:26` — `deck: ['neutral-rallying-cry'],`
  - `src/state/neutral-capital-punishment.test.ts:16` — `const RALLYING_CRY = 'neutral-rallying-cry';`
  - `src/state/neutral-conscription.test.ts:15` — `const RALLYING_CRY = 'neutral-rallying-cry';`
  - `src/state/neutral-contraband.test.ts:19` — `const RALLYING_CRY = 'neutral-rallying-cry';`
  - `src/state/neutral-entrenchment-topology.test.ts:8` — `return Array.from({ length: 30 }, () => 'neutral-rallying-cry');`
  - `src/state/neutral-entrenchment.test.ts:14` — `const ACTION_CARD = 'neutral-rallying-cry';`
  - `src/state/neutral-foothold.test.ts:16` — `const FOURTH = 'neutral-rallying-cry';`
  - `src/state/neutral-fortifications.test.ts:27` — `deck: [FORTIFICATIONS, 'card-valor', 'neutral-rallying-cry'],`
  - `src/state/neutral-fortifications.test.ts:35` — `deck: [FORTIFICATIONS, FORTIFICATIONS, 'card-valor', 'neutral-rallying-cry'],`
  - `src/state/neutral-insurrection.test.ts:17` — `const RALLYING_CRY = 'neutral-rallying-cry';`
  - `src/state/neutral-invasion.test.ts:8` — `const RALLYING_CRY = 'neutral-rallying-cry';`
  - `src/state/neutral-liberation.test.ts:17` — `const RALLYING_CRY = 'neutral-rallying-cry';`
  - `src/state/neutral-protracted-siege.test.ts:20` — `const RALLYING_CRY = 'neutral-rallying-cry';`
  - `src/state/neutral-rallying-cry.test.ts:11` — `import { applyRallyingCryBattleEffects, RALLYING_CRY } from './neutral-rallying-cry';`
  - `src/state/neutral-rallying-cry.test.ts:18` — `id: 'neutral-rallying-cry-test',`
  - `src/state/neutral-rallying-cry.ts:14` — `export const RALLYING_CRY = 'neutral-rallying-cry';`
  - `src/state/neutral-redemption.test.ts:35` — `deck: [DIVINE_MERCY, 'neutral-rallying-cry', FIRST],`
  - `src/state/neutral-redemption.test.ts:220` — `own.players.player_1.zones.hand = ['neutral-rallying-cry'];`
  - `src/state/neutral-redemption.test.ts:225` — `cardId: 'neutral-rallying-cry',`
  - `src/state/neutral-resistance.test.ts:21` — `const RALLYING_CRY = 'neutral-rallying-cry';`
  - `src/state/neutral-strategic-withdrawal.test.ts:13` — `const OTHER = 'neutral-rallying-cry';`
  - `src/state/neutral-supplies.test.ts:20` — `const FOURTH = 'neutral-rallying-cry';`
  - `src/state/neutral-tactical-planning.test.ts:17` — `const TAIL = 'neutral-rallying-cry';`
  - `src/state/neutral-valor.test.ts:14` — `const FIRST = 'neutral-rallying-cry';`
  - `src/state/v06-board.test.ts:6` — `return Array.from({ length: 30 }, () => 'neutral-rallying-cry');`
  - `src/state/v06-last-stand.test.ts:7` — `return Array.from({ length: 30 }, () => 'neutral-rallying-cry');`
  - `src/state/v06-setup.test.ts:7` — `return Array.from({ length: 30 }, () => 'neutral-rallying-cry');`
  - `src/state/v06-setup.test.ts:61` — `...Array.from({ length: 29 }, () => 'neutral-rallying-cry'),`
  - `src/state/v06-setup.test.ts:82` — `...Array.from({ length: 28 }, () => 'neutral-rallying-cry'),`
- **Virtual/effect-only sites in those files:** 10
  - `src/state/neutral-capital-punishment.test.ts:277` — `it('ignores canceled, negated, and virtual Capital Punishment copies', () => {`
  - `src/state/neutral-capital-punishment.test.ts:278` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-fortifications.test.ts:210` — `played(FORTIFICATIONS, 'player_2', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-insurrection.test.ts:305` — `it('ignores canceled, negated, virtual, and defending copies', () => {`
  - `src/state/neutral-insurrection.test.ts:312` — `played('player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-resistance.test.ts:285` — `played('battle_draw', { virtual: true }),`
  - `src/state/neutral-strategic-withdrawal.test.ts:264` — `it('does not trigger from canceled, negated, or virtual copies or when no other used card exists', () => {`
  - `src/state/neutral-strategic-withdrawal.test.ts:268` — `played(STRATEGIC_WITHDRAWAL, 'player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-valor.test.ts:234` — `it('does not trigger from canceled, negated, virtual, tied, or already-leading copies', () => {`
  - `src/state/neutral-valor.test.ts:243` — `played('player_1', 'battle_draw', { virtual: true }),`

### Redemption (`neutral-redemption`)

- **Allegiance:** Neutral
- **Timing tags:** cleanup
- **Printed Battle text:** If an opposing effect negates one other card you used in this battle and that card would enter your Discard Pile, return it to your hand during battle cleanup instead.
- **TypeScript files containing the ID:** 7
  - `src/cards/playability.ts:83` — `'neutral-redemption': battleAndAction('neutral-redemption', 'asset_bank'),`
  - `src/dev/neutral-options.test.ts:14` — `{ id: 'player_2', name: 'Two', deck: ['neutral-redemption'], territories: ['d', 'e', 'f'] },`
  - `src/state/apply-neutral.ts:193` — `} from './neutral-redemption';`
  - `src/state/index.ts:111` — `export * from './neutral-redemption';`
  - `src/state/neutral-decoys.test.ts:13` — `import { registerRedemptionDiscardCardIds } from './neutral-redemption';`
  - `src/state/neutral-decoys.test.ts:17` — `const REDEMPTION = 'neutral-redemption';`
  - `src/state/neutral-redemption.test.ts:17` — `} from './neutral-redemption';`
  - `src/state/neutral-redemption.test.ts:25` — `id: 'neutral-redemption-test',`
  - `src/state/neutral-redemption.ts:18` — `export const REDEMPTION = 'neutral-redemption';`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Reserves (`neutral-reserves`)

- **Allegiance:** Neutral
- **Timing tags:** cleanup
- **Printed Battle text:** During battle cleanup, you may place one unchosen card from your Battle Hand on top of your Draw Pile instead of putting it in your Discard Pile.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:84` — `'neutral-reserves': battleAndAction('neutral-reserves', 'discard'),`
  - `src/state/apply-neutral.ts:273` — `} from './neutral-reserves';`
  - `src/state/index.ts:112` — `export * from './neutral-reserves';`
  - `src/state/neutral-reserves.test.ts:11` — `import { RESERVES } from './neutral-reserves';`
  - `src/state/neutral-reserves.test.ts:19` — `id: 'neutral-reserves-test',`
  - `src/state/neutral-reserves.ts:17` — `export const RESERVES = 'neutral-reserves';`
  - `src/state/neutral-valor.test.ts:15` — `const SECOND = 'neutral-reserves';`
- **Virtual/effect-only sites in those files:** 2
  - `src/state/neutral-valor.test.ts:234` — `it('does not trigger from canceled, negated, virtual, tied, or already-leading copies', () => {`
  - `src/state/neutral-valor.test.ts:243` — `played('player_1', 'battle_draw', { virtual: true }),`

### Scouting Report (`neutral-scouting-report`)

- **Allegiance:** Neutral
- **Timing tags:** pre-reveal, board-change, targeted
- **Printed Battle text:** Reveal this before the other cards in the battle. Look at one opposing face-down card used in the battle. You may replace this with one unchosen card from your Battle Hand. If you do, put this in your Graveyard immediately and place the replacement face down.
- **TypeScript files containing the ID:** 7
  - `src/cards/playability.ts:85` — `'neutral-scouting-report': battleAndAction('neutral-scouting-report', 'discard'),`
  - `src/state/apply-neutral.ts:290` — `} from './neutral-scouting-report';`
  - `src/state/index.ts:113` — `export * from './neutral-scouting-report';`
  - `src/state/intelligence-pre-reveal.ts:31` — `} from './neutral-scouting-report';`
  - `src/state/neutral-reinforcements.ts:26` — `'neutral-scouting-report',`
  - `src/state/neutral-scouting-report.test.ts:13` — `import { SCOUTING_REPORT } from './neutral-scouting-report';`
  - `src/state/neutral-scouting-report.test.ts:22` — `id: 'neutral-scouting-report-test',`
  - `src/state/neutral-scouting-report.ts:19` — `export const SCOUTING_REPORT = 'neutral-scouting-report';`
- **Virtual/effect-only sites in those files:** 5
  - `src/state/neutral-reinforcements.ts:60` — `&& !card.virtual`
  - `src/state/neutral-scouting-report.ts:190` — `&& !card.virtual,`
  - `src/state/neutral-scouting-report.ts:234` — `if (opponent.handCommit?.faceDown && !opponent.handCommit.canceled && !opponent.handCommit.virtual) {`
  - `src/state/neutral-scouting-report.ts:242` — `if (!card.faceDown || card.canceled || card.virtual) return;`
  - `src/state/neutral-scouting-report.ts:266` — `if (!target?.faceDown || target.canceled || target.virtual) {`

### Supplies (`neutral-supplies`)

- **Allegiance:** Neutral
- **Timing tags:** cleanup
- **Printed Battle text:** During battle cleanup, draw two cards, then discard one card.
- **TypeScript files containing the ID:** 8
  - `src/cards/playability.ts:86` — `'neutral-supplies': battleAndAction('neutral-supplies', 'asset_bank'),`
  - `src/state/apply-neutral.ts:296` — `} from './neutral-supplies';`
  - `src/state/index.ts:114` — `export * from './neutral-supplies';`
  - `src/state/neutral-illegal-occupation.test.ts:12` — `import { queueSuppliesAfterNormalDraw } from './neutral-supplies';`
  - `src/state/neutral-illegal-occupation.test.ts:14` — `const SUPPLIES = 'neutral-supplies';`
  - `src/state/neutral-sedition.test.ts:15` — `const ASSET = 'neutral-supplies';`
  - `src/state/neutral-supplies.test.ts:15` — `} from './neutral-supplies';`
  - `src/state/neutral-supplies.test.ts:24` — `id: 'neutral-supplies-test',`
  - `src/state/neutral-supplies.ts:15` — `export const SUPPLIES = 'neutral-supplies';`
  - `src/state/neutral-valor.test.ts:16` — `const THIRD = 'neutral-supplies';`
- **Virtual/effect-only sites in those files:** 7
  - `src/state/neutral-illegal-occupation.test.ts:137` — `it('ignores canceled, negated, virtual, defensive, and non-counterattack copies', () => {`
  - `src/state/neutral-illegal-occupation.test.ts:142` — `played('player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-sedition.test.ts:278` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-sedition.test.ts:283` — `played('player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-supplies.ts:62` — `return Boolean(card && card.cardId === SUPPLIES && !card.canceled && !card.negated && !card.virtual);`
  - `src/state/neutral-valor.test.ts:234` — `it('does not trigger from canceled, negated, virtual, tied, or already-leading copies', () => {`
  - `src/state/neutral-valor.test.ts:243` — `played('player_1', 'battle_draw', { virtual: true }),`

### Advance Guard (`neutral-advance-guard`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** If you are the attacking player and did not commit a card from hand, gain advantage.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:39` — `'neutral-advance-guard': battleAndAction('neutral-advance-guard', 'discard'),`
  - `src/state/apply-neutral.ts:45` — `} from './neutral-advance-guard';`
  - `src/state/index.ts:75` — `export * from './neutral-advance-guard';`
  - `src/state/neutral-advance-guard.test.ts:14` — `} from './neutral-advance-guard';`
  - `src/state/neutral-advance-guard.test.ts:21` — `id: 'neutral-advance-guard-test',`
  - `src/state/neutral-advance-guard.ts:11` — `export const ADVANCE_GUARD = 'neutral-advance-guard';`
  - `src/state/neutral-insurrection.test.ts:135` — `state.players.player_1.zones.discard = ['neutral-advance-guard'];`
  - `src/state/neutral-insurrection.test.ts:156` — `'neutral-advance-guard',`
- **Virtual/effect-only sites in those files:** 3
  - `src/state/neutral-advance-guard.ts:49` — `&& !card.virtual,`
  - `src/state/neutral-insurrection.test.ts:305` — `it('ignores canceled, negated, virtual, and defending copies', () => {`
  - `src/state/neutral-insurrection.test.ts:312` — `played('player_1', 'battle_draw', { virtual: true }),`

### Consolidation (`neutral-consolidation`)

- **Allegiance:** Neutral
- **Timing tags:** cleanup
- **Printed Battle text:** During battle cleanup, if you won as the attacking player on a Territory your opponent controls, draw one card.
- **TypeScript files containing the ID:** 5
  - `src/cards/playability.ts:40` — `'neutral-consolidation': battleAndAction('neutral-consolidation', 'discard'),`
  - `src/state/apply-neutral.ts:51` — `} from './neutral-consolidation';`
  - `src/state/index.ts:80` — `export * from './neutral-consolidation';`
  - `src/state/neutral-consolidation.test.ts:11` — `import { CONSOLIDATION } from './neutral-consolidation';`
  - `src/state/neutral-consolidation.test.ts:19` — `id: 'neutral-consolidation-test',`
  - `src/state/neutral-consolidation.ts:14` — `export const CONSOLIDATION = 'neutral-consolidation';`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/neutral-consolidation.ts:51` — `&& !card.virtual,`

### Decoys (`neutral-decoys`)

- **Allegiance:** Neutral
- **Timing tags:** other
- **Printed Battle text:** An opposing effect that cancels a card used in this battle must target this before another active card you used, if able.
- **TypeScript files containing the ID:** 12
  - `src/cards/playability.ts:43` — `'neutral-decoys': battleAndAction('neutral-decoys', 'asset_bank'),`
  - `src/dev/battle-reveal-options.ts:39` — `const decoys = remainingTargets.filter((card) => card.cardId === 'neutral-decoys');`
  - `src/effects/embargo.ts:116` — `const decoysRemain = remainingOpposingCards.some((card) => card.cardId === 'neutral-decoys');`
  - `src/effects/embargo.ts:118` — `? remainingOpposingCards.filter((card) => card.cardId === 'neutral-decoys')`
  - `src/state/apply-neutral.ts:82` — `} from './neutral-decoys';`
  - `src/state/index.ts:88` — `export * from './neutral-decoys';`
  - `src/state/index.ts:89` — `export * from './neutral-decoys-battle';`
  - `src/state/neutral-decoys-battle.ts:3` — `export const DECOYS = 'neutral-decoys';`
  - `src/state/neutral-decoys.test.ts:10` — `} from './neutral-decoys';`
  - `src/state/neutral-decoys.test.ts:11` — `import { DECOYS } from './neutral-decoys-battle';`
  - `src/state/neutral-decoys.test.ts:21` — `id: 'neutral-decoys-replacement-test',`
  - `src/state/neutral-decoys.ts:14` — `import { DECOYS } from './neutral-decoys-battle';`
  - `src/state/neutral-disruption.test.ts:14` — `const DECOYS = 'neutral-decoys';`
  - `src/state/neutral-sedition.test.ts:16` — `const OTHER_ASSET = 'neutral-decoys';`
  - `src/state/neutral-sequestration.test.ts:8` — `import { DECOYS } from './neutral-decoys-battle';`
  - `src/state/views.ts:37` — `import { cancellationCandidatesWithDecoysPriority } from './neutral-decoys-battle';`
- **Virtual/effect-only sites in those files:** 9
  - `src/effects/embargo.ts:22` — `played && !played.canceled && !played.negated && !played.virtual,`
  - `src/state/neutral-decoys-battle.ts:8` — `card && !card.canceled && !card.negated && !card.virtual,`
  - `src/state/neutral-sedition.test.ts:278` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-sedition.test.ts:283` — `played('player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-sequestration.test.ts:239` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-sequestration.test.ts:240` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/views.ts:115` — `if (!played || played.virtual) return undefined;`
  - `src/state/views.ts:123` — `.filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled && !card.virtual);`
  - `src/state/views.ts:190` — `battleDrawPlayed: participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => revealPlayedCardToViewer(card, viewer)!).filter(Boolean),`

### Disruption (`neutral-disruption`)

- **Allegiance:** Neutral
- **Timing tags:** targeted
- **Printed Battle text:** Cancel one active opposing card used in the battle. A canceled hand commitment returns to its owner's hand. A canceled card chosen from a Battle Hand goes to its owner's Discard Pile.
- **TypeScript files containing the ID:** 12
  - `src/cards/playability.ts:44` — `'neutral-disruption': battleAndAction('neutral-disruption', 'discard'),`
  - `src/dev/battle-reveal-options.ts:71` — `if (cardId === 'neutral-disruption') return 'Disruption';`
  - `src/effects/disruption.ts:14` — `.some((card) => card.cardId === 'neutral-disruption'));`
  - `src/effects/disruption.ts:20` — `.filter((target) => target.sourceCardId === 'neutral-disruption')`
  - `src/effects/disruption.ts:24` — `source: 'neutral-disruption',`
  - `src/effects/embargo.ts:11` — `'neutral-disruption',`
  - `src/effects/embargo.ts:53` — `: cardId === 'neutral-disruption'`
  - `src/state/apply-neutral.ts:87` — `} from './neutral-disruption';`
  - `src/state/index.ts:90` — `export * from './neutral-disruption';`
  - `src/state/neutral-disruption.test.ts:12` — `import { DISRUPTION } from './neutral-disruption';`
  - `src/state/neutral-disruption.test.ts:20` — `id: 'neutral-disruption-test',`
  - `src/state/neutral-disruption.ts:5` — `export const DISRUPTION = 'neutral-disruption';`
  - `src/state/neutral-reinforcements.test.ts:12` — `const DISRUPTION = 'neutral-disruption';`
  - `src/state/neutral-reinforcements.ts:23` — `'neutral-disruption',`
  - `src/state/neutral-requisition.test.ts:10` — `const DISRUPTION = 'neutral-disruption';`
  - `src/state/views.ts:38` — `import { canResolveDisruptionAction, DISRUPTION } from './neutral-disruption';`
- **Virtual/effect-only sites in those files:** 9
  - `src/effects/embargo.ts:22` — `played && !played.canceled && !played.negated && !played.virtual,`
  - `src/state/neutral-reinforcements.test.ts:145` — `it('ignores canceled, negated, and virtual Reinforcements copies', () => {`
  - `src/state/neutral-reinforcements.test.ts:146` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-reinforcements.ts:60` — `&& !card.virtual`
  - `src/state/neutral-requisition.test.ts:217` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-requisition.test.ts:218` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/views.ts:115` — `if (!played || played.virtual) return undefined;`
  - `src/state/views.ts:123` — `.filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled && !card.virtual);`
  - `src/state/views.ts:190` — `battleDrawPlayed: participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => revealPlayedCardToViewer(card, viewer)!).filter(Boolean),`

### Entrenchment (`neutral-entrenchment`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** If you are the defending player, your opponent gains disadvantage during this battle.
- **TypeScript files containing the ID:** 14
  - `src/cards/playability.ts:45` — `'neutral-entrenchment': battleAndAction('neutral-entrenchment', 'asset_bank'),`
  - `src/state/apply-neutral.ts:93` — `} from './neutral-entrenchment';`
  - `src/state/index.ts:91` — `export * from './neutral-entrenchment';`
  - `src/state/neutral-capital-punishment.test.ts:15` — `const ASSET = 'neutral-entrenchment';`
  - `src/state/neutral-decoys.test.ts:15` — `const ASSET_A = 'neutral-entrenchment';`
  - `src/state/neutral-entrenchment-topology.test.ts:4` — `import { ENTRENCHMENT } from './neutral-entrenchment';`
  - `src/state/neutral-entrenchment.test.ts:11` — `import { ENTRENCHMENT } from './neutral-entrenchment';`
  - `src/state/neutral-entrenchment.test.ts:18` — `id: 'neutral-entrenchment-test',`
  - `src/state/neutral-entrenchment.ts:11` — `export const ENTRENCHMENT = 'neutral-entrenchment';`
  - `src/state/neutral-reinforcements.test.ts:10` — `const ENTRENCHMENT = 'neutral-entrenchment';`
  - `src/state/neutral-requisition.test.ts:9` — `const ASSET_TWO = 'neutral-entrenchment';`
  - `src/state/neutral-rousing-speech.test.ts:233` — `state.players.player_2.zones.assetBank = [BANKED_CARD, 'neutral-entrenchment'];`
  - `src/state/neutral-rousing-speech.test.ts:248` — `state.players.player_2.zones.assetBank = [BANKED_CARD, 'neutral-entrenchment'];`
  - `src/state/neutral-rousing-speech.test.ts:249` — `state.players.player_2.faceDownAssets = ['neutral-entrenchment'];`
  - `src/state/neutral-sabotage.test.ts:9` — `const ASSET = 'neutral-entrenchment';`
  - `src/state/neutral-sequestration.test.ts:12` — `const ASSET_A = 'neutral-entrenchment';`
  - `src/state/views.ts:40` — `import { entrenchmentActionPlayProhibited } from './neutral-entrenchment';`
- **Virtual/effect-only sites in those files:** 14
  - `src/state/neutral-capital-punishment.test.ts:277` — `it('ignores canceled, negated, and virtual Capital Punishment copies', () => {`
  - `src/state/neutral-capital-punishment.test.ts:278` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-entrenchment.ts:38` — `&& !card.virtual,`
  - `src/state/neutral-reinforcements.test.ts:145` — `it('ignores canceled, negated, and virtual Reinforcements copies', () => {`
  - `src/state/neutral-reinforcements.test.ts:146` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-requisition.test.ts:217` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-requisition.test.ts:218` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-rousing-speech.test.ts:245` — `it('counts only face-up Assets and ignores canceled, negated, and virtual copies', () => {`
  - `src/state/neutral-rousing-speech.test.ts:253` — `played('player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-sequestration.test.ts:239` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-sequestration.test.ts:240` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/views.ts:115` — `if (!played || played.virtual) return undefined;`
  - `src/state/views.ts:123` — `.filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled && !card.virtual);`
  - `src/state/views.ts:190` — `battleDrawPlayed: participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => revealPlayedCardToViewer(card, viewer)!).filter(Boolean),`

### Foothold (`neutral-foothold`)

- **Allegiance:** Neutral
- **Timing tags:** reveal, cleanup
- **Printed Battle text:** If you are defending a Territory you occupy but do not control, gain advantage. During battle cleanup, if you won, draw one card.
- **TypeScript files containing the ID:** 5
  - `src/cards/playability.ts:46` — `'neutral-foothold': battleAndAction('neutral-foothold', 'asset_bank'),`
  - `src/state/apply-neutral.ts:150` — `} from './neutral-foothold';`
  - `src/state/index.ts:92` — `export * from './neutral-foothold';`
  - `src/state/neutral-foothold.test.ts:11` — `import { FOOTHOLD } from './neutral-foothold';`
  - `src/state/neutral-foothold.test.ts:20` — `id: 'neutral-foothold-test',`
  - `src/state/neutral-foothold.ts:15` — `export const FOOTHOLD = 'neutral-foothold';`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/neutral-foothold.ts:49` — `&& !card.virtual,`

### Illegal Occupation (`neutral-illegal-occupation`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** If you are counterattacking an opponent occupying a Territory you control, their banked Assets are inactive during this battle and you gain advantage.
- **TypeScript files containing the ID:** 8
  - `src/cards/playability.ts:47` — `'neutral-illegal-occupation': battleAndAction('neutral-illegal-occupation', 'asset_bank'),`
  - `src/state/banked-assets.ts:3` — `import { illegalOccupationSuppressesBankedAssets } from './neutral-illegal-occupation';`
  - `src/state/index.ts:93` — `export * from './neutral-illegal-occupation';`
  - `src/state/intelligence-subversion-battle.ts:8` — `import { applyIllegalOccupationBattleEffects } from './neutral-illegal-occupation';`
  - `src/state/neutral-illegal-occupation.test.ts:10` — `} from './neutral-illegal-occupation';`
  - `src/state/neutral-illegal-occupation.test.ts:20` — `id: 'neutral-illegal-occupation-test',`
  - `src/state/neutral-illegal-occupation.ts:10` — `export const ILLEGAL_OCCUPATION = 'neutral-illegal-occupation';`
  - `src/state/neutral-reinforcements.test.ts:11` — `const ILLEGAL_OCCUPATION = 'neutral-illegal-occupation';`
  - `src/state/neutral-rousing-speech.test.ts:6` — `import { ILLEGAL_OCCUPATION } from './neutral-illegal-occupation';`
- **Virtual/effect-only sites in those files:** 7
  - `src/state/neutral-illegal-occupation.test.ts:137` — `it('ignores canceled, negated, virtual, defensive, and non-counterattack copies', () => {`
  - `src/state/neutral-illegal-occupation.test.ts:142` — `played('player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-illegal-occupation.ts:19` — `&& !card.virtual,`
  - `src/state/neutral-reinforcements.test.ts:145` — `it('ignores canceled, negated, and virtual Reinforcements copies', () => {`
  - `src/state/neutral-reinforcements.test.ts:146` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-rousing-speech.test.ts:245` — `it('counts only face-up Assets and ignores canceled, negated, and virtual copies', () => {`
  - `src/state/neutral-rousing-speech.test.ts:253` — `played('player_1', 'battle_draw', { virtual: true }),`

### Palisade Wall (`neutral-palisade-wall`)

- **Allegiance:** Neutral
- **Timing tags:** reveal, targeted
- **Printed Battle text:** If you are the defending player, negate one active opposing card committed from hand. If there is no such card, gain advantage instead.
- **TypeScript files containing the ID:** 7
  - `src/cards/playability.ts:48` — `'neutral-palisade-wall': battleAndAction('neutral-palisade-wall', 'asset_bank'),`
  - `src/state/apply-neutral.ts:154` — `} from './neutral-palisade-wall';`
  - `src/state/battle-reveal.ts:7` — `import { applyPalisadeWallBattleEffects } from './neutral-palisade-wall';`
  - `src/state/index.ts:100` — `export * from './neutral-palisade-wall';`
  - `src/state/neutral-palisade-wall.test.ts:10` — `} from './neutral-palisade-wall';`
  - `src/state/neutral-palisade-wall.test.ts:18` — `id: 'neutral-palisade-wall-test',`
  - `src/state/neutral-palisade-wall.ts:13` — `export const PALISADE_WALL = 'neutral-palisade-wall';`
  - `src/state/neutral-reinforcements.ts:25` — `'neutral-palisade-wall',`
- **Virtual/effect-only sites in those files:** 4
  - `src/state/neutral-palisade-wall.test.ts:191` — `it('ignores canceled, negated, virtual, and targetless Battle copies', () => {`
  - `src/state/neutral-palisade-wall.test.ts:192` — `for (const override of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-palisade-wall.ts:47` — `&& !card.virtual,`
  - `src/state/neutral-reinforcements.ts:60` — `&& !card.virtual`

### Reinforcements (`neutral-reinforcements`)

- **Allegiance:** Neutral
- **Timing tags:** other
- **Printed Battle text:** After all other cards in the battle are revealed, draw one additional card into your Battle Hand. You may immediately reveal it face up for its Battle effect in addition to your other card, if that effect can still resolve.
- **TypeScript files containing the ID:** 8
  - `src/cards/playability.ts:49` — `'neutral-reinforcements': battleAndAction('neutral-reinforcements', 'asset_bank'),`
  - `src/state/apply-neutral.ts:201` — `} from './neutral-reinforcements';`
  - `src/state/index.ts:101` — `export * from './neutral-reinforcements';`
  - `src/state/neutral-insurrection.test.ts:19` — `const REINFORCEMENTS = 'neutral-reinforcements';`
  - `src/state/neutral-liberation.test.ts:16` — `const REINFORCEMENTS = 'neutral-reinforcements';`
  - `src/state/neutral-reinforcements.test.ts:6` — `import { REINFORCEMENTS } from './neutral-reinforcements';`
  - `src/state/neutral-reinforcements.test.ts:16` — `id: 'neutral-reinforcements-test',`
  - `src/state/neutral-reinforcements.ts:19` — `export const REINFORCEMENTS = 'neutral-reinforcements';`
  - `src/state/views.ts:41` — `import { canUseReinforcementsAsset, REINFORCEMENTS, reinforcementsActionOpportunityActive } from './neutral-reinforcements';`
- **Virtual/effect-only sites in those files:** 8
  - `src/state/neutral-insurrection.test.ts:305` — `it('ignores canceled, negated, virtual, and defending copies', () => {`
  - `src/state/neutral-insurrection.test.ts:312` — `played('player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-reinforcements.test.ts:145` — `it('ignores canceled, negated, and virtual Reinforcements copies', () => {`
  - `src/state/neutral-reinforcements.test.ts:146` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-reinforcements.ts:60` — `&& !card.virtual`
  - `src/state/views.ts:115` — `if (!played || played.virtual) return undefined;`
  - `src/state/views.ts:123` — `.filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled && !card.virtual);`
  - `src/state/views.ts:190` — `battleDrawPlayed: participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => revealPlayedCardToViewer(card, viewer)!).filter(Boolean),`

### Requisition (`neutral-requisition`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** You may discard one banked Asset you control. If you do, gain advantage.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:50` — `'neutral-requisition': battleAndAction('neutral-requisition', 'discard', true),`
  - `src/state/apply-neutral.ts:209` — `} from './neutral-requisition';`
  - `src/state/index.ts:102` — `export * from './neutral-requisition';`
  - `src/state/neutral-armistice.test.ts:13` — `const REQUISITION = 'neutral-requisition';`
  - `src/state/neutral-requisition.test.ts:6` — `import { REQUISITION } from './neutral-requisition';`
  - `src/state/neutral-requisition.test.ts:14` — `id: 'neutral-requisition-test',`
  - `src/state/neutral-requisition.ts:14` — `export const REQUISITION = 'neutral-requisition';`
- **Virtual/effect-only sites in those files:** 3
  - `src/state/neutral-requisition.test.ts:217` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-requisition.test.ts:218` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-requisition.ts:57` — `&& !card.virtual,`

### Rousing Speech (`neutral-rousing-speech`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** If your opponent has more face-up Assets than you, gain advantage.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:51` — `'neutral-rousing-speech': battleAndAction('neutral-rousing-speech', 'asset_bank'),`
  - `src/state/apply-neutral.ts:265` — `} from './neutral-rousing-speech';`
  - `src/state/index.ts:105` — `export * from './neutral-rousing-speech';`
  - `src/state/neutral-conscription.test.ts:14` — `const ROUSING_SPEECH = 'neutral-rousing-speech';`
  - `src/state/neutral-rousing-speech.test.ts:12` — `} from './neutral-rousing-speech';`
  - `src/state/neutral-rousing-speech.test.ts:21` — `id: 'neutral-rousing-speech-test',`
  - `src/state/neutral-rousing-speech.ts:15` — `export const ROUSING_SPEECH = 'neutral-rousing-speech';`
- **Virtual/effect-only sites in those files:** 3
  - `src/state/neutral-rousing-speech.test.ts:245` — `it('counts only face-up Assets and ignores canceled, negated, and virtual copies', () => {`
  - `src/state/neutral-rousing-speech.test.ts:253` — `played('player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-rousing-speech.ts:81` — `&& !card.virtual,`

### Sabotage (`neutral-sabotage`)

- **Allegiance:** Neutral
- **Timing tags:** targeted
- **Printed Battle text:** Cancel one active opposing card used in the battle. Put it in its owner's Discard Pile immediately.
- **TypeScript files containing the ID:** 8
  - `src/cards/playability.ts:52` — `'neutral-sabotage': battleAndAction('neutral-sabotage', 'discard', true),`
  - `src/effects/embargo.ts:12` — `'neutral-sabotage',`
  - `src/effects/embargo.ts:55` — `: cardId === 'neutral-sabotage'`
  - `src/effects/sabotage.ts:11` — `.some((card) => card.cardId === 'neutral-sabotage'));`
  - `src/effects/sabotage.ts:17` — `.filter((target) => target.sourceCardId === 'neutral-sabotage')`
  - `src/effects/sabotage.ts:21` — `source: 'neutral-sabotage',`
  - `src/state/apply-neutral.ts:216` — `} from './neutral-sabotage';`
  - `src/state/index.ts:124` — `export * from './neutral-sabotage';`
  - `src/state/neutral-reinforcements.ts:24` — `'neutral-sabotage',`
  - `src/state/neutral-sabotage.test.ts:7` — `import { SABOTAGE } from './neutral-sabotage';`
  - `src/state/neutral-sabotage.test.ts:14` — `id: 'neutral-sabotage-test',`
  - `src/state/neutral-sabotage.ts:6` — `export const SABOTAGE = 'neutral-sabotage';`
- **Virtual/effect-only sites in those files:** 2
  - `src/effects/embargo.ts:22` — `played && !played.canceled && !played.negated && !played.virtual,`
  - `src/state/neutral-reinforcements.ts:60` — `&& !card.virtual`

### Salvage (`neutral-salvage`)

- **Allegiance:** Neutral
- **Timing tags:** cleanup
- **Printed Battle text:** During battle cleanup, if you won, you may put one unchosen card from your Battle Hand in your hand instead of your Discard Pile. If you do, discard one card from your hand.
- **TypeScript files containing the ID:** 5
  - `src/cards/playability.ts:53` — `'neutral-salvage': battleAndAction('neutral-salvage', 'discard', true),`
  - `src/state/apply-neutral.ts:224` — `} from './neutral-salvage';`
  - `src/state/index.ts:125` — `export * from './neutral-salvage';`
  - `src/state/neutral-salvage.test.ts:6` — `import { SALVAGE } from './neutral-salvage';`
  - `src/state/neutral-salvage.test.ts:14` — `id: 'neutral-salvage-test',`
  - `src/state/neutral-salvage.ts:14` — `export const SALVAGE = 'neutral-salvage';`
- **Virtual/effect-only sites in those files:** 3
  - `src/state/neutral-salvage.test.ts:239` — `it('does not trigger after losing or from canceled, negated, or virtual copies', () => {`
  - `src/state/neutral-salvage.test.ts:251` — `played(SALVAGE, 'player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-salvage.ts:55` — `&& !card.virtual);`

### Scorched Earth (`neutral-scorched-earth`)

- **Allegiance:** Neutral
- **Timing tags:** cleanup, aftermath, board-change
- **Printed Battle text:** If you lose while defending a Territory you control and retreat from it, place this on that Territory as a Ruins Overlay instead of following its normal destination.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:54` — `'neutral-scorched-earth': battleAndAction('neutral-scorched-earth', 'asset_bank'),`
  - `src/state/apply-neutral.ts:230` — `} from './neutral-scorched-earth';`
  - `src/state/index.ts:126` — `export * from './neutral-scorched-earth';`
  - `src/state/neutral-contraband.ts:40` — `'neutral-scorched-earth',`
  - `src/state/neutral-scorched-earth.test.ts:11` — `import { SCORCHED_EARTH } from './neutral-scorched-earth';`
  - `src/state/neutral-scorched-earth.test.ts:26` — `id: 'neutral-scorched-earth-test',`
  - `src/state/neutral-scorched-earth.ts:16` — `export const SCORCHED_EARTH = 'neutral-scorched-earth';`
- **Virtual/effect-only sites in those files:** 4
  - `src/state/neutral-contraband.ts:87` — `&& !card.virtual);`
  - `src/state/neutral-scorched-earth.test.ts:252` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-scorched-earth.test.ts:257` — `played('player_2', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-scorched-earth.ts:48` — `&& !card.virtual);`

### Sedition (`neutral-sedition`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** Your opponent chooses one face-up Asset they control. It is inactive during this battle. If they control no face-up Assets, add +1 to your battle total.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:55` — `'neutral-sedition': battleAndAction('neutral-sedition', 'discard'),`
  - `src/state/apply-neutral.ts:258` — `} from './neutral-sedition';`
  - `src/state/index.ts:127` — `export * from './neutral-sedition';`
  - `src/state/neutral-decoys.test.ts:31` — `deck: ['neutral-sedition'],`
  - `src/state/neutral-sedition.test.ts:12` — `import { SEDITION } from './neutral-sedition';`
  - `src/state/neutral-sedition.test.ts:21` — `id: 'neutral-sedition-test',`
  - `src/state/neutral-sedition.ts:19` — `export const SEDITION = 'neutral-sedition';`
- **Virtual/effect-only sites in those files:** 3
  - `src/state/neutral-sedition.test.ts:278` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-sedition.test.ts:283` — `played('player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-sedition.ts:62` — `&& !card.virtual,`

### Stand Ground (`neutral-stand-ground`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** If you are the defending player, gain advantage.
- **TypeScript files containing the ID:** 9
  - `src/cards/playability.ts:56` — `'neutral-stand-ground': battleAndAction('neutral-stand-ground', 'asset_bank'),`
  - `src/state/apply-neutral.ts:234` — `} from './neutral-stand-ground';`
  - `src/state/index.ts:128` — `export * from './neutral-stand-ground';`
  - `src/state/military-interactions.ts:5` — `import { openStandGroundForMilitaryMovement } from './neutral-stand-ground';`
  - `src/state/neutral-court-martial.test.ts:15` — `import { STAND_GROUND } from './neutral-stand-ground';`
  - `src/state/neutral-court-martial.ts:20` — `} from './neutral-stand-ground';`
  - `src/state/neutral-stand-ground.test.ts:15` — `import { STAND_GROUND } from './neutral-stand-ground';`
  - `src/state/neutral-stand-ground.test.ts:55` — `id: 'neutral-stand-ground-test',`
  - `src/state/neutral-stand-ground.ts:19` — `export const STAND_GROUND = 'neutral-stand-ground';`
  - `src/state/reducer.ts:25` — `import { openStandGroundForNoMartyrsMovement } from './neutral-stand-ground';`
- **Virtual/effect-only sites in those files:** 4
  - `src/state/neutral-court-martial.test.ts:176` — `played(COURT_MARTIAL, 'player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-court-martial.ts:57` — `&& !card.virtual,`
  - `src/state/neutral-stand-ground.test.ts:183` — `played(STAND_GROUND, 'player_2', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-stand-ground.ts:58` — `&& !card.virtual,`

### Strategic Withdrawal (`neutral-strategic-withdrawal`)

- **Allegiance:** Neutral
- **Timing tags:** cleanup, aftermath, board-change
- **Printed Battle text:** If you lose, after completing your normal retreat, you may withdraw one additional position. If you do, return one other card you used in this battle to your hand instead of putting it in its normal destination.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:57` — `'neutral-strategic-withdrawal': battleAndAction('neutral-strategic-withdrawal', 'discard', true),`
  - `src/state/apply-neutral.ts:240` — `} from './neutral-strategic-withdrawal';`
  - `src/state/index.ts:129` — `export * from './neutral-strategic-withdrawal';`
  - `src/state/neutral-strategic-withdrawal.test.ts:11` — `import { STRATEGIC_WITHDRAWAL } from './neutral-strategic-withdrawal';`
  - `src/state/neutral-strategic-withdrawal.test.ts:18` — `id: 'neutral-strategic-withdrawal-test',`
  - `src/state/neutral-strategic-withdrawal.ts:18` — `export const STRATEGIC_WITHDRAWAL = 'neutral-strategic-withdrawal';`
  - `src/state/reducer.ts:26` — `import { openStrategicWithdrawalAfterRetreat } from './neutral-strategic-withdrawal';`
- **Virtual/effect-only sites in those files:** 6
  - `src/state/neutral-strategic-withdrawal.test.ts:264` — `it('does not trigger from canceled, negated, or virtual copies or when no other used card exists', () => {`
  - `src/state/neutral-strategic-withdrawal.test.ts:268` — `played(STRATEGIC_WITHDRAWAL, 'player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-strategic-withdrawal.ts:66` — `&& !card.virtual,`
  - `src/state/neutral-strategic-withdrawal.ts:76` — `if (participant.handCommit && !participant.handCommit.virtual) {`
  - `src/state/neutral-strategic-withdrawal.ts:80` — `if (!card.virtual) entries.push({ targetKey: `battle_draw:${index}`, card });`
  - `src/state/neutral-strategic-withdrawal.ts:298` — `if (!target || target.virtual || target.cleanupDestination === 'hand') {`

### Tactical Planning (`neutral-tactical-planning`)

- **Allegiance:** Neutral
- **Timing tags:** formation
- **Printed Battle text:** If this was committed from hand, draw one additional card when forming your initial Battle Hand. This does not increase the number of cards you may choose from that Battle Hand.
- **TypeScript files containing the ID:** 8
  - `src/cards/playability.ts:58` — `'neutral-tactical-planning': battleAndAction('neutral-tactical-planning', 'discard'),`
  - `src/state/apply-neutral.ts:246` — `} from './neutral-tactical-planning';`
  - `src/state/index.ts:130` — `export * from './neutral-tactical-planning';`
  - `src/state/neutral-contraband.test.ts:22` — `const TACTICAL_PLANNING = 'neutral-tactical-planning';`
  - `src/state/neutral-contraband.ts:37` — `'neutral-tactical-planning',`
  - `src/state/neutral-tactical-planning.test.ts:10` — `import { TACTICAL_PLANNING } from './neutral-tactical-planning';`
  - `src/state/neutral-tactical-planning.test.ts:21` — `id: 'neutral-tactical-planning-test',`
  - `src/state/neutral-tactical-planning.ts:14` — `export const TACTICAL_PLANNING = 'neutral-tactical-planning';`
  - `src/state/reducer.ts:139` — `if (!participant.hasDrawnBattleCards && participant.handCommit?.cardId === 'neutral-tactical-planning') {`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/neutral-contraband.ts:87` — `&& !card.virtual);`

### Valor (`neutral-valor`)

- **Allegiance:** Neutral
- **Timing tags:** dice
- **Printed Battle text:** After battle dice are rolled, if your battle total is lower than your opponent's, you may reroll your battle die. You must use the new result.
- **TypeScript files containing the ID:** 10
  - `src/cards/playability.ts:59` — `'neutral-valor': battleAndAction('neutral-valor', 'asset_bank'),`
  - `src/state/apply-neutral.ts:251` — `} from './neutral-valor';`
  - `src/state/battle-effect-replay.ts:23` — `'neutral-valor',`
  - `src/state/index.ts:131` — `export * from './neutral-valor';`
  - `src/state/neutral-liberation.test.ts:15` — `const VALOR = 'neutral-valor';`
  - `src/state/neutral-resistance.test.ts:20` — `const VALOR = 'neutral-valor';`
  - `src/state/neutral-revolution.test.ts:12` — `import { VALOR } from './neutral-valor';`
  - `src/state/neutral-sequestration.test.ts:14` — `const ASSET_C = 'neutral-valor';`
  - `src/state/neutral-valor.test.ts:12` — `import { VALOR } from './neutral-valor';`
  - `src/state/neutral-valor.test.ts:20` — `id: 'neutral-valor-test',`
  - `src/state/neutral-valor.ts:16` — `export const VALOR = 'neutral-valor';`
- **Virtual/effect-only sites in those files:** 10
  - `src/state/battle-effect-replay.ts:76` — `played.virtual = true;`
  - `src/state/battle-effect-replay.ts:77` — `played.effectOnlyReplay = true;`
  - `src/state/neutral-resistance.test.ts:285` — `played('battle_draw', { virtual: true }),`
  - `src/state/neutral-revolution.test.ts:257` — `it('ignores canceled, negated, and virtual Revolution copies', () => {`
  - `src/state/neutral-revolution.test.ts:258` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-sequestration.test.ts:239` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-sequestration.test.ts:240` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-valor.test.ts:234` — `it('does not trigger from canceled, negated, virtual, tied, or already-leading copies', () => {`
  - `src/state/neutral-valor.test.ts:243` — `played('player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-valor.ts:48` — `&& (!card.virtual || card.effectOnlyReplay),`

### Attrition (`neutral-attrition`)

- **Allegiance:** Neutral
- **Timing tags:** formation, cleanup
- **Printed Battle text:** During battle cleanup, if your opponent loses, put every card from their initial Battle Hand in their Graveyard instead of its normal destination.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:60` — `'neutral-attrition': battleAndAction('neutral-attrition', 'asset_bank'),`
  - `src/effects/battle.ts:372` — `return hasPlayedCard(context, context.battle.winner, 'neutral-attrition')`
  - `src/effects/battle.ts:373` — `|| treasonCopiedEffect(context, context.battle.winner, 'neutral-attrition');`
  - `src/effects/battle.ts:402` — `return hasBankedAsset(context.game, context.battle.winner, 'neutral-attrition');`
  - `src/state/battle-effect-replay.ts:21` — `'neutral-attrition',`
  - `src/state/intelligence-subversion-asset.ts:23` — `const ATTRITION_ASSETS = ['neutral-attrition', 'card-attrition'] as const satisfies readonly CardID[];`
  - `src/state/intelligence-treason.ts:103` — `case 'neutral-attrition':`
  - `src/state/neutral-attrition.test.ts:12` — `const ATTRITION = 'neutral-attrition';`
  - `src/state/neutral-attrition.test.ts:16` — `id: 'neutral-attrition-test',`
  - `src/state/neutral-attrition.test.ts:283` — `state.battle!.effectsResolved.push('treason_copy:player_1:neutral-attrition');`
- **Virtual/effect-only sites in those files:** 8
  - `src/effects/battle.ts:37` — `.find((played) => played?.cardId === target.targetCardId && played.owner === target.targetOwner && !played.canceled && !played.virtual);`
  - `src/effects/battle.ts:55` — `...participant.battleDrawPlayed.filter((played) => !played.virtual).map((played) => played.cardId),`
  - `src/effects/battle.ts:71` — `.filter(({ played }) => !played.virtual && played.origin === 'battle_draw')`
  - `src/effects/battle.ts:83` — `if (played.virtual || played.fromInitialBattleHand === false) continue;`
  - `src/effects/battle.ts:102` — `.filter(({ played }) => !played.virtual && played.origin === 'battle_draw')`
  - `src/effects/battle.ts:352` — `const cards = loser.battleDrawPlayed.filter((played) => !played.virtual).map((played) => played.cardId);`
  - `src/state/battle-effect-replay.ts:76` — `played.virtual = true;`
  - `src/state/battle-effect-replay.ts:77` — `played.effectOnlyReplay = true;`

### Conscription (`neutral-conscription`)

- **Allegiance:** Neutral
- **Timing tags:** formation, targeted
- **Printed Battle text:** If this was committed from hand before Battle Hands were formed, draw one additional card when forming your initial Battle Hand and you may choose one additional card from it.
- **TypeScript files containing the ID:** 9
  - `src/cards/playability.ts:63` — `'neutral-conscription': battleAndAction('neutral-conscription', 'discard'),`
  - `src/state/apply-neutral.ts:76` — `} from './neutral-conscription';`
  - `src/state/index.ts:82` — `export * from './neutral-conscription';`
  - `src/state/neutral-conscription.test.ts:10` — `import { CONSCRIPTION } from './neutral-conscription';`
  - `src/state/neutral-conscription.test.ts:24` — `id: 'neutral-conscription-test',`
  - `src/state/neutral-conscription.ts:15` — `export const CONSCRIPTION = 'neutral-conscription';`
  - `src/state/neutral-contraband.test.ts:21` — `const CONSCRIPTION = 'neutral-conscription';`
  - `src/state/neutral-contraband.ts:36` — `'neutral-conscription',`
  - `src/state/reducer.ts:142` — `if (!participant.hasDrawnBattleCards && participant.handCommit?.cardId === 'neutral-conscription') {`
  - `src/state/views.ts:39` — `import { conscriptionAssetCardCanBePlayed } from './neutral-conscription';`
- **Virtual/effect-only sites in those files:** 4
  - `src/state/neutral-contraband.ts:87` — `&& !card.virtual);`
  - `src/state/views.ts:115` — `if (!played || played.virtual) return undefined;`
  - `src/state/views.ts:123` — `.filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled && !card.virtual);`
  - `src/state/views.ts:190` — `battleDrawPlayed: participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => revealPlayedCardToViewer(card, viewer)!).filter(Boolean),`

### Contraband (`neutral-contraband`)

- **Allegiance:** Neutral
- **Timing tags:** pre-reveal, reveal, cleanup, targeted
- **Printed Battle text:** When this is revealed, choose one card in your Discard Pile whose Battle effect can still resolve. Put this in your Graveyard and reveal the chosen card face up in its place. During cleanup, put the chosen card in your Graveyard unless its text states another destination.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:64` — `'neutral-contraband': battleAndAction('neutral-contraband', 'discard', true),`
  - `src/state/apply-neutral.ts:58` — `} from './neutral-contraband';`
  - `src/state/index.ts:83` — `export * from './neutral-contraband';`
  - `src/state/intelligence-pre-reveal.ts:14` — `} from './neutral-contraband';`
  - `src/state/neutral-contraband.test.ts:16` — `} from './neutral-contraband';`
  - `src/state/neutral-contraband.test.ts:27` — `id: 'neutral-contraband-test',`
  - `src/state/neutral-contraband.ts:14` — `export const CONTRABAND = 'neutral-contraband';`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/neutral-contraband.ts:87` — `&& !card.virtual);`

### Counterworks (`neutral-counterworks`)

- **Allegiance:** Neutral
- **Timing tags:** reveal, board-change, targeted
- **Printed Battle text:** Choose one: one Overlay on the contested Territory is inactive during this battle; or the next opposing Overlay that would be placed there during this battle or cleanup is not placed. If a card would have become that Overlay, put it in its owner's Discard Pile.
- **TypeScript files containing the ID:** 15
  - `src/cards/military.ts:4` — `import { processCounterworksOverlayQueue, queueCounterworksOverlayPlacement } from '../state/neutral-counterworks';`
  - `src/cards/playability.ts:65` — `'neutral-counterworks': battleAndAction('neutral-counterworks', 'asset_bank'),`
  - `src/state/apply-neutral.ts:62` — `} from './neutral-counterworks';`
  - `src/state/diplomat-persistent.ts:9` — `} from './neutral-counterworks';`
  - `src/state/index.ts:85` — `export * from './neutral-counterworks';`
  - `src/state/intelligence-fog-overlay.ts:14` — `} from './neutral-counterworks';`
  - `src/state/intelligence-pre-reveal.ts:18` — `} from './neutral-counterworks';`
  - `src/state/military-interactions.ts:6` — `import { processCounterworksOverlayQueue, queueCounterworksOverlayPlacement } from './neutral-counterworks';`
  - `src/state/mystics-circle-of-bones.ts:17` — `import { counterworksOverlayInactive, processCounterworksOverlayQueue, queueCounterworksOverlayPlacement } from './neutral-counterworks';`
  - `src/state/mystics-spirit-hollow.ts:16` — `import { counterworksOverlayInactive, processCounterworksOverlayQueue, queueCounterworksOverlayPlacement } from './neutral-counterworks';`
  - `src/state/neutral-counterworks.test.ts:12` — `} from './neutral-counterworks';`
  - `src/state/neutral-counterworks.test.ts:20` — `id: 'neutral-counterworks-test',`
  - `src/state/neutral-counterworks.ts:18` — `export const COUNTERWORKS = 'neutral-counterworks';`
  - `src/state/neutral-protracted-siege.test.ts:11` — `import { COUNTERWORKS } from './neutral-counterworks';`
  - `src/state/neutral-protracted-siege.ts:14` — `import { processCounterworksOverlayQueue, queueCounterworksOverlayPlacement } from './neutral-counterworks';`
  - `src/state/neutral-scorched-earth.ts:14` — `import { processCounterworksOverlayQueue, queueCounterworksOverlayPlacement } from './neutral-counterworks';`
- **Virtual/effect-only sites in those files:** 2
  - `src/state/neutral-protracted-siege.ts:48` — `&& !card.virtual);`
  - `src/state/neutral-scorched-earth.ts:48` — `&& !card.virtual);`

### Court Martial (`neutral-court-martial`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** Your opponent gains disadvantage during this battle. If they lose, after completing their normal retreat, they retreat one additional position, if able.
- **TypeScript files containing the ID:** 5
  - `src/cards/playability.ts:66` — `'neutral-court-martial': battleAndAction('neutral-court-martial', 'asset_bank'),`
  - `src/state/apply-neutral.ts:68` — `} from './neutral-court-martial';`
  - `src/state/index.ts:86` — `export * from './neutral-court-martial';`
  - `src/state/neutral-court-martial.test.ts:13` — `import { COURT_MARTIAL } from './neutral-court-martial';`
  - `src/state/neutral-court-martial.test.ts:19` — `id: 'neutral-court-martial-test',`
  - `src/state/neutral-court-martial.ts:23` — `export const COURT_MARTIAL = 'neutral-court-martial';`
- **Virtual/effect-only sites in those files:** 2
  - `src/state/neutral-court-martial.test.ts:176` — `played(COURT_MARTIAL, 'player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-court-martial.ts:57` — `&& !card.virtual,`

### Fortifications (`neutral-fortifications`)

- **Allegiance:** Neutral
- **Timing tags:** reveal, aftermath, board-change
- **Printed Battle text:** If you are the defending player, add +1 to your battle total. If you lose, you may withdraw one additional position after completing your normal retreat.
- **TypeScript files containing the ID:** 14
  - `src/cards/playability.ts:67` — `'neutral-fortifications': battleAndAction('neutral-fortifications', 'asset_bank'),`
  - `src/state/apply-neutral.ts:99` — `} from './neutral-fortifications';`
  - `src/state/battle-effect-replay.ts:22` — `'neutral-fortifications',`
  - `src/state/battle-effect-replay.ts:37` — `if ((cardId === 'card-fortifications' || cardId === 'neutral-fortifications')`
  - `src/state/index.ts:87` — `export * from './neutral-fortifications';`
  - `src/state/neutral-decoys.test.ts:16` — `const ASSET_B = 'neutral-fortifications';`
  - `src/state/neutral-fortifications.test.ts:13` — `import { FORTIFICATIONS } from './neutral-fortifications';`
  - `src/state/neutral-fortifications.test.ts:17` — `id: 'neutral-fortifications-test',`
  - `src/state/neutral-fortifications.ts:13` — `export const FORTIFICATIONS = 'neutral-fortifications';`
  - `src/state/neutral-insurrection.test.ts:18` — `const FORTIFICATIONS = 'neutral-fortifications';`
  - `src/state/neutral-liberation.test.ts:14` — `const FORTIFICATIONS = 'neutral-fortifications';`
  - `src/state/neutral-protracted-siege.test.ts:21` — `const FORTIFICATIONS = 'neutral-fortifications';`
  - `src/state/neutral-resistance.test.ts:19` — `const FORTIFICATIONS = 'neutral-fortifications';`
  - `src/state/neutral-resourcefulness.test.ts:24` — `const FORTIFICATIONS = 'neutral-fortifications';`
  - `src/state/neutral-sequestration.test.ts:13` — `const ASSET_B = 'neutral-fortifications';`
  - `src/state/reducer.ts:27` — `import { openFortificationsAfterRetreat } from './neutral-fortifications';`
- **Virtual/effect-only sites in those files:** 10
  - `src/state/battle-effect-replay.ts:76` — `played.virtual = true;`
  - `src/state/battle-effect-replay.ts:77` — `played.effectOnlyReplay = true;`
  - `src/state/neutral-fortifications.test.ts:210` — `played(FORTIFICATIONS, 'player_2', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-fortifications.ts:45` — `&& (!card.virtual || card.effectOnlyReplay),`
  - `src/state/neutral-insurrection.test.ts:305` — `it('ignores canceled, negated, virtual, and defending copies', () => {`
  - `src/state/neutral-insurrection.test.ts:312` — `played('player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-resistance.test.ts:285` — `played('battle_draw', { virtual: true }),`
  - `src/state/neutral-resourcefulness.test.ts:230` — `played(FORCED_MARCH, 'player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-sequestration.test.ts:239` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-sequestration.test.ts:240` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`

### Insurrection (`neutral-insurrection`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** If you are counterattacking an opponent occupying a Territory you control, gain double advantage. Otherwise, if you are the attacking player, gain advantage.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:68` — `'neutral-insurrection': battleAndAction('neutral-insurrection', 'discard'),`
  - `src/state/apply-neutral.ts:108` — `} from './neutral-insurrection';`
  - `src/state/index.ts:94` — `export * from './neutral-insurrection';`
  - `src/state/neutral-insurrection.test.ts:14` — `} from './neutral-insurrection';`
  - `src/state/neutral-insurrection.test.ts:23` — `id: 'neutral-insurrection-test',`
  - `src/state/neutral-insurrection.ts:13` — `export const INSURRECTION = 'neutral-insurrection';`
  - `src/state/views.ts:42` — `import { insurrectionActionOpportunityActive } from './neutral-insurrection';`
- **Virtual/effect-only sites in those files:** 6
  - `src/state/neutral-insurrection.test.ts:305` — `it('ignores canceled, negated, virtual, and defending copies', () => {`
  - `src/state/neutral-insurrection.test.ts:312` — `played('player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-insurrection.ts:53` — `&& !card.virtual,`
  - `src/state/views.ts:115` — `if (!played || played.virtual) return undefined;`
  - `src/state/views.ts:123` — `.filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled && !card.virtual);`
  - `src/state/views.ts:190` — `battleDrawPlayed: participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => revealPlayedCardToViewer(card, viewer)!).filter(Boolean),`

### Liberation (`neutral-liberation`)

- **Allegiance:** Neutral
- **Timing tags:** formation, targeted
- **Printed Battle text:** If you are counterattacking an opponent occupying a Territory you control, draw one additional card when forming your initial Battle Hand and you may choose one additional card from it.
- **TypeScript files containing the ID:** 8
  - `src/cards/playability.ts:69` — `'neutral-liberation': battleAndAction('neutral-liberation', 'asset_bank'),`
  - `src/state/apply-neutral.ts:123` — `} from './neutral-liberation';`
  - `src/state/index.ts:96` — `export * from './neutral-liberation';`
  - `src/state/neutral-liberation.test.ts:11` — `import { LIBERATION } from './neutral-liberation';`
  - `src/state/neutral-liberation.test.ts:21` — `id: 'neutral-liberation-test',`
  - `src/state/neutral-liberation.ts:11` — `export const LIBERATION = 'neutral-liberation';`
  - `src/state/neutral-resistance.ts:13` — `import { battleIsCounterattack } from './neutral-liberation';`
  - `src/state/reducer.ts:28` — `import { battleIsCounterattack, liberationActionOpportunityActive } from './neutral-liberation';`
  - `src/state/reducer.ts:153` — `&& participant.handCommit?.cardId === 'neutral-liberation'`
  - `src/state/views.ts:43` — `import { liberationActionOpportunityActive } from './neutral-liberation';`
- **Virtual/effect-only sites in those files:** 4
  - `src/state/neutral-resistance.ts:50` — `&& !card.virtual,`
  - `src/state/views.ts:115` — `if (!played || played.virtual) return undefined;`
  - `src/state/views.ts:123` — `.filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled && !card.virtual);`
  - `src/state/views.ts:190` — `battleDrawPlayed: participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => revealPlayedCardToViewer(card, viewer)!).filter(Boolean),`

### Protracted Siege (`neutral-protracted-siege`)

- **Allegiance:** Neutral
- **Timing tags:** cleanup, aftermath, board-change
- **Printed Battle text:** If you lose while defending a Territory you control, place this on that Territory as an Overlay instead of following its normal destination. The opponent does not capture that Territory during their next Capture step. During their following Capture step, they capture it normally if they still occupy it.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:70` — `'neutral-protracted-siege': battleAndAction('neutral-protracted-siege', 'asset_bank'),`
  - `src/state/apply-neutral.ts:129` — `} from './neutral-protracted-siege';`
  - `src/state/index.ts:97` — `export * from './neutral-protracted-siege';`
  - `src/state/neutral-protracted-siege.test.ts:15` — `} from './neutral-protracted-siege';`
  - `src/state/neutral-protracted-siege.test.ts:25` — `id: 'neutral-protracted-siege-test',`
  - `src/state/neutral-protracted-siege.ts:18` — `export const PROTRACTED_SIEGE = 'neutral-protracted-siege';`
  - `src/state/reducer.ts:32` — `} from './neutral-protracted-siege';`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/neutral-protracted-siege.ts:48` — `&& !card.virtual);`

### Resistance (`neutral-resistance`)

- **Allegiance:** Neutral
- **Timing tags:** reveal, cleanup, aftermath
- **Printed Battle text:** If you are counterattacking an opponent occupying a Territory you control, gain advantage. If you win, bank this as an Asset during cleanup instead of following its normal destination.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:71` — `'neutral-resistance': battleAndAction('neutral-resistance', 'asset_bank'),`
  - `src/state/apply-neutral.ts:135` — `} from './neutral-resistance';`
  - `src/state/index.ts:98` — `export * from './neutral-resistance';`
  - `src/state/neutral-resistance.test.ts:16` — `} from './neutral-resistance';`
  - `src/state/neutral-resistance.test.ts:25` — `id: 'neutral-resistance-test',`
  - `src/state/neutral-resistance.ts:15` — `export const RESISTANCE = 'neutral-resistance';`
  - `src/state/reducer.ts:33` — `import { prepareResistanceBattleCleanup } from './neutral-resistance';`
- **Virtual/effect-only sites in those files:** 2
  - `src/state/neutral-resistance.test.ts:285` — `played('battle_draw', { virtual: true }),`
  - `src/state/neutral-resistance.ts:50` — `&& !card.virtual,`

### Resourcefulness (`neutral-resourcefulness`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** If another active card you used in this battle has cost 1, gain advantage.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:72` — `'neutral-resourcefulness': battleAndAction('neutral-resourcefulness', 'asset_bank'),`
  - `src/state/apply-neutral.ts:143` — `} from './neutral-resourcefulness';`
  - `src/state/index.ts:99` — `export * from './neutral-resourcefulness';`
  - `src/state/neutral-resourcefulness.test.ts:19` — `} from './neutral-resourcefulness';`
  - `src/state/neutral-resourcefulness.test.ts:28` — `id: 'neutral-resourcefulness-test',`
  - `src/state/neutral-resourcefulness.ts:14` — `export const RESOURCEFULNESS = 'neutral-resourcefulness';`
  - `src/state/views.ts:46` — `import { canBankResourcefulness, RESOURCEFULNESS } from './neutral-resourcefulness';`
- **Virtual/effect-only sites in those files:** 5
  - `src/state/neutral-resourcefulness.test.ts:230` — `played(FORCED_MARCH, 'player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-resourcefulness.ts:41` — `return Boolean(card && !card.canceled && !card.negated && !card.virtual);`
  - `src/state/views.ts:115` — `if (!played || played.virtual) return undefined;`
  - `src/state/views.ts:123` — `.filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled && !card.virtual);`
  - `src/state/views.ts:190` — `battleDrawPlayed: participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => revealPlayedCardToViewer(card, viewer)!).filter(Boolean),`

### Arcane Knowledge (`neutral-arcane-knowledge`)

- **Allegiance:** Neutral
- **Timing tags:** pre-reveal, reveal, targeted
- **Printed Battle text:** When this is revealed, choose one card in your Graveyard with a Battle effect that can resolve in this battle. Resolve that effect as though you had used it. Leave the chosen card in your Graveyard.
- **TypeScript files containing the ID:** 7
  - `src/cards/neutral-audit-containment.ts:16` — `'neutral-arcane-knowledge': ['battle_hand_commit', 'battle_draw_play'],`
  - `src/cards/playability.ts:61` — `'neutral-arcane-knowledge': battleAndAction('neutral-arcane-knowledge', 'discard', true),`
  - `src/state/apply-neutral.ts:21` — `} from './neutral-arcane-knowledge';`
  - `src/state/index.ts:76` — `export * from './neutral-arcane-knowledge';`
  - `src/state/neutral-arcane-knowledge.test.ts:3` — `import { ARCANE_KNOWLEDGE } from './neutral-arcane-knowledge';`
  - `src/state/neutral-arcane-knowledge.ts:22` — `export const ARCANE_KNOWLEDGE = 'neutral-arcane-knowledge';`
  - `src/state/views.ts:30` — `import { ARCANE_KNOWLEDGE, canResolveArcaneKnowledgeAction } from './neutral-arcane-knowledge';`
- **Virtual/effect-only sites in those files:** 4
  - `src/state/neutral-arcane-knowledge.ts:112` — `&& !card.virtual,`
  - `src/state/views.ts:115` — `if (!played || played.virtual) return undefined;`
  - `src/state/views.ts:123` — `.filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled && !card.virtual);`
  - `src/state/views.ts:190` — `battleDrawPlayed: participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => revealPlayedCardToViewer(card, viewer)!).filter(Boolean),`

### Armistice (`neutral-armistice`)

- **Allegiance:** Neutral
- **Timing tags:** other
- **Printed Battle text:** Resolve effects that cancel cards first. If this is not canceled, end the battle without a winner. Return the attacking player to the position they entered from. Stop resolving Battle effects. Put all other cards still used in the battle in their owners' Discard Piles, then put this in its owner's Graveyard.
- **TypeScript files containing the ID:** 8
  - `src/cards/neutral-audit-containment.ts:21` — `coreCardPlayRules['neutral-armistice'].defaultDestinationByOrigin.hand = 'asset_bank';`
  - `src/cards/playability.ts:77` — `'neutral-armistice': battleAndAction('neutral-armistice', 'removed'),`
  - `src/state/apply-neutral.ts:28` — `} from './neutral-armistice';`
  - `src/state/index.ts:78` — `export * from './neutral-armistice';`
  - `src/state/neutral-armistice.test.ts:11` — `import { ARMISTICE } from './neutral-armistice';`
  - `src/state/neutral-armistice.test.ts:18` — `id: 'neutral-armistice-canonical-test',`
  - `src/state/neutral-armistice.ts:15` — `export const ARMISTICE = 'neutral-armistice';`
  - `src/state/neutral-reinforcements.ts:31` — `'neutral-armistice',`
  - `src/state/neutral-requisition.ts:11` — `import { armisticeCanBeVoluntarilyDiscarded } from './neutral-armistice';`
- **Virtual/effect-only sites in those files:** 4
  - `src/state/neutral-armistice.ts:76` — `&& !card.virtual);`
  - `src/state/neutral-armistice.ts:211` — `if (card.virtual) continue;`
  - `src/state/neutral-reinforcements.ts:60` — `&& !card.virtual`
  - `src/state/neutral-requisition.ts:57` — `&& !card.virtual,`

### Assimilation (`neutral-assimilation`)

- **Allegiance:** Neutral
- **Timing tags:** aftermath, board-change
- **Printed Battle text:** If you win as the attacking player on a Territory your opponent controls, capture that Territory immediately instead of occupying it. Put this in your Graveyard after the capture resolves.
- **TypeScript files containing the ID:** 6
  - `src/cards/neutral-audit-containment.ts:20` — `coreCardPlayRules['neutral-assimilation'].defaultDestinationByOrigin.hand = 'asset_bank';`
  - `src/cards/playability.ts:73` — `'neutral-assimilation': battleAndAction('neutral-assimilation', 'removed'),`
  - `src/state/apply-neutral.ts:13` — `} from './neutral-assimilation';`
  - `src/state/index.ts:77` — `export * from './neutral-assimilation';`
  - `src/state/neutral-assimilation.test.ts:11` — `import { ASSIMILATION } from './neutral-assimilation';`
  - `src/state/neutral-assimilation.test.ts:15` — `id: 'neutral-assimilation-canonical-test',`
  - `src/state/neutral-assimilation.ts:21` — `export const ASSIMILATION = 'neutral-assimilation';`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/neutral-assimilation.ts:81` — `&& !card.virtual,`

### Capital Punishment (`neutral-capital-punishment`)

- **Allegiance:** Neutral
- **Timing tags:** cleanup, targeted
- **Printed Battle text:** Negate one active opposing card used in the battle. During battle cleanup, if you won, put the chosen card in its owner's Graveyard instead of its normal destination.
- **TypeScript files containing the ID:** 8
  - `src/cards/playability.ts:62` — `'neutral-capital-punishment': battleAndAction('neutral-capital-punishment', 'discard', true),`
  - `src/effects/capital-punishment.ts:8` — `export const CAPITAL_PUNISHMENT = 'neutral-capital-punishment';`
  - `src/state/apply-neutral.ts:33` — `} from './neutral-capital-punishment';`
  - `src/state/battle-reveal.ts:6` — `import { applyCapitalPunishmentBattleEffects } from './neutral-capital-punishment';`
  - `src/state/index.ts:79` — `export * from './neutral-capital-punishment';`
  - `src/state/neutral-capital-punishment.test.ts:12` — `import { CAPITAL_PUNISHMENT } from './neutral-capital-punishment';`
  - `src/state/neutral-capital-punishment.test.ts:20` — `id: 'neutral-capital-punishment-test',`
  - `src/state/neutral-sequestration.test.ts:7` — `import { CAPITAL_PUNISHMENT } from './neutral-capital-punishment';`
  - `src/state/views.ts:36` — `} from './neutral-capital-punishment';`
- **Virtual/effect-only sites in those files:** 8
  - `src/effects/capital-punishment.ts:13` — `&& !card.virtual`
  - `src/state/neutral-capital-punishment.test.ts:277` — `it('ignores canceled, negated, and virtual Capital Punishment copies', () => {`
  - `src/state/neutral-capital-punishment.test.ts:278` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-sequestration.test.ts:239` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-sequestration.test.ts:240` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/views.ts:115` — `if (!played || played.virtual) return undefined;`
  - `src/state/views.ts:123` — `.filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled && !card.virtual);`
  - `src/state/views.ts:190` — `battleDrawPlayed: participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => revealPlayedCardToViewer(card, viewer)!).filter(Boolean),`

### Invasion (`neutral-invasion`)

- **Allegiance:** Neutral
- **Timing tags:** formation, targeted
- **Printed Battle text:** If you are the attacking player, draw one additional card when forming your initial Battle Hand and you may choose one additional card from it.
- **TypeScript files containing the ID:** 7
  - `src/cards/playability.ts:74` — `'neutral-invasion': battleAndAction('neutral-invasion', 'discard'),`
  - `src/state/apply-neutral.ts:117` — `} from './neutral-invasion';`
  - `src/state/index.ts:95` — `export * from './neutral-invasion';`
  - `src/state/neutral-invasion.test.ts:6` — `import { INVASION } from './neutral-invasion';`
  - `src/state/neutral-invasion.test.ts:14` — `id: 'neutral-invasion-canonical-test',`
  - `src/state/neutral-invasion.ts:9` — `export const INVASION = 'neutral-invasion';`
  - `src/state/reducer.ts:147` — `&& participant.handCommit?.cardId === 'neutral-invasion'`
  - `src/state/views.ts:44` — `import { canPlayInvasionAction, INVASION } from './neutral-invasion';`
- **Virtual/effect-only sites in those files:** 3
  - `src/state/views.ts:115` — `if (!played || played.virtual) return undefined;`
  - `src/state/views.ts:123` — `.filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled && !card.virtual);`
  - `src/state/views.ts:190` — `battleDrawPlayed: participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => revealPlayedCardToViewer(card, viewer)!).filter(Boolean),`

### Revolution (`neutral-revolution`)

- **Allegiance:** Neutral
- **Timing tags:** dice
- **Printed Battle text:** After all rerolls, you may exchange the players' final selected die results. Each player retains their own modifiers.
- **TypeScript files containing the ID:** 5
  - `src/cards/playability.ts:75` — `'neutral-revolution': battleAndAction('neutral-revolution', 'discard'),`
  - `src/state/apply-neutral.ts:279` — `} from './neutral-revolution';`
  - `src/state/index.ts:103` — `export * from './neutral-revolution';`
  - `src/state/neutral-revolution.test.ts:11` — `import { REVOLUTION } from './neutral-revolution';`
  - `src/state/neutral-revolution.test.ts:17` — `id: 'neutral-revolution-test',`
  - `src/state/neutral-revolution.ts:14` — `export const REVOLUTION = 'neutral-revolution';`
- **Virtual/effect-only sites in those files:** 3
  - `src/state/neutral-revolution.test.ts:257` — `it('ignores canceled, negated, and virtual Revolution copies', () => {`
  - `src/state/neutral-revolution.test.ts:258` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-revolution.ts:95` — `&& !card.virtual,`

### Sequestration (`neutral-sequestration`)

- **Allegiance:** Neutral
- **Timing tags:** reveal
- **Printed Battle text:** All banked Assets are inactive during this battle.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:76` — `'neutral-sequestration': battleAndAction('neutral-sequestration', 'discard'),`
  - `src/state/apply-neutral.ts:284` — `} from './neutral-sequestration';`
  - `src/state/battle-reveal.ts:8` — `import { applySequestrationBattleRestriction } from './neutral-sequestration';`
  - `src/state/index.ts:104` — `export * from './neutral-sequestration';`
  - `src/state/neutral-sequestration.test.ts:9` — `import { SEQUESTRATION } from './neutral-sequestration';`
  - `src/state/neutral-sequestration.test.ts:18` — `id: 'neutral-sequestration-test',`
  - `src/state/neutral-sequestration.ts:12` — `export const SEQUESTRATION = 'neutral-sequestration';`
- **Virtual/effect-only sites in those files:** 3
  - `src/state/neutral-sequestration.test.ts:239` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-sequestration.test.ts:240` — `for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {`
  - `src/state/neutral-sequestration.ts:148` — `&& !card.virtual,`

### Siege Weaponry (`neutral-siege-weaponry`)

- **Allegiance:** Neutral
- **Timing tags:** reveal, cleanup, aftermath, board-change
- **Printed Battle text:** If you are attacking on an enemy-controlled Territory, place this face up on it. That Territory's printed effect is inactive during this battle. If you win, turn this face down; it becomes a Ruins Overlay instead of following its normal destination.
- **TypeScript files containing the ID:** 2
  - `src/state/neutral-scorched-earth.test.ts:272` — `placeRuinsOverlay(state, space, 'neutral-siege-weaponry', 'player_1');`
  - `src/state/neutral-scorched-earth.test.ts:279` — `expect(state.players.player_1.zones.graveyard).toContain('neutral-siege-weaponry');`
  - `src/state/territory-overlays.ts:12` — `'neutral-siege-weaponry',`
- **Virtual/effect-only sites in those files:** 2
  - `src/state/neutral-scorched-earth.test.ts:252` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-scorched-earth.test.ts:257` — `played('player_2', 'battle_draw', { virtual: true }),`

### Manifest Destiny (`neutral-manifest-destiny`)

- **Allegiance:** Neutral
- **Timing tags:** cleanup, aftermath
- **Printed Battle text:** If you win as the attacking player on a Territory your opponent controls, insert this between the contested Territory and the position from which you attacked. It becomes a blank Territory under your control instead of following its normal destination.
- **TypeScript files containing the ID:** 0
  - No TypeScript occurrence found.
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Unbroken Ranks (`military-unbroken-ranks`)

- **Allegiance:** Military
- **Timing tags:** aftermath
- **Printed Battle text:** If you win this battle and used no Orders in it, gain 1 Command.
- **TypeScript files containing the ID:** 7
  - `src/cards/military.test.ts:11` — `deck: ['military-encampment', 'military-reserve-force', 'military-unbroken-ranks', 'military-give-chase'],`
  - `src/cards/military.test.ts:54` — `expect(player.zones.hand).toContain('military-unbroken-ranks');`
  - `src/cards/military.test.ts:56` — `applyMilitaryActionEffect(game, player.id, 'military-reserve-force', [{ kind: 'card', cardId: 'military-unbroken-ranks', owner: player.id }]);`
  - `src/cards/military.test.ts:57` — `expect(player.zones.hand).not.toContain('military-unbroken-ranks');`
  - `src/cards/military.test.ts:58` — `expect(player.military?.storedCards['military-reserve-force']).toBe('military-unbroken-ranks');`
  - `src/cards/military.ts:18` — `{ id: 'military-unbroken-ranks', name: 'Unbroken Ranks', cost: 1, action: 'Bank this as an Asset. After you win a battle in which you used no Orders, you may discard it to gain 1 Command.', battle: 'If you win this battle and used no Orders in it, gain 1 Command.' },`
  - `src/cards/playability.ts:94` — `'military-unbroken-ranks': battleAndAction('military-unbroken-ranks', 'asset_bank'),`
  - `src/cli/dev-runner-v06.ts:13` — `{ id: 'player_2', name: 'Player Two', factionId: 'military', leaderName: 'Commandant', deck: ['military-rearguard','military-unbroken-ranks','military-give-chase','military-field-command','card-attrition','card-valor','card-conscription','card-embargo'], territories: ['p2-territory-1','p2-territory-2','p2-territory-3'] },`
  - `src/gui/dev-server-v06.ts:15` — `{ id: 'player_2', name: 'Player Two', factionId: 'military', leaderName: 'Commandant', deck: ['military-rearguard','military-unbroken-ranks','military-give-chase','military-field-command','card-attrition','card-valor','card-conscription','card-embargo'], territories: ['p2-territory-1','p2-territory-2','p2-territory-3'] },`
  - `src/state/military-interactions.test.ts:12` — `deck: ['military-unbroken-ranks', 'military-battlefield-promotion', 'military-war-crimes', 'military-shock-and-awe'],`
  - `src/state/military-interactions.test.ts:39` — `state.players.player_1.zones.discard.push('military-unbroken-ranks');`
  - `src/state/military-interactions.test.ts:42` — `options: ['military-unbroken-ranks'],`
  - `src/state/military-interactions.test.ts:45` — `resolveMilitaryChoice(state, 'player_1', 'military-unbroken-ranks');`
  - `src/state/military-interactions.test.ts:46` — `expect(state.players.player_1.zones.hand).toContain('military-unbroken-ranks');`
  - `src/state/military-interactions.test.ts:47` — `expect(state.players.player_1.zones.discard).not.toContain('military-unbroken-ranks');`
  - `src/state/military-interactions.ts:75` — `if (cardWasPlayed(result, result.winner, 'military-unbroken-ranks') && !usedOrders) {`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Battlefield Promotion (`military-battlefield-promotion`)

- **Allegiance:** Military
- **Timing tags:** cleanup, aftermath
- **Printed Battle text:** If you win, return one other card you played from your Battle Hand to your hand instead of discarding it during cleanup.
- **TypeScript files containing the ID:** 6
  - `src/cards/military.ts:19` — `{ id: 'military-battlefield-promotion', name: 'Battlefield Promotion', cost: 2, action: 'During an Action Opportunity after you win a battle this turn, return one card you played from your Battle Hand in that battle from your Discard Pile to your hand.', battle: 'If you win, return one other card you played from your Battle Hand to your hand instead of discarding it during cleanup.' },`
  - `src/cards/military.ts:79` — `if (cardId === 'military-battlefield-promotion') {`
  - `src/cards/playability.ts:95` — `'military-battlefield-promotion': battleAndAction('military-battlefield-promotion', 'discard', true),`
  - `src/cli/dev-runner-v06.ts:12` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/gui/dev-server-v06.ts:14` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/state/military-interactions.test.ts:12` — `deck: ['military-unbroken-ranks', 'military-battlefield-promotion', 'military-war-crimes', 'military-shock-and-awe'],`
  - `src/state/military-interactions.test.ts:41` — `kind: 'battlefield_promotion', playerId: 'player_1', sourceCardId: 'military-battlefield-promotion',`
  - `src/state/military-interactions.ts:79` — `if (cardWasPlayed(result, result.winner, 'military-battlefield-promotion')) {`
  - `src/state/military-interactions.ts:80` — `const options = (result.battleHandCards?.[result.winner] ?? []).filter((card) => card !== 'military-battlefield-promotion' && winner.zones.discard.includes(card));`
  - `src/state/military-interactions.ts:81` — `if (options.length > 0) queue(game, { kind: 'battlefield_promotion', playerId: result.winner, sourceCardId: 'military-battlefield-promotion', options });`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Encampment (`military-encampment`)

- **Allegiance:** Military
- **Timing tags:** cleanup, aftermath, board-change
- **Printed Battle text:** If you win while defending a Territory you control, place this on it as an Overlay during cleanup.
- **TypeScript files containing the ID:** 6
  - `src/cards/military.test.ts:11` — `deck: ['military-encampment', 'military-reserve-force', 'military-unbroken-ranks', 'military-give-chase'],`
  - `src/cards/military.test.ts:42` — `player.zones.removed.push('military-encampment');`
  - `src/cards/military.test.ts:44` — `applyMilitaryActionEffect(game, player.id, 'military-encampment', [{ kind: 'space', spaceId: space.id }]);`
  - `src/cards/military.test.ts:45` — `expect(space.overlays).toEqual([{ cardId: 'military-encampment', owner: player.id, faceUp: true }]);`
  - `src/cards/military.ts:20` — `{ id: 'military-encampment', name: 'Encampment', cost: 2, cardForm: 'Territory Overlay', action: 'Place this as an Overlay on a Territory you occupy and control.', battle: 'If you win while defending a Territory you control, place this on it as an Overlay during cleanup.', supplemental: ['At the end of your turn, if you occupy and control this Territory, gain 1 Command. When an opponent gains control of it, put this in its owner’s Graveyard.'] },`
  - `src/cards/military.ts:56` — `if (cardId === 'military-encampment') {`
  - `src/cards/military.ts:99` — `if (overlay.cardId === 'military-encampment' && overlay.owner === endingPlayer && space.occupant === endingPlayer && space.controller === endingPlayer) {`
  - `src/cards/military.ts:110` — `if (overlay.cardId === 'military-encampment' && space.controller !== overlay.owner) {`
  - `src/cards/playability.ts:96` — `'military-encampment': battleAndAction('military-encampment', 'removed', true),`
  - `src/cli/dev-runner-v06.ts:12` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/gui/dev-server-v06.ts:14` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/state/military-interactions.ts:85` — `if (cardWasPlayed(result, result.winner, 'military-encampment') && result.winner === result.defender && location?.kind === 'territory' && location.controller === result.winner) {`
  - `src/state/military-interactions.ts:86` — `const sourceZone = winner.zones.discard.includes('military-encampment') ? 'discard' : winner.zones.graveyard.includes('military-encampment') ? 'graveyard' : undefined;`
  - `src/state/military-interactions.ts:91` — `cardId: 'military-encampment',`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Rearguard (`military-rearguard`)

- **Allegiance:** Military
- **Timing tags:** cleanup, aftermath
- **Printed Battle text:** If you lose and retreat, bank this during cleanup.
- **TypeScript files containing the ID:** 6
  - `src/cards/military.ts:21` — `{ id: 'military-rearguard', name: 'Rearguard', cost: 2, action: 'Bank this as an Asset. After you lose a battle and retreat, when your opponent would enter your position that turn using an Order or card effect, you may discard this to prevent that movement. No Command is spent; any card used returns to its owner’s hand.', battle: 'If you lose and retreat, bank this during cleanup.' },`
  - `src/cards/playability.ts:97` — `'military-rearguard': battleAndAction('military-rearguard', 'asset_bank'),`
  - `src/cli/dev-runner-v06.ts:13` — `{ id: 'player_2', name: 'Player Two', factionId: 'military', leaderName: 'Commandant', deck: ['military-rearguard','military-unbroken-ranks','military-give-chase','military-field-command','card-attrition','card-valor','card-conscription','card-embargo'], territories: ['p2-territory-1','p2-territory-2','p2-territory-3'] },`
  - `src/gui/dev-server-v06.ts:15` — `{ id: 'player_2', name: 'Player Two', factionId: 'military', leaderName: 'Commandant', deck: ['military-rearguard','military-unbroken-ranks','military-give-chase','military-field-command','card-attrition','card-valor','card-conscription','card-embargo'], territories: ['p2-territory-1','p2-territory-2','p2-territory-3'] },`
  - `src/state/inquisition-no-martyrs.test.ts:254` — `militaryBattle.defender.battleDrawPlayed = [played('military-rearguard', 'player_2')];`
  - `src/state/inquisition-no-martyrs.test.ts:255` — `militaryState.players.player_2.zones.discard = ['military-rearguard'];`
  - `src/state/inquisition-no-martyrs.test.ts:257` — `militaryState.recentBattleResult!.battleHandCards = { player_2: ['military-rearguard'] };`
  - `src/state/inquisition-no-martyrs.test.ts:259` — `expect(militaryState.players.player_2.zones.assetBank).not.toContain('military-rearguard');`
  - `src/state/inquisition-no-martyrs.test.ts:260` — `expect(militaryState.players.player_2.zones.discard).toContain('military-rearguard');`
  - `src/state/military-interactions.ts:118` — `&& cardWasPlayed(result, result.loser, 'military-rearguard')) {`
  - `src/state/military-interactions.ts:119` — `loser.zones.discard = loser.zones.discard.filter((card) => card !== 'military-rearguard');`
  - `src/state/military-interactions.ts:120` — `loser.zones.assetBank.push('military-rearguard');`
- **Virtual/effect-only sites in those files:** 2
  - `src/state/inquisition-no-martyrs.test.ts:196` — `it('counts active physical Battle copies and activated Assets while ignoring canceled, negated, and virtual copies', () => {`
  - `src/state/inquisition-no-martyrs.test.ts:204` — `played(NO_MARTYRS, 'player_1', 'replayed', { virtual: true }),`

### Brothers in Arms (`military-brothers-in-arms`)

- **Allegiance:** Military
- **Timing tags:** formation
- **Printed Battle text:** If this is in your initial Battle Hand and you committed no card from your hand, you may choose this and also commit one card from your hand face up. Both Battle effects must still be able to resolve.
- **TypeScript files containing the ID:** 7
  - `src/cards/military.ts:22` — `{ id: 'military-brothers-in-arms', name: 'Brothers in Arms', cost: 2, action: 'Bank this as an Asset. Before cards are committed from hand in a battle involving you, you may discard this to delay your hand commitment until after both players form their Battle Hands. Then either commit one card from your hand and choose one card from your Battle Hand, revealing both face up together, or choose neither. Both Battle effects must still be able to resolve.', battle: 'If this is in your initial Battle Hand and you committed no card from your hand, you may choose this and also commit one card from your hand face up. Both Battle effects must still be able to resolve.' },`
  - `src/cards/playability.ts:98` — `'military-brothers-in-arms': battleAndAction('military-brothers-in-arms', 'asset_bank'),`
  - `src/cli/dev-runner-v06.ts:12` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/dev/guided-options.test.ts:10` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe'], territories: ['p1-t1','p1-t2','p1-t3'] },`
  - `src/dev/guided-options.test.ts:29` — `state.pendingMilitaryTimingChoice = { kind: 'brothers_in_arms_selection', playerId: 'player_1', sourceCardId: 'military-brothers-in-arms', handOptions: ['hand-a','hand-b'], battleHandOptions: ['battle-a','battle-b'], mayChooseNeither: true };`
  - `src/gui/dev-server-v06.ts:14` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/state/military-timing.ts:6` — `const BROTHERS = 'military-brothers-in-arms';`
  - `src/types/military.ts:33` — `| { kind: 'brothers_in_arms_precommit'; playerId: PlayerID; sourceCardId: 'military-brothers-in-arms'; options: Array<'use' | 'pass'> }`
  - `src/types/military.ts:35` — `| { kind: 'brothers_in_arms_selection'; playerId: PlayerID; sourceCardId: 'military-brothers-in-arms'; handOptions: CardID[]; battleHandOptions: CardID[]; mayChooseNeither: true }`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Field Command (`military-field-command`)

- **Allegiance:** Military
- **Timing tags:** reveal
- **Printed Battle text:** After using a 1-Command Order during this battle, you may use your Leader's other 1-Command Order once this turn, at its next legal timing, for 0 Command. If you do, put this in your Graveyard after that Order resolves.
- **TypeScript files containing the ID:** 4
  - `src/cards/military.ts:23` — `{ id: 'military-field-command', name: 'Field Command', cost: 3, action: 'Bank this as an Asset. After using a 1-Command Order, you may discard this to use your Leader’s other 1-Command Order once this turn, at its next legal timing, for 0 Command.', battle: 'After using a 1-Command Order during this battle, you may use your Leader’s other 1-Command Order once this turn, at its next legal timing, for 0 Command. If you do, put this in your Graveyard after that Order resolves.' },`
  - `src/cards/playability.ts:99` — `'military-field-command': battleAndAction('military-field-command', 'asset_bank'),`
  - `src/cli/dev-runner-v06.ts:13` — `{ id: 'player_2', name: 'Player Two', factionId: 'military', leaderName: 'Commandant', deck: ['military-rearguard','military-unbroken-ranks','military-give-chase','military-field-command','card-attrition','card-valor','card-conscription','card-embargo'], territories: ['p2-territory-1','p2-territory-2','p2-territory-3'] },`
  - `src/gui/dev-server-v06.ts:15` — `{ id: 'player_2', name: 'Player Two', factionId: 'military', leaderName: 'Commandant', deck: ['military-rearguard','military-unbroken-ranks','military-give-chase','military-field-command','card-attrition','card-valor','card-conscription','card-embargo'], territories: ['p2-territory-1','p2-territory-2','p2-territory-3'] },`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Reserve Force (`military-reserve-force`)

- **Allegiance:** Military
- **Timing tags:** cleanup, board-change, targeted
- **Printed Battle text:** After all cards in the battle are revealed, you may replace this with a card from your hand whose Battle effect can still resolve. If you do, put this in your Graveyard, reveal that card face up for its Battle effect, and put that card in your Graveyard during cleanup. Otherwise, discard this during cleanup.
- **TypeScript files containing the ID:** 10
  - `src/cards/military.test.ts:11` — `deck: ['military-encampment', 'military-reserve-force', 'military-unbroken-ranks', 'military-give-chase'],`
  - `src/cards/military.test.ts:53` — `player.zones.assetBank.push('military-reserve-force');`
  - `src/cards/military.test.ts:56` — `applyMilitaryActionEffect(game, player.id, 'military-reserve-force', [{ kind: 'card', cardId: 'military-unbroken-ranks', owner: player.id }]);`
  - `src/cards/military.test.ts:58` — `expect(player.military?.storedCards['military-reserve-force']).toBe('military-unbroken-ranks');`
  - `src/cards/military.ts:24` — `{ id: 'military-reserve-force', name: 'Reserve Force', cost: 3, action: 'Bank this as an Asset with another card from your hand that has a Battle effect face down beneath it. After all cards in a battle involving you are revealed, you may discard this to reveal the stored card face up for its Battle effect, if that effect can still resolve. Put the stored card in your Graveyard during cleanup, or immediately if this leaves play before deployment.', battle: 'After all cards in the battle are revealed, you may replace this with a card from your hand whose Battle effect can still resolve. If you do, put this in your Graveyard, reveal that card face up for its Battle effect, and put that card in your Graveyard during cleanup. Otherwise, discard this during cleanup.' },`
  - `src/cards/military.ts:70` — `if (cardId === 'military-reserve-force') {`
  - `src/cards/playability.ts:100` — `'military-reserve-force': battleAndAction('military-reserve-force', 'asset_bank', true),`
  - `src/cli/dev-runner-v06.ts:12` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/dev/guided-options.test.ts:10` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe'], territories: ['p1-t1','p1-t2','p1-t3'] },`
  - `src/dev/guided-options.test.ts:39` — `state.pendingMilitaryTimingChoice = { kind: 'reserve_force_after_reveal', playerId: 'player_1', sourceCardId: 'military-reserve-force', storedCard: 'stored-card', handOptions: ['hand-a','hand-b'], options: ['deploy_stored','replace_from_hand','pass'] };`
  - `src/gui/dev-server-v06.ts:14` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/state/intelligence-subversion-battle.test.ts:121` — `state.players.player_2.zones.assetBank = ['military-reserve-force'];`
  - `src/state/intelligence-subversion-battle.test.ts:122` — `state.players.player_2.military!.storedCards['military-reserve-force'] = 'card-valor';`
  - `src/state/intelligence-subversion-battle.test.ts:129` — `expect(state.players.player_2.zones.assetBank).toContain('military-reserve-force');`
  - `src/state/military-timing.ts:7` — `const RESERVE = 'military-reserve-force';`
  - `src/state/neutral-conscription.test.ts:16` — `const RESERVE_FORCE = 'military-reserve-force';`
  - `src/types/military.ts:36` — `| { kind: 'reserve_force_after_reveal'; playerId: PlayerID; sourceCardId: 'military-reserve-force'; storedCard?: CardID; handOptions: CardID[]; options: Array<'deploy_stored' | 'replace_from_hand' | 'pass'> }`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Give Chase (`military-give-chase`)

- **Allegiance:** Military
- **Timing tags:** aftermath
- **Printed Battle text:** If you win and initiated this battle, after the opponent retreats, move one position toward their end of the Gauntlet. This may initiate a battle.
- **TypeScript files containing the ID:** 5
  - `src/cards/military.test.ts:11` — `deck: ['military-encampment', 'military-reserve-force', 'military-unbroken-ranks', 'military-give-chase'],`
  - `src/cards/military.ts:25` — `{ id: 'military-give-chase', name: 'Give Chase', cost: 3, action: 'During an Action Opportunity after you win a battle you initiated this turn, move one position toward the opponent’s end of the Gauntlet. This may initiate a battle.', battle: 'If you win and initiated this battle, after the opponent retreats, move one position toward their end of the Gauntlet. This may initiate a battle.', supplemental: ['In a battle initiated this way, you cannot commit a card from your hand or use Orders. When forming your Battle Hand, draw one fewer card for each battle already fought this turn beyond the first, to a minimum of zero. After the movement, put this in your Graveyard.'] },`
  - `src/cards/military.ts:88` — `if (cardId === 'military-give-chase') {`
  - `src/cards/playability.ts:101` — `'military-give-chase': battleAndAction('military-give-chase', 'graveyard'),`
  - `src/cli/dev-runner-v06.ts:13` — `{ id: 'player_2', name: 'Player Two', factionId: 'military', leaderName: 'Commandant', deck: ['military-rearguard','military-unbroken-ranks','military-give-chase','military-field-command','card-attrition','card-valor','card-conscription','card-embargo'], territories: ['p2-territory-1','p2-territory-2','p2-territory-3'] },`
  - `src/gui/dev-server-v06.ts:15` — `{ id: 'player_2', name: 'Player Two', factionId: 'military', leaderName: 'Commandant', deck: ['military-rearguard','military-unbroken-ranks','military-give-chase','military-field-command','card-attrition','card-valor','card-conscription','card-embargo'], territories: ['p2-territory-1','p2-territory-2','p2-territory-3'] },`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Hold the Line (`military-hold-the-line`)

- **Allegiance:** Military
- **Timing tags:** cleanup
- **Printed Battle text:** If you are defending a Territory you control, use the effect below, then put this in your Graveyard during cleanup.
- **TypeScript files containing the ID:** 11
  - `src/cards/military.ts:26` — `{ id: 'military-hold-the-line', name: 'Hold the Line', cost: 4, action: 'Bank this as an Asset. When a battle begins in which you defend a Territory you control, before cards are committed from hand, you may put this in your Graveyard to use the effect below.', battle: 'If you are defending a Territory you control, use the effect below, then put this in your Graveyard during cleanup.', supplemental: ['After all cards in the battle are revealed, draw two additional cards into your Battle Hand and immediately reveal up to one of them face up for its Battle effect, if that effect can still resolve. If you lose, after you retreat, the opponent captures that Territory immediately.'] },`
  - `src/cards/playability.ts:102` — `'military-hold-the-line': battleAndAction('military-hold-the-line', 'asset_bank'),`
  - `src/cli/dev-runner-v06.ts:12` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/dev/guided-options.test.ts:10` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe'], territories: ['p1-t1','p1-t2','p1-t3'] },`
  - `src/dev/guided-options.test.ts:19` — `state.pendingMilitaryTimingChoice = { kind: 'military_asset_precommit', playerId: 'player_1', sourceCardId: 'military-hold-the-line', options: ['use', 'pass'] };`
  - `src/dev/guided-options.test.ts:22` — `expect(options.map((option) => option.label)).toEqual(['Use military-hold-the-line', 'Pass military-hold-the-line']);`
  - `src/dev/guided-options.test.ts:47` — `hold.pendingMilitaryTimingChoice = { kind: 'hold_the_line_after_reveal', playerId: 'player_1', sourceCardId: 'military-hold-the-line', drawnCards: ['a','b'], options: ['a','b'], mayPass: true };`
  - `src/gui/dev-server-v06.ts:14` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/state/inquisition-no-martyrs.test.ts:306` — `currentBattle.defender.battleDrawPlayed = [played('military-hold-the-line', 'player_2')];`
  - `src/state/intelligence-subversion-asset.test.ts:147` — `state.players.player_2.zones.assetBank = ['military-hold-the-line'];`
  - `src/state/intelligence-subversion-asset.test.ts:151` — `sourceCardId: 'military-hold-the-line',`
  - `src/state/intelligence-subversion-asset.test.ts:156` — `expectSubversionWindow(state, 'military-hold-the-line');`
  - `src/state/intelligence-subversion-asset.test.ts:160` — `expect(state.battle?.effectsResolved).not.toContain('active:military-hold-the-line:player_2');`
  - `src/state/intelligence-subversion-asset.test.ts:161` — `expect(state.players.player_2.zones.discard).toContain('military-hold-the-line');`
  - `src/state/intelligence-subversion-battle.test.ts:135` — `state.battle!.effectsResolved.push('active:military-hold-the-line:player_2');`
  - `src/state/intelligence-treason.test.ts:328` — `played('military-hold-the-line', 'player_2', 'battle_draw'),`
  - `src/state/military-timing.ts:8` — `const HOLD = 'military-hold-the-line';`
  - `src/types/military.ts:34` — `| { kind: 'military_asset_precommit'; playerId: PlayerID; sourceCardId: 'military-hold-the-line' | 'military-shock-and-awe'; options: Array<'use' | 'pass'> }`
  - `src/types/military.ts:37` — `| { kind: 'hold_the_line_after_reveal'; playerId: PlayerID; sourceCardId: 'military-hold-the-line'; drawnCards: CardID[]; options: CardID[]; mayPass: true }`
- **Virtual/effect-only sites in those files:** 2
  - `src/state/inquisition-no-martyrs.test.ts:196` — `it('counts active physical Battle copies and activated Assets while ignoring canceled, negated, and virtual copies', () => {`
  - `src/state/inquisition-no-martyrs.test.ts:204` — `played(NO_MARTYRS, 'player_1', 'replayed', { virtual: true }),`

### Countercharge (`military-countercharge`)

- **Allegiance:** Military
- **Timing tags:** aftermath
- **Printed Battle text:** If you win this battle and did not initiate it, use the effect below, then put this in your Graveyard.
- **TypeScript files containing the ID:** 5
  - `src/cards/military.ts:27` — `{ id: 'military-countercharge', name: 'Countercharge', cost: 4, action: 'Bank this as an Asset. After you win a battle you did not initiate, you may put this in your Graveyard to use the effect below.', battle: 'If you win this battle and did not initiate it, use the effect below, then put this in your Graveyard.', supplemental: ['After the opponent retreats, move one position toward their end of the Gauntlet. This may initiate a battle.'] },`
  - `src/cards/playability.ts:103` — `'military-countercharge': battleAndAction('military-countercharge', 'asset_bank'),`
  - `src/cli/dev-runner-v06.ts:12` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/gui/dev-server-v06.ts:14` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/state/military-interactions.ts:100` — `if (result.winner === result.defender && hasCardSource(game, result.winner, 'military-countercharge')) {`
  - `src/state/military-interactions.ts:101` — `queue(game, { kind: 'countercharge', playerId: result.winner, sourceCardId: 'military-countercharge', options: ['use', 'pass'] });`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### War Crimes (`military-war-crimes`)

- **Allegiance:** Military
- **Timing tags:** cleanup, aftermath
- **Printed Battle text:** If you win, you may use the effect below. If you do, put this in your Graveyard during cleanup.
- **TypeScript files containing the ID:** 7
  - `src/cards/military.ts:28` — `{ id: 'military-war-crimes', name: 'War Crimes', cost: 4, action: 'Bank this as an Asset. After you win a battle, you may put this in your Graveyard to use the effect below.', battle: 'If you win, you may use the effect below. If you do, put this in your Graveyard during cleanup.', supplemental: ['Put every card your opponent played from their Battle Hand in that battle in their Graveyard instead of their Discard Pile, and make them retreat one additional position. You cannot move, capture a Territory, or use an Order as a result of that victory.'] },`
  - `src/cards/playability.ts:104` — `'military-war-crimes': battleAndAction('military-war-crimes', 'asset_bank'),`
  - `src/cli/dev-runner-v06.ts:12` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/gui/dev-server-v06.ts:14` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/state/military-interactions.test.ts:12` — `deck: ['military-unbroken-ranks', 'military-battlefield-promotion', 'military-war-crimes', 'military-shock-and-awe'],`
  - `src/state/military-interactions.test.ts:52` — `state.players.player_1.zones.assetBank.push('military-war-crimes');`
  - `src/state/military-interactions.test.ts:58` — `kind: 'war_crimes', playerId: 'player_1', sourceCardId: 'military-war-crimes',`
  - `src/state/military-interactions.test.ts:64` — `expect(state.players.player_1.zones.graveyard).toContain('military-war-crimes');`
  - `src/state/military-interactions.ts:104` — `if (hasCardSource(game, result.winner, 'military-war-crimes')) {`
  - `src/state/military-interactions.ts:105` — `queue(game, { kind: 'war_crimes', playerId: result.winner, sourceCardId: 'military-war-crimes', defeatedPlayer: result.loser, affectedCards: [...(result.battleHandCards?.[result.loser] ?? [])], options: ['use', 'pass'] });`
  - `src/state/neutral-stand-ground.test.ts:65` — `deck: [NO_MARTYRS, NO_MARTYRS, 'military-war-crimes', 'military-shock-and-awe'],`
  - `src/state/neutral-stand-ground.test.ts:297` — `state.players.player_1.zones.assetBank = ['military-war-crimes'];`
  - `src/state/neutral-stand-ground.test.ts:303` — `sourceCardId: 'military-war-crimes',`
  - `src/state/neutral-stand-ground.test.ts:317` — `expect(state.players.player_1.zones.assetBank).toContain('military-war-crimes');`
  - `src/state/neutral-stand-ground.test.ts:327` — `expect(state.players.player_1.zones.graveyard).toContain('military-war-crimes');`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/neutral-stand-ground.test.ts:183` — `played(STAND_GROUND, 'player_2', 'battle_draw', { virtual: true }),`

### Shock and Awe (`military-shock-and-awe`)

- **Allegiance:** Military
- **Timing tags:** cleanup
- **Printed Battle text:** If you are attacking on an enemy-controlled Territory, use the effect below, then put this in your Graveyard during cleanup.
- **TypeScript files containing the ID:** 10
  - `src/cards/military.ts:29` — `{ id: 'military-shock-and-awe', name: 'Shock and Awe', cost: 5, unique: true, action: 'Bank this as an Asset. When you initiate a battle on an enemy-controlled Territory, before cards are committed from hand, you may put this in your Graveyard to use the effect below.', battle: 'If you are attacking on an enemy-controlled Territory, use the effect below, then put this in your Graveyard during cleanup.', supplemental: ['After all cards in the battle are revealed, you may reveal one additional card from your hand face up for its Battle effect, if that effect can still resolve. Put that card in your Graveyard during cleanup. If you lose, retreat one additional position after your normal retreat. If you win, choose Breakthrough or Consolidate.', 'Breakthrough: Choose only if the opponent can retreat one additional position. They do so after their normal retreat; then move one position toward their end of the Gauntlet. This movement cannot initiate a battle.', 'Consolidate: Capture the contested Territory immediately, then set your Command to 2.', 'After either option, you cannot move again, capture another Territory, or use an Order as a result of that victory.'] },`
  - `src/cards/playability.ts:105` — `'military-shock-and-awe': battleAndAction('military-shock-and-awe', 'asset_bank'),`
  - `src/cli/dev-runner-v06.ts:12` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/dev/guided-options.test.ts:10` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe'], territories: ['p1-t1','p1-t2','p1-t3'] },`
  - `src/dev/guided-options.test.ts:52` — `shock.pendingMilitaryTimingChoice = { kind: 'shock_and_awe_after_reveal', playerId: 'player_1', sourceCardId: 'military-shock-and-awe', handOptions: ['a'], mayPass: true };`
  - `src/gui/dev-server-v06.ts:14` — `{ id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },`
  - `src/state/military-interactions.test.ts:12` — `deck: ['military-unbroken-ranks', 'military-battlefield-promotion', 'military-war-crimes', 'military-shock-and-awe'],`
  - `src/state/military-interactions.test.ts:70` — `state.players.player_1.zones.assetBank.push('military-shock-and-awe');`
  - `src/state/military-interactions.test.ts:76` — `kind: 'shock_and_awe', playerId: 'player_1', sourceCardId: 'military-shock-and-awe',`
  - `src/state/military-interactions.ts:108` — `if (result.winner === result.attacker && hasCardSource(game, result.winner, 'military-shock-and-awe')) {`
  - `src/state/military-interactions.ts:112` — `queue(game, { kind: 'shock_and_awe', playerId: result.winner, sourceCardId: 'military-shock-and-awe', location: result.location, defeatedPlayer: result.loser, options });`
  - `src/state/military-timing.ts:9` — `const SHOCK = 'military-shock-and-awe';`
  - `src/state/neutral-stand-ground.test.ts:65` — `deck: [NO_MARTYRS, NO_MARTYRS, 'military-war-crimes', 'military-shock-and-awe'],`
  - `src/state/neutral-stand-ground.test.ts:338` — `state.players.player_1.zones.assetBank = ['military-shock-and-awe'];`
  - `src/state/neutral-stand-ground.test.ts:343` — `sourceCardId: 'military-shock-and-awe',`
  - `src/state/neutral-stand-ground.test.ts:364` — `expect(state.players.player_1.zones.graveyard).toContain('military-shock-and-awe');`
  - `src/types/military.ts:34` — `| { kind: 'military_asset_precommit'; playerId: PlayerID; sourceCardId: 'military-hold-the-line' | 'military-shock-and-awe'; options: Array<'use' | 'pass'> }`
  - `src/types/military.ts:38` — `| { kind: 'shock_and_awe_after_reveal'; playerId: PlayerID; sourceCardId: 'military-shock-and-awe'; handOptions: CardID[]; mayPass: true };`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/neutral-stand-ground.test.ts:183` — `played(STAND_GROUND, 'player_2', 'battle_draw', { virtual: true }),`

### Trade Concessions (`diplomats-trade-concessions`)

- **Allegiance:** Diplomats
- **Timing tags:** reveal
- **Printed Battle text:** The opponent draws one card. Add +2 to your battle total.
- **TypeScript files containing the ID:** 1
  - `src/state/diplomat-cards.ts:9` — `tradeConcessions: 'diplomats-trade-concessions',`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Gunboat Diplomacy (`diplomats-gunboat-diplomacy`)

- **Allegiance:** Diplomats
- **Timing tags:** reveal, aftermath
- **Printed Battle text:** Add +2 to your battle total. After the battle, put this in your Discard Pile.
- **TypeScript files containing the ID:** 1
  - `src/state/diplomat-cards.ts:15` — `gunboatDiplomacy: 'diplomats-gunboat-diplomacy',`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Speculation (`financiers-speculation`)

- **Allegiance:** Financiers
- **Timing tags:** cleanup
- **Printed Battle text:** If you initiated this battle, you may spend 1 Capital. If you do and win, gain 2 Capital during battle cleanup. If you do and do not win, put this in your Graveyard instead of its normal destination.
- **TypeScript files containing the ID:** 12
  - `src/cards/financiers.test.ts:5` — `['financiers-speculation', 1],`
  - `src/cards/financiers.ts:16` — `id: 'financiers-speculation', name: 'Speculation', cost: 1,`
  - `src/cards/playability.ts:115` — `'financiers-speculation': battleAndAction('financiers-speculation', 'removed', true),`
  - `src/state/financier-action-cards.test.ts:7` — `'financiers-speculation',`
  - `src/state/financier-action-cards.test.ts:42` — `state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-speculation', targets: [{ kind: 'space', spaceId: target.id }] }).state;`
  - `src/state/financier-action-cards.test.ts:44` — `expect(state.players.player_1.zones.removed).not.toContain('financiers-speculation');`
  - `src/state/financier-action-cards.test.ts:50` — `expect(state.players.player_1.zones.discard).toContain('financiers-speculation');`
  - `src/state/financier-battle-acquisitions.test.ts:15` — `'financiers-speculation',`
  - `src/state/financier-battle-cards.test.ts:13` — `'financiers-speculation',`
  - `src/state/financier-cards.ts:10` — `speculation: 'financiers-speculation',`
  - `src/state/financier-integration.test.ts:12` — `{ id: 'player_1', name: 'Banker', factionId: 'financiers', leaderName: 'Banker', deck: ['financiers-speculation', 'financiers-monetary-crisis', 'financiers-corner-the-market'], territories: ['t1', 't2', 't3'] },`
  - `src/state/financier-integration.test.ts:96` — `state.battle!.attacker.battleDraw = ['financiers-speculation'];`
  - `src/state/financier-integration.test.ts:144` — `state = applyGameAction(state, { type: 'begin_play_the_market', playerId: 'player_1', cardId: 'financiers-speculation' }).state;`
  - `src/state/financier-investment-actions.test.ts:12` — `'financiers-speculation',`
  - `src/state/financier-investment-actions.test.ts:66` — `state = applyGameAction(state, { type: 'place_treasury_card', playerId: 'player_1', cardId: 'financiers-speculation' }).state;`
  - `src/state/financier-investment-actions.test.ts:102` — `targets: [{ kind: 'card', cardId: 'financiers-speculation', owner: 'player_1' }],`
  - `src/state/financier-investment-actions.test.ts:105` — `expect(state.players.player_1.zones.hand).not.toContain('financiers-speculation');`
  - `src/state/financier-investment-actions.test.ts:111` — `expect(state.pendingFinancierChoice).toMatchObject({ kind: 'margin_loan_repayment', repaymentCost: 4, collateralCardId: 'financiers-speculation' });`
  - `src/state/financier-investment-actions.test.ts:112` — `expect(buildGuidedOptions(state).map((option) => option.label)).toEqual(expect.arrayContaining(['Repay Margin Loan for 4 Capital', 'Default and lose financiers-speculation']));`
  - `src/state/financier-investment-actions.test.ts:116` — `expect(state.players.player_1.zones.hand).toContain('financiers-speculation');`
  - `src/state/financier-investment-actions.test.ts:125` — `targets: [{ kind: 'card', cardId: 'financiers-speculation', owner: 'player_1' }],`
  - `src/state/financier-investment-actions.test.ts:129` — `expect(state.players.player_1.zones.graveyard).toEqual(expect.arrayContaining(['financiers-margin-loan', 'financiers-speculation']));`
  - `src/state/financier-pre-dice.test.ts:9` — `'financiers-speculation',`
  - `src/state/financier-pre-dice.test.ts:93` — `const setup = game(['financiers-speculation']);`
  - `src/state/financier-pre-dice.test.ts:102` — `expect(state.players.player_1.zones.discard).toContain('financiers-speculation');`
  - `src/state/financier-pre-dice.ts:7` — `speculation: 'financiers-speculation',`
  - `src/state/financiers.test.ts:22` — `{ id: 'player_1', name: 'Financier', factionId: 'financiers', leaderName: 'Banker', deck: ['financiers-speculation', 'financiers-monetary-crisis', 'financiers-corner-the-market'], territories: ['t1','t2','t3'] },`
  - `src/state/financiers.test.ts:60` — `const paid = buyDeed(state, 'player_1', ownSpace.id, 'financiers-speculation');`
  - `src/state/financiers.test.ts:63` — `expect(state.players.player_1.zones.discard).toContain('financiers-speculation');`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Monetary Crisis (`financiers-monetary-crisis`)

- **Allegiance:** Financiers
- **Timing tags:** cleanup
- **Printed Battle text:** During battle cleanup, each player with more than one card in hand chooses one of those cards and discards the rest.
- **TypeScript files containing the ID:** 12
  - `src/cards/financiers.test.ts:6` — `['financiers-monetary-crisis', 2],`
  - `src/cards/financiers.ts:22` — `id: 'financiers-monetary-crisis', name: 'Monetary Crisis', cost: 2,`
  - `src/cards/playability.ts:116` — `'financiers-monetary-crisis': battleAndAction('financiers-monetary-crisis', 'discard'),`
  - `src/state/financier-acquisition-actions.test.ts:12` — `'financiers-monetary-crisis',`
  - `src/state/financier-acquisition-actions.test.ts:45` — `state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'purchase', cardIds: ['financiers-monetary-crisis'] }).state;`
  - `src/state/financier-acquisition-actions.test.ts:47` — `expect(state.players.player_1.zones.graveyard).toContain('financiers-monetary-crisis');`
  - `src/state/financier-action-cards.test.ts:8` — `'financiers-monetary-crisis',`
  - `src/state/financier-action-cards.test.ts:57` — `state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-monetary-crisis' }).state;`
  - `src/state/financier-battle-acquisitions.test.ts:12` — `'financiers-monetary-crisis',`
  - `src/state/financier-battle-cards.test.ts:9` — `'financiers-monetary-crisis',`
  - `src/state/financier-battle-cards.test.ts:104` — `const setup = game(['financiers-monetary-crisis'], [], 6, 1, 'financiers-capital-gains');`
  - `src/state/financier-battle-cards.test.ts:107` — `expect(buildGuidedOptions(state).some((option) => option.action.type === 'resolve_financier_choice' && option.action.cardId === 'financiers-monetary-crisis')).toBe(true);`
  - `src/state/financier-battle-cards.test.ts:108` — `state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'financiers-monetary-crisis', cardId: 'financiers-monetary-crisis' }).state;`
  - `src/state/financier-battle-cards.test.ts:109` — `expect(state.players.player_1.financiers?.treasury).toContain('financiers-monetary-crisis');`
  - `src/state/financier-battle-cards.test.ts:110` — `expect(state.players.player_1.zones.discard).not.toContain('financiers-monetary-crisis');`
  - `src/state/financier-battle-cards.test.ts:114` — `const setup = game(['financiers-monetary-crisis']);`
  - `src/state/financier-battle-cards.test.ts:134` — `expect(() => applyGameAction(setup.state, { type: 'commit_battle_hand_card', playerId: 'player_1', cardId: 'financiers-monetary-crisis' })).not.toThrow();`
  - `src/state/financier-battle-cards.ts:9` — `monetaryCrisis: 'financiers-monetary-crisis',`
  - `src/state/financier-cards.ts:11` — `monetaryCrisis: 'financiers-monetary-crisis',`
  - `src/state/financier-integration.test.ts:12` — `{ id: 'player_1', name: 'Banker', factionId: 'financiers', leaderName: 'Banker', deck: ['financiers-speculation', 'financiers-monetary-crisis', 'financiers-corner-the-market'], territories: ['t1', 't2', 't3'] },`
  - `src/state/financier-pre-dice.test.ts:17` — `'financiers-monetary-crisis',`
  - `src/state/financiers.test.ts:22` — `{ id: 'player_1', name: 'Financier', factionId: 'financiers', leaderName: 'Banker', deck: ['financiers-speculation', 'financiers-monetary-crisis', 'financiers-corner-the-market'], territories: ['t1','t2','t3'] },`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Liquidation (`financiers-liquidation`)

- **Allegiance:** Financiers
- **Timing tags:** targeted
- **Printed Battle text:** Before dice are rolled, you may choose one card in your Treasury and put it in your Discard Pile. If you do, gain Capital equal to its deckbuilding value, then you may immediately Subsidize.
- **TypeScript files containing the ID:** 12
  - `src/cards/financiers.test.ts:7` — `['financiers-liquidation', 2],`
  - `src/cards/financiers.ts:27` — `id: 'financiers-liquidation', name: 'Liquidation', cost: 2,`
  - `src/cards/playability.ts:117` — `'financiers-liquidation': battleAndAction('financiers-liquidation', 'discard', true),`
  - `src/state/financier-acquisition-actions.test.ts:13` — `'financiers-liquidation',`
  - `src/state/financier-action-cards.test.ts:9` — `'financiers-liquidation',`
  - `src/state/financier-action-cards.test.ts:67` — `state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-liquidation', targets: [{ kind: 'card', cardId: 'financiers-corner-the-market', owner: 'player_1' }] }).state;`
  - `src/state/financier-battle-acquisitions.test.ts:16` — `'financiers-liquidation',`
  - `src/state/financier-battle-cards.test.ts:14` — `'financiers-liquidation',`
  - `src/state/financier-battle-cards.test.ts:135` — `expect(() => applyGameAction(setup.state, { type: 'commit_battle_hand_card', playerId: 'player_1', cardId: 'financiers-liquidation' })).not.toThrow();`
  - `src/state/financier-cards.ts:12` — `liquidation: 'financiers-liquidation',`
  - `src/state/financier-integration.test.ts:13` — `{ id: 'player_2', name: 'Executive', factionId: 'financiers', leaderName: 'Executive', deck: ['financiers-liquidation', 'financiers-underwriting', 'financiers-capital-gains'], territories: ['t4', 't5', 't6'] },`
  - `src/state/financier-integration.test.ts:97` — `state.battle!.defender.battleDraw = ['financiers-liquidation'];`
  - `src/state/financier-investment-actions.test.ts:13` — `'financiers-liquidation',`
  - `src/state/financier-pre-dice.test.ts:10` — `'financiers-liquidation',`
  - `src/state/financier-pre-dice.test.ts:106` — `const setup = game(['financiers-liquidation', 'financiers-tariffs'], ['o-card']);`
  - `src/state/financier-pre-dice.ts:8` — `liquidation: 'financiers-liquidation',`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Underwriting (`financiers-underwriting`)

- **Allegiance:** Financiers
- **Timing tags:** aftermath
- **Printed Battle text:** After this battle, if you lose and used Subsidize, gain Capital equal to the bonus you purchased.
- **TypeScript files containing the ID:** 13
  - `src/cards/financiers.test.ts:8` — `['financiers-underwriting', 2],`
  - `src/cards/financiers.ts:32` — `id: 'financiers-underwriting', name: 'Underwriting', cost: 2, cardForm: 'Asset',`
  - `src/cards/playability.ts:118` — `'financiers-underwriting': battleAndAction('financiers-underwriting', 'asset_bank'),`
  - `src/state/financier-acquisition-actions.test.ts:14` — `'financiers-underwriting',`
  - `src/state/financier-action-cards.test.ts:10` — `'financiers-underwriting',`
  - `src/state/financier-action-cards.test.ts:100` — `state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-underwriting' }).state;`
  - `src/state/financier-action-cards.test.ts:101` — `expect(state.players.player_1.zones.assetBank).toContain('financiers-underwriting');`
  - `src/state/financier-battle-acquisitions.test.ts:11` — `'financiers-underwriting',`
  - `src/state/financier-battle-acquisitions.test.ts:81` — `const setup = battleGame(['financiers-leveraged-buyout', 'financiers-underwriting']);`
  - `src/state/financier-battle-acquisitions.test.ts:86` — `collateralOptions: ['financiers-underwriting'],`
  - `src/state/financier-battle-acquisitions.test.ts:88` — `expect(buildGuidedOptions(state).some((option) => option.action.type === 'resolve_financier_choice' && option.action.cardIds?.includes('financiers-underwriting'))).toBe(true);`
  - `src/state/financier-battle-acquisitions.test.ts:91` — `type: 'resolve_financier_choice', playerId: 'player_1', choice: 'purchase', cardIds: ['financiers-underwriting'],`
  - `src/state/financier-battle-acquisitions.test.ts:94` — `expect(state.players.player_1.zones.graveyard).toContain('financiers-underwriting');`
  - `src/state/financier-battle-acquisitions.test.ts:99` — `const setup = battleGame(['financiers-leveraged-buyout', 'financiers-underwriting']);`
  - `src/state/financier-battle-acquisitions.test.ts:123` — `const setup = battleGame(['financiers-leveraged-buyout', 'financiers-underwriting', 'financiers-corner-the-market']);`
  - `src/state/financier-battle-cards.test.ts:10` — `'financiers-underwriting',`
  - `src/state/financier-battle-cards.test.ts:84` — `const setup = game([], ['financiers-underwriting'], 6, 1);`
  - `src/state/financier-battle-cards.ts:10` — `underwriting: 'financiers-underwriting',`
  - `src/state/financier-cards.ts:13` — `underwriting: 'financiers-underwriting',`
  - `src/state/financier-integration.test.ts:13` — `{ id: 'player_2', name: 'Executive', factionId: 'financiers', leaderName: 'Executive', deck: ['financiers-liquidation', 'financiers-underwriting', 'financiers-capital-gains'], territories: ['t4', 't5', 't6'] },`
  - `src/state/financier-investment-actions.test.ts:14` — `'financiers-underwriting',`
  - `src/state/financier-pre-dice.test.ts:15` — `'financiers-underwriting',`
  - `src/state/financier-pre-dice.test.ts:107` — `setup.state.players.player_1.financiers!.treasury = ['financiers-underwriting'];`
  - `src/state/financier-pre-dice.test.ts:108` — `removeOne(setup.state.players.player_1.zones.deck, 'financiers-underwriting');`
  - `src/state/financier-pre-dice.test.ts:111` — `state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'liquidate', cardId: 'financiers-underwriting' }).state;`
  - `src/state/financier-pre-dice.test.ts:134` — `setup.state.players.player_1.zones.hand = ['financiers-underwriting'];`
  - `src/state/financier-pre-dice.test.ts:135` — `removeOne(setup.state.players.player_1.zones.deck, 'financiers-underwriting');`
  - `src/state/financier-pre-dice.test.ts:138` — `state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'collateralize', cardId: 'financiers-underwriting' }).state;`
  - `src/state/financier-pre-dice.test.ts:143` — `expect(state.players.player_1.zones.graveyard).toContain('financiers-underwriting');`
  - `src/state/inquisition-no-martyrs.test.ts:264` — `financierBattle.defender.battleDrawPlayed = [played('financiers-underwriting', 'player_2')];`
- **Virtual/effect-only sites in those files:** 2
  - `src/state/inquisition-no-martyrs.test.ts:196` — `it('counts active physical Battle copies and activated Assets while ignoring canceled, negated, and virtual copies', () => {`
  - `src/state/inquisition-no-martyrs.test.ts:204` — `played(NO_MARTYRS, 'player_1', 'replayed', { virtual: true }),`

### Capital Gains (`financiers-capital-gains`)

- **Allegiance:** Financiers
- **Timing tags:** reveal, cleanup, targeted
- **Printed Battle text:** During battle cleanup, if you won, choose one other card you used during this battle that would enter your Discard Pile or Graveyard. Place that card face up in your Treasury instead.
- **TypeScript files containing the ID:** 11
  - `src/cards/financiers.test.ts:9` — `['financiers-capital-gains', 3],`
  - `src/cards/financiers.ts:37` — `id: 'financiers-capital-gains', name: 'Capital Gains', cost: 3,`
  - `src/cards/playability.ts:119` — `'financiers-capital-gains': battleAndAction('financiers-capital-gains', 'removed', true),`
  - `src/state/financier-acquisition-actions.test.ts:15` — `'financiers-capital-gains',`
  - `src/state/financier-battle-acquisitions.test.ts:13` — `'financiers-capital-gains',`
  - `src/state/financier-battle-cards.test.ts:11` — `'financiers-capital-gains',`
  - `src/state/financier-battle-cards.test.ts:104` — `const setup = game(['financiers-monetary-crisis'], [], 6, 1, 'financiers-capital-gains');`
  - `src/state/financier-battle-cards.ts:11` — `capitalGains: 'financiers-capital-gains',`
  - `src/state/financier-cards.ts:14` — `capitalGains: 'financiers-capital-gains',`
  - `src/state/financier-integration.test.ts:13` — `{ id: 'player_2', name: 'Executive', factionId: 'financiers', leaderName: 'Executive', deck: ['financiers-liquidation', 'financiers-underwriting', 'financiers-capital-gains'], territories: ['t4', 't5', 't6'] },`
  - `src/state/financier-investment-actions.test.ts:8` — `'financiers-capital-gains',`
  - `src/state/financier-investment-actions.test.ts:43` — `type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-capital-gains',`
  - `src/state/financier-investment-actions.test.ts:47` — `expect(state.players.player_1.zones.removed).not.toContain('financiers-capital-gains');`
  - `src/state/financier-investment-actions.test.ts:53` — `expect(state.players.player_1.zones.discard).toContain('financiers-capital-gains');`
  - `src/state/financier-investment-actions.test.ts:60` — `type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-capital-gains',`
  - `src/state/financier-investment-actions.test.ts:68` — `expect(state.players.player_1.zones.discard).toContain('financiers-capital-gains');`
  - `src/state/financier-pre-dice.test.ts:16` — `'financiers-capital-gains',`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Tariffs (`financiers-tariffs`)

- **Allegiance:** Financiers
- **Timing tags:** reveal
- **Printed Battle text:** Your opponent may discard one card from hand. If they do not, add +1 to your battle total.
- **TypeScript files containing the ID:** 12
  - `src/cards/financiers.test.ts:10` — `['financiers-tariffs', 3],`
  - `src/cards/financiers.ts:42` — `id: 'financiers-tariffs', name: 'Tariffs', cost: 3, cardForm: 'Asset',`
  - `src/cards/playability.ts:120` — `'financiers-tariffs': battleAndAction('financiers-tariffs', 'asset_bank'),`
  - `src/state/financier-acquisition-actions.test.ts:16` — `'financiers-tariffs',`
  - `src/state/financier-battle-acquisitions.test.ts:17` — `'financiers-tariffs',`
  - `src/state/financier-battle-cards.test.ts:15` — `'financiers-tariffs',`
  - `src/state/financier-cards.ts:15` — `tariffs: 'financiers-tariffs',`
  - `src/state/financier-investment-actions.test.ts:9` — `'financiers-tariffs',`
  - `src/state/financier-investment-actions.test.ts:74` — `state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-tariffs' }).state;`
  - `src/state/financier-investment-actions.test.ts:75` — `expect(state.players.player_1.zones.assetBank).toContain('financiers-tariffs');`
  - `src/state/financier-investment-actions.test.ts:90` — `state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-tariffs' }).state;`
  - `src/state/financier-investment-actions.test.ts:92` — `player_1: { playerId: 'player_1', limit: 0, discardCount: 1, options: ['financiers-tariffs'] },`
  - `src/state/financier-investment-actions.test.ts:94` — `expect(() => applyGameAction(state, { type: 'resolve_asset_bank_discard', playerId: 'player_1', cardIds: ['financiers-tariffs'] })).toThrow(/cannot cause Tariffs to leave play/i);`
  - `src/state/financier-pre-dice.test.ts:11` — `'financiers-tariffs',`
  - `src/state/financier-pre-dice.test.ts:106` — `const setup = game(['financiers-liquidation', 'financiers-tariffs'], ['o-card']);`
  - `src/state/financier-pre-dice.test.ts:159` — `const setup = game(['financiers-tariffs'], ['o-card']);`
  - `src/state/financier-pre-dice.ts:9` — `tariffs: 'financiers-tariffs',`
  - `src/state/intelligence-subversion-asset.test.ts:206` — `state.players.player_2.zones.assetBank = ['financiers-tariffs'];`
  - `src/state/intelligence-subversion-asset.test.ts:210` — `expectSubversionWindow(state, 'financiers-tariffs');`
  - `src/state/intelligence-subversion-asset.test.ts:214` — `expect(state.players.player_2.zones.discard).toContain('financiers-tariffs');`
  - `src/state/intelligence-subversion-asset.ts:10` — `tariffs: 'financiers-tariffs',`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Divestment (`financiers-divestment`)

- **Allegiance:** Financiers
- **Timing tags:** other
- **Printed Battle text:** Before dice are rolled, you may make one Deed you own unowned. If you do, gain Capital equal to the number of Deeds you owned before doing so, then you may immediately Subsidize.
- **TypeScript files containing the ID:** 10
  - `src/cards/financiers.test.ts:11` — `['financiers-divestment', 3],`
  - `src/cards/financiers.ts:48` — `id: 'financiers-divestment', name: 'Divestment', cost: 3,`
  - `src/cards/playability.ts:121` — `'financiers-divestment': battleAndAction('financiers-divestment', 'discard', true),`
  - `src/state/financier-acquisition-actions.test.ts:17` — `'financiers-divestment',`
  - `src/state/financier-action-cards.test.ts:11` — `'financiers-divestment',`
  - `src/state/financier-action-cards.test.ts:80` — `state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-divestment', targets: [{ kind: 'space', spaceId: 'space-1' }] }).state;`
  - `src/state/financier-battle-cards.test.ts:17` — `'financiers-divestment',`
  - `src/state/financier-cards.ts:16` — `divestment: 'financiers-divestment',`
  - `src/state/financier-investment-actions.test.ts:16` — `'financiers-divestment',`
  - `src/state/financier-pre-dice.test.ts:12` — `'financiers-divestment',`
  - `src/state/financier-pre-dice.test.ts:121` — `const setup = game(['financiers-divestment']);`
  - `src/state/financier-pre-dice.ts:10` — `divestment: 'financiers-divestment',`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Margin Loan (`financiers-margin-loan`)

- **Allegiance:** Financiers
- **Timing tags:** cleanup
- **Printed Battle text:** Before dice are rolled, you may place one other card from your hand or Treasury beneath this as collateral. If you do, gain Capital equal to its deckbuilding value, then you may immediately Subsidize. During battle cleanup, if you won, return the collateral card to your hand. Otherwise, put this and its collateral in your Graveyard.
- **TypeScript files containing the ID:** 9
  - `src/cards/financiers.test.ts:12` — `['financiers-margin-loan', 3],`
  - `src/cards/financiers.ts:53` — `id: 'financiers-margin-loan', name: 'Margin Loan', cost: 3, cardForm: 'Asset',`
  - `src/cards/playability.ts:122` — `'financiers-margin-loan': battleAndAction('financiers-margin-loan', 'asset_bank', true),`
  - `src/state/financier-acquisition-actions.test.ts:18` — `'financiers-margin-loan',`
  - `src/state/financier-battle-cards.test.ts:18` — `'financiers-margin-loan',`
  - `src/state/financier-cards.ts:17` — `marginLoan: 'financiers-margin-loan',`
  - `src/state/financier-investment-actions.test.ts:10` — `'financiers-margin-loan',`
  - `src/state/financier-investment-actions.test.ts:101` — `type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-margin-loan',`
  - `src/state/financier-investment-actions.test.ts:104` — `expect(state.players.player_1.zones.assetBank).toContain('financiers-margin-loan');`
  - `src/state/financier-investment-actions.test.ts:117` — `expect(state.players.player_1.zones.discard).toContain('financiers-margin-loan');`
  - `src/state/financier-investment-actions.test.ts:124` — `type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-margin-loan',`
  - `src/state/financier-investment-actions.test.ts:129` — `expect(state.players.player_1.zones.graveyard).toEqual(expect.arrayContaining(['financiers-margin-loan', 'financiers-speculation']));`
  - `src/state/financier-pre-dice.test.ts:13` — `'financiers-margin-loan',`
  - `src/state/financier-pre-dice.test.ts:133` — `const setup = game(['financiers-margin-loan']);`
  - `src/state/financier-pre-dice.test.ts:142` — `expect(state.players.player_1.zones.graveyard).toContain('financiers-margin-loan');`
  - `src/state/financier-pre-dice.test.ts:144` — `expect(state.players.player_1.zones.discard).not.toContain('financiers-margin-loan');`
  - `src/state/financier-pre-dice.ts:11` — `marginLoan: 'financiers-margin-loan',`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Leveraged Buyout (`financiers-leveraged-buyout`)

- **Allegiance:** Financiers
- **Timing tags:** cleanup
- **Printed Battle text:** During battle cleanup, if you won as the attacking player on a Territory whose Deed you do not own, you may immediately buy or buy out that Deed, treating the Territory as occupied. For this purchase, you may use any number of other cards you used in this battle as collateral. Each contributes payment equal to its deckbuilding value and is put in your Graveyard instead of its normal destination. Collateral may pay the entire cost.
- **TypeScript files containing the ID:** 8
  - `src/cards/financiers.test.ts:13` — `['financiers-leveraged-buyout', 4],`
  - `src/cards/financiers.ts:59` — `id: 'financiers-leveraged-buyout', name: 'Leveraged Buyout', cost: 4,`
  - `src/cards/playability.ts:123` — `'financiers-leveraged-buyout': battleAndAction('financiers-leveraged-buyout', 'discard'),`
  - `src/state/financier-acquisition-actions.test.ts:10` — `'financiers-leveraged-buyout',`
  - `src/state/financier-acquisition-actions.test.ts:39` — `state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-leveraged-buyout' }).state;`
  - `src/state/financier-acquisition-actions.test.ts:60` — `state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-leveraged-buyout', targets: [{ kind: 'space', spaceId: target.id }] }).state;`
  - `src/state/financier-acquisition-cards.ts:6` — `leveragedBuyout: 'financiers-leveraged-buyout',`
  - `src/state/financier-battle-acquisitions.test.ts:9` — `'financiers-leveraged-buyout',`
  - `src/state/financier-battle-acquisitions.test.ts:81` — `const setup = battleGame(['financiers-leveraged-buyout', 'financiers-underwriting']);`
  - `src/state/financier-battle-acquisitions.test.ts:99` — `const setup = battleGame(['financiers-leveraged-buyout', 'financiers-underwriting']);`
  - `src/state/financier-battle-acquisitions.test.ts:123` — `const setup = battleGame(['financiers-leveraged-buyout', 'financiers-underwriting', 'financiers-corner-the-market']);`
  - `src/state/financier-battle-cards.ts:12` — `leveragedBuyout: 'financiers-leveraged-buyout',`
  - `src/state/financier-cards.ts:18` — `leveragedBuyout: 'financiers-leveraged-buyout',`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Foreclosure (`financiers-foreclosure`)

- **Allegiance:** Financiers
- **Timing tags:** board-change
- **Printed Battle text:** If you initiated this battle on a Territory whose Deed you owned when the battle began and you win, capture that Territory immediately instead of occupying it.
- **TypeScript files containing the ID:** 11
  - `src/cards/financiers.test.ts:14` — `['financiers-foreclosure', 4],`
  - `src/cards/financiers.ts:64` — `id: 'financiers-foreclosure', name: 'Foreclosure', cost: 4,`
  - `src/cards/playability.ts:124` — `'financiers-foreclosure': battleAndAction('financiers-foreclosure', 'discard', true),`
  - `src/state/financier-acquisition-actions.test.ts:19` — `'financiers-foreclosure',`
  - `src/state/financier-action-cards.test.ts:12` — `'financiers-foreclosure',`
  - `src/state/financier-action-cards.test.ts:92` — `state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-foreclosure', targets: [{ kind: 'space', spaceId: target.id }] }).state;`
  - `src/state/financier-battle-acquisitions.test.ts:14` — `'financiers-foreclosure',`
  - `src/state/financier-battle-cards.test.ts:12` — `'financiers-foreclosure',`
  - `src/state/financier-battle-cards.test.ts:94` — `const setup = game(['financiers-foreclosure']);`
  - `src/state/financier-battle-cards.ts:13` — `foreclosure: 'financiers-foreclosure',`
  - `src/state/financier-cards.ts:19` — `foreclosure: 'financiers-foreclosure',`
  - `src/state/financier-investment-actions.test.ts:17` — `'financiers-foreclosure',`
  - `src/state/financier-pre-dice.test.ts:18` — `'financiers-foreclosure',`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Property Dues (`financiers-property-dues`)

- **Allegiance:** Financiers
- **Timing tags:** cleanup
- **Printed Battle text:** If this battle takes place on a Territory whose Deed you own, your opponent chooses one: discard one card from hand, or you gain 3 Capital during battle cleanup.
- **TypeScript files containing the ID:** 11
  - `src/cards/financiers.test.ts:15` — `['financiers-property-dues', 4],`
  - `src/cards/financiers.ts:69` — `id: 'financiers-property-dues', name: 'Property Dues', cost: 4, cardForm: 'Asset',`
  - `src/cards/playability.ts:125` — `'financiers-property-dues': battleAndAction('financiers-property-dues', 'asset_bank'),`
  - `src/state/battle-reveal-resolution.test.ts:109` — `let state = game('card-embargo', 'financiers-property-dues');`
  - `src/state/financier-action-cards.test.ts:13` — `'financiers-property-dues',`
  - `src/state/financier-action-cards.test.ts:103` — `state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-property-dues' }).state;`
  - `src/state/financier-action-cards.test.ts:104` — `expect(state.players.player_1.zones.assetBank).toContain('financiers-property-dues');`
  - `src/state/financier-battle-acquisitions.test.ts:18` — `'financiers-property-dues',`
  - `src/state/financier-battle-cards.test.ts:16` — `'financiers-property-dues',`
  - `src/state/financier-cards.ts:20` — `propertyDues: 'financiers-property-dues',`
  - `src/state/financier-investment-actions.test.ts:15` — `'financiers-property-dues',`
  - `src/state/financier-pre-dice.test.ts:14` — `'financiers-property-dues',`
  - `src/state/financier-pre-dice.test.ts:148` — `const setup = game(['financiers-property-dues'], ['o-card']);`
  - `src/state/financier-pre-dice.ts:12` — `propertyDues: 'financiers-property-dues',`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Corner the Market (`financiers-corner-the-market`)

- **Allegiance:** Financiers
- **Timing tags:** cleanup
- **Printed Battle text:** During battle cleanup, if you won, you may buy or buy out any number of Deeds. Resolve each purchase completely before calculating the cost of the next.
- **TypeScript files containing the ID:** 12
  - `src/cards/financiers.test.ts:16` — `['financiers-corner-the-market', 5],`
  - `src/cards/financiers.test.ts:27` — `expect(financierCardDefinitions.filter((card) => card.unique).map((card) => card.id)).toEqual(['financiers-corner-the-market']);`
  - `src/cards/financiers.ts:74` — `id: 'financiers-corner-the-market', name: 'Corner the Market', cost: 5, unique: true,`
  - `src/cards/playability.ts:126` — `'financiers-corner-the-market': battleAndAction('financiers-corner-the-market', 'discard'),`
  - `src/state/financier-acquisition-actions.test.ts:11` — `'financiers-corner-the-market',`
  - `src/state/financier-acquisition-actions.test.ts:54` — `const treasuryCardId = 'financiers-corner-the-market';`
  - `src/state/financier-acquisition-actions.test.ts:72` — `state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-corner-the-market' }).state;`
  - `src/state/financier-acquisition-actions.test.ts:93` — `state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-corner-the-market' }).state;`
  - `src/state/financier-acquisition-cards.ts:7` — `cornerTheMarket: 'financiers-corner-the-market',`
  - `src/state/financier-action-cards.test.ts:14` — `'financiers-corner-the-market',`
  - `src/state/financier-action-cards.test.ts:65` — `state.players.player_1.financiers!.treasury = ['financiers-corner-the-market'];`
  - `src/state/financier-action-cards.test.ts:67` — `state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-liquidation', targets: [{ kind: 'card', cardId: 'financiers-corner-the-market', owner: 'player_1' }] }).state;`
  - `src/state/financier-battle-acquisitions.test.ts:10` — `'financiers-corner-the-market',`
  - `src/state/financier-battle-acquisitions.test.ts:107` — `const setup = battleGame(['financiers-corner-the-market']);`
  - `src/state/financier-battle-acquisitions.test.ts:123` — `const setup = battleGame(['financiers-leveraged-buyout', 'financiers-underwriting', 'financiers-corner-the-market']);`
  - `src/state/financier-battle-cards.ts:14` — `cornerTheMarket: 'financiers-corner-the-market',`
  - `src/state/financier-cards.ts:21` — `cornerTheMarket: 'financiers-corner-the-market',`
  - `src/state/financier-integration.test.ts:12` — `{ id: 'player_1', name: 'Banker', factionId: 'financiers', leaderName: 'Banker', deck: ['financiers-speculation', 'financiers-monetary-crisis', 'financiers-corner-the-market'], territories: ['t1', 't2', 't3'] },`
  - `src/state/financier-integration.test.ts:58` — `state = applyGameAction(state, { type: 'place_treasury_card', playerId: 'player_1', cardId: 'financiers-corner-the-market' }).state;`
  - `src/state/financier-integration.test.ts:59` — `expect(state.players.player_1.financiers?.treasury).toEqual(['financiers-corner-the-market']);`
  - `src/state/financier-integration.test.ts:63` — `state = applyGameAction(state, { type: 'begin_play_the_market', playerId: 'player_1', cardId: 'financiers-corner-the-market' }).state;`
  - `src/state/financier-integration.test.ts:67` — `expect(state.players.player_1.zones.discard).toContain('financiers-corner-the-market');`
  - `src/state/financier-integration.test.ts:77` — `state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'collateral', cardId: 'financiers-corner-the-market' }).state;`
  - `src/state/financier-integration.test.ts:79` — `expect(state.players.player_1.zones.discard).toContain('financiers-corner-the-market');`
  - `src/state/financier-investment-actions.test.ts:11` — `'financiers-corner-the-market',`
  - `src/state/financier-investment-actions.test.ts:41` — `state.players.player_1.financiers!.treasury = ['financiers-corner-the-market'];`
  - `src/state/financier-investment-actions.test.ts:44` — `targets: [{ kind: 'card', cardId: 'financiers-corner-the-market', owner: 'player_1' }],`
  - `src/state/financier-investment-actions.test.ts:50` — `expect(state.players.player_1.financiers?.treasury).not.toContain('financiers-corner-the-market');`
  - `src/state/financier-investment-actions.test.ts:51` — `expect(state.players.player_1.zones.hand).toContain('financiers-corner-the-market');`
  - `src/state/financier-investment-actions.test.ts:58` — `state.players.player_1.financiers!.treasury = ['financiers-corner-the-market'];`
  - `src/state/financier-investment-actions.test.ts:61` — `targets: [{ kind: 'card', cardId: 'financiers-corner-the-market', owner: 'player_1' }],`
  - `src/state/financiers.test.ts:22` — `{ id: 'player_1', name: 'Financier', factionId: 'financiers', leaderName: 'Banker', deck: ['financiers-speculation', 'financiers-monetary-crisis', 'financiers-corner-the-market'], territories: ['t1','t2','t3'] },`
  - `src/state/financiers.test.ts:50` — `placeInTreasury(state, 'player_1', 'financiers-corner-the-market');`
  - `src/state/financiers.test.ts:51` — `expect(state.players.player_1.financiers?.treasury).toEqual(['financiers-corner-the-market']);`
  - `src/state/financiers.test.ts:79` — `const gain = playTheMarket(state, 'player_1', 'financiers-corner-the-market', 6);`
  - `src/state/financiers.test.ts:82` — `expect(state.players.player_1.zones.discard).toContain('financiers-corner-the-market');`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Exfiltration (`intelligence-exfiltration`)

- **Allegiance:** Intelligence
- **Timing tags:** aftermath
- **Printed Battle text:** If you lose, you may retreat one additional position.
- **TypeScript files containing the ID:** 13
  - `src/cards/intelligence.ts:16` — `'intelligence-exfiltration',`
  - `src/cards/playability.ts:128` — `'intelligence-exfiltration': battleAndAction('intelligence-exfiltration', 'asset_bank'),`
  - `src/state/apply-exfiltration.ts:8` — `} from './intelligence-exfiltration-battle';`
  - `src/state/index.ts:32` — `export * from './intelligence-exfiltration-battle';`
  - `src/state/intelligence-exfiltration-battle.test.ts:45` — `id: 'intelligence-exfiltration-battle',`
  - `src/state/intelligence-exfiltration-battle.test.ts:79` — `state.battle!.defender.handCommit = played('intelligence-exfiltration', 'player_2', 'hand');`
  - `src/state/intelligence-exfiltration-battle.test.ts:95` — `expect(state.players.player_2.zones.graveyard).toContain('intelligence-exfiltration');`
  - `src/state/intelligence-exfiltration-battle.test.ts:100` — `state.battle!.defender.handCommit = played('intelligence-exfiltration', 'player_2', 'hand');`
  - `src/state/intelligence-exfiltration-battle.test.ts:123` — `state.battle!.attacker.handCommit = played('intelligence-exfiltration', 'player_1', 'hand');`
  - `src/state/intelligence-exfiltration-battle.test.ts:138` — `state.battle!.defender.battleDrawPlayed = [played('intelligence-exfiltration', 'player_2', 'battle_draw')];`
  - `src/state/intelligence-exfiltration-battle.test.ts:149` — `expect(state.players.player_2.zones.discard).toContain('intelligence-exfiltration');`
  - `src/state/intelligence-exfiltration-battle.test.ts:154` — `state.battle!.attacker.handCommit = played('intelligence-exfiltration', 'player_1', 'hand');`
  - `src/state/intelligence-exfiltration-battle.test.ts:165` — `...played('intelligence-exfiltration', 'player_2', 'hand'),`
  - `src/state/intelligence-exfiltration-battle.test.ts:180` — `state.battle!.defender.handCommit = played('intelligence-exfiltration', 'player_2', 'hand');`
  - `src/state/intelligence-exfiltration-battle.test.ts:202` — `state.battle!.defender.handCommit = played('intelligence-exfiltration', 'player_2', 'hand');`
  - `src/state/intelligence-exfiltration-battle.test.ts:203` — `state.battle!.defender.battleDrawPlayed = [played('intelligence-exfiltration', 'player_2', 'battle_draw')];`
  - `src/state/intelligence-exfiltration-battle.test.ts:236` — `state.battle!.defender.handCommit = played('intelligence-exfiltration', 'player_2', 'hand');`
  - `src/state/intelligence-exfiltration-battle.ts:12` — `const EXFILTRATION = 'intelligence-exfiltration';`
  - `src/state/intelligence-leaders.test.ts:21` — `'intelligence-exfiltration',`
  - `src/state/intelligence-missions.test.ts:18` — `'intelligence-exfiltration',`
  - `src/state/intelligence-reactive-assets.test.ts:103` — `state.players.player_1.zones.assetBank = ['intelligence-exfiltration'];`
  - `src/state/intelligence-reactive-assets.test.ts:120` — `expect(state.players.player_1.zones.assetBank).not.toContain('intelligence-exfiltration');`
  - `src/state/intelligence-reactive-assets.test.ts:121` — `expect(state.players.player_1.zones.discard).toContain('intelligence-exfiltration');`
  - `src/state/intelligence-reactive-assets.ts:17` — `exfiltration: 'intelligence-exfiltration',`
  - `src/state/intelligence-subversion-asset.ts:11` — `exfiltration: 'intelligence-exfiltration',`
  - `src/state/intelligence-treason.test.ts:265` — `state.battle!.defender.handCommit = played('intelligence-exfiltration', 'player_2');`
  - `src/state/intelligence-treason.ts:104` — `case 'intelligence-exfiltration':`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Spies (`intelligence-spies`)

- **Allegiance:** Intelligence
- **Timing tags:** pre-reveal
- **Printed Battle text:** Reveal this before the other cards in the battle. Look at each opposing face-down card used in the battle. You may return your selected card to your Battle Hand and choose another eligible card from that Battle Hand face down.
- **TypeScript files containing the ID:** 24
  - `src/cards/intelligence.ts:17` — `'intelligence-spies',`
  - `src/cards/playability.ts:129` — `'intelligence-spies': battleAndAction('intelligence-spies', 'discard'),`
  - `src/state/apply-spies.ts:10` — `import { resolveSpiesBattleChoice } from './intelligence-spies-battle';`
  - `src/state/index.ts:28` — `export * from './intelligence-spies-battle';`
  - `src/state/intelligence-action-cards.test.ts:46` — `state.players.player_1.zones.hand = ['intelligence-spies', 'keep-card'];`
  - `src/state/intelligence-action-cards.test.ts:53` — `cardId: 'intelligence-spies',`
  - `src/state/intelligence-action-cards.test.ts:56` — `expect(state.players.player_1.zones.discard).toContain('intelligence-spies');`
  - `src/state/intelligence-action-cards.test.ts:86` — `expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining(['intelligence-spies', 'drawn-card']));`
  - `src/state/intelligence-action-cards.test.ts:129` — `state.players.player_1.zones.hand = ['intelligence-operational-reassessment', 'intelligence-spies'];`
  - `src/state/intelligence-action-cards.test.ts:143` — `'intelligence-spies',`
  - `src/state/intelligence-action-cards.test.ts:167` — `eligibleCardIds: expect.arrayContaining(['intelligence-spies', 'intelligence-subversion']),`
  - `src/state/intelligence-action-cards.test.ts:196` — `cardId: 'intelligence-spies',`
  - `src/state/intelligence-action-cards.ts:22` — `spies: 'intelligence-spies',`
  - `src/state/intelligence-action-legality.test.ts:29` — `cardId: 'intelligence-spies',`
  - `src/state/intelligence-fog-of-war-battle.test.ts:160` — `state.battle!.defender.battleDrawPlayed = [played('intelligence-spies', 'player_2', 'battle_draw')];`
  - `src/state/intelligence-fog-of-war-battle.test.ts:168` — `cardId: 'intelligence-spies',`
  - `src/state/intelligence-fog-of-war-battle.test.ts:173` — `expect(state.battle?.defender.battleDraw).toContain('intelligence-spies');`
  - `src/state/intelligence-fog-of-war-battle.test.ts:179` — `state.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');`
  - `src/state/intelligence-fog-of-war-battle.test.ts:200` — `spiesFirst.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');`
  - `src/state/intelligence-fog-of-war-battle.test.ts:210` — `fogFirst.battle!.attacker.battleDrawPlayed = [played('intelligence-spies', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-intercepted-orders-battle.test.ts:248` — `cardId: 'intelligence-spies',`
  - `src/state/intelligence-leaders.test.ts:15` — `'intelligence-spies',`
  - `src/state/intelligence-leaders.test.ts:59` — `state = applyGameAction(state, { type: 'start_intelligence_mission', playerId: 'player_1', cardId: 'intelligence-spies', kind: 'normal' }).state;`
  - `src/state/intelligence-leaders.test.ts:77` — `state = applyGameAction(state, { type: 'start_intelligence_mission', playerId: 'player_1', cardId: 'intelligence-spies', kind: 'normal' }).state;`
  - `src/state/intelligence-mission-triggers.test.ts:80` — `const state = game('intelligence-spies');`
  - `src/state/intelligence-mission-triggers.ts:10` — `const SPIES = 'intelligence-spies';`
  - `src/state/intelligence-missions.test.ts:12` — `'intelligence-spies',`
  - `src/state/intelligence-missions.test.ts:61` — `const state = applyGameAction(game(), { type: 'start_intelligence_mission', playerId: 'player_1', cardId: 'intelligence-spies', kind: 'normal' }).state;`
  - `src/state/intelligence-missions.test.ts:62` — `expect(state.players.player_1.zones.hand).not.toContain('intelligence-spies');`
  - `src/state/intelligence-missions.test.ts:63` — `expect(state.players.player_1.intelligence?.activeMission?.cardId).toBe('intelligence-spies');`
  - `src/state/intelligence-missions.test.ts:65` — `expect((toPrivateGameView(state, 'player_1').players.player_1 as ReturnType<typeof toPrivateGameView>['players'][string]).intelligence).toMatchObject({ activeMission: { cardId: 'intelligence-spies' } });`
  - `src/state/intelligence-missions.test.ts:69` — `let state = applyGameAction(game(), { type: 'start_intelligence_mission', playerId: 'player_1', cardId: 'intelligence-spies', kind: 'normal' }).state;`
  - `src/state/intelligence-missions.test.ts:76` — `expect(state.players.player_1.zones.discard).toContain('intelligence-spies');`
  - `src/state/intelligence-missions.test.ts:121` — `expect(options.some((option) => option.action.type === 'start_intelligence_mission' && option.action.kind === 'normal' && option.action.cardId === 'intelligence-spies')).toBe(true);`
  - `src/state/intelligence-missions.test.ts:122` — `expect(options.some((option) => option.action.type === 'start_intelligence_mission' && option.action.kind === 'special_operation' && option.action.cardId === 'intelligence-spies')).toBe(true);`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:86` — `'intelligence-spies',`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:101` — `'intelligence-spies',`
  - `src/state/intelligence-post-reveal.test.ts:120` — `state.players.player_1.zones.hand = ['intelligence-spies'];`
  - `src/state/intelligence-pre-reveal.test.ts:130` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-spies', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-pre-reveal.ts:26` — `import { resolveSpiesPreRevealCard } from './intelligence-spies-battle';`
  - `src/state/intelligence-pre-reveal.ts:34` — `spies: 'intelligence-spies',`
  - `src/state/intelligence-reactive-assets.test.ts:104` — `state.players.player_1.zones.hand = ['intelligence-spies'];`
  - `src/state/intelligence-reactive-assets.test.ts:207` — `cardId: 'intelligence-spies',`
  - `src/state/intelligence-reactive-assets.test.ts:216` — `expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'deep_cover', missionCardId: 'intelligence-spies' });`
  - `src/state/intelligence-reactive-assets.test.ts:217` — `expect(state.players.player_1.intelligence?.activeMission?.cardId).toBe('intelligence-spies');`
  - `src/state/intelligence-reactive-assets.test.ts:221` — `expect(state.players.player_1.zones.hand).toContain('intelligence-spies');`
  - `src/state/intelligence-reactive-assets.test.ts:223` — `expect(state.players.player_1.zones.graveyard).not.toContain('intelligence-spies');`
  - `src/state/intelligence-sleeper-network.test.ts:91` — `state.players.player_1.zones.hand = ['intelligence-spies'];`
  - `src/state/intelligence-sleeper-network.test.ts:103` — `state.players.player_1.zones.hand = ['intelligence-spies'];`
  - `src/state/intelligence-sleeper-network.test.ts:108` — `eligibleCardIds: ['intelligence-spies'],`
  - `src/state/intelligence-sleeper-network.test.ts:116` — `cardId: 'intelligence-spies',`
  - `src/state/intelligence-sleeper-network.test.ts:121` — `'intelligence-spies',`
  - `src/state/intelligence-sleeper-network.test.ts:176` — `let state = bankNetwork(game(), 'intelligence-spies');`
  - `src/state/intelligence-sleeper-network.test.ts:189` — `cardId: 'intelligence-spies',`
  - `src/state/intelligence-sleeper-network.test.ts:207` — `state.players.player_1.intelligence!.sleeperNetwork!.cards.push('intelligence-spies', 'intelligence-assassins');`
  - `src/state/intelligence-sleeper-network.test.ts:220` — `cardId: 'intelligence-spies',`
  - `src/state/intelligence-sleeper-network.test.ts:258` — `state.players.player_1.intelligence!.sleeperNetwork!.cards.push('intelligence-spies', 'card-valor');`
  - `src/state/intelligence-sleeper-network.test.ts:265` — `eligibleCardIds: expect.arrayContaining(['card-attrition', 'intelligence-spies']),`
  - `src/state/intelligence-sleeper-network.test.ts:279` — `'intelligence-spies',`
  - `src/state/intelligence-sleeper-network.test.ts:287` — `state.players.player_1.intelligence!.sleeperNetwork!.cards.push('intelligence-spies');`
  - `src/state/intelligence-sleeper-network.test.ts:296` — `eligibleCardIds: expect.arrayContaining(['card-attrition', 'intelligence-spies']),`
  - `src/state/intelligence-spies-battle.test.ts:30` — `id: 'intelligence-spies-battle',`
  - `src/state/intelligence-spies-battle.test.ts:59` — `state.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');`
  - `src/state/intelligence-spies-battle.test.ts:73` — `expect(state.battle?.attacker.handCommit).toMatchObject({ cardId: 'intelligence-spies', faceDown: false, earlyEffectResolved: true });`
  - `src/state/intelligence-spies-battle.test.ts:82` — `state.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');`
  - `src/state/intelligence-spies-battle.test.ts:104` — `state.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');`
  - `src/state/intelligence-spies-battle.test.ts:118` — `state.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');`
  - `src/state/intelligence-spies-battle.test.ts:120` — `state.battle!.attacker.battleDraw = ['intelligence-spies', 'second-replacement'];`
  - `src/state/intelligence-spies-battle.test.ts:128` — `cardId: 'intelligence-spies',`
  - `src/state/intelligence-spies-battle.test.ts:133` — `currentSelectedCardId: 'intelligence-spies',`
  - `src/state/intelligence-spies-battle.test.ts:142` — `state.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');`
  - `src/state/intelligence-spies-battle.test.ts:160` — `cardId: 'intelligence-spies',`
  - `src/state/intelligence-spies-battle.test.ts:167` — `state.battle!.attacker.handCommit = played('intelligence-spies', 'player_1', 'hand');`
  - `src/state/intelligence-spies-battle.ts:18` — `const SPIES_CARD_ID = 'intelligence-spies';`
  - `src/state/intelligence-subversion-asset.test.ts:225` — `cards: ['intelligence-spies'],`
  - `src/state/intelligence-subversion-asset.test.ts:241` — `expect(state.players.player_2.zones.discard).toEqual(expect.arrayContaining(['intelligence-sleeper-network', 'intelligence-spies']));`
  - `src/state/neutral-counterintelligence.test.ts:160` — `applyIntelligenceActionEffect(game, 'player_1', 'intelligence-spies');`
  - `src/state/neutral-reinforcements.ts:27` — `'intelligence-spies',`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/neutral-reinforcements.ts:60` — `&& !card.virtual`

### Fog of War (`intelligence-fog-of-war`)

- **Allegiance:** Intelligence
- **Timing tags:** pre-reveal, targeted
- **Printed Battle text:** Reveal this before the other cards in the battle. If your opponent used one card from hand and one card from their Battle Hand, they choose one of those cards and return it to its source. They use no card from that source.
- **TypeScript files containing the ID:** 16
  - `src/cards/intelligence.ts:18` — `'intelligence-fog-of-war',`
  - `src/cards/playability.ts:130` — `'intelligence-fog-of-war': battleAndAction('intelligence-fog-of-war', 'removed', true),`
  - `src/state/apply-fog-of-war.ts:5` — `import { resolveFogOfWarBattleChoice } from './intelligence-fog-of-war-battle';`
  - `src/state/index.ts:29` — `export * from './intelligence-fog-of-war-battle';`
  - `src/state/intelligence-action-legality.test.ts:40` — `state.players.player_1.zones.hand.push('intelligence-fog-of-war');`
  - `src/state/intelligence-fog-of-war-battle.test.ts:30` — `id: 'intelligence-fog-of-war-battle',`
  - `src/state/intelligence-fog-of-war-battle.test.ts:58` — `state.battle!.attacker.handCommit = played('intelligence-fog-of-war', 'player_1', 'hand');`
  - `src/state/intelligence-fog-of-war-battle.test.ts:78` — `cardId: 'intelligence-fog-of-war',`
  - `src/state/intelligence-fog-of-war-battle.test.ts:147` — `state.battle!.attacker.handCommit = played('intelligence-fog-of-war', 'player_1', 'hand');`
  - `src/state/intelligence-fog-of-war-battle.test.ts:182` — `state.battle!.defender.handCommit = played('intelligence-fog-of-war', 'player_2', 'hand');`
  - `src/state/intelligence-fog-of-war-battle.test.ts:192` — `cardId: 'intelligence-fog-of-war',`
  - `src/state/intelligence-fog-of-war-battle.test.ts:201` — `spiesFirst.battle!.attacker.battleDrawPlayed = [played('intelligence-fog-of-war', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-fog-of-war-battle.test.ts:209` — `fogFirst.battle!.attacker.handCommit = played('intelligence-fog-of-war', 'player_1', 'hand');`
  - `src/state/intelligence-fog-of-war-battle.test.ts:220` — `state.battle!.attacker.handCommit = played('intelligence-fog-of-war', 'player_1', 'hand');`
  - `src/state/intelligence-fog-of-war-battle.ts:11` — `const FOG_OF_WAR = 'intelligence-fog-of-war';`
  - `src/state/intelligence-fog-overlay.ts:16` — `export const FOG_OF_WAR_OVERLAY = 'intelligence-fog-of-war';`
  - `src/state/intelligence-leaders.test.ts:16` — `'intelligence-fog-of-war',`
  - `src/state/intelligence-mission-triggers.test.ts:87` — `const state = game('intelligence-fog-of-war');`
  - `src/state/intelligence-mission-triggers.test.ts:127` — `const state = game('intelligence-fog-of-war', 'special_operation');`
  - `src/state/intelligence-mission-triggers.ts:11` — `const FOG_OF_WAR = 'intelligence-fog-of-war';`
  - `src/state/intelligence-missions.test.ts:13` — `'intelligence-fog-of-war',`
  - `src/state/intelligence-pre-reveal.test.ts:59` — `state.battle!.defender.handCommit = played('intelligence-fog-of-war', 'player_2', 'hand');`
  - `src/state/intelligence-pre-reveal.test.ts:68` — `cardId: 'intelligence-fog-of-war',`
  - `src/state/intelligence-pre-reveal.test.ts:78` — `state.battle!.defender.handCommit = played('intelligence-fog-of-war', 'player_2', 'hand');`
  - `src/state/intelligence-pre-reveal.test.ts:94` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-fog-of-war', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-pre-reveal.test.ts:111` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-fog-of-war', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-pre-reveal.ts:19` — `import { resolveFogOfWarPreRevealCard } from './intelligence-fog-of-war-battle';`
  - `src/state/intelligence-pre-reveal.ts:35` — `fogOfWar: 'intelligence-fog-of-war',`
  - `src/state/mystics-spirit-hollow.test.ts:214` — `placeTerritoryOverlay(coveredSpace, 'intelligence-fog-of-war', 'player_2');`
  - `src/state/mystics-spirit-hollow.test.ts:330` — `{ cardId: 'intelligence-fog-of-war', owner: 'player_2', faceUp: true },`
  - `src/state/mystics-spirit-hollow.test.ts:344` — `{ cardId: 'intelligence-fog-of-war', owner: 'player_2', faceUp: true },`
  - `src/state/neutral-counterworks.test.ts:14` — `const FOG = 'intelligence-fog-of-war';`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Disinformation (`intelligence-disinformation`)

- **Allegiance:** Intelligence
- **Timing tags:** pre-reveal, reveal, cleanup
- **Printed Battle text:** If you committed this from hand, reveal it before the other cards in the battle. If your opponent also committed a card from hand, gain advantage. Return this to your hand during cleanup.
- **TypeScript files containing the ID:** 14
  - `src/cards/intelligence.ts:19` — `'intelligence-disinformation',`
  - `src/cards/playability.ts:131` — `'intelligence-disinformation': battleOnly('intelligence-disinformation'),`
  - `src/state/intelligence-action-cards.test.ts:147` — `cardId: 'intelligence-disinformation',`
  - `src/state/intelligence-action-cards.test.ts:163` — `expect(state.players.player_1.zones.hand).toContain('intelligence-disinformation');`
  - `src/state/intelligence-action-cards.test.ts:166` — `returnedMissionCardId: 'intelligence-disinformation',`
  - `src/state/intelligence-action-cards.test.ts:169` — `expect((state.pendingIntelligenceChoice as { eligibleCardIds: string[] }).eligibleCardIds).not.toContain('intelligence-disinformation');`
  - `src/state/intelligence-action-cards.test.ts:187` — `expect(state.players.player_1.zones.hand).toContain('intelligence-disinformation');`
  - `src/state/intelligence-leaders.test.ts:17` — `'intelligence-disinformation',`
  - `src/state/intelligence-mission-triggers.test.ts:93` — `const state = game('intelligence-disinformation');`
  - `src/state/intelligence-mission-triggers.test.ts:134` — `const state = game('intelligence-disinformation');`
  - `src/state/intelligence-mission-triggers.ts:12` — `const DISINFORMATION = 'intelligence-disinformation';`
  - `src/state/intelligence-missions.test.ts:14` — `'intelligence-disinformation',`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:88` — `'intelligence-disinformation',`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:103` — `'intelligence-disinformation',`
  - `src/state/intelligence-pre-reveal.test.ts:76` — `state.battle!.attacker.handCommit = played('intelligence-disinformation', 'player_1', 'hand');`
  - `src/state/intelligence-pre-reveal.ts:36` — `disinformation: 'intelligence-disinformation',`
  - `src/state/intelligence-reactive-assets.test.ts:106` — `cardId: 'intelligence-disinformation',`
  - `src/state/intelligence-simple-battle-effects.test.ts:73` — `state.battle!.attacker.handCommit = played('intelligence-disinformation', 'player_1', 'hand');`
  - `src/state/intelligence-simple-battle-effects.test.ts:81` — `expect(state.players.player_1.zones.hand).toContain('intelligence-disinformation');`
  - `src/state/intelligence-simple-battle-effects.test.ts:82` — `expect(state.players.player_1.zones.graveyard).not.toContain('intelligence-disinformation');`
  - `src/state/intelligence-simple-battle-effects.test.ts:88` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-disinformation', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-simple-battle-effects.test.ts:94` — `expect(state.players.player_1.zones.discard).toContain('intelligence-disinformation');`
  - `src/state/intelligence-simple-battle-effects.test.ts:95` — `expect(state.players.player_1.zones.hand).not.toContain('intelligence-disinformation');`
  - `src/state/intelligence-simple-battle-effects.test.ts:123` — `state.battle!.defender.handCommit = played('intelligence-disinformation', 'player_2', 'hand');`
  - `src/state/intelligence-simple-battle-effects.test.ts:129` — `expect(state.players.player_2.zones.graveyard).toContain('intelligence-disinformation');`
  - `src/state/intelligence-simple-battle-effects.test.ts:130` — `expect(state.players.player_2.zones.hand).not.toContain('intelligence-disinformation');`
  - `src/state/intelligence-simple-battle-effects.test.ts:165` — `state.battle!.attacker.handCommit = played('intelligence-disinformation', 'player_1', 'hand');`
  - `src/state/intelligence-simple-battle-effects.ts:19` — `disinformation: 'intelligence-disinformation',`
  - `src/state/neutral-contraband.ts:39` — `'intelligence-disinformation',`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/neutral-contraband.ts:87` — `&& !card.virtual);`

### Operational Reassessment (`intelligence-operational-reassessment`)

- **Allegiance:** Intelligence
- **Timing tags:** cleanup, board-change, targeted
- **Printed Battle text:** After all cards in the battle are revealed, you may replace this with a card from your hand whose Battle effect can still resolve. If you do, put this in your Graveyard, reveal the replacement card face up for its Battle effect, and put that card in your Graveyard during cleanup.
- **TypeScript files containing the ID:** 17
  - `src/cards/intelligence.ts:20` — `'intelligence-operational-reassessment',`
  - `src/cards/playability.ts:132` — `'intelligence-operational-reassessment': battleAndAction('intelligence-operational-reassessment', 'discard'),`
  - `src/state/apply-operational-reassessment.ts:9` — `} from './intelligence-operational-reassessment-battle';`
  - `src/state/apply-post-reveal.ts:4` — `import { resolveOperationalReassessmentBattleChoice } from './intelligence-operational-reassessment-battle';`
  - `src/state/index.ts:40` — `export * from './intelligence-operational-reassessment-battle';`
  - `src/state/intelligence-action-cards.test.ts:129` — `state.players.player_1.zones.hand = ['intelligence-operational-reassessment', 'intelligence-spies'];`
  - `src/state/intelligence-action-cards.test.ts:131` — `expect(toPrivateGameView(state, 'player_1').legalActionPlays?.map((play) => play.cardId)).not.toContain('intelligence-operational-reassessment');`
  - `src/state/intelligence-action-cards.test.ts:135` — `cardId: 'intelligence-operational-reassessment',`
  - `src/state/intelligence-action-cards.test.ts:142` — `'intelligence-operational-reassessment',`
  - `src/state/intelligence-action-cards.test.ts:158` — `cardId: 'intelligence-operational-reassessment',`
  - `src/state/intelligence-action-cards.test.ts:189` — `expect(state.players.player_1.zones.discard).toContain('intelligence-operational-reassessment');`
  - `src/state/intelligence-action-cards.test.ts:194` — `state.players.player_1.zones.hand = ['intelligence-operational-reassessment'];`
  - `src/state/intelligence-action-cards.test.ts:208` — `cardId: 'intelligence-operational-reassessment',`
  - `src/state/intelligence-action-cards.ts:24` — `operationalReassessment: 'intelligence-operational-reassessment',`
  - `src/state/intelligence-action-legality.test.ts:35` — `expect(canResolveIntelligenceAction(state, 'player_1', 'intelligence-operational-reassessment')).toBe(false);`
  - `src/state/intelligence-action-legality.test.ts:38` — `expect(canResolveIntelligenceAction(state, 'player_1', 'intelligence-operational-reassessment')).toBe(false);`
  - `src/state/intelligence-action-legality.test.ts:41` — `expect(canResolveIntelligenceAction(state, 'player_1', 'intelligence-operational-reassessment')).toBe(true);`
  - `src/state/intelligence-leaders.test.ts:22` — `'intelligence-operational-reassessment',`
  - `src/state/intelligence-missions.test.ts:19` — `'intelligence-operational-reassessment',`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:28` — `id: 'intelligence-operational-reassessment-battle',`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:61` — `if (origin === 'hand') participantState.handCommit = played('intelligence-operational-reassessment', playerId, 'hand');`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:62` — `else participantState.battleDrawPlayed.push(played('intelligence-operational-reassessment', playerId, 'battle_draw'));`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:123` — `expect(state.players.player_1.zones.graveyard).toContain('intelligence-operational-reassessment');`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:152` — `cardId: 'intelligence-operational-reassessment',`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:155` — `expect(state.players.player_1.zones.graveyard).not.toContain('intelligence-operational-reassessment');`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:181` — `state.players.player_1.zones.hand = ['intelligence-operational-reassessment', 'card-valor'];`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:188` — `cardId: 'intelligence-operational-reassessment',`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:196` — `expect(state.players.player_1.zones.graveyard.filter((cardId) => cardId === 'intelligence-operational-reassessment')).toHaveLength(1);`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:215` — `expect.objectContaining({ cardId: 'intelligence-operational-reassessment' }),`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:236` — `'intelligence-operational-reassessment',`
  - `src/state/intelligence-operational-reassessment-battle.ts:12` — `const OPERATIONAL_REASSESSMENT = 'intelligence-operational-reassessment';`
  - `src/state/intelligence-post-reveal.test.ts:70` — `state.battle!.attacker.handCommit = played('intelligence-operational-reassessment', 'player_1', 'hand');`
  - `src/state/intelligence-post-reveal.test.ts:104` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-operational-reassessment', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-post-reveal.test.ts:118` — `state.battle!.attacker.handCommit = played('intelligence-operational-reassessment', 'player_1', 'hand');`
  - `src/state/intelligence-post-reveal.test.ts:152` — `state.battle!.attacker.handCommit = played('intelligence-operational-reassessment', 'player_1', 'hand');`
  - `src/state/intelligence-post-reveal.test.ts:168` — `expect(state.players.player_1.zones.graveyard).toContain('intelligence-operational-reassessment');`
  - `src/state/intelligence-post-reveal.ts:7` — `import { battleEffectCanStillResolve } from './intelligence-operational-reassessment-battle';`
  - `src/state/intelligence-post-reveal.ts:22` — `operationalReassessment: 'intelligence-operational-reassessment',`
  - `src/state/intelligence-sleeper-network.ts:89` — `if (cardId === 'intelligence-operational-reassessment') {`
  - `src/state/intelligence-subversion-battle.test.ts:150` — `state.battle!.attacker.handCommit = played('intelligence-operational-reassessment', 'player_1');`
  - `src/state/intelligence-treason.test.ts:327` — `played('intelligence-operational-reassessment', 'player_2', 'battle_draw'),`
  - `src/state/intelligence-treason.test.ts:340` — `state.battle!.attacker.handCommit = played('intelligence-operational-reassessment', 'player_1');`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Intercepted Orders (`intelligence-intercepted-orders`)

- **Allegiance:** Intelligence
- **Timing tags:** pre-reveal, reveal, targeted
- **Printed Battle text:** Reveal this before the other cards in the battle. Look at your opponent's Battle Hand and choose one card. They cannot use that card during this battle. If it was their selected card, they may choose another eligible card from that Battle Hand face down.
- **TypeScript files containing the ID:** 14
  - `src/cards/intelligence.ts:21` — `'intelligence-intercepted-orders',`
  - `src/cards/playability.ts:133` — `'intelligence-intercepted-orders': battleAndAction('intelligence-intercepted-orders', 'asset_bank'),`
  - `src/state/apply-intercepted-orders.ts:8` — `} from './intelligence-intercepted-orders-battle';`
  - `src/state/index.ts:30` — `export * from './intelligence-intercepted-orders-battle';`
  - `src/state/intelligence-intercepted-orders-battle.test.ts:31` — `id: 'intelligence-intercepted-orders-battle',`
  - `src/state/intelligence-intercepted-orders-battle.test.ts:59` — `state.battle!.attacker.handCommit = played('intelligence-intercepted-orders', 'player_1', 'hand');`
  - `src/state/intelligence-intercepted-orders-battle.test.ts:133` — `state.battle!.attacker.handCommit = played('intelligence-intercepted-orders', 'player_1', 'hand');`
  - `src/state/intelligence-intercepted-orders-battle.test.ts:215` — `state.battle!.defender.handCommit = played('intelligence-intercepted-orders', 'player_2', 'hand');`
  - `src/state/intelligence-intercepted-orders-battle.test.ts:223` — `cardId: 'intelligence-intercepted-orders',`
  - `src/state/intelligence-intercepted-orders-battle.test.ts:231` — `state.battle!.attacker.handCommit = played('intelligence-intercepted-orders', 'player_1', 'hand');`
  - `src/state/intelligence-intercepted-orders-battle.test.ts:266` — `state.battle!.attacker.handCommit = played('intelligence-intercepted-orders', 'player_1', 'hand');`
  - `src/state/intelligence-intercepted-orders-battle.ts:23` — `const INTERCEPTED_ORDERS = 'intelligence-intercepted-orders';`
  - `src/state/intelligence-leaders.test.ts:23` — `'intelligence-intercepted-orders',`
  - `src/state/intelligence-missions.test.ts:20` — `'intelligence-intercepted-orders',`
  - `src/state/intelligence-pre-reveal.ts:20` — `import { resolveInterceptedOrdersPreRevealCard } from './intelligence-intercepted-orders-battle';`
  - `src/state/intelligence-pre-reveal.ts:37` — `interceptedOrders: 'intelligence-intercepted-orders',`
  - `src/state/intelligence-reactive-assets.test.ts:171` — `state.players.player_1.zones.assetBank = ['intelligence-intercepted-orders'];`
  - `src/state/intelligence-reactive-assets.test.ts:248` — `state.players.player_1.zones.assetBank = ['intelligence-intercepted-orders'];`
  - `src/state/intelligence-reactive-assets.ts:18` — `interceptedOrders: 'intelligence-intercepted-orders',`
  - `src/state/intelligence-subversion-asset.ts:13` — `interceptedOrders: 'intelligence-intercepted-orders',`
  - `src/state/neutral-counterintelligence.test.ts:16` — `import { resolveInterceptedOrdersPreRevealCard } from './intelligence-intercepted-orders-battle';`
  - `src/state/neutral-counterintelligence.test.ts:213` — `const source = played('intelligence-intercepted-orders', 'player_1');`
  - `src/state/neutral-reinforcements.ts:28` — `'intelligence-intercepted-orders',`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/neutral-reinforcements.ts:60` — `&& !card.virtual`

### Reconnaissance (`intelligence-reconnaissance`)

- **Allegiance:** Intelligence
- **Timing tags:** pre-reveal, board-change
- **Printed Battle text:** Reveal this before the other cards in the battle. After the remaining cards are revealed, before any of their effects resolve, you may withdraw. If you do, return all other cards used in the battle to their sources and end the battle without a winner.
- **TypeScript files containing the ID:** 21
  - `src/cards/intelligence.ts:22` — `'intelligence-reconnaissance',`
  - `src/cards/playability.ts:134` — `'intelligence-reconnaissance': battleAndAction('intelligence-reconnaissance', 'asset_bank'),`
  - `src/state/apply-post-reveal.ts:6` — `import { resolveReconnaissanceBattleChoice } from './intelligence-reconnaissance-battle';`
  - `src/state/apply-reconnaissance.ts:7` — `} from './intelligence-reconnaissance-battle';`
  - `src/state/index.ts:31` — `export * from './intelligence-reconnaissance-battle';`
  - `src/state/intelligence-leaders.test.ts:18` — `'intelligence-reconnaissance',`
  - `src/state/intelligence-mission-triggers.test.ts:99` — `const state = game('intelligence-reconnaissance');`
  - `src/state/intelligence-mission-triggers.ts:13` — `const RECONNAISSANCE = 'intelligence-reconnaissance';`
  - `src/state/intelligence-missions.test.ts:15` — `'intelligence-reconnaissance',`
  - `src/state/intelligence-post-reveal.test.ts:29` — `earlyEffectResolved: cardId === 'intelligence-reconnaissance' ? true : undefined,`
  - `src/state/intelligence-post-reveal.test.ts:71` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-reconnaissance', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-post-reveal.test.ts:72` — `state.battle!.defender.handCommit = played('intelligence-reconnaissance', 'player_2', 'hand');`
  - `src/state/intelligence-post-reveal.test.ts:105` — `state.battle!.defender.handCommit = played('intelligence-reconnaissance', 'player_2', 'hand');`
  - `src/state/intelligence-post-reveal.test.ts:119` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-reconnaissance', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-post-reveal.test.ts:133` — `state.battle!.attacker.handCommit = played('intelligence-reconnaissance', 'player_1', 'hand');`
  - `src/state/intelligence-post-reveal.test.ts:153` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-reconnaissance', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-post-reveal.ts:8` — `import { reconnaissanceWithdrawalAvailable } from './intelligence-reconnaissance-battle';`
  - `src/state/intelligence-post-reveal.ts:21` — `reconnaissance: 'intelligence-reconnaissance',`
  - `src/state/intelligence-pre-reveal.ts:21` — `import { resolveReconnaissancePreRevealCard } from './intelligence-reconnaissance-battle';`
  - `src/state/intelligence-pre-reveal.ts:38` — `reconnaissance: 'intelligence-reconnaissance',`
  - `src/state/intelligence-reactive-assets.test.ts:132` — `state.players.player_1.zones.assetBank = ['intelligence-reconnaissance'];`
  - `src/state/intelligence-reactive-assets.test.ts:156` — `state.players.player_1.zones.assetBank = ['intelligence-reconnaissance'];`
  - `src/state/intelligence-reactive-assets.ts:19` — `reconnaissance: 'intelligence-reconnaissance',`
  - `src/state/intelligence-reconnaissance-battle.test.ts:30` — `id: 'intelligence-reconnaissance-battle',`
  - `src/state/intelligence-reconnaissance-battle.test.ts:71` — `state.battle!.attacker.handCommit = played('intelligence-reconnaissance', 'player_1', 'hand');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:98` — `state.battle!.attacker.handCommit = played('intelligence-reconnaissance', 'player_1', 'hand');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:99` — `state.battle!.defender.handCommit = played('intelligence-reconnaissance', 'player_2', 'hand');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:117` — `state.battle!.attacker.handCommit = played('intelligence-reconnaissance', 'player_1', 'hand');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:136` — `expect(state.players.player_1.zones.graveyard).toContain('intelligence-reconnaissance');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:145` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-reconnaissance', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-reconnaissance-battle.test.ts:154` — `expect(state.players.player_1.zones.discard).toContain('intelligence-reconnaissance');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:156` — `expect(state.players.player_1.zones.graveyard).not.toContain('intelligence-reconnaissance');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:162` — `state.battle!.defender.handCommit = played('intelligence-reconnaissance', 'player_2', 'hand');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:176` — `expect(state.players.player_2.zones.graveyard).toContain('intelligence-reconnaissance');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:182` — `state.battle!.attacker.handCommit = played('intelligence-reconnaissance', 'player_1', 'hand');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:209` — `state.battle!.attacker.handCommit = played('intelligence-reconnaissance', 'player_1', 'hand');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:210` — `state.battle!.defender.handCommit = played('intelligence-reconnaissance', 'player_2', 'hand');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:219` — `expect(state.players.player_1.zones.graveyard).toContain('intelligence-reconnaissance');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:220` — `expect(state.players.player_2.zones.hand).toContain('intelligence-reconnaissance');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:221` — `expect(state.players.player_2.zones.graveyard).not.toContain('intelligence-reconnaissance');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:235` — `state.battle!.defender.handCommit = played('intelligence-reconnaissance', 'player_2', 'hand');`
  - `src/state/intelligence-reconnaissance-battle.test.ts:249` — `state.battle!.attacker.handCommit = played('intelligence-reconnaissance', 'player_1', 'hand');`
  - `src/state/intelligence-reconnaissance-battle.ts:13` — `const RECONNAISSANCE = 'intelligence-reconnaissance';`
  - `src/state/intelligence-subversion-asset.test.ts:79` — `state.players.player_2.zones.assetBank = ['intelligence-reconnaissance'];`
  - `src/state/intelligence-subversion-asset.test.ts:90` — `expectSubversionWindow(state, 'intelligence-reconnaissance');`
  - `src/state/intelligence-subversion-asset.test.ts:94` — `expect(state.players.player_2.zones.discard).toContain('intelligence-reconnaissance');`
  - `src/state/intelligence-subversion-asset.test.ts:100` — `state.players.player_2.zones.assetBank = ['intelligence-reconnaissance'];`
  - `src/state/intelligence-subversion-asset.test.ts:114` — `expect(state.players.player_2.zones.discard).toContain('intelligence-reconnaissance');`
  - `src/state/intelligence-subversion-asset.ts:12` — `reconnaissance: 'intelligence-reconnaissance',`
  - `src/state/intelligence-subversion-mission-evidence.test.ts:82` — `state.players[playerId].zones.assetBank = ['intelligence-reconnaissance'];`
  - `src/state/intelligence-subversion-mission-evidence.test.ts:109` — `'subversion:asset:battle-1:player_2:intelligence-reconnaissance',`
  - `src/state/intelligence-subversion-mission-evidence.test.ts:132` — `'subversion:asset:battle-1:player_2:intelligence-reconnaissance',`
  - `src/state/intelligence-subversion-mission-evidence.test.ts:153` — `'subversion:asset:battle-1:player_2:intelligence-reconnaissance',`
  - `src/state/intelligence-subversion-mission-evidence.test.ts:184` — `'subversion:asset:battle-1:player_1:intelligence-reconnaissance',`
  - `src/state/intelligence-treason.test.ts:292` — `state.battle!.defender.handCommit = played('intelligence-reconnaissance', 'player_2', 'hand', {`
  - `src/state/intelligence-treason.test.ts:317` — `expect(state.players.player_2.zones.hand).toContain('intelligence-reconnaissance');`
  - `src/state/intelligence-treason.ts:13` — `import { reconnaissanceWithdrawalAvailable } from './intelligence-reconnaissance-battle';`
  - `src/state/intelligence-treason.ts:110` — `case 'intelligence-reconnaissance':`
  - `src/state/intelligence-treason.ts:267` — `case 'intelligence-reconnaissance': {`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Deep Cover (`intelligence-deep-cover`)

- **Allegiance:** Intelligence
- **Timing tags:** pre-reveal, reveal
- **Printed Battle text:** If an opposing effect looked at or revealed one of your face-down cards used in this battle before the normal reveal, gain advantage.
- **TypeScript files containing the ID:** 13
  - `src/cards/intelligence.ts:23` — `'intelligence-deep-cover',`
  - `src/cards/playability.ts:135` — `'intelligence-deep-cover': battleAndAction('intelligence-deep-cover', 'asset_bank'),`
  - `src/state/intelligence-leaders.test.ts:24` — `'intelligence-deep-cover',`
  - `src/state/intelligence-missions.test.ts:21` — `'intelligence-deep-cover',`
  - `src/state/intelligence-missions.ts:6` — `const DEEP_COVER_CARD_ID = 'intelligence-deep-cover';`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:85` — `'intelligence-deep-cover',`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:97` — `eligibleCardIds: expect.arrayContaining(['card-valor', 'intelligence-deep-cover']),`
  - `src/state/intelligence-operational-reassessment-battle.ts:20` — `'intelligence-deep-cover',`
  - `src/state/intelligence-reactive-assets.test.ts:205` — `state.players.player_1.zones.assetBank = ['intelligence-deep-cover'];`
  - `src/state/intelligence-reactive-assets.test.ts:222` — `expect(state.players.player_1.zones.graveyard).toContain('intelligence-deep-cover');`
  - `src/state/intelligence-reactive-assets.test.ts:228` — `state.players.player_1.zones.assetBank = ['intelligence-deep-cover'];`
  - `src/state/intelligence-reactive-assets.test.ts:242` — `expect(state.players.player_1.zones.assetBank).toContain('intelligence-deep-cover');`
  - `src/state/intelligence-reactive-assets.ts:20` — `deepCover: 'intelligence-deep-cover',`
  - `src/state/intelligence-simple-battle-effects.test.ts:136` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-deep-cover', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-simple-battle-effects.test.ts:145` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-deep-cover', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-simple-battle-effects.test.ts:155` — `state.battle!.defender.handCommit = { ...played('intelligence-deep-cover', 'player_2', 'hand'), faceDown: true };`
  - `src/state/intelligence-simple-battle-effects.test.ts:156` — `markBattleCardsObservedBeforeNormalReveal(state, 'player_2', ['intelligence-deep-cover']);`
  - `src/state/intelligence-simple-battle-effects.ts:20` — `deepCover: 'intelligence-deep-cover',`
  - `src/state/intelligence-subversion-asset.ts:14` — `deepCover: 'intelligence-deep-cover',`
  - `src/state/intelligence-treason.ts:108` — `case 'intelligence-deep-cover':`
  - `src/state/intelligence-treason.ts:261` — `case 'intelligence-deep-cover':`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Assassins (`intelligence-assassins`)

- **Allegiance:** Intelligence
- **Timing tags:** pre-reveal, reveal
- **Printed Battle text:** Reveal this before the other cards in the battle. If your opponent committed a card from hand, reveal and negate that card. Otherwise, give your opponent disadvantage during this battle.
- **TypeScript files containing the ID:** 19
  - `src/cards/intelligence.ts:24` — `'intelligence-assassins',`
  - `src/cards/playability.ts:136` — `'intelligence-assassins': battleAndAction('intelligence-assassins', 'discard'),`
  - `src/state/intelligence-action-cards.test.ts:91` — `state.players.player_1.zones.hand = ['intelligence-assassins'];`
  - `src/state/intelligence-action-cards.test.ts:94` — `cardId: 'intelligence-assassins',`
  - `src/state/intelligence-action-cards.test.ts:105` — `cardId: 'intelligence-assassins',`
  - `src/state/intelligence-action-cards.test.ts:124` — `expect(state.players.player_1.zones.discard).toContain('intelligence-assassins');`
  - `src/state/intelligence-action-cards.ts:25` — `assassins: 'intelligence-assassins',`
  - `src/state/intelligence-action-legality.test.ts:21` — `expect(canResolveIntelligenceAction(state, 'player_1', 'intelligence-assassins')).toBe(false);`
  - `src/state/intelligence-action-legality.test.ts:23` — `expect(canResolveIntelligenceAction(state, 'player_1', 'intelligence-assassins')).toBe(true);`
  - `src/state/intelligence-intercepted-orders-battle.test.ts:214` — `state.battle!.attacker.handCommit = played('intelligence-assassins', 'player_1', 'hand');`
  - `src/state/intelligence-intercepted-orders-battle.test.ts:232` — `state.battle!.defender.handCommit = played('intelligence-assassins', 'player_2', 'hand');`
  - `src/state/intelligence-leaders.test.ts:19` — `'intelligence-assassins',`
  - `src/state/intelligence-mission-triggers.test.ts:107` — `const state = game('intelligence-assassins');`
  - `src/state/intelligence-mission-triggers.ts:14` — `const ASSASSINS = 'intelligence-assassins';`
  - `src/state/intelligence-missions.test.ts:16` — `'intelligence-assassins',`
  - `src/state/intelligence-missions.test.ts:57` — `expect(intelligenceCardDefinitions.find((card) => card.id === 'intelligence-assassins')?.cost).toBe(4);`
  - `src/state/intelligence-missions.test.ts:83` — `state = applyGameAction(state, { type: 'start_intelligence_mission', playerId: 'player_1', cardId: 'intelligence-assassins', kind: 'normal' }).state;`
  - `src/state/intelligence-missions.test.ts:88` — `expect(state.players.player_1.zones.discard).toContain('intelligence-assassins');`
  - `src/state/intelligence-missions.test.ts:94` — `state = applyGameAction(state, { type: 'start_intelligence_mission', playerId: 'player_1', cardId: 'intelligence-assassins', kind: 'special_operation' }).state;`
  - `src/state/intelligence-missions.test.ts:97` — `const cost = specialOperationIntelCost(state, 'intelligence-assassins');`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:87` — `'intelligence-assassins',`
  - `src/state/intelligence-operational-reassessment-battle.test.ts:102` — `'intelligence-assassins',`
  - `src/state/intelligence-pre-reveal.test.ts:58` — `state.battle!.attacker.handCommit = played('intelligence-assassins', 'player_1', 'hand');`
  - `src/state/intelligence-pre-reveal.test.ts:93` — `state.battle!.attacker.handCommit = played('intelligence-assassins', 'player_1', 'hand');`
  - `src/state/intelligence-pre-reveal.test.ts:110` — `state.battle!.attacker.handCommit = played('intelligence-assassins', 'player_1', 'hand');`
  - `src/state/intelligence-pre-reveal.test.ts:129` — `state.battle!.attacker.handCommit = played('intelligence-assassins', 'player_1', 'hand');`
  - `src/state/intelligence-pre-reveal.test.ts:146` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-assassins', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-pre-reveal.ts:39` — `assassins: 'intelligence-assassins',`
  - `src/state/intelligence-simple-battle-effects.test.ts:100` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-assassins', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-simple-battle-effects.test.ts:111` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-assassins', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-simple-battle-effects.test.ts:122` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-assassins', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-simple-battle-effects.test.ts:154` — `state.battle!.attacker.battleDrawPlayed = [played('intelligence-assassins', 'player_1', 'battle_draw')];`
  - `src/state/intelligence-simple-battle-effects.ts:21` — `assassins: 'intelligence-assassins',`
  - `src/state/intelligence-sleeper-network.test.ts:207` — `state.players.player_1.intelligence!.sleeperNetwork!.cards.push('intelligence-spies', 'intelligence-assassins');`
  - `src/state/intelligence-sleeper-network.test.ts:231` — `cardId: 'intelligence-assassins',`
  - `src/state/intelligence-treason.test.ts:323` — `state.battle!.defender.handCommit = played('intelligence-assassins', 'player_2');`
  - `src/state/neutral-counterintelligence.test.ts:174` — `const assassins = played('intelligence-assassins', 'player_1');`
  - `src/state/neutral-fealty.test.ts:38` — `deck: ['intelligence-assassins', 'card-fortifications', 'card-attrition'],`
  - `src/state/neutral-fealty.test.ts:200` — `const assassins = played('intelligence-assassins', 'player_2');`
  - `src/state/neutral-fealty.test.ts:212` — `const assassins = played('intelligence-assassins', 'player_2');`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Treason (`intelligence-treason`)

- **Allegiance:** Intelligence
- **Timing tags:** pre-reveal, targeted
- **Printed Battle text:** Reveal this before the other cards in the battle. After the remaining cards are revealed, before their effects resolve, choose one opposing card used in the battle. Negate it, then resolve its Battle effect as though you had used it.
- **TypeScript files containing the ID:** 13
  - `src/cards/intelligence.ts:25` — `'intelligence-treason',`
  - `src/cards/playability.ts:137` — `'intelligence-treason': battleAndAction('intelligence-treason', 'asset_bank'),`
  - `src/state/apply-post-reveal.ts:7` — `import { resolveTreasonChoice, resolveTreasonReconnaissanceChoice } from './intelligence-treason';`
  - `src/state/index.ts:35` — `export * from './intelligence-treason';`
  - `src/state/intelligence-exfiltration-battle.ts:10` — `import { treasonCopyCount } from './intelligence-treason';`
  - `src/state/intelligence-leaders.test.ts:25` — `'intelligence-treason',`
  - `src/state/intelligence-missions.test.ts:22` — `'intelligence-treason',`
  - `src/state/intelligence-post-reveal.ts:18` — `} from './intelligence-treason';`
  - `src/state/intelligence-pre-reveal.ts:27` — `import { resolveTreasonPreRevealCard } from './intelligence-treason';`
  - `src/state/intelligence-pre-reveal.ts:40` — `treason: 'intelligence-treason',`
  - `src/state/intelligence-subversion-asset.ts:15` — `treason: 'intelligence-treason',`
  - `src/state/intelligence-treason.test.ts:54` — `id: 'intelligence-treason',`
  - `src/state/intelligence-treason.test.ts:86` — `return played('intelligence-treason', owner, 'hand', { earlyEffectResolved: true });`
  - `src/state/intelligence-treason.test.ts:97` — `state.battle!.attacker.handCommit = played('intelligence-treason', 'player_1', 'hand', { faceDown: true });`
  - `src/state/intelligence-treason.test.ts:105` — `cardId: 'intelligence-treason',`
  - `src/state/intelligence-treason.test.ts:165` — `state.players.player_1.zones.assetBank = ['intelligence-treason'];`
  - `src/state/intelligence-treason.test.ts:180` — `expect(state.players.player_1.zones.assetBank).toContain('intelligence-treason');`
  - `src/state/intelligence-treason.test.ts:190` — `state.players.player_1.zones.assetBank = ['intelligence-treason'];`
  - `src/state/intelligence-treason.test.ts:200` — `expect(state.players.player_1.zones.assetBank).not.toContain('intelligence-treason');`
  - `src/state/intelligence-treason.test.ts:201` — `expect(state.players.player_1.zones.discard).toContain('intelligence-treason');`
  - `src/state/intelligence-treason.test.ts:226` — `state.players.player_2.zones.assetBank = ['intelligence-treason'];`
  - `src/state/intelligence-treason.test.ts:233` — `expect(state.players.player_2.zones.assetBank).toContain('intelligence-treason');`
  - `src/state/intelligence-treason.test.ts:315` — `expect(state.players.player_1.zones.graveyard).toContain('intelligence-treason');`
  - `src/state/intelligence-treason.test.ts:325` — `played('intelligence-treason', 'player_2', 'battle_draw', { earlyEffectResolved: true }),`
  - `src/state/intelligence-treason.test.ts:342` — `state.players.player_1.zones.hand = ['intelligence-treason'];`
  - `src/state/intelligence-treason.test.ts:347` — `eligibleCardIds: ['intelligence-treason'],`
  - `src/state/intelligence-treason.test.ts:353` — `cardId: 'intelligence-treason',`
  - `src/state/intelligence-treason.ts:21` — `export const TREASON = 'intelligence-treason';`
  - `src/state/neutral-reinforcements.ts:29` — `'intelligence-treason',`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/neutral-reinforcements.ts:60` — `&& !card.virtual`

### Subversion (`intelligence-subversion`)

- **Allegiance:** Intelligence
- **Timing tags:** reveal
- **Printed Battle text:** Opposing banked Assets cannot be used during this battle.
- **TypeScript files containing the ID:** 44
  - `src/cards/intelligence.ts:26` — `'intelligence-subversion',`
  - `src/cards/playability.ts:138` — `'intelligence-subversion': battleAndAction('intelligence-subversion', 'asset_bank'),`
  - `src/dev/intelligence-battle-options.ts:7` — `} from '../state/intelligence-subversion-asset';`
  - `src/state/apply-intelligence.ts:38` — `import { bankedAssetUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/apply-mystics.ts:4` — `import { isSubversionAssetChoice } from './intelligence-subversion-asset';`
  - `src/state/apply-subversion-asset.ts:9` — `} from './intelligence-subversion-asset';`
  - `src/state/battle-reveal.ts:4` — `import { applySubversionBattleRestrictions } from './intelligence-subversion-battle';`
  - `src/state/diplomat-cards.ts:4` — `import { bankedAssetUseAllowed, bankedAssetCardUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/financier-cards.ts:4` — `import { activeBankedAssetCopies, bankedAssetCardUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/index.ts:33` — `export * from './intelligence-subversion-battle';`
  - `src/state/index.ts:34` — `export * from './intelligence-subversion-asset';`
  - `src/state/inquisition-no-martyrs.ts:10` — `import { bankedAssetUseAllowed, activeBankedAssetCopies, bankedAssetCardUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/inquisition-tyranny.ts:13` — `import { bankedAssetUseAllowed, activeBankedAssetCopies, bankedAssetCardUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/intelligence-action-cards.test.ts:144` — `'intelligence-subversion',`
  - `src/state/intelligence-action-cards.test.ts:167` — `eligibleCardIds: expect.arrayContaining(['intelligence-spies', 'intelligence-subversion']),`
  - `src/state/intelligence-action-cards.test.ts:176` — `cardId: 'intelligence-subversion',`
  - `src/state/intelligence-action-cards.test.ts:181` — `cardId: 'intelligence-subversion',`
  - `src/state/intelligence-action-cards.test.ts:188` — `expect(state.players.player_1.zones.hand).not.toContain('intelligence-subversion');`
  - `src/state/intelligence-leaders.test.ts:20` — `'intelligence-subversion',`
  - `src/state/intelligence-leaders.test.ts:66` — `expect(buildGuidedOptions(state).some((option) => option.action.type === 'resolve_intelligence_choice' && option.action.cardId === 'intelligence-subversion')).toBe(true);`
  - `src/state/intelligence-leaders.test.ts:68` — `state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'select', cardId: 'intelligence-subversion' }).state;`
  - `src/state/intelligence-leaders.test.ts:69` — `expect(state.players.player_1.intelligence?.activeMission).toMatchObject({ cardId: 'intelligence-subversion', kind: 'normal', startedTurn: state.turn });`
  - `src/state/intelligence-mission-triggers.test.ts:114` — `const state = game('intelligence-subversion');`
  - `src/state/intelligence-mission-triggers.test.ts:119` — `const second = game('intelligence-subversion');`
  - `src/state/intelligence-mission-triggers.ts:15` — `const SUBVERSION = 'intelligence-subversion';`
  - `src/state/intelligence-missions.test.ts:17` — `'intelligence-subversion',`
  - `src/state/intelligence-missions.test.ts:110` — `state = applyGameAction(state, { type: 'start_intelligence_mission', playerId: 'player_1', cardId: 'intelligence-subversion', kind: 'special_operation' }).state;`
  - `src/state/intelligence-missions.test.ts:114` — `expect(state.players.player_1.zones.graveyard).toContain('intelligence-subversion');`
  - `src/state/intelligence-missions.ts:4` — `import { bankedAssetUseAllowed, bankedAssetCardUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/intelligence-post-reveal.ts:12` — `} from './intelligence-subversion-battle';`
  - `src/state/intelligence-reactive-assets.test.ts:230` — `cardId: 'intelligence-subversion',`
  - `src/state/intelligence-reactive-assets.test.ts:241` — `expect(state.players.player_1.zones.graveyard).toContain('intelligence-subversion');`
  - `src/state/intelligence-reactive-assets.ts:8` — `import { bankedAssetUseAllowed, bankedAssetCardUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/intelligence-sleeper-network.ts:10` — `import { bankedAssetCardUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/intelligence-subversion-asset.test.ts:5` — `import { isSubversionAssetChoice } from './intelligence-subversion-asset';`
  - `src/state/intelligence-subversion-asset.test.ts:34` — `state.players.player_1.zones.assetBank = ['intelligence-subversion'];`
  - `src/state/intelligence-subversion-asset.test.ts:95` — `expect(state.players.player_1.zones.assetBank).toContain('intelligence-subversion');`
  - `src/state/intelligence-subversion-asset.test.ts:113` — `expect(state.players.player_1.zones.graveyard).toContain('intelligence-subversion');`
  - `src/state/intelligence-subversion-asset.test.ts:254` — `expect(state.players.player_1.zones.assetBank).toContain('intelligence-subversion');`
  - `src/state/intelligence-subversion-asset.ts:3` — `import { bankedAssetCardUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/intelligence-subversion-asset.ts:6` — `export const SUBVERSION_ASSET = 'intelligence-subversion';`
  - `src/state/intelligence-subversion-battle.test.ts:5` — `import { applySubversionBattleRestrictions, bankedAssetUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/intelligence-subversion-battle.test.ts:31` — `id: 'intelligence-subversion-battle',`
  - `src/state/intelligence-subversion-battle.test.ts:69` — `state.battle!.attacker.handCommit = played('intelligence-subversion', 'player_1');`
  - `src/state/intelligence-subversion-battle.test.ts:82` — `state.battle!.defender.handCommit = played('intelligence-subversion', 'player_2');`
  - `src/state/intelligence-subversion-battle.test.ts:94` — `state.battle!.attacker.handCommit = played('intelligence-subversion', 'player_1');`
  - `src/state/intelligence-subversion-battle.test.ts:95` — `state.battle!.defender.handCommit = played('intelligence-subversion', 'player_2');`
  - `src/state/intelligence-subversion-battle.test.ts:107` — `...played('intelligence-subversion', 'player_1'),`
  - `src/state/intelligence-subversion-battle.test.ts:120` — `state.battle!.attacker.handCommit = played('intelligence-subversion', 'player_1');`
  - `src/state/intelligence-subversion-battle.test.ts:134` — `state.battle!.attacker.handCommit = played('intelligence-subversion', 'player_1');`
  - `src/state/intelligence-subversion-battle.test.ts:151` — `state.players.player_1.zones.hand = ['intelligence-subversion'];`
  - `src/state/intelligence-subversion-battle.test.ts:157` — `eligibleCardIds: ['intelligence-subversion'],`
  - `src/state/intelligence-subversion-battle.test.ts:164` — `cardId: 'intelligence-subversion',`
  - `src/state/intelligence-subversion-battle.test.ts:174` — `state.battle!.attacker.handCommit = played('intelligence-subversion', 'player_1');`
  - `src/state/intelligence-subversion-battle.test.ts:192` — `state.battle!.attacker.handCommit = played('intelligence-subversion', 'player_1');`
  - `src/state/intelligence-subversion-battle.ts:11` — `export const SUBVERSION_BATTLE_CARD = 'intelligence-subversion';`
  - `src/state/intelligence-subversion-mission-evidence.test.ts:70` — `cardId: 'intelligence-subversion',`
  - `src/state/intelligence-subversion-mission-evidence.test.ts:115` — `state.players.player_1.zones.assetBank = ['intelligence-subversion'];`
  - `src/state/intelligence-subversion-mission-evidence.test.ts:138` — `state.players.player_1.zones.assetBank = ['intelligence-subversion'];`
  - `src/state/intelligence-subversion-mission-evidence.test.ts:154` — `'subversion:asset:battle-1:player_1:intelligence-subversion',`
  - `src/state/intelligence-treason.test.ts:208` — `state.battle!.defender.handCommit = played('intelligence-subversion', 'player_2');`
  - `src/state/intelligence-treason.test.ts:225` — `state.battle!.attacker.handCommit = played('intelligence-subversion', 'player_1');`
  - `src/state/intelligence-treason.ts:18` — `} from './intelligence-subversion-battle';`
  - `src/state/intelligence-treason.ts:112` — `case 'intelligence-subversion':`
  - `src/state/intelligence-treason.ts:264` — `case 'intelligence-subversion':`
  - `src/state/military-timing.ts:4` — `import { bankedAssetCardUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/mystics-black-covenant.ts:18` — `import { bankedAssetCardUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/mystics-grave-ward.test.ts:13` — `import { isSubversionAssetChoice } from './intelligence-subversion-asset';`
  - `src/state/mystics-grave-ward.test.ts:61` — `deck: ['intelligence-subversion', 'card-valor', 'card-fortifications'],`
  - `src/state/mystics-grave-ward.test.ts:255` — `state.players.player_2.zones.assetBank = ['intelligence-subversion'];`
  - `src/state/mystics-grave-ward.test.ts:259` — `cardId: 'intelligence-subversion',`
  - `src/state/mystics-grave-ward.test.ts:293` — `expect(state.players.player_2.zones.assetBank).toContain('intelligence-subversion');`
  - `src/state/mystics-grave-ward.test.ts:319` — `expect(state.players.player_2.zones.graveyard).toContain('intelligence-subversion');`
  - `src/state/mystics-grave-ward.test.ts:323` — `'subversion:asset:battle-evidence:player_2:intelligence-subversion',`
  - `src/state/mystics-grave-ward.ts:13` — `import { activeBankedAssetCopies, bankedAssetCardUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/mystics-rend-the-veil.ts:15` — `import { activeBankedAssetCopies } from './intelligence-subversion-battle';`
  - `src/state/mystics-witchcraft.ts:13` — `import { activeBankedAssetCopies } from './intelligence-subversion-battle';`
  - `src/state/neutral-assimilation.ts:14` — `import { activeBankedAssetCopies, bankedAssetUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/neutral-counterintelligence.ts:8` — `import { bankedAssetCardUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/neutral-entrenchment.ts:8` — `import { bankedAssetCardUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/neutral-fealty.ts:9` — `import { bankedAssetCardUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/neutral-foothold.ts:12` — `import { activeBankedAssetCopies, bankedAssetUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/neutral-illegal-occupation.test.ts:6` — `import { bankedAssetUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/neutral-redemption.ts:15` — `import { activeBankedAssetCopies, bankedAssetUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/neutral-rousing-speech.ts:12` — `import { bankedAssetUseAllowed } from './intelligence-subversion-battle';`
  - `src/state/neutral-supplies.ts:12` — `import { activeBankedAssetCopies, bankedAssetUseAllowed } from './intelligence-subversion-battle';`
- **Virtual/effect-only sites in those files:** 15
  - `src/state/inquisition-no-martyrs.ts:149` — `&& !card.virtual);`
  - `src/state/inquisition-tyranny.ts:60` — `return Boolean(card && !card.canceled && !card.negated && !card.virtual);`
  - `src/state/mystics-witchcraft.ts:70` — `return Boolean(active(card) && card.cardId === WITCHCRAFT && !card.virtual);`
  - `src/state/mystics-witchcraft.ts:95` — `&& !participant.handCommit.virtual`
  - `src/state/mystics-witchcraft.ts:107` — `if (!active(card) || card.virtual || card.cardId === WITCHCRAFT) return;`
  - `src/state/mystics-witchcraft.ts:274` — `virtual: true,`
  - `src/state/mystics-witchcraft.ts:337` — `const virtualCards = participant.battleDrawPlayed.filter((card) => card.virtual);`
  - `src/state/mystics-witchcraft.ts:339` — `for (const card of virtualCards) {`
  - `src/state/neutral-assimilation.ts:81` — `&& !card.virtual,`
  - `src/state/neutral-entrenchment.ts:38` — `&& !card.virtual,`
  - `src/state/neutral-foothold.ts:49` — `&& !card.virtual,`
  - `src/state/neutral-illegal-occupation.test.ts:137` — `it('ignores canceled, negated, virtual, defensive, and non-counterattack copies', () => {`
  - `src/state/neutral-illegal-occupation.test.ts:142` — `played('player_1', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-rousing-speech.ts:81` — `&& !card.virtual,`
  - `src/state/neutral-supplies.ts:62` — `return Boolean(card && card.cardId === SUPPLIES && !card.canceled && !card.negated && !card.virtual);`

### Dark Omens (`mystics-dark-omens`)

- **Allegiance:** Mystics
- **Timing tags:** reveal
- **Printed Battle text:** Draw one card. You may put it in your Graveyard. If you do, gain advantage.
- **TypeScript files containing the ID:** 11
  - `src/cards/playability.ts:141` — `'mystics-dark-omens': battleAndAction('mystics-dark-omens', 'discard'),`
  - `src/state/apply-mystics.ts:41` — `} from './mystics-dark-omens';`
  - `src/state/index.ts:48` — `export * from './mystics-dark-omens';`
  - `src/state/inquisition-core.test.ts:54` — `deck: ['mystics-grave-ward', 'mystics-dark-omens', 'card-valor'],`
  - `src/state/inquisition-core.test.ts:93` — `cardId: 'mystics-dark-omens',`
  - `src/state/inquisition-core.test.ts:107` — `state.players.player_2.zones.graveyard = ['mystics-dark-omens'];`
  - `src/state/inquisition-core.test.ts:111` — `expect(state.players.player_2.zones.graveyard).toEqual(['mystics-dark-omens', 'card-valor']);`
  - `src/state/inquisition-core.test.ts:125` — `state.players.player_2.zones.graveyard.push('mystics-dark-omens');`
  - `src/state/inquisition-core.test.ts:141` — `cardId: 'mystics-dark-omens',`
  - `src/state/mystics-dark-omens.test.ts:30` — `id: 'mystics-dark-omens-test',`
  - `src/state/mystics-dark-omens.test.ts:40` — `deck: ['mystics-dark-omens', 'card-valor', 'mystics-fates-toll', 'card-fortifications'],`
  - `src/state/mystics-dark-omens.test.ts:75` — `state.battle.attacker.handCommit = played('mystics-dark-omens', 'player_1', 'hand');`
  - `src/state/mystics-dark-omens.test.ts:77` — `state.battle.attacker.battleDrawPlayed = [played('mystics-dark-omens', 'player_1', 'battle_draw')];`
  - `src/state/mystics-dark-omens.test.ts:85` — `state.players.player_1.zones.hand = ['mystics-dark-omens'];`
  - `src/state/mystics-dark-omens.test.ts:92` — `cardId: 'mystics-dark-omens',`
  - `src/state/mystics-dark-omens.test.ts:99` — `sourceCardId: 'mystics-dark-omens',`
  - `src/state/mystics-dark-omens.test.ts:104` — `expect(state.players.player_1.zones.discard).not.toContain('mystics-dark-omens');`
  - `src/state/mystics-dark-omens.test.ts:124` — `expect(state.players.player_1.zones.hand).not.toContain('mystics-dark-omens');`
  - `src/state/mystics-dark-omens.test.ts:125` — `expect(state.players.player_1.zones.discard).toContain('mystics-dark-omens');`
  - `src/state/mystics-dark-omens.test.ts:131` — `state.players.player_1.zones.hand = ['mystics-dark-omens', 'unrelated-hand-card'];`
  - `src/state/mystics-dark-omens.test.ts:137` — `cardId: 'mystics-dark-omens',`
  - `src/state/mystics-dark-omens.test.ts:151` — `state.players.player_1.zones.hand = ['mystics-dark-omens'];`
  - `src/state/mystics-dark-omens.test.ts:158` — `cardId: 'mystics-dark-omens',`
  - `src/state/mystics-dark-omens.test.ts:172` — `sourceCardIds: ['mystics-dark-omens'],`
  - `src/state/mystics-dark-omens.ts:14` — `export const DARK_OMENS_CARD_ID = 'mystics-dark-omens';`
  - `src/state/mystics-rite-integration.test.ts:37` — `deck: ['mystics-dark-omens', 'mystics-dark-omens', 'mystics-fates-toll'],`
  - `src/state/mystics-rite-integration.test.ts:110` — `state.players.player_1.zones.hand = ['mystics-dark-omens', 'blood-cost'];`
  - `src/state/mystics-rite-integration.test.ts:120` — `secondaryCardId: 'mystics-dark-omens',`
  - `src/state/mystics-rite-integration.test.ts:139` — `faceDownBoundCardId: 'mystics-dark-omens',`
  - `src/state/mystics-rite-integration.test.ts:143` — `cardId: 'mystics-dark-omens',`
  - `src/state/mystics-rite-integration.test.ts:156` — `'mystics-dark-omens',`
  - `src/state/mystics-rite-integration.test.ts:157` — `'mystics-dark-omens',`
  - `src/state/mystics-rite-integration.test.ts:167` — `faceDownBoundCardId: 'mystics-dark-omens',`
  - `src/state/mystics-rite-integration.test.ts:171` — `cardId: 'mystics-dark-omens',`
  - `src/state/mystics-rite-integration.test.ts:184` — `'mystics-dark-omens',`
  - `src/state/mystics-rite-integration.test.ts:211` — `cardId: 'mystics-dark-omens',`
  - `src/state/mystics-rite-integration.test.ts:283` — `state.players.player_1.zones.hand = ['mystics-dark-omens'];`
  - `src/state/mystics-ritual.test.ts:29` — `deck: ['mystics-dark-omens', 'mystics-dark-omens', 'mystics-fates-toll'],`
  - `src/state/mystics-ritual.test.ts:87` — `state.players.player_1.zones.hand = ['mystics-dark-omens'];`
  - `src/state/mystics-ritual.test.ts:89` — `beginRiteOfEchoes(state, 'player_1', 'grave-card', 'mystics-dark-omens');`
  - `src/state/mystics-ritual.test.ts:98` — `faceDownBoundCardId: 'mystics-dark-omens',`
  - `src/state/mystics-ritual.test.ts:108` — `faceDownBoundCardId: 'mystics-dark-omens',`
  - `src/state/mystics-ritual.test.ts:181` — `state.players.player_1.zones.discard = ['mystics-dark-omens'];`
  - `src/state/mystics-ritual.test.ts:194` — `beginRiteOfCrossing(state, 'player_1', 'mystics-dark-omens', 'discard');`
  - `src/state/mystics-ritual.test.ts:197` — `expect(state.players.player_1.zones.graveyard).toContain('mystics-dark-omens');`
  - `src/state/mystics-ritual.ts:15` — `'mystics-dark-omens',`
  - `src/state/mystics-witchcraft.test.ts:58` — `'mystics-dark-omens',`
  - `src/state/mystics-witchcraft.test.ts:219` — `state.battle!.attacker.battleDrawPlayed = [played('mystics-dark-omens', 'player_1', 'battle_draw')];`
  - `src/state/mystics-witchcraft.test.ts:288` — `'mystics-dark-omens',`
  - `src/state/mystics-witchcraft.ts:24` — `'mystics-dark-omens',`
- **Virtual/effect-only sites in those files:** 7
  - `src/state/mystics-witchcraft.test.ts:147` — `virtual: true,`
  - `src/state/mystics-witchcraft.ts:70` — `return Boolean(active(card) && card.cardId === WITCHCRAFT && !card.virtual);`
  - `src/state/mystics-witchcraft.ts:95` — `&& !participant.handCommit.virtual`
  - `src/state/mystics-witchcraft.ts:107` — `if (!active(card) || card.virtual || card.cardId === WITCHCRAFT) return;`
  - `src/state/mystics-witchcraft.ts:274` — `virtual: true,`
  - `src/state/mystics-witchcraft.ts:337` — `const virtualCards = participant.battleDrawPlayed.filter((card) => card.virtual);`
  - `src/state/mystics-witchcraft.ts:339` — `for (const card of virtualCards) {`

### Accursed Wager (`mystics-accursed-wager`)

- **Allegiance:** Mystics
- **Timing tags:** other
- **Printed Battle text:** After this battle, the losing player puts one card from their hand in their Graveyard, if able.
- **TypeScript files containing the ID:** 8
  - `src/cards/playability.ts:142` — `'mystics-accursed-wager': battleAndAction('mystics-accursed-wager', 'discard'),`
  - `src/state/apply-mystics.ts:13` — `} from './mystics-accursed-wager';`
  - `src/state/index.ts:49` — `export * from './mystics-accursed-wager';`
  - `src/state/inquisition-no-martyrs.test.ts:19` — `import { queueAccursedWagerAfterBattle } from './mystics-accursed-wager';`
  - `src/state/inquisition-no-martyrs.test.ts:282` — `currentBattle.defender.battleDrawPlayed = [played('mystics-accursed-wager', 'player_2')];`
  - `src/state/mystics-accursed-wager.test.ts:12` — `} from './mystics-accursed-wager';`
  - `src/state/mystics-accursed-wager.test.ts:38` — `id: 'mystics-accursed-wager-test',`
  - `src/state/mystics-accursed-wager.test.ts:48` — `deck: ['mystics-accursed-wager', 'card-valor'],`
  - `src/state/mystics-accursed-wager.test.ts:101` — `state.players.player_1.zones.hand = ['mystics-accursed-wager'];`
  - `src/state/mystics-accursed-wager.test.ts:106` — `cardId: 'mystics-accursed-wager',`
  - `src/state/mystics-accursed-wager.test.ts:113` — `expect(state.players.player_1.zones.discard).toContain('mystics-accursed-wager');`
  - `src/state/mystics-accursed-wager.test.ts:128` — `applyAccursedWagerAction(state, 'player_1', 'mystics-accursed-wager');`
  - `src/state/mystics-accursed-wager.test.ts:129` — `applyAccursedWagerAction(state, 'player_1', 'mystics-accursed-wager');`
  - `src/state/mystics-accursed-wager.test.ts:142` — `prior.attacker.handCommit = played('mystics-accursed-wager', 'player_1', 'hand');`
  - `src/state/mystics-accursed-wager.test.ts:143` — `prior.attacker.battleDrawPlayed = [played('mystics-accursed-wager', 'player_1', 'battle_draw')];`
  - `src/state/mystics-accursed-wager.test.ts:176` — `prior.attacker.handCommit = played('mystics-accursed-wager', 'player_1', 'hand');`
  - `src/state/mystics-accursed-wager.test.ts:177` — `prior.attacker.battleDrawPlayed = [played('mystics-accursed-wager', 'player_1', 'battle_draw')];`
  - `src/state/mystics-accursed-wager.test.ts:207` — `prior.attacker.handCommit = played('mystics-accursed-wager', 'player_1', 'hand');`
  - `src/state/mystics-accursed-wager.test.ts:222` — `prior.attacker.handCommit = played('mystics-accursed-wager', 'player_1', 'hand');`
  - `src/state/mystics-accursed-wager.test.ts:234` — `prior.attacker.handCommit = { ...played('mystics-accursed-wager', 'player_1', 'hand'), canceled: true };`
  - `src/state/mystics-accursed-wager.test.ts:245` — `prior.defender.handCommit = played('mystics-accursed-wager', 'player_2', 'hand');`
  - `src/state/mystics-accursed-wager.ts:12` — `export const ACCURSED_WAGER_CARD_ID = 'mystics-accursed-wager';`
  - `src/state/mystics-conversion.test.ts:184` — `state.players.player_1.zones.hand = ['mystics-accursed-wager'];`
  - `src/state/mystics-conversion.test.ts:190` — `cardId: 'mystics-accursed-wager',`
  - `src/state/mystics-conversion.test.ts:196` — `sourceCardIds: ['mystics-accursed-wager'],`
  - `src/state/mystics-ritual.ts:16` — `'mystics-accursed-wager',`
- **Virtual/effect-only sites in those files:** 2
  - `src/state/inquisition-no-martyrs.test.ts:196` — `it('counts active physical Battle copies and activated Assets while ignoring canceled, negated, and virtual copies', () => {`
  - `src/state/inquisition-no-martyrs.test.ts:204` — `played(NO_MARTYRS, 'player_1', 'replayed', { virtual: true }),`

### Fate's Toll (`mystics-fate-s-toll`)

- **Allegiance:** Mystics
- **Timing tags:** dice
- **Printed Battle text:** After you roll, you may put one other card from your hand in your Graveyard to reroll. You must use the new result.
- **TypeScript files containing the ID:** 0
  - No TypeScript occurrence found.
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Grave Ward (`mystics-grave-ward`)

- **Allegiance:** Mystics
- **Timing tags:** reveal, cleanup, targeted
- **Printed Battle text:** During battle cleanup, choose one other card you committed from hand during this battle. Move it from your Graveyard to your Discard Pile.
- **TypeScript files containing the ID:** 14
  - `src/cards/playability.ts:144` — `'mystics-grave-ward': battleAndAction('mystics-grave-ward', 'asset_bank'),`
  - `src/state/apply-grave-ward.ts:4` — `import { resolveGraveWardAssetAction } from './mystics-grave-ward';`
  - `src/state/apply-inquisition.ts:105` — `} from './mystics-grave-ward';`
  - `src/state/apply-mystics.ts:61` — `} from './mystics-grave-ward';`
  - `src/state/index.ts:53` — `export * from './mystics-grave-ward';`
  - `src/state/inquisition-core.test.ts:54` — `deck: ['mystics-grave-ward', 'mystics-dark-omens', 'card-valor'],`
  - `src/state/inquisition-core.test.ts:106` — `resolved.attacker.battleDraw = ['mystics-grave-ward'];`
  - `src/state/inquisition-core.test.ts:108` — `state.players.player_2.zones.discard = ['mystics-grave-ward', 'card-valor'];`
  - `src/state/inquisition-core.test.ts:112` — `expect(state.players.player_2.zones.discard).toEqual(['mystics-grave-ward']);`
  - `src/state/inquisition-core.test.ts:131` — `state.players.player_2.zones.graveyard.push('mystics-grave-ward');`
  - `src/state/inquisition-core.test.ts:163` — `state.players.player_2.zones.hand = ['mystics-grave-ward'];`
  - `src/state/inquisition-core.test.ts:168` — `cardId: 'mystics-grave-ward',`
  - `src/state/inquisition-core.test.ts:172` — `expect(state.players.player_2.zones.assetBank).toContain('mystics-grave-ward');`
  - `src/state/intelligence-subversion-asset.ts:20` — `graveWard: 'mystics-grave-ward',`
  - `src/state/mystics-circle-of-bones.test.ts:366` — `state.players.player_1.zones.assetBank = ['mystics-grave-ward'];`
  - `src/state/mystics-grave-ward.test.ts:11` — `} from './mystics-grave-ward';`
  - `src/state/mystics-grave-ward.test.ts:43` — `id: 'mystics-grave-ward-test',`
  - `src/state/mystics-grave-ward.test.ts:53` — `deck: ['mystics-grave-ward', 'card-valor', 'card-fortifications'],`
  - `src/state/mystics-grave-ward.test.ts:113` — `state.players.player_1.zones.assetBank = Array(assetCount).fill('mystics-grave-ward');`
  - `src/state/mystics-grave-ward.test.ts:124` — `state.players.player_1.zones.hand = ['mystics-grave-ward'];`
  - `src/state/mystics-grave-ward.test.ts:129` — `cardId: 'mystics-grave-ward',`
  - `src/state/mystics-grave-ward.test.ts:132` — `expect(state.players.player_1.zones.assetBank).toContain('mystics-grave-ward');`
  - `src/state/mystics-grave-ward.test.ts:133` — `expect(state.players.player_1.zones.hand).not.toContain('mystics-grave-ward');`
  - `src/state/mystics-grave-ward.test.ts:138` — `state.players.player_1.zones.assetBank = ['mystics-grave-ward'];`
  - `src/state/mystics-grave-ward.test.ts:179` — `'mystics-grave-ward',`
  - `src/state/mystics-grave-ward.test.ts:182` — `expect(state.players.player_1.zones.assetBank).not.toContain('mystics-grave-ward');`
  - `src/state/mystics-grave-ward.test.ts:216` — `'mystics-grave-ward',`
  - `src/state/mystics-grave-ward.test.ts:217` — `'mystics-grave-ward',`
  - `src/state/mystics-grave-ward.test.ts:223` — `state.players.player_1.zones.assetBank = ['mystics-grave-ward'];`
  - `src/state/mystics-grave-ward.test.ts:235` — `state.players.player_1.zones.assetBank = ['mystics-grave-ward'];`
  - `src/state/mystics-grave-ward.test.ts:290` — `'mystics-grave-ward',`
  - `src/state/mystics-grave-ward.test.ts:295` — `'subversion:asset:battle-evidence:player_1:mystics-grave-ward',`
  - `src/state/mystics-grave-ward.test.ts:318` — `expect(state.players.player_1.zones.discard).toContain('mystics-grave-ward');`
  - `src/state/mystics-grave-ward.test.ts:322` — `'subversion:asset:battle-evidence:player_1:mystics-grave-ward',`
  - `src/state/mystics-grave-ward.test.ts:332` — `battle.attacker.handCommit = played('mystics-grave-ward', 'player_1', 'hand');`
  - `src/state/mystics-grave-ward.test.ts:333` — `state.players.player_1.zones.graveyard = ['mystics-grave-ward', 'other-commitment'];`
  - `src/state/mystics-grave-ward.test.ts:334` — `recordResult(state, battle, ['mystics-grave-ward', 'other-commitment']);`
  - `src/state/mystics-grave-ward.test.ts:351` — `expect(state.players.player_1.zones.graveyard).toContain('mystics-grave-ward');`
  - `src/state/mystics-grave-ward.test.ts:357` — `battle.attacker.handCommit = played('mystics-grave-ward', 'player_1', 'hand');`
  - `src/state/mystics-grave-ward.test.ts:358` — `battle.attacker.battleDrawPlayed = [played('mystics-grave-ward', 'player_1', 'battle_draw')];`
  - `src/state/mystics-grave-ward.test.ts:359` — `state.players.player_1.zones.graveyard = ['mystics-grave-ward'];`
  - `src/state/mystics-grave-ward.test.ts:360` — `recordResult(state, battle, ['mystics-grave-ward']);`
  - `src/state/mystics-grave-ward.test.ts:367` — `handOptions: ['mystics-grave-ward'],`
  - `src/state/mystics-grave-ward.test.ts:374` — `battle.attacker.handCommit = played('mystics-grave-ward', 'player_1', 'hand', true);`
  - `src/state/mystics-grave-ward.test.ts:376` — `played('mystics-grave-ward', 'player_1', 'battle_draw'),`
  - `src/state/mystics-grave-ward.test.ts:377` — `played('mystics-grave-ward', 'player_1', 'battle_draw'),`
  - `src/state/mystics-grave-ward.test.ts:400` — `battle.attacker.handCommit = played('mystics-grave-ward', 'player_1', 'hand');`
  - `src/state/mystics-grave-ward.test.ts:401` — `state.players.player_1.zones.graveyard = ['mystics-grave-ward'];`
  - `src/state/mystics-grave-ward.test.ts:402` — `recordResult(state, battle, ['mystics-grave-ward']);`
  - `src/state/mystics-grave-ward.ts:15` — `export const GRAVE_WARD_CARD_ID = 'mystics-grave-ward';`
  - `src/state/mystics-necromancy.test.ts:258` — `state.players.player_1.zones.assetBank = ['mystics-grave-ward'];`
  - `src/state/mystics-ritual.ts:18` — `'mystics-grave-ward',`
  - `src/state/mystics-soul-for-soul.test.ts:249` — `state.players.player_1.zones.assetBank = ['mystics-grave-ward'];`
  - `src/state/mystics-spirit-hollow.test.ts:298` — `state.players.player_1.zones.assetBank = ['mystics-grave-ward'];`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Spirit Hollow (`mystics-spirit-hollow`)

- **Allegiance:** Mystics
- **Timing tags:** cleanup, board-change
- **Printed Battle text:** Place this as an Overlay on the contested Territory instead of following its normal destination.
- **TypeScript files containing the ID:** 12
  - `src/cards/playability.ts:150` — `'mystics-spirit-hollow': battleAndAction('mystics-spirit-hollow', 'removed', true),`
  - `src/dev/mystics-options.ts:138` — `if (!game.players[playerId].zones.hand.includes('mystics-spirit-hollow')) return [];`
  - `src/dev/mystics-options.ts:144` — `cardId: 'mystics-spirit-hollow',`
  - `src/state/apply-mystics.ts:98` — `} from './mystics-spirit-hollow';`
  - `src/state/index.ts:58` — `export * from './mystics-spirit-hollow';`
  - `src/state/mystics-circle-of-bones.test.ts:337` — `placeTerritoryOverlay(coveredSpace, 'mystics-spirit-hollow', 'player_1');`
  - `src/state/mystics-ritual.ts:19` — `'mystics-spirit-hollow',`
  - `src/state/mystics-spirit-hollow.test.ts:17` — `} from './mystics-spirit-hollow';`
  - `src/state/mystics-spirit-hollow.test.ts:43` — `cardId: 'mystics-spirit-hollow',`
  - `src/state/mystics-spirit-hollow.test.ts:54` — `id: 'mystics-spirit-hollow-test',`
  - `src/state/mystics-spirit-hollow.test.ts:64` — `deck: ['mystics-spirit-hollow', 'card-valor', 'card-fortifications'],`
  - `src/state/mystics-spirit-hollow.test.ts:114` — `placeTerritoryOverlay(space, 'mystics-spirit-hollow', 'player_1');`
  - `src/state/mystics-spirit-hollow.test.ts:122` — `state.players.player_1.zones.hand = ['mystics-spirit-hollow'];`
  - `src/state/mystics-spirit-hollow.test.ts:128` — `cardId: 'mystics-spirit-hollow',`
  - `src/state/mystics-spirit-hollow.test.ts:134` — `cardId: 'mystics-spirit-hollow',`
  - `src/state/mystics-spirit-hollow.test.ts:142` — `cardId: 'mystics-spirit-hollow',`
  - `src/state/mystics-spirit-hollow.test.ts:147` — `cardId: 'mystics-spirit-hollow',`
  - `src/state/mystics-spirit-hollow.test.ts:151` — `expect(state.players.player_1.zones.removed).not.toContain('mystics-spirit-hollow');`
  - `src/state/mystics-spirit-hollow.test.ts:152` — `expect(state.players.player_1.zones.discard).not.toContain('mystics-spirit-hollow');`
  - `src/state/mystics-spirit-hollow.test.ts:153` — `expect(state.players.player_1.zones.graveyard).not.toContain('mystics-spirit-hollow');`
  - `src/state/mystics-spirit-hollow.test.ts:160` — `state.players.player_1.zones.hand = ['mystics-spirit-hollow'];`
  - `src/state/mystics-spirit-hollow.test.ts:166` — `cardId: 'mystics-spirit-hollow',`
  - `src/state/mystics-spirit-hollow.test.ts:171` — `cardId: 'mystics-spirit-hollow',`
  - `src/state/mystics-spirit-hollow.test.ts:177` — `cardId: 'mystics-spirit-hollow',`
  - `src/state/mystics-spirit-hollow.test.ts:180` — `expect(state.players.player_1.zones.hand).toEqual(['mystics-spirit-hollow']);`
  - `src/state/mystics-spirit-hollow.test.ts:194` — `state.players.player_1.zones.graveyard = ['mystics-spirit-hollow'];`
  - `src/state/mystics-spirit-hollow.test.ts:195` — `state.players.player_1.zones.discard = ['mystics-spirit-hollow', 'mystics-spirit-hollow'];`
  - `src/state/mystics-spirit-hollow.test.ts:196` — `state.players.player_2.zones.hand = ['mystics-spirit-hollow'];`
  - `src/state/mystics-spirit-hollow.test.ts:201` — `{ cardId: 'mystics-spirit-hollow', owner: 'player_1', faceUp: true },`
  - `src/state/mystics-spirit-hollow.test.ts:202` — `{ cardId: 'mystics-spirit-hollow', owner: 'player_1', faceUp: true },`
  - `src/state/mystics-spirit-hollow.test.ts:204` — `expect(state.players.player_1.zones.graveyard).not.toContain('mystics-spirit-hollow');`
  - `src/state/mystics-spirit-hollow.test.ts:205` — `expect(state.players.player_1.zones.discard).toEqual(['mystics-spirit-hollow']);`
  - `src/state/mystics-spirit-hollow.test.ts:206` — `expect(state.players.player_2.zones.hand).toContain('mystics-spirit-hollow');`
  - `src/state/mystics-spirit-hollow.test.ts:213` — `placeTerritoryOverlay(coveredSpace, 'mystics-spirit-hollow', 'player_1');`
  - `src/state/mystics-spirit-hollow.test.ts:220` — `active.players.player_1.zones.graveyard = ['mystics-spirit-hollow'];`
  - `src/state/mystics-spirit-hollow.test.ts:329` — `{ cardId: 'mystics-spirit-hollow', owner: 'player_1', faceUp: true },`
  - `src/state/mystics-spirit-hollow.test.ts:347` — `'mystics-spirit-hollow',`
  - `src/state/mystics-spirit-hollow.ts:18` — `export const SPIRIT_HOLLOW = 'mystics-spirit-hollow';`
  - `src/state/neutral-contraband.ts:41` — `'mystics-spirit-hollow',`
  - `src/state/neutral-protracted-siege.test.ts:300` — `placeTerritoryOverlay(space, 'mystics-spirit-hollow', 'player_2');`
  - `src/state/neutral-protracted-siege.test.ts:314` — `placeTerritoryOverlay(space, 'mystics-spirit-hollow', 'player_2');`
  - `src/state/neutral-protracted-siege.test.ts:319` — `expect(space.overlays).toEqual([{ cardId: 'mystics-spirit-hollow', owner: 'player_2', faceUp: true }]);`
  - `src/state/neutral-scorched-earth.test.ts:271` — `placeTerritoryOverlay(space, 'mystics-spirit-hollow', 'player_1');`
  - `src/state/neutral-scorched-earth.test.ts:277` — `expect(space.overlays?.[0]).toMatchObject({ cardId: 'mystics-spirit-hollow' });`
  - `src/state/neutral-scorched-earth.test.ts:310` — `placeTerritoryOverlay(space, 'mystics-spirit-hollow', 'player_1');`
  - `src/state/territory-overlays.ts:16` — `'mystics-spirit-hollow',`
- **Virtual/effect-only sites in those files:** 3
  - `src/state/neutral-contraband.ts:87` — `&& !card.virtual);`
  - `src/state/neutral-scorched-earth.test.ts:252` — `it('ignores canceled, negated, and virtual Battle copies', () => {`
  - `src/state/neutral-scorched-earth.test.ts:257` — `played('player_2', 'battle_draw', { virtual: true }),`

### Soul for Soul (`mystics-soul-for-soul`)

- **Allegiance:** Mystics
- **Timing tags:** reveal, cleanup
- **Printed Battle text:** During battle cleanup, after cards committed from your hand enter your Graveyard, you may exchange one card in your hand with one other card in your Graveyard that you committed from hand during this battle.
- **TypeScript files containing the ID:** 7
  - `src/cards/playability.ts:145` — `'mystics-soul-for-soul': battleAndAction('mystics-soul-for-soul', 'discard', true),`
  - `src/dev/mystics-options.ts:91` — `if (!player.zones.hand.includes('mystics-soul-for-soul') || player.zones.graveyard.length < 1) return [];`
  - `src/dev/mystics-options.ts:93` — `eligibleHand.splice(eligibleHand.indexOf('mystics-soul-for-soul'), 1);`
  - `src/dev/mystics-options.ts:102` — `cardId: 'mystics-soul-for-soul',`
  - `src/state/apply-mystics.ts:89` — `} from './mystics-soul-for-soul';`
  - `src/state/index.ts:56` — `export * from './mystics-soul-for-soul';`
  - `src/state/mystics-ritual.ts:20` — `'mystics-soul-for-soul',`
  - `src/state/mystics-soul-for-soul.test.ts:10` — `} from './mystics-soul-for-soul';`
  - `src/state/mystics-soul-for-soul.test.ts:40` — `id: 'mystics-soul-for-soul-test',`
  - `src/state/mystics-soul-for-soul.test.ts:50` — `deck: ['mystics-soul-for-soul', 'card-valor', 'card-fortifications'],`
  - `src/state/mystics-soul-for-soul.test.ts:103` — `state.players.player_1.zones.hand = ['mystics-soul-for-soul', 'hand-card'];`
  - `src/state/mystics-soul-for-soul.test.ts:109` — `cardId: 'mystics-soul-for-soul',`
  - `src/state/mystics-soul-for-soul.test.ts:115` — `cardId: 'mystics-soul-for-soul',`
  - `src/state/mystics-soul-for-soul.test.ts:117` — `{ kind: 'card', owner: 'player_1', cardId: 'mystics-soul-for-soul' },`
  - `src/state/mystics-soul-for-soul.test.ts:121` — `expect(state.players.player_1.zones.hand).toEqual(['mystics-soul-for-soul', 'hand-card']);`
  - `src/state/mystics-soul-for-soul.test.ts:126` — `state.players.player_1.zones.hand = ['mystics-soul-for-soul', 'hand-card'];`
  - `src/state/mystics-soul-for-soul.test.ts:133` — `cardId: 'mystics-soul-for-soul',`
  - `src/state/mystics-soul-for-soul.test.ts:143` — `cardId: 'mystics-soul-for-soul',`
  - `src/state/mystics-soul-for-soul.test.ts:154` — `expect(state.players.player_1.zones.discard).toContain('mystics-soul-for-soul');`
  - `src/state/mystics-soul-for-soul.test.ts:160` — `state.players.player_1.zones.hand = ['mystics-soul-for-soul', 'duplicate'];`
  - `src/state/mystics-soul-for-soul.test.ts:166` — `cardId: 'mystics-soul-for-soul',`
  - `src/state/mystics-soul-for-soul.test.ts:198` — `battle.attacker.handCommit = played('mystics-soul-for-soul', 'player_1', 'hand');`
  - `src/state/mystics-soul-for-soul.test.ts:200` — `state.players.player_1.zones.graveyard = ['mystics-soul-for-soul', 'other-commitment'];`
  - `src/state/mystics-soul-for-soul.test.ts:201` — `recordResult(state, battle, ['mystics-soul-for-soul', 'other-commitment']);`
  - `src/state/mystics-soul-for-soul.test.ts:228` — `battle.attacker.handCommit = played('mystics-soul-for-soul', 'player_1', 'hand');`
  - `src/state/mystics-soul-for-soul.test.ts:229` — `battle.attacker.battleDrawPlayed = [played('mystics-soul-for-soul', 'player_1', 'battle_draw')];`
  - `src/state/mystics-soul-for-soul.test.ts:231` — `state.players.player_1.zones.graveyard = ['mystics-soul-for-soul'];`
  - `src/state/mystics-soul-for-soul.test.ts:232` — `recordResult(state, battle, ['mystics-soul-for-soul']);`
  - `src/state/mystics-soul-for-soul.test.ts:239` — `graveyardOptions: ['mystics-soul-for-soul'],`
  - `src/state/mystics-soul-for-soul.test.ts:246` — `battle.attacker.battleDrawPlayed = [played('mystics-soul-for-soul', 'player_1', 'battle_draw')];`
  - `src/state/mystics-soul-for-soul.test.ts:275` — `battle.attacker.handCommit = played('mystics-soul-for-soul', 'player_1', 'hand', true);`
  - `src/state/mystics-soul-for-soul.test.ts:277` — `played('mystics-soul-for-soul', 'player_1', 'battle_draw'),`
  - `src/state/mystics-soul-for-soul.test.ts:278` — `played('mystics-soul-for-soul', 'player_1', 'battle_draw'),`
  - `src/state/mystics-soul-for-soul.test.ts:307` — `battle.attacker.battleDrawPlayed = [played('mystics-soul-for-soul', 'player_1', 'battle_draw')];`
  - `src/state/mystics-soul-for-soul.ts:12` — `export const SOUL_FOR_SOUL_CARD_ID = 'mystics-soul-for-soul';`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Rend the Veil (`mystics-rend-the-veil`)

- **Allegiance:** Mystics
- **Timing tags:** targeted
- **Printed Battle text:** When revealed, you may choose one card in your Graveyard whose Battle effect can resolve in this battle and does not use another card or resolve or repeat another Battle effect. Reveal the chosen card face up and resolve its Battle effect.
- **TypeScript files containing the ID:** 6
  - `src/cards/playability.ts:146` — `'mystics-rend-the-veil': battleAndAction('mystics-rend-the-veil', 'asset_bank'),`
  - `src/state/apply-mystics.ts:81` — `} from './mystics-rend-the-veil';`
  - `src/state/index.ts:55` — `export * from './mystics-rend-the-veil';`
  - `src/state/mystics-rend-the-veil.test.ts:13` — `} from './mystics-rend-the-veil';`
  - `src/state/mystics-rend-the-veil.test.ts:34` — `cardId: 'mystics-rend-the-veil',`
  - `src/state/mystics-rend-the-veil.test.ts:54` — `deck: ['mystics-rend-the-veil', 'card-valor', 'card-attrition', 'card-fortifications'],`
  - `src/state/mystics-rend-the-veil.test.ts:94` — `state.players.player_1.zones.hand = ['mystics-rend-the-veil'];`
  - `src/state/mystics-rend-the-veil.test.ts:99` — `cardId: 'mystics-rend-the-veil',`
  - `src/state/mystics-rend-the-veil.test.ts:102` — `expect(state.players.player_1.zones.assetBank).toContain('mystics-rend-the-veil');`
  - `src/state/mystics-rend-the-veil.test.ts:168` — `expect(state.players.player_1.zones.graveyard).toContain('mystics-rend-the-veil');`
  - `src/state/mystics-rend-the-veil.test.ts:174` — `state.players.player_1.zones.assetBank = ['mystics-rend-the-veil'];`
  - `src/state/mystics-rend-the-veil.test.ts:183` — `expect(state.players.player_1.zones.assetBank).toContain('mystics-rend-the-veil');`
  - `src/state/mystics-rend-the-veil.test.ts:193` — `expect(state.players.player_1.zones.assetBank).not.toContain('mystics-rend-the-veil');`
  - `src/state/mystics-rend-the-veil.test.ts:194` — `expect(state.players.player_1.zones.discard).toContain('mystics-rend-the-veil');`
  - `src/state/mystics-rend-the-veil.ts:18` — `export const REND_THE_VEIL = 'mystics-rend-the-veil';`
  - `src/state/mystics-ritual.ts:21` — `'mystics-rend-the-veil',`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Paths of Shadow (`mystics-paths-of-shadow`)

- **Allegiance:** Mystics
- **Timing tags:** aftermath
- **Printed Battle text:** If you lose this battle, you may move to any Territory you control instead of retreating normally.
- **TypeScript files containing the ID:** 8
  - `src/cards/playability.ts:147` — `'mystics-paths-of-shadow': battleAndAction('mystics-paths-of-shadow', 'discard', true),`
  - `src/dev/mystics-options.ts:117` — `if (!player.zones.hand.includes('mystics-paths-of-shadow')) return [];`
  - `src/dev/mystics-options.ts:130` — `cardId: 'mystics-paths-of-shadow',`
  - `src/state/apply-mystics.ts:76` — `} from './mystics-paths-of-shadow';`
  - `src/state/index.ts:57` — `export * from './mystics-paths-of-shadow';`
  - `src/state/inquisition-no-martyrs.test.ts:20` — `import { queuePathsOfShadowAfterBattle } from './mystics-paths-of-shadow';`
  - `src/state/inquisition-no-martyrs.test.ts:272` — `mysticsBattle.defender.battleDrawPlayed = [played('mystics-paths-of-shadow', 'player_2')];`
  - `src/state/mystics-paths-of-shadow.test.ts:10` — `} from './mystics-paths-of-shadow';`
  - `src/state/mystics-paths-of-shadow.test.ts:31` — `cardId: 'mystics-paths-of-shadow',`
  - `src/state/mystics-paths-of-shadow.test.ts:41` — `id: 'mystics-paths-of-shadow-test',`
  - `src/state/mystics-paths-of-shadow.test.ts:51` — `deck: ['mystics-paths-of-shadow', 'mystics-paths-of-shadow', 'card-valor'],`
  - `src/state/mystics-paths-of-shadow.test.ts:137` — `state.players.player_1.zones.hand = ['mystics-paths-of-shadow'];`
  - `src/state/mystics-paths-of-shadow.test.ts:143` — `cardId: 'mystics-paths-of-shadow',`
  - `src/state/mystics-paths-of-shadow.test.ts:150` — `cardId: 'mystics-paths-of-shadow',`
  - `src/state/mystics-paths-of-shadow.test.ts:160` — `expect(state.players.player_1.zones.discard).toContain('mystics-paths-of-shadow');`
  - `src/state/mystics-paths-of-shadow.test.ts:168` — `state.players.player_1.zones.hand = ['mystics-paths-of-shadow'];`
  - `src/state/mystics-paths-of-shadow.test.ts:173` — `cardId: 'mystics-paths-of-shadow',`
  - `src/state/mystics-paths-of-shadow.test.ts:178` — `cardId: 'mystics-paths-of-shadow',`
  - `src/state/mystics-paths-of-shadow.test.ts:184` — `cardId: 'mystics-paths-of-shadow',`
  - `src/state/mystics-paths-of-shadow.test.ts:193` — `cardId: 'mystics-paths-of-shadow',`
  - `src/state/mystics-paths-of-shadow.test.ts:196` — `expect(state.players.player_1.zones.hand).toEqual(['mystics-paths-of-shadow']);`
  - `src/state/mystics-paths-of-shadow.test.ts:208` — `state.players.player_1.zones.hand = ['mystics-paths-of-shadow'];`
  - `src/state/mystics-paths-of-shadow.test.ts:213` — `cardId: 'mystics-paths-of-shadow',`
  - `src/state/mystics-paths-of-shadow.test.ts:308` — `cancellations: [{ owner: 'player_1', cardId: 'mystics-paths-of-shadow' }],`
  - `src/state/mystics-paths-of-shadow.test.ts:328` — `cancellations: [{ owner: 'player_1', cardId: 'mystics-paths-of-shadow' }],`
  - `src/state/mystics-paths-of-shadow.ts:14` — `export const PATHS_OF_SHADOW = 'mystics-paths-of-shadow';`
  - `src/state/mystics-ritual.ts:22` — `'mystics-paths-of-shadow',`
- **Virtual/effect-only sites in those files:** 2
  - `src/state/inquisition-no-martyrs.test.ts:196` — `it('counts active physical Battle copies and activated Assets while ignoring canceled, negated, and virtual copies', () => {`
  - `src/state/inquisition-no-martyrs.test.ts:204` — `played(NO_MARTYRS, 'player_1', 'replayed', { virtual: true }),`

### Witchcraft (`mystics-witchcraft`)

- **Allegiance:** Mystics
- **Timing tags:** reveal, cleanup, targeted
- **Printed Battle text:** When revealed, choose one other active card you used in the battle with an eligible Battle effect. Resolve that effect one additional time. If you cannot choose one, gain advantage. During battle cleanup, put this in your Graveyard.
- **TypeScript files containing the ID:** 7
  - `src/cards/playability.ts:148` — `'mystics-witchcraft': battleAndAction('mystics-witchcraft', 'asset_bank'),`
  - `src/state/apply-mystics.ts:105` — `} from './mystics-witchcraft';`
  - `src/state/index.ts:59` — `export * from './mystics-witchcraft';`
  - `src/state/mystics-conversion.test.ts:41` — `deck: ['card-valor', 'mystics-fates-toll', 'mystics-witchcraft'],`
  - `src/state/mystics-conversion.test.ts:91` — `state.players.player_1.zones.hand = ['mystics-witchcraft'];`
  - `src/state/mystics-conversion.test.ts:98` — `cardId: 'mystics-witchcraft',`
  - `src/state/mystics-conversion.test.ts:104` — `cardId: 'mystics-witchcraft',`
  - `src/state/mystics-conversion.test.ts:108` — `expect(state.players.player_1.zones.graveyard).toContain('mystics-witchcraft');`
  - `src/state/mystics-conversion.test.ts:116` — `state.players.player_1.zones.hand = ['mystics-witchcraft'];`
  - `src/state/mystics-conversion.test.ts:125` — `cardId: 'mystics-witchcraft',`
  - `src/state/mystics-conversion.test.ts:155` — `state.players.player_1.zones.hand = ['mystics-witchcraft'];`
  - `src/state/mystics-conversion.test.ts:161` — `cardId: 'mystics-witchcraft',`
  - `src/state/mystics-conversion.test.ts:232` — `expect(queueInvocationForArcaneUse(next, 'player_1', ['mystics-witchcraft'])).toBe(true);`
  - `src/state/mystics-ritual.ts:23` — `'mystics-witchcraft',`
  - `src/state/mystics-witchcraft.test.ts:15` — `} from './mystics-witchcraft';`
  - `src/state/mystics-witchcraft.ts:17` — `export const WITCHCRAFT = 'mystics-witchcraft';`
- **Virtual/effect-only sites in those files:** 7
  - `src/state/mystics-witchcraft.test.ts:147` — `virtual: true,`
  - `src/state/mystics-witchcraft.ts:70` — `return Boolean(active(card) && card.cardId === WITCHCRAFT && !card.virtual);`
  - `src/state/mystics-witchcraft.ts:95` — `&& !participant.handCommit.virtual`
  - `src/state/mystics-witchcraft.ts:107` — `if (!active(card) || card.virtual || card.cardId === WITCHCRAFT) return;`
  - `src/state/mystics-witchcraft.ts:274` — `virtual: true,`
  - `src/state/mystics-witchcraft.ts:337` — `const virtualCards = participant.battleDrawPlayed.filter((card) => card.virtual);`
  - `src/state/mystics-witchcraft.ts:339` — `for (const card of virtualCards) {`

### Black Covenant (`mystics-black-covenant`)

- **Allegiance:** Mystics
- **Timing tags:** cleanup
- **Printed Battle text:** When revealed, you may bind one other card from your hand that has a Battle effect beneath this, then immediately commit and reveal it as an additional hand commitment. During battle cleanup, put this in your Graveyard.
- **TypeScript files containing the ID:** 8
  - `src/cards/playability.ts:149` — `'mystics-black-covenant': battleAndAction('mystics-black-covenant', 'asset_bank', true),`
  - `src/dev/guided-options.ts:175` — `if (play.cardId === 'mystics-black-covenant'`
  - `src/dev/guided-options.ts:182` — `if (view.legalActionPlays?.some((play) => play.cardId === 'mystics-black-covenant')) {`
  - `src/dev/guided-options.ts:183` — `for (const cardId of game.players[playerId].zones.hand.filter((candidate) => candidate !== 'mystics-black-covenant')) {`
  - `src/dev/guided-options.ts:184` — `options.push({ label: `Bind ${cardId} beneath Black Covenant`, action: { type: 'play_action_card', playerId, cardId: 'mystics-black-covenant', targets: [{ kind: 'card', owner: playerId, cardId }] } });`
  - `src/state/apply-inquisition.ts:106` — `import { reconcileBlackCovenantBindings } from './mystics-black-covenant';`
  - `src/state/apply-mystics.ts:26` — `} from './mystics-black-covenant';`
  - `src/state/index.ts:50` — `export * from './mystics-black-covenant';`
  - `src/state/mystics-black-covenant.test.ts:11` — `} from './mystics-black-covenant';`
  - `src/state/mystics-black-covenant.ts:21` — `export const BLACK_COVENANT = 'mystics-black-covenant';`
  - `src/state/mystics-ritual.ts:24` — `'mystics-black-covenant',`
- **Virtual/effect-only sites in those files:** 0
  - None found.

### Circle of Bones (`mystics-circle-of-bones`)

- **Allegiance:** Mystics
- **Timing tags:** cleanup, board-change
- **Printed Battle text:** Place this as an Overlay on the contested Territory instead of following its normal destination.
- **TypeScript files containing the ID:** 11
  - `src/cards/playability.ts:151` — `'mystics-circle-of-bones': battleAndAction('mystics-circle-of-bones', 'removed', true),`
  - `src/dev/mystics-options.ts:152` — `if (!game.players[playerId].zones.hand.includes('mystics-circle-of-bones')) return [];`
  - `src/dev/mystics-options.ts:158` — `cardId: 'mystics-circle-of-bones',`
  - `src/state/apply-mystics.ts:35` — `} from './mystics-circle-of-bones';`
  - `src/state/index.ts:51` — `export * from './mystics-circle-of-bones';`
  - `src/state/mystics-circle-of-bones.test.ts:17` — `} from './mystics-circle-of-bones';`
  - `src/state/mystics-circle-of-bones.test.ts:43` — `cardId: 'mystics-circle-of-bones',`
  - `src/state/mystics-circle-of-bones.test.ts:55` — `id: 'mystics-circle-of-bones-test',`
  - `src/state/mystics-circle-of-bones.test.ts:65` — `deck: ['mystics-circle-of-bones', 'card-valor', 'card-fortifications'],`
  - `src/state/mystics-circle-of-bones.test.ts:119` — `placeTerritoryOverlay(space, 'mystics-circle-of-bones', owner);`
  - `src/state/mystics-circle-of-bones.test.ts:127` — `state.players.player_1.zones.hand = ['mystics-circle-of-bones'];`
  - `src/state/mystics-circle-of-bones.test.ts:133` — `cardId: 'mystics-circle-of-bones',`
  - `src/state/mystics-circle-of-bones.test.ts:139` — `cardId: 'mystics-circle-of-bones',`
  - `src/state/mystics-circle-of-bones.test.ts:147` — `cardId: 'mystics-circle-of-bones',`
  - `src/state/mystics-circle-of-bones.test.ts:152` — `cardId: 'mystics-circle-of-bones',`
  - `src/state/mystics-circle-of-bones.test.ts:156` — `expect(state.players.player_1.zones.removed).not.toContain('mystics-circle-of-bones');`
  - `src/state/mystics-circle-of-bones.test.ts:163` — `state.players.player_1.zones.hand = ['mystics-circle-of-bones'];`
  - `src/state/mystics-circle-of-bones.test.ts:169` — `cardId: 'mystics-circle-of-bones',`
  - `src/state/mystics-circle-of-bones.test.ts:174` — `cardId: 'mystics-circle-of-bones',`
  - `src/state/mystics-circle-of-bones.test.ts:180` — `cardId: 'mystics-circle-of-bones',`
  - `src/state/mystics-circle-of-bones.test.ts:183` — `expect(state.players.player_1.zones.hand).toEqual(['mystics-circle-of-bones']);`
  - `src/state/mystics-circle-of-bones.test.ts:199` — `{ cardId: 'mystics-circle-of-bones', owner: 'player_1', faceUp: true },`
  - `src/state/mystics-circle-of-bones.test.ts:216` — `{ cardId: 'mystics-circle-of-bones', owner: 'player_1', faceUp: true },`
  - `src/state/mystics-circle-of-bones.test.ts:217` — `{ cardId: 'mystics-circle-of-bones', owner: 'player_2', faceUp: true },`
  - `src/state/mystics-circle-of-bones.test.ts:228` — `state.players.player_1.zones.graveyard = ['mystics-circle-of-bones', 'other'];`
  - `src/state/mystics-circle-of-bones.test.ts:229` — `state.players.player_1.zones.discard = ['mystics-circle-of-bones', 'other-discard'];`
  - `src/state/mystics-circle-of-bones.test.ts:234` — `expect(current.attacker.handCommit?.cardId).toBe('mystics-circle-of-bones');`
  - `src/state/mystics-circle-of-bones.test.ts:235` — `expect(current.attacker.battleDrawPlayed[0].cardId).toBe('mystics-circle-of-bones');`
  - `src/state/mystics-circle-of-bones.ts:19` — `export const CIRCLE_OF_BONES = 'mystics-circle-of-bones';`
  - `src/state/mystics-ritual.ts:25` — `'mystics-circle-of-bones',`
  - `src/state/mystics-spirit-hollow.test.ts:331` — `{ cardId: 'mystics-circle-of-bones', owner: 'player_1', faceUp: true },`
  - `src/state/mystics-spirit-hollow.test.ts:348` — `'mystics-circle-of-bones',`
  - `src/state/neutral-contraband.ts:42` — `'mystics-circle-of-bones',`
  - `src/state/neutral-counterworks.test.ts:15` — `const CIRCLE = 'mystics-circle-of-bones';`
  - `src/state/territory-overlays.ts:17` — `'mystics-circle-of-bones',`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/neutral-contraband.ts:87` — `&& !card.virtual);`

### Necromancy (`mystics-necromancy`)

- **Allegiance:** Mystics
- **Timing tags:** cleanup
- **Printed Battle text:** During battle cleanup, after your other used cards follow their normal destinations, choose up to three non-Necromancy cards in your Graveyard. Put every card remaining in your hand in your Graveyard, then return the chosen cards to your hand. This follows its normal destination.
- **TypeScript files containing the ID:** 10
  - `src/cards/playability.ts:152` — `'mystics-necromancy': battleAndAction('mystics-necromancy', 'removed'),`
  - `src/state/apply-mystics.ts:68` — `} from './mystics-necromancy';`
  - `src/state/index.ts:54` — `export * from './mystics-necromancy';`
  - `src/state/inquisition-burning-at-the-stake.test.ts:21` — `const ARCANE_HIGH = 'mystics-necromancy';`
  - `src/state/inquisition-tyranny.test.ts:69` — `deck: ['card-valor', 'card-fortifications', 'mystics-necromancy'],`
  - `src/state/inquisition-tyranny.test.ts:255` — `state.battle!.defender.handCommit = played('mystics-necromancy', 'player_2');`
  - `src/state/inquisition-tyranny.test.ts:263` — `targetOptions: [expect.objectContaining({ cardId: 'mystics-necromancy' })],`
  - `src/state/mystics-necromancy.test.ts:16` — `} from './mystics-necromancy';`
  - `src/state/mystics-necromancy.test.ts:41` — `cardId: 'mystics-necromancy',`
  - `src/state/mystics-necromancy.test.ts:52` — `id: 'mystics-necromancy-test',`
  - `src/state/mystics-necromancy.test.ts:62` — `deck: ['mystics-necromancy', 'card-valor', 'card-fortifications'],`
  - `src/state/mystics-necromancy.test.ts:113` — `state.players.player_1.zones.hand = ['mystics-necromancy', 'hand-card'];`
  - `src/state/mystics-necromancy.test.ts:119` — `cardId: 'mystics-necromancy',`
  - `src/state/mystics-necromancy.test.ts:125` — `sourceCardId: 'mystics-necromancy',`
  - `src/state/mystics-necromancy.test.ts:128` — `expect(state.players.player_1.zones.removed).toContain('mystics-necromancy');`
  - `src/state/mystics-necromancy.test.ts:129` — `expect(state.players.player_1.zones.graveyard).not.toContain('mystics-necromancy');`
  - `src/state/mystics-necromancy.test.ts:143` — `state.players.player_1.zones.hand = ['mystics-necromancy'];`
  - `src/state/mystics-necromancy.test.ts:150` — `cardId: 'mystics-necromancy',`
  - `src/state/mystics-necromancy.test.ts:152` — `expect(state.players.player_1.mystics?.invocationDeferredSourceCardIds).toContain('mystics-necromancy');`
  - `src/state/mystics-necromancy.test.ts:161` — `expect(state.players.player_1.zones.deck).toEqual(['bottom-card', 'mystics-necromancy']);`
  - `src/state/mystics-necromancy.test.ts:167` — `state.players.player_1.zones.hand = ['mystics-necromancy'];`
  - `src/state/mystics-necromancy.test.ts:174` — `cardId: 'mystics-necromancy',`
  - `src/state/mystics-necromancy.test.ts:182` — `expect(state.players.player_1.zones.hand).toEqual(['mystics-necromancy']);`
  - `src/state/mystics-necromancy.test.ts:188` — `state.players.player_1.zones.hand = ['mystics-necromancy', 'hand-a', 'hand-b'];`
  - `src/state/mystics-necromancy.test.ts:194` — `cardId: 'mystics-necromancy',`
  - `src/state/mystics-necromancy.test.ts:208` — `'mystics-necromancy',`
  - `src/state/mystics-necromancy.test.ts:217` — `state.players.player_1.zones.hand = ['mystics-necromancy', 'hand-card'];`
  - `src/state/mystics-necromancy.test.ts:222` — `cardId: 'mystics-necromancy',`
  - `src/state/mystics-necromancy.test.ts:241` — `cardIds: ['mystics-necromancy'],`
  - `src/state/mystics-necromancy.test.ts:249` — `expect(state.players.player_1.zones.removed).toContain('mystics-necromancy');`
  - `src/state/mystics-necromancy.test.ts:255` — `state.players.player_1.zones.hand = ['mystics-necromancy', 'hand-a', 'hand-b'];`
  - `src/state/mystics-necromancy.test.ts:263` — `cardId: 'mystics-necromancy',`
  - `src/state/mystics-necromancy.test.ts:287` — `state.players.player_1.zones.graveyard = ['mystics-necromancy', 'used-hand-card'];`
  - `src/state/mystics-necromancy.test.ts:288` — `state.players.player_1.zones.discard = ['mystics-necromancy', 'used-battle-card'];`
  - `src/state/mystics-necromancy.test.ts:309` — `state.players.player_1.zones.hand = ['mystics-necromancy'];`
  - `src/state/mystics-necromancy.test.ts:310` — `state.players.player_1.zones.discard = ['mystics-necromancy'];`
  - `src/state/mystics-necromancy.test.ts:316` — `over.players.player_1.zones.graveyard = ['mystics-necromancy'];`
  - `src/state/mystics-necromancy.test.ts:326` — `state.players.player_1.zones.graveyard = ['mystics-necromancy', 'hand-result'];`
  - `src/state/mystics-necromancy.test.ts:327` — `state.players.player_1.zones.discard = ['mystics-necromancy', 'draw-result'];`
  - `src/state/mystics-necromancy.test.ts:340` — `expect(state.players.player_1.zones.graveyard).toEqual(expect.arrayContaining(['remaining', 'mystics-necromancy']));`
  - `src/state/mystics-necromancy.test.ts:355` — `'mystics-necromancy',`
  - `src/state/mystics-necromancy.test.ts:364` — `state.players.player_1.zones.graveyard = ['mystics-necromancy', 'grave-card'];`
  - `src/state/mystics-necromancy.test.ts:378` — `state.players.player_1.mystics!.invocationDeferredSourceCardIds = ['mystics-necromancy'];`
  - `src/state/mystics-necromancy.ts:16` — `export const NECROMANCY = 'mystics-necromancy';`
  - `src/state/mystics-rend-the-veil.test.ts:109` — `state.players.player_1.zones.graveyard = ['card-valor', 'mystics-necromancy'];`
  - `src/state/mystics-ritual.test.ts:116` — `state.players.player_1.zones.hand = ['mystics-necromancy'];`
  - `src/state/mystics-ritual.test.ts:123` — `'mystics-necromancy',`
  - `src/state/mystics-ritual.test.ts:127` — `expect(state.players.player_1.zones.hand).toEqual(['mystics-necromancy']);`
  - `src/state/mystics-ritual.ts:26` — `'mystics-necromancy',`
- **Virtual/effect-only sites in those files:** 2
  - `src/state/inquisition-tyranny.test.ts:144` — `it('keeps duplicate target instances distinct and excludes inactive or virtual cards', () => {`
  - `src/state/inquisition-tyranny.test.ts:152` — `played('card-valor', 'player_2', 'replayed', { virtual: true }),`

### Accusation (`inquisition-accusation`)

- **Allegiance:** Inquisition
- **Timing tags:** aftermath, targeted
- **Printed Battle text:** After the battle, choose one card in the opponent's Discard Pile. They put it on top of their Draw Pile or in their Graveyard.
- **TypeScript files containing the ID:** 9
  - `src/cards/playability.ts:154` — `'inquisition-accusation': battleAndAction('inquisition-accusation', 'discard', true),`
  - `src/dev/guided-options.ts:176` — `|| play.cardId === 'inquisition-accusation'`
  - `src/dev/guided-options.ts:188` — `if (opponent && view.legalActionPlays?.some((play) => play.cardId === 'inquisition-accusation')) {`
  - `src/dev/guided-options.ts:190` — `options.push({ label: `Play Accusation targeting ${cardId}`, action: { type: 'play_action_card', playerId, cardId: 'inquisition-accusation', targets: [{ kind: 'card', owner: opponent.id, cardId }] } });`
  - `src/state/apply-inquisition.ts:11` — `} from './inquisition-accusation';`
  - `src/state/index.ts:63` — `export * from './inquisition-accusation';`
  - `src/state/inquisition-accusation.test.ts:12` — `} from './inquisition-accusation';`
  - `src/state/inquisition-accusation.test.ts:34` — `id: 'inquisition-accusation-test',`
  - `src/state/inquisition-accusation.test.ts:44` — `deck: ['inquisition-accusation', 'inquisition-confession'],`
  - `src/state/inquisition-accusation.test.ts:82` — `state.players.player_1.zones.hand = ['inquisition-accusation'];`
  - `src/state/inquisition-accusation.test.ts:89` — `cardId: 'inquisition-accusation',`
  - `src/state/inquisition-accusation.test.ts:93` — `expect(state.players.player_1.zones.discard).toContain('inquisition-accusation');`
  - `src/state/inquisition-accusation.test.ts:120` — `state.players.player_1.zones.hand = ['inquisition-accusation'];`
  - `src/state/inquisition-accusation.test.ts:126` — `cardId: 'inquisition-accusation',`
  - `src/state/inquisition-accusation.test.ts:128` — `expect(state.players.player_1.zones.hand).toEqual(['inquisition-accusation']);`
  - `src/state/inquisition-accusation.test.ts:136` — `cardId: 'inquisition-accusation',`
  - `src/state/inquisition-accusation.test.ts:187` — `cardId: 'inquisition-accusation',`
  - `src/state/inquisition-accusation.test.ts:195` — `cardId: 'inquisition-accusation',`
  - `src/state/inquisition-accusation.test.ts:202` — `cardId: 'inquisition-accusation',`
  - `src/state/inquisition-accusation.test.ts:250` — `cardId: 'inquisition-accusation',`
  - `src/state/inquisition-accusation.ts:17` — `export const ACCUSATION = 'inquisition-accusation';`
  - `src/state/inquisition-canonical-audit.test.ts:15` — `['inquisition-accusation', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],`
  - `src/state/inquisition-penance.test.ts:45` — `deck: [PENANCE, 'inquisition-accusation'],`
  - `src/state/inquisition-purge.test.ts:24` — `deck: ['inquisition-accusation', 'inquisition-confession'],`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/inquisition-accusation.ts:113` — `return Boolean(card && card.cardId === ACCUSATION && !card.canceled && !card.negated && !card.virtual);`

### Confession (`inquisition-confession`)

- **Allegiance:** Inquisition
- **Timing tags:** pre-reveal
- **Printed Battle text:** After both players complete their hand commitments and Battle Hand choices, before the normal reveal, reveal this and the opponent's hand commitment, if any. You may return your own hand commitment to your hand and replace it with another eligible card from hand, revealed face up.
- **TypeScript files containing the ID:** 12
  - `src/cards/playability.ts:161` — `'inquisition-confession': battleAndAction('inquisition-confession', 'discard'),`
  - `src/state/apply-inquisition.ts:32` — `} from './inquisition-confession';`
  - `src/state/index.ts:70` — `export * from './inquisition-confession';`
  - `src/state/inquisition-accusation.test.ts:44` — `deck: ['inquisition-accusation', 'inquisition-confession'],`
  - `src/state/inquisition-canonical-audit.test.ts:16` — `['inquisition-confession', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],`
  - `src/state/inquisition-confession.test.ts:14` — `} from './inquisition-confession';`
  - `src/state/inquisition-confession.test.ts:36` — `id: 'inquisition-confession-test',`
  - `src/state/inquisition-confession.ts:17` — `export const CONFESSION = 'inquisition-confession';`
  - `src/state/inquisition-purge.test.ts:24` — `deck: ['inquisition-accusation', 'inquisition-confession'],`
  - `src/state/intelligence-pre-reveal.ts:10` — `} from './inquisition-confession';`
  - `src/state/neutral-counterintelligence.test.ts:11` — `import { applyConfessionAction, CONFESSION } from './inquisition-confession';`
  - `src/state/neutral-reinforcements.ts:30` — `'inquisition-confession',`
  - `src/state/views.ts:27` — `import { confessionLegalHandCommitCards } from './inquisition-confession';`
- **Virtual/effect-only sites in those files:** 5
  - `src/state/inquisition-confession.ts:199` — `&& !card.virtual);`
  - `src/state/neutral-reinforcements.ts:60` — `&& !card.virtual`
  - `src/state/views.ts:115` — `if (!played || played.virtual) return undefined;`
  - `src/state/views.ts:123` — `.filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled && !card.virtual);`
  - `src/state/views.ts:190` — `battleDrawPlayed: participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => revealPlayedCardToViewer(card, viewer)!).filter(Boolean),`

### Penance (`inquisition-penance`)

- **Allegiance:** Inquisition
- **Timing tags:** reveal
- **Printed Battle text:** After all cards in the battle are revealed, the opponent chooses one: put one card from hand in their Graveyard, or add +1 to your battle total.
- **TypeScript files containing the ID:** 16
  - `src/cards/playability.ts:155` — `'inquisition-penance': battleAndAction('inquisition-penance', 'discard'),`
  - `src/state/apply-inquisition.ts:88` — `} from './inquisition-penance';`
  - `src/state/index.ts:64` — `export * from './inquisition-penance';`
  - `src/state/inquisition-act-of-faith.test.ts:20` — `const FOURTH = 'inquisition-penance';`
  - `src/state/inquisition-burning-at-the-stake.test.ts:20` — `const TIED_HIGH_B = 'inquisition-penance';`
  - `src/state/inquisition-canonical-audit.test.ts:17` — `['inquisition-penance', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],`
  - `src/state/inquisition-confession.test.ts:46` — `deck: [CONFESSION, 'inquisition-penance', 'card-valor'],`
  - `src/state/inquisition-confession.test.ts:189` — `cardId: 'inquisition-penance',`
  - `src/state/inquisition-confession.test.ts:218` — `originalCommitCardId: 'inquisition-penance',`
  - `src/state/inquisition-confession.test.ts:235` — `expect(state.players.player_1.zones.hand).toContain('inquisition-penance');`
  - `src/state/inquisition-confession.test.ts:257` — `state.players.player_1.zones.hand = ['inquisition-penance'];`
  - `src/state/inquisition-confession.test.ts:264` — `cardId: 'inquisition-penance',`
  - `src/state/inquisition-confession.test.ts:267` — `expect(state.battle?.attacker.handCommit?.cardId).toBe('inquisition-penance');`
  - `src/state/inquisition-divine-mercy.test.ts:45` — `deck: [DIVINE_MERCY, 'inquisition-penance'],`
  - `src/state/inquisition-excommunication.test.ts:50` — `deck: [EXCOMMUNICATION, 'inquisition-divine-mercy', 'inquisition-penance'],`
  - `src/state/inquisition-guilt-by-association.test.ts:48` — `deck: [GUILT_BY_ASSOCIATION, 'inquisition-excommunication', 'inquisition-penance'],`
  - `src/state/inquisition-hellfire.test.ts:51` — `deck: [HELLFIRE, HELLFIRE, 'inquisition-penance'],`
  - `src/state/inquisition-heresy.test.ts:58` — `deck: [HERESY, HERESY, 'inquisition-penance'],`
  - `src/state/inquisition-no-martyrs.test.ts:67` — `deck: [NO_MARTYRS, NO_MARTYRS, 'inquisition-penance'],`
  - `src/state/inquisition-penance.test.ts:13` — `} from './inquisition-penance';`
  - `src/state/inquisition-penance.test.ts:35` — `id: 'inquisition-penance-test',`
  - `src/state/inquisition-penance.ts:14` — `export const PENANCE = 'inquisition-penance';`
  - `src/state/inquisition-tyranny.test.ts:61` — `deck: [TYRANNY, TYRANNY, 'inquisition-penance'],`
- **Virtual/effect-only sites in those files:** 12
  - `src/state/inquisition-guilt-by-association.test.ts:132` — `it('offers titles from physical opposing cards used in battle, including canceled cards but excluding virtual effects', () => {`
  - `src/state/inquisition-guilt-by-association.test.ts:164` — `virtual: true,`
  - `src/state/inquisition-heresy.test.ts:134` — `it('spends four Conviction, leaves the opposing card in its Graveyard, and resolves a virtual replay', () => {`
  - `src/state/inquisition-heresy.test.ts:155` — `virtual: true,`
  - `src/state/inquisition-heresy.test.ts:185` — `it('skips canceled, negated, virtual, underfunded, and targetless sources', () => {`
  - `src/state/inquisition-heresy.test.ts:189` — `{ virtual: true },`
  - `src/state/inquisition-heresy.test.ts:233` — `expect(state.battle?.attacker.battleDrawPlayed.filter((card) => card.virtual)).toHaveLength(1);`
  - `src/state/inquisition-no-martyrs.test.ts:196` — `it('counts active physical Battle copies and activated Assets while ignoring canceled, negated, and virtual copies', () => {`
  - `src/state/inquisition-no-martyrs.test.ts:204` — `played(NO_MARTYRS, 'player_1', 'replayed', { virtual: true }),`
  - `src/state/inquisition-penance.ts:79` — `return Boolean(card && card.cardId === PENANCE && !card.canceled && !card.negated && !card.virtual);`
  - `src/state/inquisition-tyranny.test.ts:144` — `it('keeps duplicate target instances distinct and excludes inactive or virtual cards', () => {`
  - `src/state/inquisition-tyranny.test.ts:152` — `played('card-valor', 'player_2', 'replayed', { virtual: true }),`

### Divine Mercy (`inquisition-divine-mercy`)

- **Allegiance:** Inquisition
- **Timing tags:** reveal, targeted
- **Printed Battle text:** Choose one card in the opponent's Graveyard and move it to their Discard Pile. Then add +2 to your battle total.
- **TypeScript files containing the ID:** 12
  - `src/cards/playability.ts:156` — `'inquisition-divine-mercy': battleAndAction('inquisition-divine-mercy', 'discard', true),`
  - `src/dev/guided-options.ts:177` — `|| play.cardId === 'inquisition-divine-mercy'`
  - `src/dev/guided-options.ts:193` — `if (opponent && view.legalActionPlays?.some((play) => play.cardId === 'inquisition-divine-mercy')) {`
  - `src/dev/guided-options.ts:195` — `options.push({ label: `Play Divine Mercy targeting ${cardId}`, action: { type: 'play_action_card', playerId, cardId: 'inquisition-divine-mercy', targets: [{ kind: 'card', owner: opponent.id, cardId }] } });`
  - `src/state/apply-inquisition.ts:49` — `} from './inquisition-divine-mercy';`
  - `src/state/index.ts:65` — `export * from './inquisition-divine-mercy';`
  - `src/state/inquisition-act-of-faith.test.ts:19` — `const THIRD = 'inquisition-divine-mercy';`
  - `src/state/inquisition-burning-at-the-stake.test.ts:19` — `const TIED_HIGH_A = 'inquisition-divine-mercy';`
  - `src/state/inquisition-canonical-audit.test.ts:18` — `['inquisition-divine-mercy', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],`
  - `src/state/inquisition-divine-mercy.test.ts:13` — `} from './inquisition-divine-mercy';`
  - `src/state/inquisition-divine-mercy.test.ts:35` — `id: 'inquisition-divine-mercy-test',`
  - `src/state/inquisition-divine-mercy.ts:17` — `export const DIVINE_MERCY = 'inquisition-divine-mercy';`
  - `src/state/inquisition-excommunication.test.ts:19` — `const TWO = 'inquisition-divine-mercy';`
  - `src/state/inquisition-excommunication.test.ts:50` — `deck: [EXCOMMUNICATION, 'inquisition-divine-mercy', 'inquisition-penance'],`
  - `src/state/inquisition-guilt-by-association.test.ts:18` — `const THIRD = 'inquisition-divine-mercy';`
  - `src/state/neutral-redemption.test.ts:10` — `import { DIVINE_MERCY } from './inquisition-divine-mercy';`
- **Virtual/effect-only sites in those files:** 3
  - `src/state/inquisition-divine-mercy.ts:97` — `return Boolean(card && card.cardId === DIVINE_MERCY && !card.canceled && !card.negated && !card.virtual);`
  - `src/state/inquisition-guilt-by-association.test.ts:132` — `it('offers titles from physical opposing cards used in battle, including canceled cards but excluding virtual effects', () => {`
  - `src/state/inquisition-guilt-by-association.test.ts:164` — `virtual: true,`

### No Martyrs (`inquisition-no-martyrs`)

- **Allegiance:** Inquisition
- **Timing tags:** other
- **Printed Battle text:** If the opponent loses, they cannot benefit from effects they control triggered by that loss or retreat, and they retreat one additional position.
- **TypeScript files containing the ID:** 15
  - `src/cards/playability.ts:162` — `'inquisition-no-martyrs': battleAndAction('inquisition-no-martyrs', 'asset_bank'),`
  - `src/state/apply-inquisition.ts:93` — `} from './inquisition-no-martyrs';`
  - `src/state/financier-battle-cards.ts:6` — `import { lossOrRetreatBenefitsSuppressed } from './inquisition-no-martyrs';`
  - `src/state/index.ts:71` — `export * from './inquisition-no-martyrs';`
  - `src/state/inquisition-canonical-audit.test.ts:19` — `['inquisition-no-martyrs', 'asset_bank', ['action', 'battle_hand_commit', 'battle_draw_play']],`
  - `src/state/inquisition-no-martyrs.test.ts:16` — `} from './inquisition-no-martyrs';`
  - `src/state/inquisition-no-martyrs.test.ts:57` — `id: `inquisition-no-martyrs-${opponentFaction}-test`,`
  - `src/state/inquisition-no-martyrs.ts:12` — `export const NO_MARTYRS = 'inquisition-no-martyrs';`
  - `src/state/military-interactions.ts:3` — `import { lossOrRetreatBenefitsSuppressed } from './inquisition-no-martyrs';`
  - `src/state/mystics-paths-of-shadow.ts:12` — `import { lossOrRetreatBenefitsSuppressed } from './inquisition-no-martyrs';`
  - `src/state/neutral-fortifications.ts:11` — `import { lossOrRetreatBenefitsSuppressed } from './inquisition-no-martyrs';`
  - `src/state/neutral-protracted-siege.ts:13` — `import { lossOrRetreatBenefitsSuppressed } from './inquisition-no-martyrs';`
  - `src/state/neutral-scorched-earth.ts:12` — `import { lossOrRetreatBenefitsSuppressed } from './inquisition-no-martyrs';`
  - `src/state/neutral-stand-ground.test.ts:14` — `import { NO_MARTYRS } from './inquisition-no-martyrs';`
  - `src/state/neutral-stand-ground.ts:182` — `sourceCardId: 'inquisition-no-martyrs',`
  - `src/state/reducer.ts:23` — `import { applyNoMartyrsOutcome } from './inquisition-no-martyrs';`
- **Virtual/effect-only sites in those files:** 8
  - `src/state/inquisition-no-martyrs.test.ts:196` — `it('counts active physical Battle copies and activated Assets while ignoring canceled, negated, and virtual copies', () => {`
  - `src/state/inquisition-no-martyrs.test.ts:204` — `played(NO_MARTYRS, 'player_1', 'replayed', { virtual: true }),`
  - `src/state/inquisition-no-martyrs.ts:149` — `&& !card.virtual);`
  - `src/state/neutral-fortifications.ts:45` — `&& (!card.virtual || card.effectOnlyReplay),`
  - `src/state/neutral-protracted-siege.ts:48` — `&& !card.virtual);`
  - `src/state/neutral-scorched-earth.ts:48` — `&& !card.virtual);`
  - `src/state/neutral-stand-ground.test.ts:183` — `played(STAND_GROUND, 'player_2', 'battle_draw', { virtual: true }),`
  - `src/state/neutral-stand-ground.ts:58` — `&& !card.virtual,`

### Excommunication (`inquisition-excommunication`)

- **Allegiance:** Inquisition
- **Timing tags:** aftermath, targeted
- **Printed Battle text:** After the battle, choose one or more cards in the opponent's Discard Pile with combined deckbuilding value up to 3. Put them in their Graveyard.
- **TypeScript files containing the ID:** 9
  - `src/cards/playability.ts:157` — `'inquisition-excommunication': battleAndAction('inquisition-excommunication', 'discard', true),`
  - `src/dev/guided-options.ts:178` — `|| play.cardId === 'inquisition-excommunication'`
  - `src/dev/guided-options.ts:198` — `if (opponent && view.legalActionPlays?.some((play) => play.cardId === 'inquisition-excommunication')) {`
  - `src/dev/guided-options.ts:205` — `cardId: 'inquisition-excommunication',`
  - `src/state/apply-inquisition.ts:57` — `} from './inquisition-excommunication';`
  - `src/state/index.ts:66` — `export * from './inquisition-excommunication';`
  - `src/state/inquisition-act-of-faith.test.ts:50` — `deck: [ACT_OF_FAITH, 'inquisition-excommunication'],`
  - `src/state/inquisition-canonical-audit.test.ts:20` — `['inquisition-excommunication', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],`
  - `src/state/inquisition-excommunication.test.ts:14` — `} from './inquisition-excommunication';`
  - `src/state/inquisition-excommunication.test.ts:40` — `id: 'inquisition-excommunication-test',`
  - `src/state/inquisition-excommunication.ts:18` — `export const EXCOMMUNICATION = 'inquisition-excommunication';`
  - `src/state/inquisition-guilt-by-association.test.ts:48` — `deck: [GUILT_BY_ASSOCIATION, 'inquisition-excommunication', 'inquisition-penance'],`
- **Virtual/effect-only sites in those files:** 3
  - `src/state/inquisition-excommunication.ts:149` — `return Boolean(card && card.cardId === EXCOMMUNICATION && !card.canceled && !card.negated && !card.virtual);`
  - `src/state/inquisition-guilt-by-association.test.ts:132` — `it('offers titles from physical opposing cards used in battle, including canceled cards but excluding virtual effects', () => {`
  - `src/state/inquisition-guilt-by-association.test.ts:164` — `virtual: true,`

### Guilt by Association (`inquisition-guilt-by-association`)

- **Allegiance:** Inquisition
- **Timing tags:** aftermath, targeted
- **Printed Battle text:** After the battle, choose one card the opponent used in that battle. Put every card in their Discard Pile with that title in their Graveyard.
- **TypeScript files containing the ID:** 7
  - `src/cards/playability.ts:158` — `'inquisition-guilt-by-association': battleAndAction('inquisition-guilt-by-association', 'discard', true),`
  - `src/dev/guided-options.ts:179` — `|| play.cardId === 'inquisition-guilt-by-association') continue;`
  - `src/dev/guided-options.ts:211` — `if (opponent && view.legalActionPlays?.some((play) => play.cardId === 'inquisition-guilt-by-association')) {`
  - `src/dev/guided-options.ts:222` — `cardId: 'inquisition-guilt-by-association',`
  - `src/state/apply-inquisition.ts:65` — `} from './inquisition-guilt-by-association';`
  - `src/state/index.ts:67` — `export * from './inquisition-guilt-by-association';`
  - `src/state/inquisition-canonical-audit.test.ts:21` — `['inquisition-guilt-by-association', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],`
  - `src/state/inquisition-guilt-by-association.test.ts:13` — `} from './inquisition-guilt-by-association';`
  - `src/state/inquisition-guilt-by-association.test.ts:38` — `id: 'inquisition-guilt-by-association-test',`
  - `src/state/inquisition-guilt-by-association.ts:18` — `export const GUILT_BY_ASSOCIATION = 'inquisition-guilt-by-association';`
- **Virtual/effect-only sites in those files:** 5
  - `src/state/inquisition-guilt-by-association.test.ts:132` — `it('offers titles from physical opposing cards used in battle, including canceled cards but excluding virtual effects', () => {`
  - `src/state/inquisition-guilt-by-association.test.ts:164` — `virtual: true,`
  - `src/state/inquisition-guilt-by-association.ts:116` — `return Boolean(card && card.cardId === GUILT_BY_ASSOCIATION && !card.canceled && !card.negated && !card.virtual);`
  - `src/state/inquisition-guilt-by-association.ts:126` — `if (participant.handCommit && !participant.handCommit.virtual) cards.push(participant.handCommit.cardId);`
  - `src/state/inquisition-guilt-by-association.ts:127` — `cards.push(...participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => card.cardId));`

### Act of Faith (`inquisition-act-of-faith`)

- **Allegiance:** Inquisition
- **Timing tags:** aftermath
- **Printed Battle text:** After the battle, reveal up to two cards from the top of the opponent's Draw Pile. Put one in their Graveyard and the rest in their Discard Pile.
- **TypeScript files containing the ID:** 7
  - `src/cards/playability.ts:159` — `'inquisition-act-of-faith': battleAndAction('inquisition-act-of-faith', 'discard'),`
  - `src/state/apply-inquisition.ts:18` — `} from './inquisition-act-of-faith';`
  - `src/state/index.ts:68` — `export * from './inquisition-act-of-faith';`
  - `src/state/inquisition-act-of-faith.test.ts:13` — `} from './inquisition-act-of-faith';`
  - `src/state/inquisition-act-of-faith.test.ts:40` — `id: 'inquisition-act-of-faith-test',`
  - `src/state/inquisition-act-of-faith.ts:14` — `export const ACT_OF_FAITH = 'inquisition-act-of-faith';`
  - `src/state/inquisition-burning-at-the-stake.test.ts:51` — `deck: [BURNING_AT_THE_STAKE, 'inquisition-act-of-faith'],`
  - `src/state/inquisition-canonical-audit.test.ts:22` — `['inquisition-act-of-faith', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/inquisition-act-of-faith.ts:118` — `return Boolean(card && card.cardId === ACT_OF_FAITH && !card.canceled && !card.negated && !card.virtual);`

### Tyranny (`inquisition-tyranny`)

- **Allegiance:** Inquisition
- **Timing tags:** targeted
- **Printed Battle text:** Negate one opposing card used in the battle.
- **TypeScript files containing the ID:** 7
  - `src/cards/playability.ts:163` — `'inquisition-tyranny': battleAndAction('inquisition-tyranny', 'asset_bank'),`
  - `src/state/apply-inquisition.ts:97` — `} from './inquisition-tyranny';`
  - `src/state/index.ts:72` — `export * from './inquisition-tyranny';`
  - `src/state/inquisition-canonical-audit.test.ts:23` — `['inquisition-tyranny', 'asset_bank', ['action', 'battle_hand_commit', 'battle_draw_play']],`
  - `src/state/inquisition-tyranny.test.ts:16` — `} from './inquisition-tyranny';`
  - `src/state/inquisition-tyranny.test.ts:51` — `id: `inquisition-tyranny-${opponentFaction}`,`
  - `src/state/inquisition-tyranny.ts:17` — `export const TYRANNY = 'inquisition-tyranny';`
  - `src/state/intelligence-post-reveal-flow.ts:8` — `import { openNextTyrannyChoice } from './inquisition-tyranny';`
- **Virtual/effect-only sites in those files:** 3
  - `src/state/inquisition-tyranny.test.ts:144` — `it('keeps duplicate target instances distinct and excludes inactive or virtual cards', () => {`
  - `src/state/inquisition-tyranny.test.ts:152` — `played('card-valor', 'player_2', 'replayed', { virtual: true }),`
  - `src/state/inquisition-tyranny.ts:60` — `return Boolean(card && !card.canceled && !card.negated && !card.virtual);`

### Burning at the Stake (`inquisition-burning-at-the-stake`)

- **Allegiance:** Inquisition
- **Timing tags:** other
- **Printed Battle text:** If the opponent loses, they reveal their hand. Put the card with the highest deckbuilding value in their Graveyard; choose among ties. If it has the Arcane trait, gain 1 Conviction.
- **TypeScript files containing the ID:** 7
  - `src/cards/playability.ts:160` — `'inquisition-burning-at-the-stake': battleAndAction('inquisition-burning-at-the-stake', 'discard'),`
  - `src/state/apply-inquisition.ts:25` — `} from './inquisition-burning-at-the-stake';`
  - `src/state/index.ts:69` — `export * from './inquisition-burning-at-the-stake';`
  - `src/state/inquisition-burning-at-the-stake.test.ts:14` — `} from './inquisition-burning-at-the-stake';`
  - `src/state/inquisition-burning-at-the-stake.test.ts:41` — `id: 'inquisition-burning-at-the-stake-test',`
  - `src/state/inquisition-burning-at-the-stake.ts:21` — `export const BURNING_AT_THE_STAKE = 'inquisition-burning-at-the-stake';`
  - `src/state/inquisition-canonical-audit.test.ts:24` — `['inquisition-burning-at-the-stake', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],`
  - `src/state/neutral-counterintelligence.test.ts:12` — `import { applyBurningAtTheStakeAction, BURNING_AT_THE_STAKE } from './inquisition-burning-at-the-stake';`
- **Virtual/effect-only sites in those files:** 1
  - `src/state/inquisition-burning-at-the-stake.ts:154` — `return Boolean(card && card.cardId === BURNING_AT_THE_STAKE && !card.canceled && !card.negated && !card.virtual);`

### Heresy (`inquisition-heresy`)

- **Allegiance:** Inquisition
- **Timing tags:** targeted
- **Printed Battle text:** You may spend 4 Conviction to choose one card in the opponent's Graveyard and resolve its Battle effect as though you had used it. That effect may resolve one additional Battle effect; the additional effect cannot resolve another.

The chosen card remains in the opponent's Graveyard.
- **TypeScript files containing the ID:** 9
  - `src/cards/playability.ts:164` — `'inquisition-heresy': battleOnly('inquisition-heresy'),`
  - `src/state/apply-inquisition.ts:75` — `} from './inquisition-heresy';`
  - `src/state/index.ts:73` — `export * from './inquisition-heresy';`
  - `src/state/inquisition-burning-at-the-stake.ts:12` — `import { HERESY } from './inquisition-heresy';`
  - `src/state/inquisition-canonical-audit.test.ts:25` — `['inquisition-heresy', 'graveyard', ['battle_hand_commit', 'battle_draw_play']],`
  - `src/state/inquisition-core.ts:12` — `import { HERESY } from './inquisition-heresy';`
  - `src/state/inquisition-heresy.test.ts:15` — `} from './inquisition-heresy';`
  - `src/state/inquisition-heresy.test.ts:48` — `id: `inquisition-heresy-${opponentFaction}`,`
  - `src/state/inquisition-heresy.ts:17` — `export const HERESY = 'inquisition-heresy';`
  - `src/state/intelligence-post-reveal-flow.ts:6` — `import { openNextHeresyChoice } from './inquisition-heresy';`
- **Virtual/effect-only sites in those files:** 11
  - `src/state/inquisition-burning-at-the-stake.ts:154` — `return Boolean(card && card.cardId === BURNING_AT_THE_STAKE && !card.canceled && !card.negated && !card.virtual);`
  - `src/state/inquisition-core.ts:50` — `if (participant.handCommit && !participant.handCommit.virtual) {`
  - `src/state/inquisition-core.ts:54` — `if (!card.virtual) cards.push({ key: `${playerId}:battle_draw:${index}`, card });`
  - `src/state/inquisition-core.ts:89` — `if (played.virtual) continue;`
  - `src/state/inquisition-heresy.test.ts:134` — `it('spends four Conviction, leaves the opposing card in its Graveyard, and resolves a virtual replay', () => {`
  - `src/state/inquisition-heresy.test.ts:155` — `virtual: true,`
  - `src/state/inquisition-heresy.test.ts:185` — `it('skips canceled, negated, virtual, underfunded, and targetless sources', () => {`
  - `src/state/inquisition-heresy.test.ts:189` — `{ virtual: true },`
  - `src/state/inquisition-heresy.test.ts:233` — `expect(state.battle?.attacker.battleDrawPlayed.filter((card) => card.virtual)).toHaveLength(1);`
  - `src/state/inquisition-heresy.ts:36` — `&& !card.virtual);`
  - `src/state/inquisition-heresy.ts:148` — `replayed.virtual = true;`

### Hellfire (`inquisition-hellfire`)

- **Allegiance:** Inquisition
- **Timing tags:** reveal, aftermath, targeted
- **Printed Battle text:** After all cards in the battle are revealed, spend any amount of Conviction. For each Conviction spent, choose one: add +1 to your battle total; or, if you win, after the battle put the top card of the opponent's Draw Pile in their Graveyard. You may choose either option more than once.
- **TypeScript files containing the ID:** 8
  - `src/cards/playability.ts:165` — `'inquisition-hellfire': battleAndAction('inquisition-hellfire', 'discard'),`
  - `src/state/apply-inquisition.ts:71` — `} from './inquisition-hellfire';`
  - `src/state/index.ts:74` — `export * from './inquisition-hellfire';`
  - `src/state/inquisition-canonical-audit.test.ts:26` — `['inquisition-hellfire', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],`
  - `src/state/inquisition-hellfire.test.ts:10` — `} from './inquisition-hellfire';`
  - `src/state/inquisition-hellfire.test.ts:41` — `id: 'inquisition-hellfire-test',`
  - `src/state/inquisition-hellfire.ts:14` — `export const HELLFIRE = 'inquisition-hellfire';`
  - `src/state/inquisition-heresy.test.ts:104` — `'inquisition-hellfire',`
  - `src/state/inquisition-heresy.test.ts:117` — `state.players.player_2.zones.graveyard = ['card-valor', 'inquisition-hellfire'];`
  - `src/state/inquisition-heresy.test.ts:209` — `targetless.players.player_2.zones.graveyard = ['inquisition-hellfire'];`
  - `src/state/intelligence-post-reveal-flow.ts:5` — `import { openNextHellfireChoice } from './inquisition-hellfire';`
- **Virtual/effect-only sites in those files:** 6
  - `src/state/inquisition-hellfire.ts:55` — `return Boolean(card && card.cardId === HELLFIRE && !card.canceled && !card.negated && !card.virtual);`
  - `src/state/inquisition-heresy.test.ts:134` — `it('spends four Conviction, leaves the opposing card in its Graveyard, and resolves a virtual replay', () => {`
  - `src/state/inquisition-heresy.test.ts:155` — `virtual: true,`
  - `src/state/inquisition-heresy.test.ts:185` — `it('skips canceled, negated, virtual, underfunded, and targetless sources', () => {`
  - `src/state/inquisition-heresy.test.ts:189` — `{ virtual: true },`
  - `src/state/inquisition-heresy.test.ts:233` — `expect(state.battle?.attacker.battleDrawPlayed.filter((card) => card.virtual)).toHaveLength(1);`

