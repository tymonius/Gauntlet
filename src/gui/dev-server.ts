#!/usr/bin/env node
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { CardID, GameState, PlayerID } from '../types';
import type { GameAction } from '../state';
import { applyGameAction, initializeGame, toPrivateGameView } from '../state';

interface GuidedOption {
  label: string;
  action: GameAction;
}

const PORT = Number(process.env.PORT ?? 5174);

const defaultDecks = {
  player_1: [
    'card-attrition',
    'card-fortifications',
    'card-valor',
    'card-conscription',
    'card-embargo',
    'p1-card-6',
    'p1-card-7',
    'p1-card-8',
  ],
  player_2: [
    'card-attrition',
    'card-fortifications',
    'card-valor',
    'card-conscription',
    'card-embargo',
    'p2-card-6',
    'p2-card-7',
    'p2-card-8',
  ],
};

function createDevGame(): GameState {
  return initializeGame({
    id: 'gui-dev-game',
    version: '0.5.6-dev',
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        deck: defaultDecks.player_1,
        territories: ['p1-territory-1', 'p1-territory-2', 'p1-territory-3'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        deck: defaultDecks.player_2,
        territories: ['p2-territory-1', 'p2-territory-2', 'p2-territory-3'],
      },
    ],
  });
}

let game = createDevGame();

function activeViewer(gameState: GameState): PlayerID {
  return gameState.priorityPlayer ?? gameState.activePlayer;
}

function playerSpace(gameState: GameState, playerId: PlayerID) {
  return gameState.board.spaces.find((space) => space.occupant === playerId);
}

function adjacentSpaces(gameState: GameState, playerId: PlayerID) {
  const current = playerSpace(gameState, playerId);
  if (!current) return [];
  return gameState.board.spaces.filter((space) => Math.abs(space.index - current.index) === 1);
}

function buildGuidedOptions(gameState: GameState): GuidedOption[] {
  const playerId = activeViewer(gameState);
  const player = gameState.players[playerId];
  const view = toPrivateGameView(gameState, playerId);
  const options: GuidedOption[] = [];

  if (gameState.pendingAssetBankDiscards?.[playerId]) {
    const pending = gameState.pendingAssetBankDiscards[playerId];
    if (pending.discardCount === 1) {
      for (const cardId of pending.options) {
        options.push({
          label: `Discard ${cardId} from Asset Bank`,
          action: { type: 'resolve_asset_bank_discard', playerId, cardIds: [cardId] },
        });
      }
    }
    return options;
  }

  if (gameState.phase === 'turn_start') {
    options.push({ label: 'Draw 1 card', action: { type: 'draw_card', playerId } });
  }

  if (gameState.phase === 'action_before_movement' || gameState.phase === 'action_after_movement') {
    for (const play of view.legalActionPlays ?? []) {
      options.push({
        label: `Play Action ${play.cardId} -> ${play.destination}`,
        action: { type: 'play_action_card', playerId, cardId: play.cardId },
      });
    }
  }

  if (gameState.phase === 'movement') {
    for (const space of adjacentSpaces(gameState, playerId)) {
      options.push({
        label: `Move to ${space.id}${space.occupant ? ` occupied by ${space.occupant}` : ''}`,
        action: { type: 'move_player', playerId, toSpaceId: space.id },
      });
    }
  }

  for (const space of gameState.board.spaces) {
    if (!space.revealed && space.controller === playerId) {
      options.push({
        label: `Reveal ${space.id}${space.territoryId ? ` (${space.territoryId})` : ''}`,
        action: { type: 'reveal_space', playerId, spaceId: space.id },
      });
    }
  }

  const battle = view.battle;
  if (battle?.legalBattlePlays) {
    for (const play of battle.legalBattlePlays) {
      if (play.action === 'commit_battle_hand_card' && play.cardId) {
        options.push({
          label: `Commit ${play.cardId} from hand`,
          action: { type: 'commit_battle_hand_card', playerId, cardId: play.cardId },
        });
      } else if (play.action === 'play_battle_draw_card' && play.cardId) {
        options.push({
          label: `Play battle-drawn ${play.cardId}`,
          action: { type: 'play_battle_draw_card', playerId, cardId: play.cardId },
        });
      } else if (play.action === 'pass_battle_hand_commit') {
        options.push({ label: 'Pass hand commitment', action: { type: 'pass_battle_hand_commit', playerId } });
      } else if (play.action === 'pass_battle_draw_play') {
        options.push({ label: 'Pass battle-draw play', action: { type: 'pass_battle_draw_play', playerId } });
      }
    }
  }

  if (gameState.battle?.stage === 'battle_draw') {
    options.push({ label: 'Draw battle cards', action: { type: 'draw_battle_cards', playerId } });
  }

  if (gameState.battle?.stage === 'dice') {
    for (const value of [1, 2, 3, 4, 5, 6]) {
      options.push({ label: `Roll ${value}`, action: { type: 'roll_battle_die', playerId, value } });
    }
  }

  if (gameState.battle?.stage === 'resolution') {
    options.push({ label: 'Resolve battle', action: { type: 'resolve_battle', playerId } });
  }

  if (gameState.phase !== 'battle' && gameState.phase !== 'game_over' && playerId === gameState.activePlayer) {
    options.push({ label: 'End turn', action: { type: 'end_turn', playerId } });
  }

  return options;
}

