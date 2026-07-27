const cards = [
  {
    name: 'Accusation', cost: 1, meta: 'Inquisition • Basic',
    effects: [
      ['Action', "Choose one card in the opponent's Discard Pile. They put it on top of their Draw Pile or in their Graveyard."],
      ['Battle', "After the battle, choose one card in the opponent's Discard Pile. They put it on top of their Draw Pile or in their Graveyard."]
    ]
  },
  {
    name: 'Confession', cost: 2, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', 'Look at the opponent\'s hand and choose one card with a Battle effect. Until the end of the turn, if they commit a card from hand in a battle involving you, they must commit the chosen card if able.'],
      ['Battle', 'After both players complete their hand commitments and Battle Hand choices, before the normal reveal, reveal this and the opponent\'s hand commitment, if any. You may return your own hand commitment to your hand and replace it with another eligible card from hand, revealed face up.'],
      ['Reminder', 'This permits one replacement, not an additional commitment.']
    ]
  },
  {
    name: 'Penance', cost: 2, meta: 'Inquisition • Basic',
    effects: [
      ['Action', 'The opponent chooses one: put one card from hand in their Graveyard, or you gain 1 Conviction.'],
      ['Battle', 'After all cards in the battle are revealed, the opponent chooses one: put one card from hand in their Graveyard, or add +1 to your battle total.']
    ]
  },
  {
    name: 'Divine Mercy', cost: 2, meta: 'Inquisition • Basic',
    effects: [
      ['Action', "Choose one card in the opponent's Graveyard and move it to their Discard Pile. Then gain 2 Conviction."],
      ['Battle', "Choose one card in the opponent's Graveyard and move it to their Discard Pile. Then add +2 to your battle total."]
    ]
  },
  {
    name: 'No Martyrs', cost: 3, meta: 'Inquisition • Advanced • Asset',
    effects: [
      ['Action', 'Bank this as an Asset. After all cards in a battle involving you are revealed, you may discard this. If you do and the opponent loses, they cannot benefit from effects they control triggered by that loss or retreat, and they retreat one additional position.'],
      ['Battle', 'If the opponent loses, they cannot benefit from effects they control triggered by that loss or retreat, and they retreat one additional position.']
    ]
  },
  {
    name: 'Excommunication', cost: 3, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', "Choose one or more cards in the opponent's Discard Pile with combined deckbuilding value up to 5. Put them in their Graveyard."],
      ['Battle', "After the battle, choose one or more cards in the opponent's Discard Pile with combined deckbuilding value up to 3. Put them in their Graveyard."]
    ]
  },
  {
    name: 'Guilt by Association', cost: 3, meta: 'Inquisition • Basic',
    effects: [
      ['Action', "Choose one card in the opponent's Discard Pile. Put every card there with that title in their Graveyard."],
      ['Battle', "After the battle, choose one card the opponent used in that battle. Put every card in their Discard Pile with that title in their Graveyard."]
    ]
  },
  {
    name: 'Act of Faith', cost: 3, meta: 'Inquisition • Basic',
    effects: [
      ['Action', "Reveal up to three cards from the top of the opponent's Draw Pile. Put one in their Graveyard and the rest in their Discard Pile."],
      ['Battle', "After the battle, reveal up to two cards from the top of the opponent's Draw Pile. Put one in their Graveyard and the rest in their Discard Pile."],
      ['Reminder', 'If only one card is revealed, put it in the Graveyard.']
    ]
  },
  {
    name: 'Tyranny', cost: 4, meta: 'Inquisition • Advanced • Asset',
    effects: [
      ['Action', 'Bank this as an Asset. Once per turn, after all cards in a battle involving you are revealed, you may spend 1 Conviction to negate one opposing card used in the battle.'],
      ['Battle', 'Negate one opposing card used in the battle.']
    ]
  },
  {
    name: 'Burning at the Stake', cost: 4, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', 'The opponent reveals their hand. Put the card with the highest deckbuilding value in their Graveyard; choose among ties. If it has the Arcane trait, gain 1 Conviction.'],
      ['Battle', 'If the opponent loses, they reveal their hand. Put the card with the highest deckbuilding value in their Graveyard; choose among ties. If it has the Arcane trait, gain 1 Conviction.'],
      ['Reminder', 'If the opponent has no cards in hand, this effect does nothing.']
    ]
  },
  {
    name: 'Heresy', cost: 5, meta: 'Inquisition • Advanced • Arcane', trait: 'Arcane trait',
    effects: [
      ['Battle', "You may spend 4 Conviction to choose one card in the opponent's Graveyard and resolve its Battle effect as though you had used it. That effect may resolve one additional Battle effect; the additional effect cannot resolve another."],
      ['Reminder', "The chosen card remains in the opponent's Graveyard."]
    ]
  },
  {
    name: 'Hellfire', cost: 5, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', "Spend any amount of Conviction. Put that many cards from the top of the opponent's Draw Pile in their Graveyard."],
      ['Battle', "After all cards in the battle are revealed, spend any amount of Conviction. For each Conviction spent, choose one: add +1 to your battle total; or, if you win, after the battle put the top card of the opponent's Draw Pile in their Graveyard. You may choose either option more than once."],
      ['Reminder', 'Each Conviction provides only one chosen benefit.']
    ]
  }
];

const sharedLeaderRules = [
  ['Conviction', 'Maximum 4. The first time each turn one or more opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction.'],
  ['Condemnation', 'In battles involving you, opposing cards used from Battle Hands go to their Graveyard during cleanup instead of the Discard Pile.'],
  ['Purification', 'After the opponent\'s normal Draw step, if they drew no card because both their Draw Pile and Discard Pile were empty, you win.']
];

