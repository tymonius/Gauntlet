const cards = [
  {
    name: 'Accusation', cost: 1, meta: 'Inquisition • Basic',
    effects: [
      ['Action', 'Choose a card in the opponent\'s discard pile. They put it on top of their deck or send it to their Graveyard.'],
      ['Battle', 'After the battle, choose a card in the opponent\'s discard pile. They put it on top of their deck or send it to their Graveyard.']
    ]
  },
  {
    name: 'Confession', cost: 2, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', 'Look at the opponent\'s hand and choose a Battle card. Until end of turn, if they commit from hand in a battle involving you, they must commit that card if able.'],
      ['Battle', 'After both players select their Battle cards, before reveal, reveal Confession and the opponent\'s hand commitment, if any. You may return your hand commitment to your hand and replace it with another Battle card from hand, played face up.']
    ]
  },
  {
    name: 'Penance', cost: 2, meta: 'Inquisition • Basic',
    effects: [
      ['Action', 'The opponent chooses one: send a card from hand to their Graveyard; or you gain 1 Conviction.'],
      ['Battle', 'After Battle cards are revealed, the opponent chooses one: send a card from hand to their Graveyard; or you gain +1 battle total.']
    ]
  },
  {
    name: 'Divine Mercy', cost: 2, meta: 'Inquisition • Basic',
    effects: [
      ['Action', 'Move a card from the opponent\'s Graveyard to their discard pile. Gain 2 Conviction.'],
      ['Battle', 'Move a card from the opponent\'s Graveyard to their discard pile. Gain +2 battle total.']
    ]
  },
  {
    name: 'No Martyrs', cost: 3, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', 'Bank No Martyrs as an Asset. After Battle cards are revealed in a battle involving you, you may discard it. If the opponent loses, they cannot benefit from effects they control triggered by that loss or retreat, and retreat one additional space.'],
      ['Battle', 'If the opponent loses, they cannot benefit from effects they control triggered by that loss or retreat, and retreat one additional space.']
    ]
  },
  {
    name: 'Excommunication', cost: 3, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', 'Choose cards in the opponent\'s discard pile with combined deckbuilding value up to 5. Send them to their Graveyard.'],
      ['Battle', 'After the battle, choose cards in the opponent\'s discard pile with combined deckbuilding value up to 3. Send them to their Graveyard.']
    ]
  },
  {
    name: 'Guilt by Association', cost: 3, meta: 'Inquisition • Basic',
    effects: [
      ['Action', 'Choose a card in the opponent\'s discard pile. Send every card there with that title to their Graveyard.'],
      ['Battle', 'After the battle, choose a card the opponent played. Send every card in their discard pile with that title to their Graveyard.']
    ]
  },
  {
    name: 'Act of Faith', cost: 3, meta: 'Inquisition • Basic',
    effects: [
      ['Action', 'Reveal up to three cards from the top of the opponent\'s deck. Send one to their Graveyard and discard the rest.'],
      ['Battle', 'After the battle, reveal up to two cards from the top of the opponent\'s deck. Send one to their Graveyard and discard the rest.']
    ]
  },
  {
    name: 'Tyranny', cost: 4, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', 'Bank Tyranny as an Asset. Once per turn, after Battle cards are revealed in a battle involving you, you may spend 1 Conviction to negate one opposing played Battle card.'],
      ['Battle', 'Negate one opposing played Battle card.']
    ]
  },
  {
    name: 'Burning at the Stake', cost: 4, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', 'The opponent reveals their hand. Send the card with the highest deckbuilding value to their Graveyard; choose among ties. If it has the Arcane trait, gain 1 Conviction.'],
      ['Battle', 'If the opponent loses, they reveal their hand. Send the card with the highest deckbuilding value to their Graveyard; choose among ties. If it has the Arcane trait, gain 1 Conviction.']
    ]
  },
  {
    name: 'Heresy', cost: 5, meta: 'Inquisition • Advanced', trait: 'Arcane trait',
    effects: [
      ['Battle', 'You may spend 4 Conviction to resolve the Battle effect of a card in the opponent\'s Graveyard as though you played it. That effect may resolve one additional Battle effect; the additional effect cannot resolve another.']
    ]
  },
  {
    name: 'Hellfire', cost: 5, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', 'Spend any amount of Conviction. Send that many cards from the top of the opponent\'s deck to their Graveyard.'],
      ['Battle', 'After Battle cards are revealed, spend any amount of Conviction. For each Conviction spent, choose one: gain +1 battle total; or, if you win, after the battle send the top card of the opponent\'s deck to their Graveyard. You may choose either option more than once.']
    ]
  }
];

const sharedLeaderRules = [
  ['Conviction', 'Maximum 4. The first time each turn one or more opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction.'],
  ['Condemnation', 'In battles involving you, opposing played battle-drawn cards go to their Graveyard after the battle instead of discard.'],
  ['Purification', 'At the start of the opponent\'s turn, after their normal draw attempt, if they draw no cards because their deck and discard pile are empty, you win.']
];

const leaders = [
  {
    name: 'Grand Inquisitor',
    image: 'https://tymonius.github.io/Gauntlet/images/grand%20inquisitor.png',
    motto: 'We judge. We purge.',
    ability: ['Final Judgment', 'Once per turn after you win a battle, you may Purge immediately without using the Action opportunity. Reduce its Conviction cost by 1, minimum 1.']
  },
  {
    name: 'Witch Hunter',
    image: 'https://tymonius.github.io/Gauntlet/images/witch%20hunter.png',
    motto: 'You ran. I followed.',
    ability: ['Relentless Pursuit', 'Once per turn, after an opponent loses a battle they initiated against you, you may spend 2 Conviction. If you do, end their turn, then move one space toward their Heartland. If this starts a battle, resolve it immediately; you are the attacker, and neither player may play an Action before it.']
  }
];

const doctrine = [
  ['Conviction', 'Maximum 4. The first time each turn one or more opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction.'],
  ['Condemnation', 'In battles involving you, opposing played battle-drawn cards go to their owner\'s Graveyard after the battle instead of discard. Hand commitments already go to the Graveyard. Unplayed battle-drawn cards are discarded normally.'],
  ['Blasphemy', 'Whenever the opponent plays a card with the Arcane trait, gain 1 Conviction outside the normal once-per-turn limit, up to the maximum. The Arcane trait is distinct from Arcane faction allegiance.'],
  ['Purification', 'At the start of the opponent\'s turn, after their normal draw attempt, if they draw no cards because their deck and discard pile are empty, you win. Failed battle draws and card-effect draws do not trigger Purification.']
];

const purgeRows = [
  [1, 'Send the top card of the opponent\'s discard pile to their Graveyard; or send up to two cards there with combined deckbuilding value 2 or less to their Graveyard.'],
  [2, 'Send one opposing Asset to its owner\'s Graveyard.'],
  [3, 'The opponent sends one card from hand to their Graveyard.'],
  [4, 'Look at the opponent\'s hand. Send one card to their Graveyard.']
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
    <div class="purge-intro"><strong>Purge:</strong> Instead of playing an Action card during the Action step, spend Conviction to choose one.</div>
    <div class="purge-list">${rows}</div>
    <div class="reference-reminder"><strong>Final Judgment:</strong> After the Grand Inquisitor wins a battle, they may Purge once per turn without using the Action opportunity and reduce its cost by 1, minimum 1.</div>
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
