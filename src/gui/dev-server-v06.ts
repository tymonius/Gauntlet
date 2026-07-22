#!/usr/bin/env node
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { GameState } from '../types';
import type { StateAction } from '../state';
import { applyGameAction, initializeGame, toPrivateGameView } from '../state';
import { activeViewer, buildGuidedOptions } from '../dev/guided-options';

const PORT = Number(process.env.PORT ?? 5174);

function createDevGame(): GameState {
  return initializeGame({
    id: 'gui-dev-game', version: '0.5.6-dev', shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },
      { id: 'player_2', name: 'Player Two', factionId: 'military', leaderName: 'Commandant', deck: ['military-rearguard','military-unbroken-ranks','military-give-chase','military-field-command','card-attrition','card-valor','card-conscription','card-embargo'], territories: ['p2-territory-1','p2-territory-2','p2-territory-3'] },
    ],
  });
}

let game = createDevGame();
const payload = () => ({ game, viewer: activeViewer(game), privateView: toPrivateGameView(game, activeViewer(game)), options: buildGuidedOptions(game) });
const json = (res: ServerResponse, body: unknown, status = 200) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
const readBody = (req: IncomingMessage) => new Promise<string>((resolve, reject) => { let data = ''; req.setEncoding('utf8'); req.on('data', (chunk) => { data += chunk; }); req.on('end', () => resolve(data)); req.on('error', reject); });

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gauntlet v0.6 Dev GUI</title><style>
:root{font-family:system-ui;color:#eee;background:#111}body{margin:0}main{max-width:1400px;margin:auto;padding:24px}.grid{display:grid;grid-template-columns:1.2fr .8fr;gap:16px}.panel{background:#191919;border:1px solid #333;border-radius:14px;padding:14px;margin-bottom:16px}.status{display:flex;gap:8px;flex-wrap:wrap}.pill{padding:5px 9px;border:1px solid #444;border-radius:999px}.board{display:flex;gap:8px;overflow:auto}.space{min-width:130px;padding:10px;border:1px solid #444;border-radius:10px}.occupied{border-color:#9fb1ff}.actions{display:grid;gap:8px}button{padding:10px;text-align:left;background:#252525;color:#eee;border:1px solid #555;border-radius:8px;cursor:pointer}button:hover{background:#333}.cardtext{white-space:pre-wrap;line-height:1.45;background:#111;padding:12px;border-radius:10px;border:1px solid #444}.muted{opacity:.7}.error{color:#ff9999}pre{white-space:pre-wrap;max-height:260px;overflow:auto}@media(max-width:900px){.grid{grid-template-columns:1fr}}
</style></head><body><main><h1>Gauntlet v0.6 Dev GUI</h1><div class="panel"><div id="status" class="status"></div></div><div class="grid"><div><section class="panel"><h2>Board</h2><div id="board" class="board"></div></section><section class="panel"><h2>Battle</h2><div id="battle"></div></section></div><aside><section class="panel"><h2>Current choice</h2><div id="cardtext" class="cardtext muted">No pending card choice.</div><div id="actions" class="actions" style="margin-top:12px"></div><div id="error" class="error"></div></section><section class="panel"><button id="reset">Reset game</button></section></aside></div><section class="panel"><h2>Players</h2><pre id="players"></pre></section><section class="panel"><h2>Log</h2><pre id="log"></pre></section></main><script>
const $=id=>document.getElementById(id);let state;
async function api(path,options){const r=await fetch(path,options);const p=await r.json();if(!r.ok)throw Error(p.error||'Request failed');return p}
async function act(action){try{$('error').textContent='';state=await api('/api/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action})});render()}catch(e){$('error').textContent=e.message}}
function render(){const g=state.game;$('status').innerHTML=[['Turn',g.turn],['Phase',g.phase],['Active',g.activePlayer],['Priority',state.viewer],['Pending',g.pendingMilitaryTimingChoice?.kind||g.pendingMilitaryChoice?.kind||'-']].map(x=>'<span class="pill"><b>'+x[0]+':</b> '+x[1]+'</span>').join('');$('board').innerHTML=g.board.spaces.map(s=>'<div class="space '+(s.occupant?'occupied':'')+'"><b>'+s.index+' · '+s.id+'</b><br>'+(s.territoryId||s.kind)+'<br><span class="muted">ctrl '+(s.controller||'-')+' · '+(s.occupant||'-')+'</span></div>').join('');const b=state.privateView.battle;$('battle').textContent=b?'Stage '+b.stage+' · '+b.attacker.playerId+' vs '+b.defender.playerId+' · '+b.location:'No active battle.';const opts=state.options||[];$('cardtext').textContent=opts.find(o=>o.cardText)?.cardText||'No pending card choice.';$('cardtext').className='cardtext'+(opts.some(o=>o.cardText)?'':' muted');$('actions').innerHTML=opts.length?opts.map((o,i)=>'<button data-i="'+i+'">'+(i+1)+'. '+o.label+'</button>').join(''):'<div class="muted">No guided choices.</div>';$('actions').querySelectorAll('button').forEach(btn=>btn.onclick=()=>act(opts[Number(btn.dataset.i)].action));$('players').textContent=Object.values(g.players).map(p=>p.name+' ('+p.id+')\n  hand: '+p.zones.hand.join(', ')+'\n  assets: '+p.zones.assetBank.join(', ')+'\n  discard: '+p.zones.discard.join(', ')+'\n  graveyard: '+p.zones.graveyard.join(', ')).join('\n\n');$('log').textContent=(g.log||[]).slice(-15).map(e=>'['+e.turn+'] '+e.message).join('\n')}
$('reset').onclick=async()=>{state=await api('/api/reset',{method:'POST'});render()};api('/api/state').then(p=>{state=p;render()}).catch(e=>$('error').textContent=e.message);
</script></body></html>`;

createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); return; }
    if (req.method === 'GET' && req.url === '/api/state') { json(res, payload()); return; }
    if (req.method === 'POST' && req.url === '/api/reset') { game = createDevGame(); json(res, payload()); return; }
    if (req.method === 'POST' && req.url === '/api/action') { const body = JSON.parse(await readBody(req)) as { action?: StateAction }; if (!body.action) throw new Error('Missing action.'); game = applyGameAction(game, body.action).state; json(res, payload()); return; }
    json(res, { error: 'Not found.' }, 404);
  } catch (error) { json(res, { error: error instanceof Error ? error.message : String(error) }, 400); }
}).listen(PORT, () => console.log(`Gauntlet v0.6 dev GUI running at http://localhost:${PORT}`));
