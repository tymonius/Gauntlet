const cards = [
  {
    name: 'Dark Omens', cost: 1, meta: 'Mystics • Basic • Arcane',
    effects: [
      ['Action', 'Draw two cards, then put one of them in your Graveyard.'],
      ['Battle', 'Draw one card. You may put it in your Graveyard. If you do, gain advantage.']
    ]
  },
  {
    name: 'Accursed Wager', cost: 2, meta: 'Mystics • Basic • Arcane',
    effects: [
      ['Action', 'After the next battle you initiate this turn, the losing player puts one card from their hand in their Graveyard, if able.'],
      ['Battle', 'After this battle, the losing player puts one card from their hand in their Graveyard, if able.']
    ]
  },
  {
    name: "Fate's Toll", cost: 2, meta: 'Mystics • Basic • Arcane',
    effects: [
      ['Action', 'Put one other card from your hand in your Graveyard. Gain one additional position of movement this turn. Resolve movement one position at a time.'],
      ['Battle', 'After you roll, you may put one other card from your hand in your Graveyard to reroll. You must use the new result.']
    ]
  },
  {
    name: 'Grave Ward', cost: 2, meta: 'Mystics • Advanced • Arcane', form: 'Asset',
    effects: [
      ['Action', 'Bank this as an Asset. When a card enters your Graveyard, you may discard this. If you do, move that card from your Graveyard to your Discard Pile.'],
      ['Battle', 'During battle cleanup, choose one other card you committed from hand during this battle. Move it from your Graveyard to your Discard Pile.']
    ]
  },
  {
    name: 'Spirit Hollow', cost: 3, meta: 'Mystics • Advanced • Arcane', form: 'Territory Overlay',
    effects: [
      ['Action', 'Place this as an Overlay on your current Territory or an adjacent Territory.'],
      ['Battle', 'Place this as an Overlay on the contested Territory instead of following its normal destination.'],
      ['Overlay', 'After battle cleanup following a battle here, each player may put one card from their hand in their Graveyard. A player who does may move one other card from their Graveyard to their Discard Pile.'],
      ['Capture', "When this Territory is captured, put this in its owner's Graveyard."]
    ]
  },
  {
    name: 'Soul for Soul', cost: 3, meta: 'Mystics • Advanced • Arcane',
    effects: [
      ['Action', 'Choose one card in your hand and one card in your Graveyard. Exchange them.'],
      ['Battle', 'During battle cleanup, after cards committed from your hand enter your Graveyard, you may exchange one card in your hand with one other card in your Graveyard that you committed from hand during this battle.']
    ]
  },
  {
    name: 'Rend the Veil', cost: 3, meta: 'Mystics • Advanced • Arcane', form: 'Asset',
    effects: [
      ['Action', 'Bank this as an Asset. After all cards in a battle involving you are revealed, you may discard this. If you do, choose one card in your Graveyard whose Battle effect can resolve in this battle and does not use another card or resolve or repeat another Battle effect. Reveal the chosen card face up and resolve its Battle effect.'],
      ['Battle', 'When revealed, you may choose one card in your Graveyard whose Battle effect can resolve in this battle and does not use another card or resolve or repeat another Battle effect. Reveal the chosen card face up and resolve its Battle effect.'],
      ['Reminder', 'A card used this way is neither a hand commitment nor a card from a Battle Hand. During battle cleanup, move it to your Discard Pile instead of any other destination.']
    ]
  },
  {
    name: 'Paths of Shadow', cost: 3, meta: 'Mystics • Advanced • Arcane',
    effects: [
      ['Action', 'Move to any Territory you control. This movement cannot initiate a battle.'],
      ['Battle', 'If you lose this battle, you may move to any Territory you control instead of retreating normally.']
    ]
  },
  {
    name: 'Witchcraft', cost: 4, meta: 'Mystics • Advanced • Arcane', form: 'Asset',
    effects: [
      ['Action', 'Bank this as an Asset. Once per turn, after all cards in a battle involving you are revealed, you may put one card from your hand in your Graveyard. If you do, choose one other active card you used in the battle with an eligible Battle effect. Resolve that effect one additional time.'],
      ['Battle', 'When revealed, choose one other active card you used in the battle with an eligible Battle effect. Resolve that effect one additional time. If you cannot choose one, gain advantage. During battle cleanup, put this in your Graveyard.'],
      ['Reminder', 'An eligible Battle effect can legally resolve in this battle and does not use another card or resolve or repeat another Battle effect. Make all choices and pay all costs again when it repeats.']
    ]
  },
  {
    name: 'Black Covenant', cost: 4, meta: 'Mystics • Advanced • Arcane', form: 'Asset with bound card',
    effects: [
      ['Action', 'Bind one other card from your hand face down beneath this, then bank this as an Asset. While banked, you may either play the bound card for its Action effect at a legal Action timing without using your normal Action Opportunity, or commit it during a battle as an additional hand commitment. The bound card follows the normal destination for a card used from hand. After the bound card resolves, put this in your Graveyard.'],
      ['Battle', 'When revealed, you may bind one other card from your hand that has a Battle effect beneath this, then immediately commit and reveal it as an additional hand commitment. During battle cleanup, put this in your Graveyard.'],
      ['Reminder', 'If this leaves play while a card remains bound beneath it, put the bound card in your Graveyard.']
    ]
  },
  {
    name: 'Circle of Bones', cost: 4, meta: 'Mystics • Advanced • Arcane', form: 'Territory Overlay',
    effects: [
      ['Action', 'Place this as an Overlay on your current Territory or an adjacent Territory.'],
      ['Battle', 'Place this as an Overlay on the contested Territory instead of following its normal destination.'],
      ['Overlay', 'Once during each battle here involving you, after dice are rolled, you may put one card from your hand in your Graveyard. If you do, choose either player. That player rerolls and must use the new result.'],
      ['Capture', "When this Territory is captured, put this in its owner's Graveyard."]
    ]
  },
  {
    name: 'Necromancy', cost: 5, meta: 'Mystics • Advanced • Arcane', unique: 'Unique — maximum one copy per Playable Deck',
    effects: [
      ['Action', 'Choose one:'],
      ['Option', 'Place this face down beneath your Draw Pile, then draw one card.'],
      ['Option', 'Choose up to three non-Necromancy cards in your Graveyard. Put every other card in your hand in your Graveyard, then return the chosen cards to your hand. Put this in your Graveyard.'],
      ['Battle', 'During battle cleanup, after your other used cards follow their normal destinations, choose up to three non-Necromancy cards in your Graveyard. Put every card remaining in your hand in your Graveyard, then return the chosen cards to your hand. This follows its normal destination.']
    ]
  }
];

