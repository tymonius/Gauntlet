import { cardCanBePlayedAt } from '../cards';
import type { BattleParticipantState, BattlePlayedCard, CardID, GameEvent, GameState, PendingMilitaryTimingChoice, PlayerID } from '../types';
import { drawFromDeck } from './draw';

const BROTHERS = 'military-brothers-in-arms';
const RESERVE = 'military-reserve-force';
const HOLD = 'military-hold-the-line';
const SHOCK = 'military-shock-and-awe';

function log(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({ id: `${game.id}-event-${game.log.length + 1}`, turn: game.turn, actor, type, message, payload, visibility: 'public' } satisfies GameEvent);
}

function participant(game: GameState, playerId: PlayerID): BattleParticipantState {
  if (!game.battle) throw new Error('There is no active battle.');
  if (game.battle.attacker.playerId === playerId) return game.battle.attacker;
  if (game.battle.defender.playerId === playerId) return game.battle.defender;
  throw new Error(`${playerId} is not participating in the battle.`);
}

function opponentId(game: GameState, playerId: PlayerID): PlayerID {
  if (!game.battle) throw new Error('There is no active battle.');
  return game.battle.attacker.playerId === playerId ? game.battle.defender.playerId : game.battle.attacker.playerId;
}

function queue(game: GameState, choice: PendingMilitaryTimingChoice): void {
  game.militaryTimingChoiceQueue ??= [];
  game.militaryTimingChoiceQueue.push(choice);
}

function activateNext(game: GameState): void {
  game.pendingMilitaryTimingChoice = game.militaryTimingChoiceQueue?.shift();
  if (game.pendingMilitaryTimingChoice) game.priorityPlayer = game.pendingMilitaryTimingChoice.playerId;
  if (game.militaryTimingChoiceQueue?.length === 0) game.militaryTimingChoiceQueue = undefined;
}

function consumeAsset(game: GameState, playerId: PlayerID, cardId: CardID): void {
  const player = game.players[playerId];
  const index = player.zones.assetBank.indexOf(cardId);
  if (index < 0) throw new Error(`${cardId} is not banked.`);
  player.zones.assetBank.splice(index, 1);
  player.zones.graveyard.push(cardId);
}

function cardWasPlayed(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  const side = participant(game, playerId);
  return side.handCommit?.cardId === cardId || side.battleDrawPlayed.some((card) => card.cardId === cardId);
}

function playableBattleCards(cards: CardID[], origin: 'hand' | 'battle_draw'): CardID[] {
  const timing = origin === 'hand' ? 'battle_hand_commit' : 'battle_draw_play';
  return cards.filter((cardId) => cardCanBePlayedAt(cardId, timing, origin));
}

export function openMilitaryPrecommitWindows(game: GameState): void {
  if (!game.battle || game.battle.stage !== 'hand_commit') return;
  const location = game.board.spaces.find((space) => space.id === game.battle?.location);
  for (const playerId of [game.battle.attacker.playerId, game.battle.defender.playerId]) {
    const player = game.players[playerId];
    if (player.factionId !== 'military') continue;
    if (player.zones.assetBank.includes(BROTHERS)) {
      queue(game, { kind: 'brothers_in_arms_precommit', playerId, sourceCardId: BROTHERS, options: ['use', 'pass'] });
    }
    if (playerId === game.battle.defender.playerId && location?.kind === 'territory' && location.controller === playerId && player.zones.assetBank.includes(HOLD)) {
      queue(game, { kind: 'military_asset_precommit', playerId, sourceCardId: HOLD, options: ['use', 'pass'] });
    }
    if (playerId === game.battle.attacker.playerId && location?.kind === 'territory' && location.controller === opponentId(game, playerId) && player.zones.assetBank.includes(SHOCK)) {
      queue(game, { kind: 'military_asset_precommit', playerId, sourceCardId: SHOCK, options: ['use', 'pass'] });
    }
  }
  activateNext(game);
}

