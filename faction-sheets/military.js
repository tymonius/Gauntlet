const cards = [
  {
    name: 'Unbroken Ranks', cost: 1, meta: 'Military • Basic',
    effects: [
      ['Action', 'Bank Unbroken Ranks as an Asset. After you win a battle during which you used no Orders, you may discard Unbroken Ranks. If you do, gain 1 Command.'],
      ['Battle', 'After you win this battle, if you used no Orders during it, gain 1 Command.']
    ]
  },
  {
    name: 'Battlefield Promotion', cost: 2, meta: 'Military • Basic',
    effects: [
      ['Action', 'Play only after you win a battle. Choose one card you played from battle draw during that battle. Return it from your discard pile to your hand.'],
      ['Battle', 'During battle cleanup, if you win, return one other card you played from battle draw to your hand instead of placing it in your discard pile.']
    ]
  },
  {
    name: 'Encampment', cost: 2, meta: 'Military • Advanced • Territory Overlay',
    effects: [
      ['Action', 'Place Encampment as an Overlay on the revealed Territory you currently occupy and control.'],
      ['Overlay', 'At the end of your turn, if you occupy and control this Territory, gain 1 Command. When an opponent gains control of this Territory, place Encampment in its owner\'s Graveyard.'],
      ['Battle', 'During battle cleanup, if you won this battle while defending a revealed Territory you control, place Encampment on that Territory as an Overlay instead of placing it in its normal destination.']
    ]
  },
  {
    name: 'Rearguard', cost: 2, meta: 'Military • Advanced',
    effects: [
      ['Action', 'Bank Rearguard as an Asset. After you lose a battle and retreat, when your opponent would use an Order or card effect to enter the space you occupy during that turn, you may discard Rearguard. If you do, they cannot use that Order or card effect. No Command is spent, and any card used for that effect is returned to its owner\'s hand.'],
      ['Battle', 'During battle cleanup, if you lose and retreat, bank Rearguard as an Asset instead of placing it in its normal destination.']
    ]
  },
  {
    name: 'Brothers in Arms', cost: 2, meta: 'Military • Advanced',
    effects: [
      ['Action', 'Bank Brothers in Arms as an Asset. Before you commit a Battle card from hand, you may discard Brothers in Arms. If you do, delay your commitment until after your initial battle draw. Then you may play one Battle card from your hand and one card from that draw face up together, if both Battle effects can still resolve. You must play both or neither.'],
      ['Battle', 'If Brothers in Arms is revealed in your initial battle draw and you did not commit a Battle card from hand, you may play one Battle card from your hand face up with it. If you do, play Brothers in Arms as your card from battle draw.']
    ]
  },
  {
    name: 'Field Command', cost: 3, meta: 'Military • Advanced',
    effects: [
      ['Action', 'Bank Field Command as an Asset. After you use a 1-Command Order, you may discard Field Command. If you do, you may use your leader\'s other 1-Command Order once this turn at its next legal timing without spending Command.'],
      ['Battle', 'After you use a 1-Command Order during this battle, you may use your leader\'s other 1-Command Order once this turn at its next legal timing without spending Command. If you do, place Field Command in your Graveyard after that Order resolves.']
    ]
  },
  {
    name: 'Reserve Force', cost: 3, meta: 'Military • Advanced',
    effects: [
      ['Action', 'Bank Reserve Force as an Asset and place one other Battle card from your hand face down beneath it. After Battle cards are revealed in a battle involving you, you may discard Reserve Force. If you do, play the stored card face up as an additional Battle card, if its Battle effect can still resolve. During battle cleanup, place the stored card in your Graveyard instead of its normal destination. If Reserve Force leaves play before the stored card is deployed, place the stored card in your Graveyard.'],
      ['Battle', 'After all Battle cards are revealed, you may replace Reserve Force with one Battle card from your hand whose Battle effect can still resolve. If you do, place Reserve Force in your Graveyard and play the chosen card face up. If you do not, place Reserve Force in your discard pile during battle cleanup instead of its normal destination.']
    ]
  },
  {
    name: 'Give Chase', cost: 3, meta: 'Military • Advanced',
    effects: [
      ['Action', 'Play only after you win a battle you initiated. Move one space toward the opponent\'s Heartland. This movement may initiate a battle. If it does, you cannot commit a Battle card from hand or use Orders during that battle. During your initial battle draw, draw one fewer card for each battle beyond the first that you already fought this turn. This may reduce your battle draw to zero. Place Give Chase in your Graveyard after this movement.'],
      ['Battle', 'During battle cleanup, if you win this battle and initiated it, after the opponent retreats, move one space toward their Heartland. This movement may initiate a battle. If it does, you cannot commit a Battle card from hand or use Orders during that battle. During your initial battle draw, draw one fewer card for each battle beyond the first that you already fought this turn. This may reduce your battle draw to zero. Place Give Chase in your Graveyard after this movement.']
    ]
  },
  {
    name: 'Hold the Line', cost: 4, meta: 'Military • Advanced',
    effects: [
      ['Action', 'Bank Hold the Line as an Asset. When a battle begins in which you are defending a Territory you control, before Battle cards are committed, you may place Hold the Line in your Graveyard. If you do, after all Battle cards are revealed, draw two additional battle cards and immediately play up to one of them face up, in addition to your other Battle cards, if its Battle effect can still resolve. If you lose, after you retreat, your opponent captures that Territory immediately.'],
      ['Battle', 'If you are defending a Territory you control, after all Battle cards are revealed, draw two additional battle cards and immediately play up to one of them face up, in addition to your other Battle cards, if its Battle effect can still resolve. If you lose, after you retreat, your opponent captures that Territory immediately. During battle cleanup, place Hold the Line in your Graveyard instead of its normal destination.']
    ]
  },
  {
    name: 'Countercharge', cost: 4, meta: 'Military • Advanced',
    effects: [
      ['Action', 'Bank Countercharge as an Asset. After you win a battle you did not initiate, you may place Countercharge in your Graveyard. If you do, after your opponent retreats, move one space toward their Heartland. This movement may initiate a battle.'],
      ['Battle', 'During battle cleanup, if you win this battle and did not initiate it, after your opponent retreats, move one space toward their Heartland. This movement may initiate a battle. Place Countercharge in your Graveyard after this movement.']
    ]
  },
  {
    name: 'War Crimes', cost: 4, meta: 'Military • Advanced',
    effects: [
      ['Action', 'Bank War Crimes as an Asset. After you win a battle, you may place War Crimes in your Graveyard. If you do, every card your opponent played from battle draw during that battle goes to their Graveyard instead of their discard pile, and they retreat one additional space. You cannot move, capture a Territory, or use an Order as a result of that victory.'],
      ['Battle', 'During battle cleanup, if you win, you may place every card your opponent played from battle draw during this battle in their Graveyard instead of their discard pile and make them retreat one additional space. If you do, you cannot move, capture a Territory, or use an Order as a result of this victory, and place War Crimes in your Graveyard instead of its normal destination.']
    ]
  },
  {
    name: 'Shock and Awe', cost: 5, meta: 'Military • Advanced', unique: 'Unique — maximum one copy per deck',
    effects: [
      ['Action', 'Bank Shock and Awe as an Asset. When you initiate a battle on an enemy-controlled Territory, before Battle cards are committed, you may place Shock and Awe in your Graveyard. If you do, after all Battle cards are revealed, you may play one Battle card from your hand face up as an additional Battle card, if its Battle effect can still resolve. During battle cleanup: If you lose, retreat one additional space after completing your normal retreat. If you win, choose Breakthrough or Consolidate. Breakthrough: Choose only if your opponent can retreat one additional space. After their normal retreat, they retreat one additional space. Then move one space toward their Heartland. This movement cannot initiate a battle. Consolidate: Capture the contested Territory immediately, then set your Command to 2. After resolving the chosen option, you cannot move again, capture another Territory, or use an Order as a result of that victory.'],
      ['Battle', 'If you are attacking on an enemy-controlled Territory, after all Battle cards are revealed, you may play one Battle card from your hand face up as an additional Battle card, if its Battle effect can still resolve. During battle cleanup: If you lose, retreat one additional space after completing your normal retreat. If you win, choose Breakthrough or Consolidate. Breakthrough: Choose only if your opponent can retreat one additional space. After their normal retreat, they retreat one additional space. Then move one space toward their Heartland. This movement cannot initiate a battle. Consolidate: Capture the contested Territory immediately, then set your Command to 2. After resolving the chosen option, you cannot move again, capture another Territory, or use an Order as a result of that victory. During battle cleanup, place Shock and Awe in your Graveyard instead of its normal destination.']
    ]
  }
];