const leaders = [
  {
    name: 'Alchemist', image: '../images/leader-cards/alchemist.svg', imageClass: 'alchemist', motto: 'Nothing is fixed. Everything can be transformed.',
    ability: ['Materia Prima', 'The first time on your turn that you put a card from your hand in your Graveyard as part of a Rite, Transmutation, or an Arcane card effect, draw one card. If this happens during battle, draw after the battle resolves.']
  },
  {
    name: 'Spirit Walker', image: '../images/leader-cards/spirit-walker.svg', imageClass: 'spirit-walker', motto: 'The spirits remember what the living abandon.',
    ability: ['Guardians of the Circle', 'The first time on your turn that you lose a battle and a begun Rite would be interrupted, you may put one Arcane card from your hand in your Graveyard. If you do, that Rite is not interrupted. This cannot preserve Rite of Crossing if you no longer occupy or control its required Territory.']
  }
];

const rites = [
  {
    name: 'Rite of Echoes', icon: '◉',
    beginning: 'Bind one chosen card from your Graveyard face up beneath this Rite. Then bind one card from your hand face down beneath it whose title matches at least one other card in your Playable Deck.',
    completion: "On a later turn, complete this Rite when you use another card with the bound hand card's title for its Battle effect.",
    result: 'Move the selected Graveyard card to your Discard Pile. Put the bound hand card in your Graveyard. The completing card resolves normally.',
    interruption: 'If you lose a battle first, put both bound cards in your Graveyard and reset this Rite.'
  },
  {
    name: 'Rite of Blood', icon: '◆',
    beginning: 'Put one card from your hand in your Graveyard.',
    completion: 'On a later turn, complete this Rite when you win a battle without committing a card from hand and without using a card from your Battle Hand.',
    result: 'Transmutation, Assets, Overlays, Territory effects, Leader abilities, and cards from other sources do not by themselves prevent completion.',
    interruption: 'If you lose a battle first, reset this Rite.'
  },
  {
    name: 'Rite of Crossing', icon: '✦',
    requirement: 'Begin only during the Action Opportunity after movement after winning a battle that caused you to occupy a Territory the opponent controlled immediately before that battle.',
    beginning: 'Put one Arcane card from your hand in your Graveyard. If you have none, reveal your hand and move one Arcane card from your Discard Pile to your Graveyard instead.',
    completion: 'At the start of your next turn, after the Capture step, complete this Rite if you still occupy or control that Territory.',
    interruption: 'Otherwise, reset this Rite.'
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
    <div class="effect ${label === 'Option' ? 'option-effect' : ''}">
      <span class="effect-label">${escapeHtml(label)}${label === 'Option' ? '' : ':'}</span>
      <span class="effect-text"> ${escapeHtml(text)}</span>
    </div>`).join('');

  return `<article class="print-card faction-card fit-card" data-card-name="${escapeHtml(card.name)}">
    <div class="card-header">
      <div class="card-name">${escapeHtml(card.name)}</div>
      <div class="card-cost">${card.cost}</div>
    </div>
    <div class="card-meta">${escapeHtml(card.meta)}${card.form ? ` • ${escapeHtml(card.form)}` : ''}</div>
    <div class="fit-content">${effects}</div>
    ${card.unique ? `<div class="unique">${escapeHtml(card.unique)}</div>` : ''}
  </article>`;
}

function renderLeaderCard(leader) {
  const rules = [
    ['Rites', 'During the Action Opportunity after movement, instead of playing a card for its Action effect, begin one incomplete Rite by paying its cost. You may have only one begun Rite at a time.'],
    leader.ability,
    ['Invocation', 'After your first completed Rite: once per turn, when you use an Arcane card for its Action or Battle effect, move one card from your Graveyard to your Discard Pile.'],
    ['Transmutation', 'After your second completed Rite: once per turn before dice, put one hand card in your Graveyard and add its deckbuilding value to your battle total.'],
    ['Ritual', 'Complete all three Rites to win immediately.']
  ].map(([name, text]) => `<div class="leader-rule"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(text)}</div>`).join('');

  return `<article class="print-card leader-card" data-card-name="${escapeHtml(leader.name)}">
    <div class="leader-art">
      <img class="${escapeHtml(leader.imageClass)}" src="${escapeHtml(leader.image)}" alt="${escapeHtml(leader.name)}">
      <div class="leader-faction">Mystics Leader</div>
      <div class="leader-title">${escapeHtml(leader.name.toUpperCase())}</div>
    </div>
    <div class="leader-content">
      <div class="leader-motto">${escapeHtml(leader.motto)}</div>
      ${rules}
    </div>
  </article>`;
}

function renderReference() {
  return `<article class="print-card reference-card fit-card" data-card-name="Mystics Reference">
    <div class="reference-heading">Mystics Reference</div>
    <div class="fit-content">
      <div class="reference-block"><strong>Setup:</strong> Place the three Rites incomplete side up. Completed Rites remain public and cannot be begun again.</div>
      <div class="reference-block"><strong>Begin:</strong> During the Action Opportunity after movement, instead of playing a card for its Action effect, begin one incomplete Rite and pay its cost. Only one Rite may be begun at a time.</div>
      <div class="reference-block"><strong>Timing:</strong> A Rite cannot complete on the turn it begins. Complete at most one Rite per turn. If interrupted, reset it; paid costs are not returned.</div>
      <div class="progress-grid">
        <div><span>1st Rite</span><strong>Invocation</strong></div>
        <div><span>2nd Rite</span><strong>Transmutation</strong></div>
        <div><span>3rd Rite</span><strong>Ritual Victory</strong></div>
      </div>
      <div class="reference-block"><strong>Invocation:</strong> Once per turn, when you use an Arcane card for its Action or Battle effect, move one card from your Graveyard to your Discard Pile.</div>
      <div class="reference-block"><strong>Transmutation:</strong> Once per turn before dice in your battle, put one hand card in your Graveyard. Add its deckbuilding value to your battle total. This is not a hand commitment.</div>
      <div class="reference-block"><strong>Bound cards:</strong> Outside all normal zones. Face-up bound cards are public; owners may view their face-down bound cards. They move only as instructed. If their effect ends without a destination, put them in their owner's Graveyard.</div>
    </div>
    <div class="cut-note">Supplemental reference — no deckbuilding value</div>
  </article>`;
}

function renderRite(rite, completed = false) {
  if (completed) {
    return `<article class="print-card rite-card completed-rite" data-card-name="Completed ${escapeHtml(rite.name)}">
      <div class="rite-sigil">${escapeHtml(rite.icon)}</div>
      <div class="rite-kicker">Rite Completed</div>
      <div class="rite-title">${escapeHtml(rite.name)}</div>
      <div class="completion-seal">✓</div>
      <div class="completed-copy">Keep this face up. This Rite remains completed and cannot be begun again.</div>
      <div class="completed-progress"><strong>First completed Rite:</strong> unlock Invocation.<br><strong>Second:</strong> unlock Transmutation.<br><strong>Third:</strong> immediately win by Ritual.</div>
      <div class="pair-key">${escapeHtml(rite.name)} • completed side</div>
    </article>`;
  }

  const requirement = rite.requirement ? `<div class="rite-block requirement"><strong>Requirement:</strong> ${escapeHtml(rite.requirement)}</div>` : '';
  return `<article class="print-card rite-card fit-card" data-card-name="${escapeHtml(rite.name)}">
    <div class="rite-sigil">${escapeHtml(rite.icon)}</div>
    <div class="rite-kicker">Incomplete Rite</div>
    <div class="rite-title">${escapeHtml(rite.name)}</div>
    <div class="fit-content">
      ${requirement}
      <div class="rite-block"><strong>Beginning cost:</strong> ${escapeHtml(rite.beginning)}</div>
      <div class="rite-block"><strong>Completion:</strong> ${escapeHtml(rite.completion)}</div>
      ${rite.result ? `<div class="rite-block"><strong>On completion:</strong> ${escapeHtml(rite.result)}</div>` : ''}
      <div class="rite-block interruption"><strong>Interrupted:</strong> ${escapeHtml(rite.interruption)}</div>
    </div>
    <div class="pair-key">${escapeHtml(rite.name)} • incomplete side</div>
  </article>`;
}

function renderSheets() {
  const pageTwo = [
    ...cards.slice(9).map(renderFactionCard),
    ...leaders.map(renderLeaderCard),
    renderReference(),
    ...rites.map(rite => renderRite(rite, false))
  ];
  const pageThree = [
    ...Array.from({ length: 6 }, () => '<div class="print-card placeholder-card"></div>'),
    ...[2, 1, 0].map(index => renderRite(rites[index], true))
  ];
  const pages = [
    { items: cards.slice(0, 9).map(renderFactionCard), className: 'playable-sheet' },
    { items: pageTwo, className: 'rite-front-sheet' },
    { items: pageThree, className: 'rite-back-sheet' }
  ];

  const root = document.getElementById('sheets');
  pages.forEach(page => {
    const items = [...page.items];
    while (items.length < 9) items.push('<div class="print-card placeholder-card"></div>');
    root.insertAdjacentHTML('beforeend', `<section class="sheet ${page.className}">${items.join('')}</section>`);
  });
}

function fitCards() {
  const results = [];
  document.querySelectorAll('.fit-card').forEach(card => {
    const isRite = card.classList.contains('rite-card');
    const isReference = card.classList.contains('reference-card');
    let bodySize = isRite ? 5.65 : (isReference ? 5.1 : 6.15);
    let labelSize = isRite ? 5.2 : (isReference ? 4.8 : 5.72);
    const minBody = isRite ? 4.45 : (isReference ? 4.2 : 4.35);

    card.style.setProperty('--body-size', `${bodySize.toFixed(2)}pt`);
    card.style.setProperty('--label-size', `${labelSize.toFixed(2)}pt`);

    while (card.scrollHeight > card.clientHeight && bodySize > minBody) {
      bodySize = Math.max(minBody, bodySize - 0.08);
      labelSize = Math.max(4.05, labelSize - 0.065);
      card.style.setProperty('--body-size', `${bodySize.toFixed(2)}pt`);
      card.style.setProperty('--label-size', `${labelSize.toFixed(2)}pt`);
    }

    results.push({
      name: card.dataset.cardName,
      fontSize: Number(bodySize.toFixed(2)),
      labelSize: Number(labelSize.toFixed(2)),
      fits: card.scrollHeight <= card.clientHeight,
      overflow: card.scrollHeight - card.clientHeight
    });
  });
  window.__cardFitResults = results;
}

renderSheets();
window.addEventListener('load', fitCards);
