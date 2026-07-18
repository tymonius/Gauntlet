const cards = [
  {name:'Exfiltration',cost:1,complexity:'Basic',effects:[
    ['Action','Bank Exfiltration as an Asset. After you complete or abort a Mission, you may discard Exfiltration. If you do, withdraw.'],
    ['Battle','If you lose, you may retreat one additional space.']
  ]},
  {name:'Spies',cost:2,complexity:'Advanced',effects:[
    ['Action',"Look at your opponent's hand. Draw one card, then discard one card."],
    ['Battle','Reveal Spies before the other Battle cards. Look at each face-down Battle card your opponent played. You may return your selected battle-drawn card to your battle draw and choose another card from that draw face down.'],
    ['Mission','Complete after you look at or reveal an opposing face-down Battle card before the normal reveal, then win that battle.']
  ]},
  {name:'Fog of War',cost:2,complexity:'Advanced',form:'Territory Overlay',effects:[
    ['Action','Place Fog of War as an Overlay on a revealed Territory. Remove it after the next battle there. During that battle, make each hand commitment and battle-draw selection after your opponent makes the corresponding choice, regardless of who initiated the battle.'],
    ['Battle','Reveal Fog of War before the other Battle cards. If your opponent played a card from both hand and battle draw, they choose one of those cards and return it to its source. They play no card from that source.'],
    ['Mission','Complete after your opponent plays a Battle card from both hand and battle draw in a battle involving you, then loses that battle.']
  ]},
  {name:'Disinformation',cost:2,complexity:'Advanced',effects:[
    ['Battle','If you committed Disinformation from hand, reveal it before the other Battle cards. If your opponent also committed from hand, gain advantage. Return Disinformation to your hand during cleanup.'],
    ['Mission','Complete after you win a battle in which your opponent committed a Battle card from hand and you did not.']
  ]},
  {name:'Operational Reassessment',cost:3,complexity:'Advanced',effects:[
    ['Action','Return your Active Mission to your hand, then place another Intelligence card from your hand with a Mission requirement face down as your Active Mission. It cannot be completed this turn.'],
    ['Battle','After all Battle cards are revealed, you may replace Operational Reassessment with a Battle card from your hand whose Battle effect can still resolve. If you do, put Operational Reassessment in your Graveyard and play that card face up.']
  ]},
  {name:'Intercepted Orders',cost:3,complexity:'Advanced',effects:[
    ['Action','Bank Intercepted Orders as an Asset. When your opponent draws their initial battle draw in a battle involving you, before they choose a card, you may discard Intercepted Orders. If you do, look at that draw and choose one card. They cannot play that card during this battle.'],
    ['Battle',"Reveal Intercepted Orders before the other Battle cards. Look at your opponent's battle draw and choose one card. They cannot play that card during this battle. If it was their selected card, they may choose another legal card from that draw face down."]
  ]},
  {name:'Reconnaissance',cost:3,complexity:'Advanced',effects:[
    ['Action',"Bank Reconnaissance as an Asset. When a battle you initiated begins, you may discard Reconnaissance to look at your opponent's hand. You may then withdraw before Battle cards are committed."],
    ['Battle','Reveal Reconnaissance before the other Battle cards. After the remaining Battle cards are revealed, before any of their effects resolve, you may withdraw. If you do, return all other Battle cards to their sources.'],
    ['Mission','Complete after you win a battle you did not initiate while occupying an enemy-controlled Territory.']
  ]},
  {name:'Deep Cover',cost:3,complexity:'Advanced',effects:[
    ['Action','Bank Deep Cover as an Asset. When your Active Mission would fail, you may put Deep Cover in your Graveyard. If you do, return that Mission to your hand instead.'],
    ['Battle','If an opposing effect looked at or revealed one of your face-down Battle cards before the normal reveal, gain advantage.']
  ]},
  {name:'Assassins',cost:4,complexity:'Advanced',effects:[
    ['Action',"Look at your opponent's hand. Choose one card from it and discard that card."],
    ['Battle','Reveal Assassins before the other Battle cards. If your opponent committed from hand, reveal and negate that card. Otherwise, give your opponent disadvantage during this battle.'],
    ['Mission',"Complete after you look at one or more cards in your opponent's hand outside a battle, then win a battle against that opponent in which they committed from hand."]
  ]},
  {name:'Treason',cost:4,complexity:'Advanced',effects:[
    ['Action','Bank Treason as an Asset. After all Battle cards are revealed in a battle involving you, before their effects resolve, you may discard Treason. If you do, choose one opposing Battle card. Negate it, then resolve its Battle effect as though you played it.'],
    ['Battle','Reveal Treason before the other Battle cards. After the remaining Battle cards are revealed, before their effects resolve, choose one opposing Battle card. Negate it, then resolve its Battle effect as though you played it.']
  ]},
  {name:'Subversion',cost:4,complexity:'Advanced',effects:[
    ['Action',"Bank Subversion as an Asset. When an opposing banked Asset's effect would resolve, you may put Subversion in your Graveyard. If you do, negate that effect and discard that Asset if it remains in play."],
    ['Battle','Opposing banked Assets cannot be used during this battle.'],
    ['Mission','Complete after you win a battle in which your opponent used a banked Asset and you used none.']
  ]},
  {name:'Sleeper Network',cost:5,complexity:'Advanced',unique:true,effects:[
    ['Action','Bank Sleeper Network as an Asset with one other card from your hand face down beneath it. At the end of each of your later turns, you may place one other card from your hand face down beneath it.'],
    ['Capacity','Sleeper Network can hold no more cards than the number of Territories you control. If it holds too many, immediately discard cards beneath it of your choice until it does not.'],
    ['Activate','At the start of your turn, you may put Sleeper Network in your Graveyard. If you do, reveal the cards beneath it. Play each of those cards whose Action effect can legally resolve, one at a time and in any order, without using Action opportunities. Discard the rest.'],
    ['Compromised','When an opposing effect would cause Sleeper Network to leave play, before it does, reveal the cards beneath it. You may play one of those cards whose Action effect can legally resolve without using an Action opportunity. Discard the rest.'],
    ['Other removal','If Sleeper Network leaves play for any other reason, discard all cards beneath it.']
  ]}
];

