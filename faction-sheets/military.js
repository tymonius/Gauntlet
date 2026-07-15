const cards = [
  {
    name: 'Unbroken Ranks', cost: 1, meta: 'Military • Basic',
    effects: [
      ['Action', 'Bank this as an Asset. After you win a battle in which you used no Orders, you may discard it to gain 1 Command.'],
      ['Battle', 'When you win this battle, if you used no Orders in it, gain 1 Command.']
    ]
  },
  {
    name: 'Battlefield Promotion', cost: 2, meta: 'Military • Basic',
    effects: [
      ['Action', 'Play after you win a battle. Return one battle-drawn card you played in that battle from your discard pile to your hand.'],
      ['Battle', 'If you win, return one other battle-drawn card you played to your hand instead of discarding it during cleanup.']
    ]
  },
  {
    name: 'Encampment', cost: 2, meta: 'Military • Advanced • Territory Overlay',
    effects: [
      ['Action', 'Place this as an Overlay on a revealed Territory you occupy and control.'],
      ['Overlay', "At the end of your turn, if you occupy and control this Territory, gain 1 Command. When an opponent gains control of it, put this in its owner's Graveyard."],
      ['Battle', 'If you win while defending a revealed Territory you control, place this on it as an Overlay during cleanup.']
    ]
  },
  {
    name: 'Rearguard', cost: 2, meta: 'Military • Advanced',
    effects: [
      ['Action', "Bank this as an Asset. After you lose a battle and retreat, when your opponent would enter your space that turn using an Order or card effect, you may discard this to prevent that movement. No Command is spent; any card used returns to its owner's hand."],
      ['Battle', 'If you lose and retreat, bank this during cleanup.']
    ]
  },
  {
    name: 'Brothers in Arms', cost: 2, meta: 'Military • Advanced',
    effects: [
      ['Action', 'Bank this as an Asset. Before committing a Battle card from hand, you may discard this to delay that commitment until after your initial battle draw. Then play one Battle card from hand and one from that draw face up together, or play neither. Both Battle effects must still be able to resolve.'],
      ['Battle', 'If this is in your initial battle draw and you committed no card from hand, you may choose it as your battle-drawn play and play one Battle card from hand face up with it.']
    ]
  },
  {
    name: 'Field Command', cost: 3, meta: 'Military • Advanced',
    effects: [
      ['Action', "Bank this as an Asset. After using a 1-Command Order, you may discard this to use your leader's other 1-Command Order once this turn, at its next legal timing, for 0 Command."],
      ['Battle', "After using a 1-Command Order during this battle, you may use your leader's other 1-Command Order once this turn, at its next legal timing, for 0 Command. If you do, put this in your Graveyard after that Order resolves."]
    ]
  },
  {
    name: 'Reserve Force', cost: 3, meta: 'Military • Advanced',
    effects: [
      ['Action', 'Bank this as an Asset with another Battle card from your hand face down beneath it. After all Battle cards are revealed in a battle involving you, you may discard this to play the stored card face up as an additional Battle card, if its Battle effect can still resolve. Put the stored card in your Graveyard during cleanup, or immediately if this leaves play before deployment.'],
      ['Battle', 'After all Battle cards are revealed, you may replace this with a Battle card from your hand whose Battle effect can still resolve. If you do, put this in your Graveyard and play that card face up. Otherwise, discard this during cleanup.']
    ]
  },
  {
    name: 'Give Chase', cost: 3, meta: 'Military • Advanced',
    effects: [
      ['Action', "Play after you win a battle you initiated. Move one space toward the opponent's Heartland. This may initiate a battle."],
      ['Battle', 'If you win and initiated this battle, after the opponent retreats, move one space toward their Heartland. This may initiate a battle.'],
      ['Pursuit', 'In a battle initiated this way, you cannot commit from hand or use Orders. Draw one fewer card in its initial battle draw for each prior battle this turn after the first, to a minimum of zero. After the movement, put this in your Graveyard.']
    ]
  },
  {
    name: 'Hold the Line', cost: 4, meta: 'Military • Advanced',
    effects: [
      ['Action', 'Bank this as an Asset. When a battle begins in which you defend a Territory you control, before Battle cards are committed, you may put this in your Graveyard to use the effect below.'],
      ['Battle', 'If you are defending a Territory you control, use the effect below, then put this in your Graveyard during cleanup.'],
      ['Effect', 'After all Battle cards are revealed, draw two additional battle cards and immediately play up to one face up as an additional Battle card, if its Battle effect can still resolve. If you lose, after you retreat, the opponent captures that Territory immediately.']
    ]
  },
  {
    name: 'Countercharge', cost: 4, meta: 'Military • Advanced',
    effects: [
      ['Action', 'Bank this as an Asset. After you win a battle you did not initiate, you may put this in your Graveyard to use the effect below.'],
      ['Battle', 'If you win this battle and did not initiate it, use the effect below, then put this in your Graveyard.'],
      ['Effect', 'After the opponent retreats, move one space toward their Heartland. This may initiate a battle.']
    ]
  },
  {
    name: 'War Crimes', cost: 4, meta: 'Military • Advanced',
    effects: [
      ['Action', 'Bank this as an Asset. After you win a battle, you may put this in your Graveyard to use the effect below.'],
      ['Battle', 'If you win, you may use the effect below. If you do, put this in your Graveyard during cleanup.'],
      ['Effect', 'Put every battle-drawn card your opponent played in that battle in their Graveyard instead of their discard pile, and make them retreat one additional space. You cannot move, capture a Territory, or use an Order as a result of that victory.']
    ]
  },
  {
    name: 'Shock and Awe', cost: 5, meta: 'Military • Advanced',
    unique: 'Unique — maximum one copy per deck',
    effects: [
      ['Action', 'Bank this as an Asset. When you initiate a battle on an enemy-controlled Territory, before Battle-card commitments, you may put this in your Graveyard to use the effect below.'],
      ['Battle', 'If attacking on an enemy-controlled Territory, use the effect below, then put this in your Graveyard during cleanup.'],
      ['Effect', 'After all Battle cards are revealed, you may play one Battle card from hand face up as an additional Battle card if its Battle effect can still resolve. During cleanup, if you lose, retreat one additional space after your normal retreat. If you win, choose Breakthrough or Consolidate.'],
      ['Breakthrough', 'Choose only if the opponent can retreat one additional space. They do so after their normal retreat; then move one space toward their Heartland. This cannot initiate a battle.'],
      ['Consolidate', 'Capture the contested Territory immediately, then set your Command to 2.'],
      ['Limit', 'After either option, you cannot move again, capture another Territory, or use an Order from that victory.']
    ]
  }
];