const leaders = [
  {
    name: 'Grand Inquisitor',
    image: 'https://tymonius.github.io/Gauntlet/images/leader-cards/grand_inquisitor.jpg',
    motto: 'We judge. We purge.',
    ability: ['Final Judgment', "Once per turn after you win a battle, you may Purge immediately without using an Action Opportunity. Reduce its Conviction cost by 1, minimum 1."]
  },
  {
    name: 'Witch Hunter',
    image: 'https://tymonius.github.io/Gauntlet/images/leader-cards/witch_hunter.jpg',
    motto: 'You ran. I followed.',
    ability: ['Relentless Pursuit', "Once per turn, after an opponent loses a battle they initiated against you, you may spend 2 Conviction. If you do, end their turn, then move one position toward their end of the Gauntlet. If this initiates a battle, resolve it immediately with you as the attacking player."]
  }
];

const doctrine = [
  ['Conviction', 'Maximum 4. The first time each turn one or more opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction.'],
  ['Condemnation', "In battles involving you, opposing cards used from Battle Hands go to their owner's Graveyard during cleanup. Hand commitments already go to the Graveyard. Unchosen Battle Hand cards are discarded normally."],
  ['Blasphemy', 'Whenever the opponent uses a card with the Arcane trait for its Action effect or Battle effect, gain 1 Conviction outside the normal once-per-turn limit, up to the maximum.'],
  ['Purification', "After the opponent's normal Draw step, if they drew no card because both their Draw Pile and Discard Pile were empty, you win. Battle Hand draws and card-effect draws do not trigger Purification."]
];

const purgeRows = [
  [1, "Put the top card of the opponent's Discard Pile in their Graveyard; or put up to two cards there with combined deckbuilding value 2 or less in their Graveyard."],
  [2, "Put one opposing Asset in its owner's Graveyard."],
  [3, 'The opponent puts one card from hand in their Graveyard.'],
  [4, "Look at the opponent's hand. Put one card in their Graveyard."]
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
    ${card.trait ? `<div class="trait">${escapeHtml(card.trait)}</div>` : ''}
  </article>`;
}

function renderLeaderCard(leader) {
  const orderedRules = [sharedLeaderRules[0], sharedLeaderRules[1], leader.ability, sharedLeaderRules[2]];
  const rules = orderedRules.map(([name, text]) => `
    <div class="leader-rule"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(text)}</div>`).join('');

  return `<article class="print-card leader-card">
    <div class="leader-art">
      <img src="${escapeHtml(leader.image)}" alt="${escapeHtml(leader.name)}">
      <div class="leader-faction">Inquisition Leader</div>
      <div class="leader-title">${escapeHtml(leader.name.toUpperCase())}</div>
    </div>
    <div class="leader-content">
      <div class="leader-motto">${escapeHtml(leader.motto)}</div>
      ${rules}
    </div>
  </article>`;
}

function renderDoctrineReference() {
  const blocks = doctrine.map(([name, text]) => `
    <div class="reference-block"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(text)}</div>`).join('');

  return `<article class="print-card reference-card">
    <div class="reference-heading">Inquisition Doctrine</div>
    ${blocks}
    <div class="cut-note">Supplemental reference — no deckbuilding value</div>
  </article>`;
}

function renderPurgeReference() {
  const rows = purgeRows.map(([cost, text]) => `
    <div class="purge-row">
      <div class="purge-cost">${cost}</div>
      <div class="purge-text">${escapeHtml(text)}</div>
    </div>`).join('');

  return `<article class="print-card reference-card">
    <div class="reference-heading">Purge Reference</div>
    <div class="purge-intro"><strong>Purge:</strong> During an Action Opportunity, instead of playing a card for its Action effect, spend Conviction to choose one.</div>
    <div class="purge-list">${rows}</div>
    <div class="reference-reminder"><strong>Final Judgment:</strong> After the Grand Inquisitor wins a battle, they may Purge once per turn without an Action Opportunity and reduce its cost by 1, minimum 1.</div>
    <div class="cut-note">Supplemental reference — no deckbuilding value</div>
  </article>`;
}

function renderTracker() {
  const steps = [1, 2, 3, 4].map(value => `
    <div class="conviction-step ${value === 4 ? 'maximum' : ''}" style="top:${(3.50 - value * 0.55).toFixed(2)}in">
      <span class="conviction-number">${value}</span>
      <span class="conviction-label">${value === 4 ? 'Maximum Conviction' : 'Conviction'}</span>
    </div>`).join('');

  return `<article class="print-card tracker-card sliding-tracker" aria-label="Inquisition Conviction tracker">
    <div class="slider-heading">INQUISITION CONVICTION</div>
    <div class="slider-crest" aria-hidden="true">⌁</div>
    <div class="slider-note">Place beneath the selected Leader Card. Fully align at 0; slide the Leader upward until its bottom edge aligns with the current Conviction line.</div>
    ${steps}
    <div class="tracker-zero">0 — FULLY COVERED</div>
    <div class="cut-note">Supplemental card — no deckbuilding value</div>
  </article>`;
}

function renderSheets() {
  const items = [
    ...cards.map(renderFactionCard),
    ...leaders.map(renderLeaderCard),
    renderDoctrineReference(),
    renderPurgeReference(),
    renderTracker()
  ];

  const root = document.getElementById('sheets');
  for (let index = 0; index < Math.ceil(items.length / 9); index += 1) {
    const pageItems = items.slice(index * 9, index * 9 + 9);
    while (pageItems.length < 9) pageItems.push('<div class="print-card placeholder-card"></div>');
    root.insertAdjacentHTML('beforeend', `<section class="sheet">${pageItems.join('')}</section>`);
  }
}

renderSheets();