const sharedLeaderRules = [
  ['Intel','Begin at 0. Gain Intel by completing normal Missions. Spend it on Surveillance, Interference, Fieldcraft, aborting Missions, and the final Special Operation cost.'],
  ['Missions','After movement, instead of an Action card, start, complete, or abort one eligible face-down Mission. Completing adds 1 Operation Progress and Intel equal to the card value.'],
  ['Special Operation','When Progress exceeds opposing controlled Territories and you have no Active Mission, start an eligible Mission card as the Special Operation. Complete its requirement later and pay the final Intel cost to win.']
];
const leaders = [
  {name:'Ranger',image:'../images/leader-cards/ranger.jpg',motto:'Know the land before the battle begins.',ability:['Fieldcraft','Once per turn, when a revealed Territory effect would affect you, your movement, or a battle involving you, spend 1 Intel to ignore that Territory effect until end of turn.']},
  {name:'Spymaster',image:'../images/leader-cards/spymaster.jpg',motto:'Information never rests. Momentum is the weapon.',ability:['Mission Control','Once per turn, after completing a normal Mission, immediately start a new Mission from hand without using the Action opportunity. It cannot complete that turn and cannot be the Special Operation.']}
];

function escapeHtml(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
function renderFactionCard(card){
  const effects=card.effects.map(([label,text])=>`<div class="effect"><span class="effect-label">${escapeHtml(label)}:</span><span class="effect-text"> ${escapeHtml(text)}</span></div>`).join('');
  const meta=['Intelligence',card.complexity,card.form,card.unique?'Unique':''].filter(Boolean).join(' • ');
  const slug=card.name.toLowerCase().replace(/[^a-z0-9]+/g,"-");
  return `<article class="print-card faction-card fit-card ${slug}"><div class="card-header"><div class="card-name">${escapeHtml(card.name)}</div><div class="card-cost">${card.cost}</div></div><div class="card-meta">${escapeHtml(meta)}</div><div class="fit-content">${effects}</div></article>`;
}
function renderLeaderCard(leader){
  const rules=[sharedLeaderRules[0],sharedLeaderRules[1],leader.ability,sharedLeaderRules[2]].map(([name,text])=>`<div class="leader-rule"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(text)}</div>`).join('');
  return `<article class="print-card leader-card"><div class="leader-art"><img src="${leader.image}" alt="${escapeHtml(leader.name)}"><div class="leader-faction">Intelligence Leader</div><div class="leader-title">${escapeHtml(leader.name.toUpperCase())}</div></div><div class="leader-content"><div class="leader-motto">${escapeHtml(leader.motto)}</div>${rules}</div></article>`;
}
function renderMissionReference(){
  return `<article class="print-card reference-card fit-card"><div class="reference-heading">Mission Reference</div><div class="fit-content">
    <div class="reference-block"><strong>Eligible:</strong> Only an Intelligence card with a printed Mission requirement.</div>
    <div class="reference-block"><strong>Start:</strong> After movement, instead of an Action card, place it face down as the Active Mission. Only one Active Mission; it cannot complete that turn.</div>
    <div class="reference-block"><strong>Complete:</strong> After movement, reveal a satisfied Active Mission instead of an Action card. Gain 1 Operation Progress and Intel equal to its value; discard it.</div>
    <div class="reference-block"><strong>Abort:</strong> After movement, reveal it and spend Intel equal to its value; discard it. Aborting is not failure.</div>
    <div class="reference-block"><strong>Fail:</strong> Opponent disruption, compromised game state, or a specific effect. Reveal it and put it in your Graveyard.</div>
    <div class="reference-block"><strong>Special Operation:</strong> Progress must exceed opposing controlled Territories. Use an eligible Mission card, maintain readiness, satisfy its requirement later, then pay Territories in the Gauntlet minus card value, minimum 1 Intel, to win.</div>
  </div><div class="cut-note">Supplemental reference — no deckbuilding value</div></article>`;
}
function renderOperationsReference(){
  return `<article class="print-card reference-card fit-card"><div class="reference-heading">Operations Reference</div><div class="fit-content">
    <div class="reference-block"><strong>Commitment order:</strong> Attacker commits from hand, then defender. Attacker selects from battle draw, then defender.</div>
    <div class="reference-block"><strong>Surveillance — 1 Intel:</strong> Once per battle, when the opponent commits or selects a face-down Battle card, look at it before the battle proceeds.</div>
    <div class="reference-block"><strong>Interference — +2 Intel:</strong> After Surveillance, remove that card from the battle. The opponent may choose another legal card from the same source.</div>
    <div class="reference-block"><strong>Hand source:</strong> Return the commitment to hand.</div>
    <div class="reference-block"><strong>Battle-draw source:</strong> Return the card to that draw; it is no longer selected.</div>
    <div class="reference-block"><strong>No replacement:</strong> The opponent plays no card from that source.</div>
    <div class="reference-block"><strong>Reminder:</strong> Interference disrupts rather than destroys. It does not discard or negate the card and creates no additional response window.</div>
  </div><div class="cut-note">Supplemental reference — no deckbuilding value</div></article>`;
}
function numbers(start,end){return Array.from({length:end-start+1},(_,i)=>start+i).map(n=>`<span>${n}</span>`).join('');}
function renderTracker(){
  return `<article class="print-card tracker-card"><div class="tracker-heading">Intelligence Resources</div><div class="eye-symbol">◉</div>
    <div class="track-label">Intel</div><div class="number-track intel-track">${numbers(0,20)}</div>
    <div class="track-label progress-label">Operation Progress</div><div class="number-track progress-track">${numbers(0,8)}</div>
    <div class="tracker-note">Place one marker on each track. Printed ranges are not maximums; use a die, note, or additional marker for larger values.</div>
    <div class="marker-row"><span class="cut-marker">I</span><span class="cut-marker">P</span><span class="marker-note">Cut-out markers</span></div>
    <div class="cut-note">Supplemental tracker — no deckbuilding value</div></article>`;
}
function renderSheets(){
  const items=[...cards.map(renderFactionCard),...leaders.map(renderLeaderCard),renderMissionReference(),renderOperationsReference(),renderTracker()];
  const root=document.getElementById('sheets');
  for(let i=0;i<Math.ceil(items.length/9);i++){
    const page=items.slice(i*9,i*9+9); while(page.length<9) page.push('<div class="print-card placeholder-card"></div>');
    root.insertAdjacentHTML('beforeend',`<section class="sheet">${page.join('')}</section>`);
  }
}
renderSheets();
