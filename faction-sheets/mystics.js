const cards = [
  {
    name: 'Dark Omens', cost: 1, meta: 'Mystics • Basic • Arcane',
    effects: [
      ['Action', 'Draw two cards, then place one of them in your Graveyard.'],
      ['Battle', 'Draw one card. You may place it in your Graveyard. If you do, gain advantage.']
    ]
  },
  {
    name: 'Accursed Wager', cost: 2, meta: 'Mystics • Basic • Arcane',
    effects: [
      ['Action', 'After the next battle you initiate this turn, the loser places one card from their hand in their Graveyard, if able.'],
      ['Battle', 'After this battle, the loser places one card from their hand in their Graveyard, if able.']
    ]
  },
  {
    name: "Fate's Toll", cost: 2, meta: 'Mystics • Basic • Arcane',
    effects: [
      ['Action', 'Place one other card from your hand in your Graveyard. Gain one additional movement this turn.'],
      ['Battle', 'After you roll, you may place one other card from your hand in your Graveyard to reroll. You must use the new result.']
    ]
  },
  {
    name: 'Grave Ward', cost: 2, meta: 'Mystics • Advanced • Arcane', form: 'Asset',
    effects: [
      ['Action', 'Bank Grave Ward as an Asset. When a card enters your Graveyard, you may discard Grave Ward. If you do, move that card from your Graveyard to your discard pile.'],
      ['Battle', 'During battle cleanup, choose one other card you committed from your hand this battle. Move it from your Graveyard to your discard pile.']
    ]
  },
  {
    name: 'Spirit Hollow', cost: 3, meta: 'Mystics • Advanced • Arcane', form: 'Overlay',
    effects: [
      ['Action', 'Place this card face up on your current Territory or an adjacent revealed Territory. It becomes an Overlay.'],
      ['Battle', 'Place this card face up on the contested Territory. It becomes an Overlay instead of entering its normal destination.'],
      ['Overlay', 'After battle cleanup following a battle here, each player may place one card from their hand in their Graveyard. A player who does may move one other card from their Graveyard to their discard pile.'],
      ['Capture', "When this Territory is captured, place this card in its owner's Graveyard."]
    ]
  },
  {
    name: 'Soul for Soul', cost: 3, meta: 'Mystics • Advanced • Arcane',
    effects: [
      ['Action', 'Choose one card in your hand and one card in your Graveyard. Exchange them.'],
      ['Battle', 'During battle cleanup, after cards committed from your hand enter your Graveyard, you may exchange one card in your hand with one other card in your Graveyard that you committed from hand in this battle.']
    ]
  },
  {
    name: 'Rend the Veil', cost: 3, meta: 'Mystics • Advanced • Arcane', form: 'Asset',
    effects: [
      ['Action', 'Bank this card as an Asset. After Battle cards are revealed in a battle involving you, you may discard this card. If you do, choose one card in your Graveyard whose Battle effect can resolve in this battle and does not play another Battle card or resolve or repeat another Battle effect. Play the chosen card as an additional Battle card.'],
      ['Battle', 'When revealed, you may choose one card in your Graveyard whose Battle effect can resolve in this battle and does not play another Battle card or resolve or repeat another Battle effect. Play the chosen card as an additional Battle card.'],
      ['Reminder', 'A card played this way is neither a hand commitment nor a battle-drawn play. During battle cleanup, move it to your discard pile instead of any other destination.']
    ]
  },
  {
    name: 'Paths of Shadow', cost: 3, meta: 'Mystics • Advanced • Arcane',
    effects: [
      ['Action', 'Move to any revealed Territory you control. This movement cannot initiate a battle.'],
      ['Battle', 'If you lose this battle, you may move to any revealed Territory you control instead of withdrawing normally.']
    ]
  },
  {
    name: 'Witchcraft', cost: 4, meta: 'Mystics • Advanced • Arcane', form: 'Asset',
    effects: [
      ['Action', 'Bank this card as an Asset. Once per turn, after Battle cards are revealed in a battle involving you, you may place one card from your hand in your Graveyard. If you do, choose one other active Battle card you played with an eligible Battle effect. That effect resolves one additional time during this battle.'],
      ['Battle', 'When revealed, choose one other active Battle card you played with an eligible Battle effect. That effect resolves one additional time during this battle. If you cannot choose one, gain advantage. During battle cleanup, place this card in your Graveyard.'],
      ['Reminder', 'An eligible Battle effect can legally resolve in this battle and does not play another Battle card or resolve or repeat another Battle effect. Make all choices and pay all costs again when it repeats.']
    ]
  },
  {
    name: 'Black Covenant', cost: 4, meta: 'Mystics • Advanced • Arcane', form: 'Asset',
    effects: [
      ['Action', 'Bind one other card from your hand face down beneath this card, then bank this card as an Asset. While banked, you may play the bound card as an Action or commit it during a battle at a legal time as though it were in your hand. This is an additional Action-card play or hand commitment. The bound card follows the normal destination for a card played or committed from hand. After the bound card resolves, place this card in your Graveyard.'],
      ['Battle', 'When revealed, you may bind one other Battle card from your hand beneath this card, then immediately commit and reveal it as an additional hand commitment. During battle cleanup, place this card in your Graveyard.'],
      ['Reminder', 'If this card leaves play while a card remains bound beneath it, place the bound card in your Graveyard.']
    ]
  },
  {
    name: 'Circle of Bones', cost: 4, meta: 'Mystics • Advanced • Arcane', form: 'Overlay',
    effects: [
      ['Action', 'Place this card face up on your current Territory or an adjacent revealed Territory. It becomes an Overlay.'],
      ['Battle', 'Place this card face up on the contested Territory. It becomes an Overlay instead of entering its normal destination.'],
      ['Overlay', 'Once during each battle here involving you, after dice are rolled, you may place one card from your hand in your Graveyard. If you do, choose either player. That player rerolls and must use the new result.'],
      ['Capture', "When this Territory is captured, place this card in its owner's Graveyard."]
    ]
  },
  {
    name: 'Necromancy', cost: 5, meta: 'Mystics • Advanced • Arcane', unique: 'Unique — maximum one copy per deck',
    effects: [
      ['Action', 'Choose one:'],
      ['Option', 'Place this card face down beneath your draw pile, then draw one card.'],
      ['Option', 'Choose up to three non-Necromancy cards in your Graveyard. Place every other card in your hand in your Graveyard, then return the chosen cards to your hand. Place this card in your Graveyard.'],
      ['Battle', 'During battle cleanup, after your other played cards follow their normal destinations, choose up to three non-Necromancy cards in your Graveyard. Place every card remaining in your hand in your Graveyard, then return the chosen cards to your hand. This card follows its normal destination.']
    ]
  }
];