export function maybeOpenBrothersSelection(game: GameState): void {
  if (!game.battle || game.battle.stage !== 'battle_play_selection') return;
  for (const playerId of [game.battle.attacker.playerId, game.battle.defender.playerId]) {
    if (!game.battle.effectsResolved.includes(`active:${BROTHERS}:${playerId}`)) continue;
    if (game.battle.effectsResolved.includes(`selected:${BROTHERS}:${playerId}`)) continue;
    const side = participant(game, playerId);
    queue(game, {
      kind: 'brothers_in_arms_selection', playerId, sourceCardId: BROTHERS,
      handOptions: playableBattleCards(game.players[playerId].zones.hand, 'hand'),
      battleHandOptions: playableBattleCards(side.battleDraw, 'battle_draw'), mayChooseNeither: true,
    });
  }
  if (!game.pendingMilitaryTimingChoice) activateNext(game);
}

function addAfterRevealCard(game: GameState, playerId: PlayerID, cardId: CardID, origin: 'hand' | 'battle_draw'): void {
  const side = participant(game, playerId);
  const played: BattlePlayedCard = { cardId, owner: playerId, origin, faceDown: false, canceled: false };
  side.battleDrawPlayed.push(played);
}

export function openMilitaryAfterRevealWindows(game: GameState): void {
  if (!game.battle || game.battle.stage !== 'dice') return;
  if (game.battle.effectsResolved.includes('military_after_reveal_windows_opened')) return;
  game.battle.effectsResolved.push('military_after_reveal_windows_opened');

  for (const playerId of [game.battle.attacker.playerId, game.battle.defender.playerId]) {
    const player = game.players[playerId];
    if (player.factionId !== 'military') continue;
    const side = participant(game, playerId);
    const stored = player.military?.storedCards[RESERVE];
    const reservePlayed = side.battleDrawPlayed.some((card) => card.cardId === RESERVE);
    if (stored || reservePlayed) {
      queue(game, {
        kind: 'reserve_force_after_reveal', playerId, sourceCardId: RESERVE, storedCard: stored,
        handOptions: playableBattleCards(player.zones.hand, 'hand'),
        options: [stored ? 'deploy_stored' : undefined, reservePlayed ? 'replace_from_hand' : undefined, 'pass'].filter(Boolean) as Array<'deploy_stored' | 'replace_from_hand' | 'pass'>,
      });
    }

    const location = game.board.spaces.find((space) => space.id === game.battle?.location);
    const holdActive = game.battle.effectsResolved.includes(`active:${HOLD}:${playerId}`) || cardWasPlayed(game, playerId, HOLD);
    if (holdActive && playerId === game.battle.defender.playerId && location?.kind === 'territory' && location.controller === playerId) {
      const draw = drawFromDeck(player, { count: 2 });
      side.battleDraw.push(...draw.drawnCards);
      queue(game, { kind: 'hold_the_line_after_reveal', playerId, sourceCardId: HOLD, drawnCards: draw.drawnCards, options: playableBattleCards(draw.drawnCards, 'battle_draw'), mayPass: true });
      game.battle.effectsResolved.push(`hold_capture_if_lost:${playerId}`);
    }

    const shockActive = game.battle.effectsResolved.includes(`active:${SHOCK}:${playerId}`) || cardWasPlayed(game, playerId, SHOCK);
    if (shockActive && playerId === game.battle.attacker.playerId && location?.kind === 'territory' && location.controller === opponentId(game, playerId)) {
      queue(game, { kind: 'shock_and_awe_after_reveal', playerId, sourceCardId: SHOCK, handOptions: playableBattleCards(player.zones.hand, 'hand'), mayPass: true });
    }
  }
  activateNext(game);
}

