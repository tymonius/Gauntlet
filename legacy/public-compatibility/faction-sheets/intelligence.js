const cards = [
  {name:'Exfiltration',cost:1,complexity:'Basic',effects:[
    ['Action','Bank this as an Asset. After you complete or abort a Mission, you may discard this. If you do, withdraw.'],
    ['Battle','If you lose, you may retreat one additional position.']
  ]},
  {name:'Spies',cost:2,complexity:'Advanced',effects:[
    ['Action',"Look at your opponent's hand. Draw one card, then discard one card."],
    ['Battle','Reveal this before the other cards in the battle. Look at each opposing face-down card used in the battle. You may return your selected card to your Battle Hand and choose another eligible card from that Battle Hand face down.'],
    ['Mission','Complete after you look at or reveal an opposing face-down card before the normal battle reveal, then win that battle.']
  ]},
  {name:'Fog of War',cost:2,complexity:'Advanced',form:'Territory Overlay',effects:[
    ['Action','Place this as an Overlay on a Territory. Remove it after the next battle fought there. During that battle, make each hand commitment and Battle Hand choice after your opponent makes the corresponding choice, regardless of who initiated the battle.'],
    ['Battle','Reveal this before the other cards in the battle. If your opponent used one card from hand and one card from their Battle Hand, they choose one of those cards and return it to its source. They use no card from that source.'],
    ['Mission','Complete after your opponent uses a card from both hand and Battle Hand in a battle involving you, then loses that battle.']
  ]},
  {name:'Disinformation',cost:2,complexity:'Advanced',effects:[
    ['Battle','If you committed this from hand, reveal it before the other cards in the battle. If your opponent also committed a card from hand, gain advantage. Return this to your hand during cleanup.'],
    ['Mission','Complete after you win a battle in which your opponent committed a card from hand and you did not.']
  ]},
  {name:'Operational Reassessment',cost:3,complexity:'Advanced',effects:[
    ['Action','Return your Active Mission to your hand, then place another eligible Intelligence card from your hand face down as your Active Mission. It cannot complete this turn.'],
    ['Battle','After all cards in the battle are revealed, you may replace this with a card from your hand whose Battle effect can still resolve. If you do, put this in your Graveyard, reveal the replacement card face up for its Battle effect, and put that card in your Graveyard during cleanup.']
  ]},
  {name:'Intercepted Orders',cost:3,complexity:'Advanced',effects:[
    ['Action','Bank this as an Asset. When your opponent forms their initial Battle Hand in a battle involving you, before they choose a card, you may discard this. If you do, look at that Battle Hand and choose one card. They cannot choose that card during this battle.'],
    ['Battle',"Reveal this before the other cards in the battle. Look at your opponent's Battle Hand and choose one card. They cannot use that card during this battle. If it was their selected card, they may choose another eligible card from that Battle Hand face down."]
  ]},
  {name:'Reconnaissance',cost:3,complexity:'Advanced',effects:[
    ['Action',"Bank this as an Asset. When a battle you initiated begins, you may discard this to look at your opponent's hand. You may then withdraw before cards are committed from hand."],
    ['Battle','Reveal this before the other cards in the battle. After the remaining cards are revealed, before any of their effects resolve, you may withdraw. If you do, return all other cards used in the battle to their sources and end the battle without a winner.'],
    ['Mission','Complete after you win a battle you did not initiate while occupying an enemy-controlled Territory.']
  ]},
  {name:'Deep Cover',cost:3,complexity:'Advanced',effects:[
    ['Action','Bank this as an Asset. When your Active Mission would fail, you may put this in your Graveyard. If you do, return that Mission to your hand instead.'],
    ['Battle','If an opposing effect looked at or revealed one of your face-down cards used in this battle before the normal reveal, gain advantage.']
  ]},
  {name:'Assassins',cost:4,complexity:'Advanced',effects:[
    ['Action',"Look at your opponent's hand. Choose one card from it and discard that card."],
    ['Battle','Reveal this before the other cards in the battle. If your opponent committed a card from hand, reveal and negate that card. Otherwise, give your opponent disadvantage during this battle.'],
    ['Mission',"Complete after you look at one or more cards in your opponent's hand outside a battle, then win a battle against that opponent in which they committed a card from hand."]
  ]},
  {name:'Treason',cost:4,complexity:'Advanced',effects:[
    ['Action','Bank this as an Asset. After all cards in a battle involving you are revealed, before their effects resolve, you may discard this. If you do, choose one opposing card used in the battle. Negate it, then resolve its Battle effect as though you had used it.'],
    ['Battle','Reveal this before the other cards in the battle. After the remaining cards are revealed, before their effects resolve, choose one opposing card used in the battle. Negate it, then resolve its Battle effect as though you had used it.']
  ]},
  {name:'Subversion',cost:4,complexity:'Advanced',effects:[
    ['Action',"Bank this as an Asset. When an opposing banked Asset's effect would resolve, you may put this in your Graveyard. If you do, negate that effect and discard that Asset if it remains in play."],
    ['Battle','Opposing banked Assets cannot be used during this battle.'],
    ['Mission','Complete after you win a battle in which your opponent used a banked Asset and you used none.']
  ]},
  {name:'Sleeper Network',cost:5,complexity:'Advanced',unique:true,effects:[
    ['Action','Bank this as an Asset with one other card from your hand face down beneath it. At the end of each of your later turns, you may place one other card from your hand face down beneath it.'],
    ['Capacity','This can hold no more cards than the number of Territories you control. If it holds too many, immediately discard cards beneath it of your choice until it is within capacity.'],
    ['Activate','At the start of your turn, you may put this in your Graveyard. If you do, reveal the cards beneath it. Play each card whose Action effect can legally resolve, one at a time and in any order, without using Action Opportunities. Discard the rest.'],
    ['Compromised','When an opposing effect would cause this to leave play, before it does, reveal the cards beneath it. You may play one card whose Action effect can legally resolve without using an Action Opportunity. Discard the rest.'],
    ['Other removal','If this leaves play for any other reason, discard all cards beneath it.']
  ]}
];

