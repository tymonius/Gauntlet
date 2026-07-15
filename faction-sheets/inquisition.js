const cards = [
  {
    name: 'Accusation', cost: 1, meta: 'Inquisition • Basic',
    effects: [
      ['Action', 'Choose one card in the opponent\'s discard pile. They choose whether to put it on top of their deck or send it to their Graveyard.'],
      ['Battle', 'After the battle, choose one card in the opponent\'s discard pile. They choose whether to put it on top of their deck or send it to their Graveyard.']
    ]
  },
  {
    name: 'Confession', cost: 2, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', 'Look at the opponent\'s hand. Choose one Battle card. Until end of turn, if they commit a card from hand in a battle involving you, they must commit the chosen card if able.'],
      ['Battle', 'After both players have selected their Battle cards but before the normal reveal, reveal Confession. Reveal the opponent\'s hand commitment, if any. You may replace your own hand commitment with a different Battle card from hand. If you do, return the original card to your hand and play the replacement face up.']
    ]
  },
  {
    name: 'Penance', cost: 2, meta: 'Inquisition • Basic',
    effects: [
      ['Action', 'The opponent chooses one: send one card from their hand to their Graveyard; or you gain 1 Conviction.'],
      ['Battle', 'After Battle cards are revealed, the opponent chooses one: send one card from their hand to their Graveyard; or add +1 to your battle total.']
    ]
  },
  {
    name: 'Divine Mercy', cost: 2, meta: 'Inquisition • Basic',
    effects: [
      ['Action', 'Choose one card in the opponent\'s Graveyard and move it to their discard pile. Gain 2 Conviction.'],
      ['Battle', 'Choose one card in the opponent\'s Graveyard and move it to their discard pile. Add +2 to your battle total.']
    ]
  },
  {
    name: 'No Martyrs', cost: 3, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', 'Bank No Martyrs as an Asset. After Battle cards are revealed in a battle involving you, you may discard No Martyrs. If you do and the opponent loses that battle, they cannot benefit from effects they control that trigger because they lost or retreated from that battle, and they retreat one additional space.'],
      ['Battle', 'If the opponent loses this battle, they cannot benefit from effects they control that trigger because they lost or retreated from this battle, and they retreat one additional space.']
    ]
  },
  {
    name: 'Excommunication', cost: 3, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', 'Choose one or more cards in the opponent\'s discard pile with a combined deckbuilding value of up to 5. Send them to their Graveyard.'],
      ['Battle', 'After the battle, choose one or more cards in the opponent\'s discard pile with a combined deckbuilding value of up to 3. Send them to their Graveyard.']
    ]
  },
  {
    name: 'Guilt by Association', cost: 3, meta: 'Inquisition • Basic',
    effects: [
      ['Action', 'Choose a card in the opponent\'s discard pile. Send it and any other copies of that card in their discard pile to their Graveyard.'],
      ['Battle', 'After the battle, choose a card the opponent played during that battle. Send any copies of that card in their discard pile to their Graveyard.']
    ]
  },
  {
    name: 'Act of Faith', cost: 3, meta: 'Inquisition • Basic',
    effects: [
      ['Action', 'Reveal up to three cards from the top of the opponent\'s deck. Choose one and send it to their Graveyard. Discard the others.'],
      ['Battle', 'After the battle, reveal up to two cards from the top of the opponent\'s deck. Choose one and send it to their Graveyard. Discard the other.']
    ]
  },
  {
    name: 'Tyranny', cost: 4, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', 'Bank Tyranny as an Asset. Once per turn, after Battle cards are revealed in a battle involving you, you may spend 1 Conviction. If you do, choose one opposing played Battle card and negate it.'],
      ['Battle', 'Choose one opposing played Battle card and negate it.']
    ]
  },
  {
    name: 'Burning at the Stake', cost: 4, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', 'The opponent reveals their hand. Send the card with the highest deckbuilding value to their Graveyard. If two or more cards are tied for highest, choose one. If the condemned card has the Arcane trait, gain 1 Conviction.'],
      ['Battle', 'If the opponent loses this battle, they reveal their hand. Send the card with the highest deckbuilding value to their Graveyard. If two or more cards are tied for highest, choose one. If the condemned card has the Arcane trait, gain 1 Conviction.']
    ]
  },
  {
    name: 'Heresy', cost: 5, meta: 'Inquisition • Advanced', trait: 'Arcane trait',
    effects: [
      ['Battle', 'You may spend 4 Conviction. If you do, choose a card in the opponent\'s Graveyard with a Battle effect and resolve that effect as though you had played it. That Battle effect may resolve one additional card\'s Battle effect. The additional effect cannot resolve another Battle effect.']
    ]
  },
  {
    name: 'Hellfire', cost: 5, meta: 'Inquisition • Advanced',
    effects: [
      ['Action', 'Spend any amount of Conviction. For each Conviction spent, send the top card of the opponent\'s deck to their Graveyard.'],
      ['Battle', 'After Battle cards are revealed, spend any amount of Conviction. For each Conviction spent, choose one: add +1 to your battle total; or, if you win this battle, after the battle send the top card of the opponent\'s deck to their Graveyard. You may choose the same option more than once.']
    ]
  }
];

