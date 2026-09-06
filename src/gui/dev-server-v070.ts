#!/usr/bin/env node
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { URL } from 'node:url';
import type { PlayerId } from '../v070/rules';
import type { V070RecordedAction } from '../v070/replay';
import type { V070GameState } from '../v070/engine';
import {
  applyV070DevRecordedAction,
  createV070DevGame,
  defaultV070DevGameOptions,
  v070DevPlayerPayload,
  v070DevStarterDefinitions,
  type V070DevGameOptions,
} from './v070-dev-session';

const PORT = Number(process.env.PORT ?? 5175);

let options = defaultV070DevGameOptions();
let game = createV070DevGame(options);

function json(
  res: ServerResponse,
  body: unknown,
  status = 200,
): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function text(
  res: ServerResponse,
  body: string,
  contentType = 'text/html; charset=utf-8',
): void {
  res.writeHead(200, {
    'content-type': contentType,
    'cache-control': 'no-store',
  });
  res.end(body);
}

function readBody(
  req: IncomingMessage,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function viewerFromUrl(url: URL): PlayerId {
  const value = url.searchParams.get('viewer') ?? 'A';
  if (value !== 'A' && value !== 'B') {
    throw new Error('viewer must be A or B.');
  }
  return value;
}

function parseRecordedAction(
  value: unknown,
): V070RecordedAction {
  if (!isRecord(value)
    || !['setup', 'turn', 'battle'].includes(String(value.domain))
    || !isRecord(value.action)
    || typeof value.action.type !== 'string') {
    throw new Error(
      'Action body must contain domain=setup|turn|battle and an action object with a string type.',
    );
  }
  return value as unknown as V070RecordedAction;
}

function parseOptions(
  value: unknown,
): V070DevGameOptions {
  if (!isRecord(value)
    || typeof value.seed !== 'string'
    || typeof value.aStarterId !== 'string'
    || typeof value.bStarterId !== 'string') {
    throw new Error(
      'Reset requires seed, aStarterId, and bStarterId strings.',
    );
  }
  return {
    seed: value.seed,
    aStarterId: value.aStarterId,
    bStarterId: value.bStarterId,
  };
}

function playerPayload(
  state: V070GameState,
  viewer: PlayerId,
) {
  const payload = v070DevPlayerPayload(state, viewer);
  return {
    ...payload,
    options: structuredClone(options),
  };
}

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gauntlet v0.7.0 Dev GUI</title>
<style>
:root{font-family:system-ui,sans-serif;color:#eee;background:#111}
*{box-sizing:border-box}body{margin:0}main{max-width:1500px;margin:auto;padding:20px}
h1,h2{margin-top:0}.grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:16px}
.panel{background:#191919;border:1px solid #333;border-radius:12px;padding:14px;margin-bottom:16px}
.controls{display:flex;gap:8px;flex-wrap:wrap;align-items:end}
label{display:grid;gap:4px;font-size:.85rem;color:#bbb}
select,input,textarea,button{font:inherit;color:#eee;background:#242424;border:1px solid #555;border-radius:7px;padding:8px}
button{cursor:pointer}button:hover{background:#303030}
textarea{width:100%;min-height:150px;font-family:ui-monospace,monospace}
.status{display:flex;gap:7px;flex-wrap:wrap}.pill{border:1px solid #444;border-radius:999px;padding:5px 9px}
.board{display:flex;gap:7px;overflow:auto}.space{min-width:125px;border:1px solid #444;border-radius:9px;padding:9px}
.occupied{border-color:#aaa}.muted{opacity:.68}.error{color:#ff9d9d;white-space:pre-wrap}
pre{white-space:pre-wrap;overflow:auto;max-height:420px;background:#111;border:1px solid #333;border-radius:8px;padding:10px}
#events{max-height:260px}@media(max-width:900px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<main>
<h1>Gauntlet v0.7.0 Dev GUI</h1>
<p class="muted">Promoted reducer surface. Unsupported current battle effects halt explicitly.</p>

<section class="panel">
<div class="controls">
<label>Viewer<select id="viewer"><option>A</option><option>B</option></select></label>
<label>Seed<input id="seed"></label>
<label>Player A starter<select id="starterA"></select></label>
<label>Player B starter<select id="starterB"></select></label>
<button id="reset">Reset game</button>
<button id="refresh">Refresh</button>
<button id="admin">Show admin state</button>
</div>
</section>

<section class="panel"><div id="status" class="status"></div></section>

<div class="grid">
<div>
<section class="panel"><h2>Board</h2><div id="board" class="board"></div></section>
<section class="panel"><h2>Player-scoped view</h2><pre id="view"></pre></section>
</div>
<aside>
<section class="panel">
<h2>Reducer action</h2>
<div class="controls"><label>Domain<select id="domain"><option>setup</option><option>turn</option><option>battle</option></select></label></div>
<textarea id="action">{"type":"choose_opening_discard","playerId":"A","cardInstanceId":"..."}</textarea>
<button id="apply">Apply action</button>
<div id="error" class="error"></div>
</section>
<section class="panel"><h2>Recent visible events</h2><pre id="events"></pre></section>
</aside>
</div>
</main>
<script>
const $=id=>document.getElementById(id);
let starters=[];
let payload=null;

async function api(path,options){
  const response=await fetch(path,options);
  const body=await response.json();
  if(!response.ok) throw Error(body.error||'Request failed');
  return body;
}
function esc(value){
  return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
}
function optionMarkup(deck){
  return '<option value="'+esc(deck.id)+'">'+esc(deck.name)+' · '+esc(deck.factionId)+'/'+esc(deck.leaderId)+'</option>';
}
async function loadStarters(){
  starters=await api('/api/starters');
  $('starterA').innerHTML=starters.map(optionMarkup).join('');
  $('starterB').innerHTML=starters.map(optionMarkup).join('');
}
async function refresh(){
  const viewer=$('viewer').value;
  payload=await api('/api/state?viewer='+viewer);
  render();
}
function render(){
  const g=payload.view;
  $('seed').value=payload.options.seed;
  $('starterA').value=payload.options.aStarterId;
  $('starterB').value=payload.options.bStarterId;
  const battleStage=g.battleRuntime?.stage||'-';
  const unsupported=g.battleRuntime?.unsupportedEffects?.length||0;
  $('status').innerHTML=[
    ['Rules',g.rulesVersion],['Stage',g.stage],['Turn',g.turnNumber],
    ['Active',g.activePlayer||'-'],['Phase',g.turnState?.phase||'-'],
    ['Battle',battleStage],['Unsupported',unsupported]
  ].map(x=>'<span class="pill"><b>'+esc(x[0])+':</b> '+esc(x[1])+'</span>').join('');
  $('board').innerHTML=g.board.map(space=>
    '<div class="space '+(space.occupant?'occupied':'')+'"><b>'+esc(space.position)+' · '+esc(space.territoryId)+'</b><br>'+
    '<span class="muted">control '+esc(space.controller)+' · occupant '+esc(space.occupant||'-')+'</span></div>'
  ).join('');
  $('view').textContent=JSON.stringify(g,null,2);
  $('events').textContent=JSON.stringify(g.events.slice(-20),null,2);
}
$('viewer').onchange=()=>refresh().catch(showError);
$('refresh').onclick=()=>refresh().catch(showError);
$('reset').onclick=async()=>{
  try{
    clearError();
    payload=await api('/api/reset?viewer='+$('viewer').value,{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({
        seed:$('seed').value,
        aStarterId:$('starterA').value,
        bStarterId:$('starterB').value
      })
    });
    render();
  }catch(error){showError(error)}
};
$('apply').onclick=async()=>{
  try{
    clearError();
    const action=JSON.parse($('action').value);
    payload=await api('/api/action?viewer='+$('viewer').value,{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({domain:$('domain').value,action})
    });
    render();
  }catch(error){showError(error)}
};
$('admin').onclick=async()=>{
  try{
    clearError();
    const state=await api('/api/admin-state');
    const popup=window.open('','gauntlet-v070-admin');
    if(!popup) throw Error('Popup blocked.');
    popup.document.write('<pre>'+esc(JSON.stringify(state,null,2))+'</pre>');
    popup.document.close();
  }catch(error){showError(error)}
};
function showError(error){$('error').textContent=error instanceof Error?error.message:String(error)}
function clearError(){$('error').textContent=''}
loadStarters().then(refresh).catch(showError);
</script>
</body>
</html>`;

createServer(async (req, res) => {
  try {
    const url = new URL(
      req.url ?? '/',
      `http://${req.headers.host ?? 'localhost'}`,
    );

    if (req.method === 'GET' && url.pathname === '/') {
      text(res, html);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/starters') {
      json(res, v070DevStarterDefinitions());
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/state') {
      json(res, playerPayload(game, viewerFromUrl(url)));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/admin-state') {
      json(res, game);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/reset') {
      options = parseOptions(JSON.parse(await readBody(req)));
      game = createV070DevGame(options);
      json(res, playerPayload(game, viewerFromUrl(url)));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/action') {
      const recorded = parseRecordedAction(
        JSON.parse(await readBody(req)),
      );
      game = applyV070DevRecordedAction(game, recorded);
      json(res, playerPayload(game, viewerFromUrl(url)));
      return;
    }

    json(res, { error: 'Not found.' }, 404);
  } catch (error) {
    json(
      res,
      { error: error instanceof Error ? error.message : String(error) },
      400,
    );
  }
}).listen(PORT, () => {
  console.log(
    `Gauntlet v0.7.0 dev GUI running at http://localhost:${PORT}`,
  );
});

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value);
}