const sharedLeaderRules = [
  ['Intel','Begin at 0. Gain Intel by completing normal Missions. Spend it on Surveillance, Interference, Fieldcraft, aborting Missions, and the final Special Operation cost.'],
  ['Missions','During the Action Opportunity after movement, instead of playing a card for its Action effect, start, complete, or abort one eligible face-down Mission. Completing adds 1 Operation Progress and Intel equal to the card value.'],
  ['Special Operation','When Progress exceeds opposing controlled Territories and you have no Active Mission, start an eligible Mission card as the Special Operation. Complete its requirement later and pay the final Intel cost to win.']
];
const leaders = [
  {name:'Ranger',image:'../images/ranger.png',motto:'Know the land before the battle begins.',ability:['Fieldcraft','Once per turn, when a Territory effect would affect you, your movement, or a battle involving you, spend 1 Intel to ignore that Territory effect until the end of the turn.']},
  {name:'Spymaster',image:'../images/spymaster.png',motto:'Information never rests. Momentum is the weapon.',ability:['Mission Control','Once per turn, after completing a normal Mission, immediately start a new eligible Mission from hand without using an Action Opportunity. It cannot complete that turn and cannot be the Special Operation.']}
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
    <div class="reference-block"><strong>Start:</strong> During the Action Opportunity after movement, place it face down as the Active Mission instead of playing a card for its Action effect. Only one Active Mission; it cannot complete that turn.</div>
    <div class="reference-block"><strong>Complete:</strong> During the Action Opportunity after movement, reveal a satisfied Active Mission instead of playing a card for its Action effect. Gain 1 Operation Progress and Intel equal to its value; put it in your Discard Pile.</div>
    <div class="reference-block"><strong>Abort:</strong> During the Action Opportunity after movement, reveal it and spend Intel equal to its value; put it in your Discard Pile. Aborting is not failure.</div>
    <div class="reference-block"><strong>Fail:</strong> Reveal it and put it in your Graveyard.</div>
    <div class="reference-block"><strong>Special Operation:</strong> Progress must exceed opposing controlled Territories. Use an eligible Mission card, maintain readiness, satisfy its requirement later, then pay Territories in the Gauntlet minus card value, minimum 1 Intel, to win.</div>
  </div><div class="cut-note">Supplemental reference — no deckbuilding value</div></article>`;
}
function renderOperationsReference(){
  return `<article class="print-card reference-card fit-card"><div class="reference-heading">Operations Reference</div><div class="fit-content">
    <div class="reference-block"><strong>Choice order:</strong> Attacker commits from hand, then defender. Attacker selects from their Battle Hand, then defender.</div>
    <div class="reference-block"><strong>Surveillance — 1 Intel:</strong> Once per battle, when the opponent commits from hand or selects from a Battle Hand face down, look at that card.</div>
    <div class="reference-block"><strong>Interference — +2 Intel:</strong> Immediately after Surveillance, remove that card from the battle. The opponent may replace it from the same source.</div>
    <div class="reference-block"><strong>Hand source:</strong> Return the commitment to hand.</div>
    <div class="reference-block"><strong>Battle Hand source:</strong> Return the card to that Battle Hand; it is no longer selected.</div>
    <div class="reference-block"><strong>No replacement:</strong> The opponent uses no card from that source.</div>
    <div class="reference-block"><strong>Reminder:</strong> Interference disrupts rather than destroys and creates no additional response window.</div>
  </div><div class="cut-note">Supplemental reference — no deckbuilding value</div></article>`;
}
function renderSlidingTracker({title,cover,max,step,label,compact=false}){
  const lines=Array.from({length:max},(_,index)=>{
    const value=index+1;
    const showLabel=!compact||value%5===0;
    return `<div class="slide-step" style="bottom:${(value*step).toFixed(2)}in"><span class="slide-value">${value}</span>${showLabel?`<span class="slide-label">${escapeHtml(label)}</span>`:''}</div>`;
  }).join('');
  return `<article class="print-card tracker-card sliding-tracker${compact?' compact-tracker':''}">
    <div class="tracker-heading">${escapeHtml(title)}</div>
    <div class="tracker-instruction">Place beneath the ${escapeHtml(cover)}. Fully cover at 0, then slide that card upward until its bottom edge aligns with the current value.</div>
    ${lines}
    <div class="tracker-zero">0 — Fully covered</div>
    <div class="cut-note">Sliding tracker — no marker required</div>
  </article>`;
}
function renderSheets(){
  const items=[
    ...cards.map(renderFactionCard),
    ...leaders.map(renderLeaderCard),
    renderMissionReference(),
    renderOperationsReference(),
    renderSlidingTracker({title:'Intel Tracker',cover:'Operations Reference Card',max:20,step:.15,label:'Intel',compact:true}),
    renderSlidingTracker({title:'Operation Progress',cover:'Mission Reference Card',max:8,step:.36,label:'Progress'})
  ];
  const root=document.getElementById('sheets');
  for(let i=0;i<Math.ceil(items.length/9);i++){
    const page=items.slice(i*9,i*9+9); while(page.length<9) page.push('<div class="print-card placeholder-card"></div>');
    root.insertAdjacentHTML('beforeend',`<section class="sheet">${page.join('')}</section>`);
  }
}
renderSheets();