const sharedLeaderRules = [
  ['Conviction', 'You may have up to 4 Conviction. The first time each turn one or more opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction.'],
  ['Condemnation', 'In battles involving you, opposing played battle-drawn cards go to their Graveyard after the battle instead of their discard pile.'],
  ['Purification', 'At the beginning of the opponent\'s turn, after their normal draw attempt, if they draw no cards because both their deck and discard pile are empty, you win.']
];

const leaders = [
  {
    name: 'Grand Inquisitor',
    image: 'https://tymonius.github.io/Gauntlet/images/grand%20inquisitor.png',
    motto: 'We judge. We purge.',
    ability: ['Final Judgment', 'Once per turn, after you win a battle, you may immediately Purge without using your Action opportunity. Reduce that Purge\'s Conviction cost by 1, minimum 1.']
  },
  {
    name: 'Witch Hunter',
    image: 'https://tymonius.github.io/Gauntlet/images/witch%20hunter.png',
    motto: 'You ran. I followed.',
    ability: ['Relentless Pursuit', 'Once per turn, when an opponent loses a battle they initiated against you, you may spend 2 Conviction. If you do, their turn ends immediately. Then move one space toward their Heartland. If this begins a battle, resolve it immediately; you are the attacker and neither player may play an Action before that battle.']
  }
];

const references = [
  {
    name: 'Inquisition Doctrine',
    blocks: [
      ['Conviction', 'Maximum 4. The first time each turn one or more opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction.'],
      ['Condemnation', 'In battles involving you, opposing battle-drawn cards that are played go to their owner\'s Graveyard after the battle instead of their discard pile. Hand commitments already go to the Graveyard. Unplayed battle-drawn cards are discarded normally.'],
      ['Blasphemy', 'Whenever the opponent plays a card with the Arcane trait, gain 1 Conviction. This does not count toward the normal once-per-turn gain limit, but cannot exceed the maximum. The Arcane trait is distinct from Arcane faction allegiance.'],
      ['Purification', 'At the beginning of the opponent\'s turn, after their normal draw attempt, if they draw no cards because both their deck and discard pile are empty, you win. This does not trigger from failed battle draws or card-effect draws.']
    ]
  }
];

const purgeRows = [
  [1, 'Choose one: send the top card of the opponent\'s discard pile to their Graveyard; or choose up to two cards in their discard pile with a combined deckbuilding value of 2 or less and send them to their Graveyard.'],
  [2, 'Choose one opposing Asset and send it to its owner\'s Graveyard.'],
  [3, 'The opponent chooses one card from hand and sends it to their Graveyard.'],
  [4, 'Look at the opponent\'s hand. Choose one card and send it to their Graveyard.']
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

function renderDoctrineReference(reference) {
  const blocks = reference.blocks.map(([name, text]) => `
    <div class="reference-block"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(text)}</div>`).join('');

  return `<article class="print-card reference-card">
    <div class="reference-heading">${escapeHtml(reference.name)}</div>
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
    <div class="purge-intro"><strong>Purge:</strong> Instead of playing an Action card during the Action step, spend Conviction to choose one eligible Purge.</div>
    <div class="purge-list">${rows}</div>
    <div class="reference-reminder"><strong>Final Judgment:</strong> After the Grand Inquisitor wins a battle, they may immediately Purge once per turn without using the Action opportunity and reduce its cost by 1, minimum 1.</div>
    <div class="cut-note">Supplemental reference — no deckbuilding value</div>
  </article>`;
}

function renderTracker() {
  const spaces = [0, 1, 2, 3, 4].map(value => `
    <div class="conviction-space ${value === 4 ? 'maximum' : ''}">${value}</div>`).join('');

  return `<article class="print-card tracker-card" aria-label="Inquisition Conviction tracker">
    <div class="tracker-heading">Conviction</div>
    <div class="tracker-symbol" aria-hidden="true"></div>
    <div class="conviction-track">${spaces}</div>
    <div class="maximum-label">4 — Maximum Conviction</div>
    <div class="tracker-rule">Gain 1 Conviction the first time each turn one or more opposing cards enter the Graveyard after a battle involving you.</div>
    <div class="tracker-use">Begin at 0. Place one marker on the current value. Conviction cannot exceed 4 or fall below 0.</div>
    <div class="cut-note">Supplemental tracker — no deckbuilding value</div>
  </article>`;
}

function renderSheets() {
  const items = [
    ...cards.map(renderFactionCard),
    ...leaders.map(renderLeaderCard),
    ...references.map(renderDoctrineReference),
    renderPurgeReference(),
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
    let bodySize = 6.15;
    let labelSize = 5.9;
    const minBody = 4.0;
    while (card.scrollHeight > card.clientHeight && bodySize > minBody) {
      bodySize -= 0.15;
      labelSize = Math.max(3.9, labelSize - 0.12);
      card.style.setProperty('--body-size', `${bodySize.toFixed(2)}pt`);
      card.style.setProperty('--label-size', `${labelSize.toFixed(2)}pt`);
    }
  });
}

renderSheets();
requestAnimationFrame(fitCards);
window.addEventListener('load', fitCards);