const leaders = [
  {
    name: 'General', image: '../images/general.png', motto: 'Forward. Again.',
    orders: [
      ['Onward', 1, 'Move one additional space this turn. This movement may initiate a battle.'],
      ['Rally', 1, 'Before dice are rolled in a battle you initiated, add +1 to your battle total.'],
      ['Rout', 2, 'After you win a battle you initiated, move one space toward the opponent\'s Heartland. This movement may initiate another battle.']
    ]
  },
  {
    name: 'Commandant', image: '../images/commandant.png', motto: 'We hold. They break.',
    orders: [
      ['Entrench', 1, 'Before dice are rolled in a battle you did not initiate, add +1 to your battle total.'],
      ['Repel', 1, 'After you win a battle you did not initiate, the defeated opponent retreats one additional space, if able.'],
      ['Fortify', 2, 'After you win a battle while occupying an enemy Territory, capture that Territory immediately.']
    ]
  }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderFactionCard(card) {
  const effects = card.effects.map(([label, text]) => `
    <div class="effect">
      <span class="effect-label">${escapeHtml(label)}:</span>
      <span class="effect-text"> ${escapeHtml(text)}</span>
    </div>`).join('');

  return `<article class="print-card faction-card fit-card">
    <div class="card-header">
      <div class="card-name">${escapeHtml(card.name)}</div>
      <div class="card-cost">${card.cost}</div>
    </div>
    <div class="card-meta">${escapeHtml(card.meta)}</div>
    <div class="fit-content">${effects}</div>
    ${card.unique ? `<div class="unique">${escapeHtml(card.unique)}</div>` : ''}
  </article>`;
}

function renderLeaderCard(leader) {
  const orders = leader.orders.map(([name, cost, text]) => `
    <div class="order"><strong>${escapeHtml(name)} <span class="order-cost">— ${cost} Command</span>:</strong> ${escapeHtml(text)}</div>`).join('');

  return `<article class="print-card leader-card">
    <div class="leader-art">
      <img src="${escapeHtml(leader.image)}" alt="${escapeHtml(leader.name)}">
      <div class="leader-faction">Military Leader</div>
      <div class="leader-title">${escapeHtml(leader.name.toUpperCase())}</div>
    </div>
    <div class="leader-content">
      <div class="leader-motto">${escapeHtml(leader.motto)}</div>
      <div class="command-rule"><strong>Command:</strong> You may have up to 2 Command. The first time each turn you win a battle, gain 1 Command. Spend Command to use Orders.</div>
      <div class="orders-title">Orders</div>
      ${orders}
    </div>
  </article>`;
}

function renderTracker() {
  return `<article class="print-card tracker-card" aria-label="Military Command tracker">
    <div class="tracker-heading">MILITARY COMMAND</div>
    <div class="tracker-crest">M</div>
    <div class="tracker-note">Place beneath the selected Leader Card. Fully cover this card at 0 Command; slide the Leader upward until its bottom edge aligns with the current Command line.</div>
    <div class="command-step command-two"><span class="command-number">2</span><span class="command-label">Full Command</span></div>
    <div class="command-step command-one"><span class="command-number">1</span><span class="command-label">Command</span></div>
    <div class="cut-note">Supplemental card — no deckbuilding value</div>
  </article>`;
}

function renderSheets() {
  const items = [
    ...cards.map(renderFactionCard),
    ...leaders.map(renderLeaderCard),
    renderTracker()
  ];

  const sheetCount = Math.ceil(items.length / 9);
  const root = document.getElementById('sheets');
  for (let i = 0; i < sheetCount; i += 1) {
    const pageItems = items.slice(i * 9, i * 9 + 9);
    while (pageItems.length < 9) pageItems.push('<div class="print-card placeholder-card"></div>');
    root.insertAdjacentHTML('beforeend', `<section class="sheet">${pageItems.join('')}</section>`);
  }
}

function fitCards() {
  document.querySelectorAll('.fit-card').forEach(card => {
    const content = card.querySelector('.fit-content');
    let bodySize = 6.25;
    let labelSize = 6;
    const minBody = 4.05;
    while (card.scrollHeight > card.clientHeight && bodySize > minBody) {
      bodySize -= 0.15;
      labelSize = Math.max(3.95, labelSize - 0.12);
      card.style.setProperty('--body-size', `${bodySize.toFixed(2)}pt`);
      card.style.setProperty('--label-size', `${labelSize.toFixed(2)}pt`);
    }
    if (card.scrollHeight > card.clientHeight) content.style.lineHeight = '1.02';
  });
}

renderSheets();
window.addEventListener('load', fitCards);