function publicPayload() {
  const viewer = activeViewer(game);
  return {
    game,
    viewer,
    privateView: toPrivateGameView(game, viewer),
    options: buildGuidedOptions(game),
  };
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { data += chunk; });
    request.on('end', () => resolve(data));
    request.on('error', reject);
  });
}

function sendJson(response: ServerResponse, payload: unknown, status = 200): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function sendHtml(response: ServerResponse): void {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(html);
}

function asAction(value: unknown): GameAction {
  return value as GameAction;
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gauntlet Dev GUI</title>
  <style>
    :root { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #e7e7e7; background: #111; }
    body { margin: 0; }
    main { max-width: 1400px; margin: 0 auto; padding: 24px; }
    header { display: flex; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 18px; }
    h1, h2, h3 { margin: 0; }
    button { cursor: pointer; border: 1px solid #555; background: #252525; color: #eee; border-radius: 8px; padding: 9px 12px; }
    button:hover { background: #333; }
    button.primary { border-color: #8aa4ff; }
    .grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 16px; }
    .panel { background: #181818; border: 1px solid #333; border-radius: 14px; padding: 14px; }
    .status { display: flex; gap: 8px; flex-wrap: wrap; }
    .pill { border: 1px solid #444; background: #202020; border-radius: 999px; padding: 5px 9px; font-size: 13px; }
    .board { display: flex; gap: 8px; align-items: stretch; overflow-x: auto; padding-bottom: 8px; }
    .space { min-width: 138px; border: 1px solid #444; border-radius: 12px; padding: 10px; background: #202020; }
    .space.occupied { border-color: #aab8ff; }
    .space.pending { border-color: #ffcc66; }
    .space.heartland { background: #241d1d; }
    .space-index { font-size: 12px; opacity: 0.75; }
    .space-id { font-weight: 700; margin: 4px 0; }
    .muted { opacity: 0.72; }
    .players { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .zones { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
    .zone { background: #202020; border: 1px solid #333; border-radius: 10px; padding: 8px; min-height: 52px; }
    .zone-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.75; margin-bottom: 4px; }
    .cards { font-size: 13px; line-height: 1.35; overflow-wrap: anywhere; }
    .actions { display: grid; gap: 8px; }
    .battle { display: grid; gap: 8px; }
    pre { white-space: pre-wrap; background: #111; border: 1px solid #333; border-radius: 10px; padding: 10px; max-height: 260px; overflow: auto; }
    .error { color: #ff8d8d; }
    @media (max-width: 900px) { .grid, .players { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Gauntlet Dev GUI</h1>
        <div class="muted">Browser wrapper around the current engine state API.</div>
      </div>
      <button id="reset">Reset game</button>
    </header>

    <section class="panel">
      <div id="status" class="status"></div>
    </section>

    <div class="grid" style="margin-top: 16px;">
      <section class="panel">
        <h2>Board</h2>
        <div id="board" class="board" style="margin-top: 12px;"></div>
      </section>

      <section class="panel">
        <h2>Available Choices</h2>
        <div id="actions" class="actions" style="margin-top: 12px;"></div>
        <div id="error" class="error" style="margin-top: 12px;"></div>
      </section>
    </div>

    <div class="grid" style="margin-top: 16px;">
      <section class="panel">
        <h2>Players</h2>
        <div id="players" class="players" style="margin-top: 12px;"></div>
      </section>

      <section class="panel">
        <h2>Battle / Log</h2>
        <div id="battle" class="battle" style="margin-top: 12px;"></div>
        <h3 style="margin-top: 16px;">Recent Engine Log</h3>
        <pre id="log"></pre>
      </section>
    </div>
  </main>

  <script>
    const state = { payload: null };

    const byId = (id) => document.getElementById(id);
    const list = (items) => !items || items.length === 0 ? '-' : items.join(', ');

    async function api(path, options) {
      const response = await fetch(path, options);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Request failed');
      return payload;
    }

    async function refresh() {
      state.payload = await api('/api/state');
      render();
    }

    async function applyAction(action) {
      byId('error').textContent = '';
      try {
        state.payload = await api('/api/action', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        render();
      } catch (error) {
        byId('error').textContent = error.message;
      }
    }

    async function resetGame() {
      state.payload = await api('/api/reset', { method: 'POST' });
      render();
    }

    function renderStatus(payload) {
      const game = payload.game;
      byId('status').innerHTML = [
        ['Turn', game.turn],
        ['Phase', game.phase],
        ['Active', game.activePlayer],
        ['Priority', payload.viewer],
        ['Winner', game.winner ?? '-'],
      ].map(([label, value]) => '<span class="pill"><strong>' + label + ':</strong> ' + value + '</span>').join('');
    }

    function renderBoard(payload) {
      const game = payload.game;
      byId('board').innerHTML = game.board.spaces.map((space) => {
        const classes = ['space', space.kind, space.occupant ? 'occupied' : '', space.capturePendingBy ? 'pending' : ''].filter(Boolean).join(' ');
        return '<div class="' + classes + '">' +
          '<div class="space-index">#' + space.index + ' · ' + space.kind + '</div>' +
          '<div class="space-id">' + space.id + '</div>' +
          '<div>' + (space.territoryId ?? '—') + '</div>' +
          '<div class="muted">ctrl: ' + (space.controller ?? '-') + '</div>' +
          '<div>occupant: <strong>' + (space.occupant ?? '-') + '</strong></div>' +
          (space.capturePendingBy ? '<div>pending: ' + space.capturePendingBy + '</div>' : '') +
        '</div>';
      }).join('');
    }

    function renderPlayers(payload) {
      const game = payload.game;
      byId('players').innerHTML = Object.values(game.players).map((player) => {
        return '<article class="panel">' +
          '<h3>' + player.name + ' <span class="muted">(' + player.id + ')</span></h3>' +
          '<div class="muted">occupied: ' + (player.occupiedSpaceId ?? '-') + ' · actions: ' + player.actionsRemaining + ' · movement: ' + player.movementRemaining + '</div>' +
          '<div class="zones">' +
            zone('Hand', player.zones.hand) +
            zone('Deck', [player.zones.deck.length + ' cards']) +
            zone('Discard', player.zones.discard) +
            zone('Graveyard', player.zones.graveyard) +
            zone('Asset Bank ' + player.zones.assetBank.length + '/' + player.controlledTerritories.length, player.zones.assetBank) +
            zone('Conditions', player.zones.conditions) +
            zone('Territories', player.controlledTerritories) +
          '</div>' +
        '</article>';
      }).join('');
    }

    function zone(title, items) {
      return '<div class="zone"><div class="zone-title">' + title + '</div><div class="cards">' + list(items) + '</div></div>';
    }

    function renderActions(payload) {
      const options = payload.options ?? [];
      byId('actions').innerHTML = options.length === 0
        ? '<div class="muted">No guided choices available.</div>'
        : options.map((option, index) => '<button class="primary" data-index="' + index + '">' + (index + 1) + '. ' + option.label + '</button>').join('');

      byId('actions').querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', () => applyAction(options[Number(button.dataset.index)].action));
      });
    }

    function renderBattle(payload) {
      const battle = payload.privateView.battle;
      byId('battle').innerHTML = !battle ? '<div class="muted">No active battle.</div>' :
        '<div><strong>Stage:</strong> ' + battle.stage + '</div>' +
        '<div><strong>Location:</strong> ' + battle.location + '</div>' +
        '<div><strong>Attacker:</strong> ' + battle.attacker.playerId + ' · die ' + (battle.attacker.diceRoll ?? '-') + ' · mod ' + battle.attacker.modifiers + '</div>' +
        '<div><strong>Defender:</strong> ' + battle.defender.playerId + ' · die ' + (battle.defender.diceRoll ?? '-') + ' · mod ' + battle.defender.modifiers + '</div>' +
        '<div><strong>Tie policy:</strong> ' + battle.tiePolicy + '</div>';
    }

    function renderLog(payload) {
      const log = payload.game.log ?? [];
      byId('log').textContent = log.slice(-12).map((event) => '[' + event.turn + '] ' + event.type + ': ' + event.message).join('\n') || 'No events yet.';
    }

    function render() {
      const payload = state.payload;
      renderStatus(payload);
      renderBoard(payload);
      renderPlayers(payload);
      renderActions(payload);
      renderBattle(payload);
      renderLog(payload);
    }

    byId('reset').addEventListener('click', resetGame);
    refresh().catch((error) => { byId('error').textContent = error.message; });
  </script>
</body>
</html>`;

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'GET' && request.url === '/') {
      sendHtml(response);
      return;
    }

    if (request.method === 'GET' && request.url === '/api/state') {
      sendJson(response, publicPayload());
      return;
    }

    if (request.method === 'POST' && request.url === '/api/reset') {
      game = createDevGame();
      sendJson(response, publicPayload());
      return;
    }

    if (request.method === 'POST' && request.url === '/api/action') {
      const body = JSON.parse(await readBody(request)) as { action?: unknown };
      if (!body.action) throw new Error('Missing action.');
      game = applyGameAction(game, asAction(body.action)).state;
      sendJson(response, publicPayload());
      return;
    }

    sendJson(response, { error: 'Not found.' }, 404);
  } catch (error) {
    sendJson(response, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
});

server.listen(PORT, () => {
  console.log(`Gauntlet dev GUI running at http://localhost:${PORT}`);
});