const leaders = [
  {
    name: 'Alchemist', image: '../images/leader-cards/alchemist.svg', imageClass: 'alchemist', motto: 'Nothing is fixed. Everything can be transformed.',
    ability: ['Materia Prima', 'The first time on your turn that you send a card from your hand to your Graveyard as part of a Rite, Transmutation, or an Arcane card ability, draw one card. If this happens during battle, draw after the battle resolves.']
  },
  {
    name: 'Spirit Walker', image: '../images/leader-cards/spirit-walker.svg', imageClass: 'spirit-walker', motto: 'The spirits remember what the living abandon.',
    ability: ['Guardians of the Circle', 'The first time on your turn that you lose a battle and a begun Rite would be interrupted, you may send one Arcane card from your hand to your Graveyard. If you do, that Rite is not interrupted. This cannot preserve Rite of Crossing if you no longer occupy or control its required Territory.']
  }
];

const rites = [
  {
    name: 'Rite of Echoes', icon: '◉',
    beginning: 'Bind one chosen card from your Graveyard face up beneath this Rite. Then bind one card from your hand face down beneath it whose title matches at least one other card in your constructed deck.',
    completion: "On a later turn, complete this Rite when you play another card with the bound hand card's title during battle.",
    result: 'Move the selected Graveyard card to your discard pile. Place the bound hand card in your Graveyard. The completing card resolves normally.',
    interruption: 'If you lose a battle first, place both bound cards in your Graveyard and reset this Rite.'
  },
  {
    name: 'Rite of Blood', icon: '◆',
    beginning: 'Send one card from your hand to your Graveyard.',
    completion: 'On a later turn, complete this Rite when you win a battle without committing a card from hand and without playing a battle-drawn card.',
    result: 'Transmutation, Assets, Overlays, Territory effects, leader abilities, and cards played from the Graveyard do not by themselves prevent completion.',
    interruption: 'If you lose a battle first, reset this Rite.'
  },
  {
    name: 'Rite of Crossing', icon: '✦',
    requirement: 'Begin only after winning a battle that causes you to occupy a Territory the opponent controlled immediately before that battle.',
    beginning: 'Send one Arcane card from your hand to your Graveyard. If you have none, reveal your hand and send one Arcane card from your discard pile to your Graveyard instead.',
    completion: 'At the beginning of your next turn, after captures, complete this Rite if you still occupy or control that Territory.',
    interruption: 'Otherwise, reset this Rite. Heartlands do not count.'
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
    ['Rites', 'During the Action phase after movement, instead of playing an Action card, begin one incomplete Rite by paying its cost. You may have only one begun Rite at a time.'],
    leader.ability,
    ['Invocation', 'After your first completed Rite: once per turn, when you play an Arcane card, you may move one card from your Graveyard to your discard pile.'],
    ['Transmutation', 'After your second completed Rite: once per turn before dice, send one hand card to your Graveyard and add its value to your battle total.'],
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
      <div class="reference-block"><strong>Begin:</strong> During the Action phase after movement, instead of an Action card, begin one incomplete Rite and pay its cost. Only one Rite may be begun at a time.</div>
      <div class="reference-block"><strong>Timing:</strong> A Rite cannot complete on the turn it begins. Complete at most one Rite per turn. If interrupted, reset it; paid costs are not returned.</div>
      <div class="progress-grid">
        <div><span>1st Rite</span><strong>Invocation</strong></div>
        <div><span>2nd Rite</span><strong>Transmutation</strong></div>
        <div><span>3rd Rite</span><strong>Ritual Victory</strong></div>
      </div>
      <div class="reference-block"><strong>Invocation:</strong> Once per turn, when you play an Arcane card, you may move one card from your Graveyard to your discard pile.</div>
      <div class="reference-block"><strong>Transmutation:</strong> Once per turn before dice in your battle, send one hand card to your Graveyard. Add its deckbuilding value to your battle total. This is neither a hand commitment nor a battle-drawn play.</div>
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