export function resolveMilitaryTimingChoice(game: GameState, playerId: PlayerID, choice: string, cardId?: CardID, secondaryCardId?: CardID): void {
  const pending = game.pendingMilitaryTimingChoice;
  if (!pending || pending.playerId !== playerId) throw new Error(`${playerId} has no pending Military timing choice.`);
  if (!game.battle) throw new Error('The battle ended before the Military timing choice resolved.');
  const player = game.players[playerId];
  const side = participant(game, playerId);

  if (pending.kind === 'brothers_in_arms_precommit') {
    if (!pending.options.includes(choice as 'use' | 'pass')) throw new Error('Choose use or pass.');
    if (choice === 'use') {
      consumeAsset(game, playerId, BROTHERS);
      side.passedHandCommit = true;
      game.battle.effectsResolved.push(`active:${BROTHERS}:${playerId}`);
      log(game, playerId, 'military_brothers_delayed', `${player.name} delayed their hand commitment with Brothers in Arms.`);
    }
  } else if (pending.kind === 'military_asset_precommit') {
    if (!pending.options.includes(choice as 'use' | 'pass')) throw new Error('Choose use or pass.');
    if (choice === 'use') {
      consumeAsset(game, playerId, pending.sourceCardId);
      game.battle.effectsResolved.push(`active:${pending.sourceCardId}:${playerId}`);
      log(game, playerId, 'military_asset_activated', `${player.name} activated ${pending.sourceCardId}.`, { cardId: pending.sourceCardId });
    }
  } else if (pending.kind === 'brothers_in_arms_selection') {
    if (choice !== 'neither') {
      if (!cardId || !secondaryCardId || !pending.handOptions.includes(cardId) || !pending.battleHandOptions.includes(secondaryCardId)) throw new Error('Brothers in Arms requires one eligible hand card and one eligible Battle Hand card, or neither.');
      player.zones.hand.splice(player.zones.hand.indexOf(cardId), 1);
      side.battleDraw.splice(side.battleDraw.indexOf(secondaryCardId), 1);
      side.handCommit = { cardId, owner: playerId, origin: 'hand', faceDown: false, canceled: false };
      addAfterRevealCard(game, playerId, secondaryCardId, 'battle_draw');
    }
    side.passedBattleDrawPlay = true;
    game.battle.effectsResolved.push(`selected:${BROTHERS}:${playerId}`);
    log(game, playerId, 'military_brothers_resolved', `${player.name} resolved Brothers in Arms.`);
  } else if (pending.kind === 'reserve_force_after_reveal') {
    if (!pending.options.includes(choice as 'deploy_stored' | 'replace_from_hand' | 'pass')) throw new Error('That Reserve Force option is not legal.');
    if (choice === 'deploy_stored') {
      if (!pending.storedCard) throw new Error('Reserve Force has no stored card.');
      consumeAsset(game, playerId, RESERVE);
      delete player.military?.storedCards[RESERVE];
      addAfterRevealCard(game, playerId, pending.storedCard, 'hand');
    } else if (choice === 'replace_from_hand') {
      if (!cardId || !pending.handOptions.includes(cardId)) throw new Error('Choose an eligible card from hand.');
      player.zones.hand.splice(player.zones.hand.indexOf(cardId), 1);
      const reserveIndex = side.battleDrawPlayed.findIndex((card) => card.cardId === RESERVE);
      if (reserveIndex < 0) throw new Error('Reserve Force is not among the played cards.');
      side.battleDrawPlayed.splice(reserveIndex, 1);
      player.zones.graveyard.push(RESERVE);
      addAfterRevealCard(game, playerId, cardId, 'hand');
    }
    log(game, playerId, 'military_reserve_resolved', `${player.name} resolved Reserve Force.`);
  } else if (pending.kind === 'hold_the_line_after_reveal') {
    if (choice !== 'pass') {
      const selected = cardId ?? choice;
      if (!pending.options.includes(selected)) throw new Error('Choose an eligible Hold the Line card or pass.');
      side.battleDraw.splice(side.battleDraw.indexOf(selected), 1);
      addAfterRevealCard(game, playerId, selected, 'battle_draw');
    }
    log(game, playerId, 'military_hold_the_line_resolved', `${player.name} resolved Hold the Line.`);
  } else if (pending.kind === 'shock_and_awe_after_reveal') {
    if (choice !== 'pass') {
      const selected = cardId ?? choice;
      if (!pending.handOptions.includes(selected)) throw new Error('Choose an eligible hand card or pass.');
      player.zones.hand.splice(player.zones.hand.indexOf(selected), 1);
      addAfterRevealCard(game, playerId, selected, 'hand');
    }
    log(game, playerId, 'military_shock_extra_card', `${player.name} resolved Shock and Awe's additional card.`);
  }

  game.pendingMilitaryTimingChoice = undefined;
  activateNext(game);
  if (!game.pendingMilitaryTimingChoice) game.priorityPlayer = game.activePlayer;
}