const leaders = [
  {
    name: 'General', image: '../images/general.png', motto: 'Forward. Again.',
    orders: [
      ['Onward', 1, 'Move one additional space this turn. This movement may initiate a battle.'],
      ['Rally', 1, 'Before dice are rolled in a battle you initiated, add +1 to your battle total.'],
      ['Rout', 2, "After you win a battle you initiated, move one space toward the opponent's Heartland. This movement may initiate another battle."]
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

  return `<article class="print-card faction-card fit-card" data-card-name="${escapeHtml(card.name)}">
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

  return `<article class="print-card leader-card" data-card-name="${escapeHtml(leader.name)}">
    <div class="leader-art">
      <img src="${escapeHtml(leader.image)}" alt="${escapeHtml(leader.name)}">
      <div class="leader-faction">Military Leader</div>
      <div class="leader-title">${escapeHtml(leader.name.toUpperCase())}</div>
    </div>
    <div class="leader-content">
      <div class="leader-motto">${escapeHtml(leader.motto)}</div>
      <div class="command-rule"><strong>Command:</strong> Maximum 2. The first time each turn you win a battle, gain 1. Spend Command to use Orders.</div>
      <div class="orders-title">Orders</div>
      ${orders}
    </div>
  </article>`;
}

function renderTracker() {
  return `<article class="print-card tracker-card" data-card-name="Military Command Tracker" aria-label="Military Command tracker">
    <div class="tracker-heading">MILITARY COMMAND</div>
    <div class="tracker-crest">M</div>
    <div class="tracker-note">Place beneath your Leader Card. Cover this card at 0 Command. Slide the Leader upward until its bottom edge reaches the current Command line.</div>
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

  const root = document.getElementById('sheets');
  for (let i = 0; i < Math.ceil(items.length / 9); i += 1) {
    const pageItems = items.slice(i * 9, i * 9 + 9);
    while (pageItems.length < 9) pageItems.push('<div class="print-card placeholder-card"></div>');
    root.insertAdjacentHTML('beforeend', `<section class="sheet">${pageItems.join('')}</section>`);
  }
}

function fitCards() {
  const results = [];
  document.querySelectorAll('.fit-card').forEach(card => {
    let bodySize = 7.2;
    let labelSize = 6.6;
    const minBody = 5.5;

    while (card.scrollHeight > card.clientHeight && bodySize > minBody) {
      bodySize = Math.max(minBody, bodySize - 0.1);
      labelSize = Math.max(5.25, labelSize - 0.08);
      card.style.setProperty('--body-size', `${bodySize.toFixed(2)}pt`);
      card.style.setProperty('--label-size', `${labelSize.toFixed(2)}pt`);
    }

    results.push({
      name: card.dataset.cardName,
      fontSize: bodySize,
      fits: card.scrollHeight <= card.clientHeight,
      overflow: card.scrollHeight - card.clientHeight
    });
  });
  window.__cardFitResults = results;
}

renderSheets();
window.addEventListener('load', fitCards);
