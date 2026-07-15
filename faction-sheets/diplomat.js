const cards = [
  {
    name: 'Clemency', cost: 1, meta: 'Diplomats • Basic',
    effects: [
      ['Action', 'Choose one card in the opponent\'s Graveyard. The opponent chooses one: move that card to their discard pile; if they do, gain 1 Influence; or leave that card in their Graveyard; if they do, draw one card.']
    ]
  },
  {
    name: 'Trade Concessions', cost: 2, meta: 'Diplomats • Advanced',
    effects: [
      ['Terms', 'When you offer Terms, before the opponent accepts or refuses, you may reveal Trade Concessions from your hand and set it aside.'],
      ['Accepted', 'The opponent chooses one available option: draw two cards; or bank one Asset from their hand without using an Action. Then discard Trade Concessions.'],
      ['Refused', 'Return Trade Concessions to your hand before the resulting battle.'],
      ['Battle', 'The opponent draws one card. Gain +2 to your battle total.']
    ]
  },
  {
    name: 'Safe Conduct', cost: 2, meta: 'Diplomats • Advanced • Asset',
    effects: [
      ['Action', 'Bank Safe Conduct as an Asset.'],
      ['Reaction', 'When you would lose a battle following refused Terms, you may discard Safe Conduct. If you do, withdraw instead. The opponent remains in or occupies the battle space, and the battle ends without a winner.']
    ]
  },
  {
    name: 'Neutral Observers', cost: 2, meta: 'Diplomats • Advanced • Asset',
    effects: [
      ['Action', 'Bank Neutral Observers as an Asset.'],
      ['Reaction', 'After Terms are refused, before either player commits a Battle card from hand, you may discard Neutral Observers. Your opponent must first either commit a Battle card from hand face up or decline to commit. Then you may commit normally.']
    ]
  },
  {
    name: 'Good Faith', cost: 3, meta: 'Diplomats • Advanced • Asset',
    effects: [
      ['Action', 'Bank Good Faith as an Asset.'],
      ['Terms', 'When you offer Terms, before the opponent accepts or refuses, you may discard Good Faith. If you do, draw one card, then reveal one card from your hand and set it aside as the offered card.'],
      ['Accepted', 'Send the offered card to your Graveyard.'],
      ['Refused', 'Return the offered card to your hand before the resulting battle.']
    ]
  },
  {
    name: 'Demilitarized Zone', cost: 3, meta: 'Diplomats • Advanced • Territory Overlay',
    effects: [
      ['Settlement', 'After Terms you offered are accepted and the Proposal\'s accepted effect resolves, you may play Demilitarized Zone on the battle Territory without using an Action. Each player still on that Territory withdraws.'],
      ['Overlay', 'Neither player may enter this Territory during the turn Demilitarized Zone is placed. To enter this Territory while it is unoccupied, discard one card. This Territory cannot be captured or change control while Demilitarized Zone remains. At the start of your turn, before captures, if you are on this Territory, discard one card or withdraw. After the first battle fought on this Territory, discard Demilitarized Zone.']
    ]
  },
  {
    name: 'Diplomatic Latitude', cost: 3, meta: 'Diplomats • Advanced',
    effects: [
      ['Terms', 'When you offer Terms, you may reveal Diplomatic Latitude from your hand and choose two eligible Proposals with the same Influence Stake instead of one. Stake that amount once.'],
      ['Accepted', 'The opponent chooses one of those Proposals to be accepted. The other has no effect and is not ratified.'],
      ['Refused', 'Choose one of those Proposals before resolving its refused effect. The chosen Proposal is the one that may be imposed; the other has no effect and is not ratified.'],
      ['Cleanup', 'After the Terms resolve, discard Diplomatic Latitude.']
    ]
  },
  {
    name: 'Nonbinding Resolution', cost: 3, meta: 'Diplomats • Advanced',
    effects: [
      ['Terms', 'When you offer Terms, before the opponent accepts or refuses, you may reveal Nonbinding Resolution from your hand and set it aside.'],
      ['Accepted', 'Before the Proposal would be ratified, if it has not already been ratified, the opponent chooses one: ratify it normally; or do not ratify it, and you gain 2 Influence. If it is ratified, resolve the normal accepted newly-ratified Influence reward. After the accepted Terms resolve, discard Nonbinding Resolution.'],
      ['Refused', 'Discard Nonbinding Resolution, then draw one card before the resulting battle.']
    ]
  },
  {
    name: 'Censure', cost: 3, meta: 'Diplomats • Advanced • Asset • Sanction',
    effects: [
      ['Sanction', 'After an opponent refuses Terms you offered, you may bank Censure from your hand without using an Action.'],
      ['Asset', 'While Censure is banked, the first time each turn that opponent plays an Action card, they choose one: discard one card; or you draw one card.'],
      ['Relief', 'After that opponent accepts Terms you offered, discard Censure.']
    ]
  },
  {
    name: 'Gunboat Diplomacy', cost: 4, meta: 'Diplomats • Advanced',
    effects: [
      ['Terms', 'When you offer Terms, before the opponent accepts or refuses, you may reveal Gunboat Diplomacy from your hand.'],
      ['Accepted', 'Discard Gunboat Diplomacy.'],
      ['Refused', 'Play Gunboat Diplomacy face up in the resulting battle without counting against the number of Battle cards you may play from hand.'],
      ['Battle', 'Gain +2 to your battle total. After the battle, discard Gunboat Diplomacy instead of sending it to the Graveyard.']
    ]
  },
  {
    name: 'Embargo', cost: 4, meta: 'Diplomats • Advanced • Asset • Sanction',
    effects: [
      ['Sanction', 'After an opponent refuses Terms you offered, you may bank Embargo from your hand without using an Action.'],
      ['Asset', 'While Embargo is banked, that opponent\'s Asset-bank limit is reduced by 1, to a minimum of 0.'],
      ['Relief', 'After that opponent accepts Terms you offered, discard Embargo.']
    ]
  },
  {
    name: 'Blockade', cost: 5, meta: 'Diplomats • Advanced • Territory Overlay • Sanction',
    effects: [
      ['Sanction', 'After an opponent refuses Terms you offered, after the resulting battle, you may play Blockade on a revealed Territory they control without using an Action.'],
      ['Overlay', 'The first time each turn that opponent enters or leaves this Territory, they choose one: discard one card; or you gain 1 Influence.'],
      ['Relief', 'Discard Blockade after that opponent accepts Terms you offered or loses control of this Territory.']
    ]
  }
];

const leaders = [
  {
    name: 'Ambassador', image: '../images/ambassador.png', motto: 'Words first. War last.',
    abilityName: 'Cordiality',
    ability: 'Once per turn, after the opponent accepts Terms you offered, draw one card.'
  },
  {
    name: 'Senator', image: '../images/senator.png', motto: 'Procedure endures.',
    abilityName: 'Political Capital',
    ability: 'Once per turn, when you would lose staked Influence because you lost the battle after refused Terms, you may send up to that many cards from your hand to your Graveyard. Recover 1 of that staked Influence for each card sent this way; lose the rest.'
  }
];

const proposals = [
  { number: 1, name: 'De-escalation', stake: 0, accepted: 'Both players withdraw. The opponent draws one card.', refused: 'Draw one card.' },
  { number: 2, name: 'Orderly Withdrawal', stake: 0, requirement: 'You must be attacking.', accepted: 'You withdraw. The opponent remains in or occupies the battle space. The opponent draws one card.', refused: 'Gain +1 to your battle total in the resulting battle.' },
  { number: 3, name: 'Capitulation', stake: 0, requirement: 'You must be defending.', accepted: 'You withdraw. The opponent remains in or occupies the battle space. The opponent draws one card.', refused: 'If you lose the resulting battle, draw two cards.' },
  { number: 4, name: 'Open Channels', stake: 1, requirement: 'You must have at least one card in hand.', accepted: 'Each player reveals their hand. Then both players withdraw. The opponent draws one card.', refused: 'Look at the opponent\'s hand. During this battle\'s battle draw, draw one additional card before choosing which battle-drawn card to play.' },
  { number: 5, name: 'Mutual Disarmament', stake: 1, requirement: 'Both players must have at least one card in hand.', accepted: 'Each player discards one card from hand. Then the opponent draws one card. Both players withdraw.', refused: 'You may discard one card from hand. If you do, during this battle\'s battle draw, draw one additional card before choosing which battle-drawn card to play.' },
  { number: 6, name: 'Prisoner Exchange', stake: 1, requirement: 'Each player must have at least one card in their Graveyard.', accepted: 'Each player may move one card from their Graveyard to their discard pile. Then both players withdraw.', refused: 'If you lose the resulting battle, you may move one card from your Graveyard to your discard pile.' },
  { number: 7, name: 'Rebuilding Pact', stake: 1, requirement: 'You must have a card in hand that can be banked as an Asset.', accepted: 'Each player may bank one Asset from hand without using an Action. Then both players withdraw.', refused: 'After the battle, you may bank one Asset from hand without using an Action.' },
  { number: 8, name: 'Ultimatum', stake: 2, accepted: 'The opponent withdraws. You remain in or occupy the battle space.', refused: 'Gain +1 to your battle total in the resulting battle. If you win, gain 2 Influence instead of the default 1 Influence for imposing a newly ratified Proposal.' },
  { number: 9, name: 'Diplomatic Recognition', stake: 2, requirement: 'You must be defending a counterattack while occupying a Territory the opponent controlled immediately before you occupied it.', accepted: 'Capture that Territory immediately. The opponent withdraws, then draws two cards.', refused: 'Fight normally. If you win, capture that Territory immediately. Gain no Influence for imposing this Proposal.' }
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
  </article>`;
}

function renderLeaderCard(leader) {
  return `<article class="print-card leader-card">
    <div class="leader-art" style="background-image:url('${escapeHtml(leader.image)}')" role="img" aria-label="${escapeHtml(leader.name)}">
      <div class="leader-faction">Diplomat Leader</div>
      <div class="leader-title">${escapeHtml(leader.name.toUpperCase())}</div>
    </div>
    <div class="leader-content">
      <div class="leader-motto">${escapeHtml(leader.motto)}</div>
      <div class="leader-rule"><strong>Setup:</strong> Place your Influence Tracker beneath this card and set it to 1. Place your nine Proposal cards Proposal side up.</div>
      <div class="leader-rule"><strong>Leverage:</strong> Before dice are rolled in a battle following refused Terms, you may spend any amount of available Influence. Gain +1 to your battle total for each Influence spent.</div>
      <div class="leader-rule"><strong>${escapeHtml(leader.abilityName)}:</strong> ${escapeHtml(leader.ability)}</div>
      <div class="leader-rule"><strong>Peace Treaty:</strong> At the start of your turn, after captures, if five different Proposals are ratified as Treaty Articles, you win.</div>
    </div>
  </article>`;
}

function renderProposal(proposal, treaty = false) {
  return `<article class="print-card proposal-card ${treaty ? 'treaty' : ''} fit-card">
    <div class="proposal-banner">${treaty ? 'Ratified Treaty Article' : 'Proposal'}</div>
    <div class="proposal-title-row">
      <div>
        <div class="proposal-number">Article ${proposal.number}</div>
        <div class="proposal-title">${escapeHtml(proposal.name)}</div>
      </div>
      <div class="stake-seal">${proposal.stake}</div>
    </div>
    ${proposal.requirement ? `<div class="requirement"><strong>Requirement:</strong> ${escapeHtml(proposal.requirement)}</div>` : ''}
    <div class="fit-content">
      <div class="proposal-effect"><strong>Accepted:</strong> ${escapeHtml(proposal.accepted)}</div>
      <div class="proposal-effect"><strong>Refused:</strong> ${escapeHtml(proposal.refused)}</div>
    </div>
    <div class="pair-key">Pair ${proposal.number} • ${treaty ? 'Treaty Article side' : 'Proposal side'} • Full rules remain active</div>
  </article>`;
}

function renderReferenceA() {
  return `<article class="print-card reference-card fit-card">
    <div class="reference-heading">DIPLOMAT REFERENCE</div>
    <div class="reference-subtitle">Side A — Offering Terms</div>
    <div class="fit-content">
      <div class="reference-step"><strong>Before a battle involving you:</strong></div>
      <ol class="reference-list">
        <li>Choose one eligible Proposal.</li>
        <li>Lower your Influence Tracker by its listed Stake. That Influence is staked and unavailable until the Terms resolve.</li>
        <li>The opponent accepts or refuses.</li>
      </ol>
      <div class="reference-block"><strong>Accepted:</strong> No battle occurs. Resolve the Accepted effect. If newly ratified, flip the Proposal. Return the stake on the tracker, then gain Influence equal to its listed Stake.</div>
      <div class="reference-block"><strong>Refused:</strong> Resolve the Refused effect and fight. Before dice, you may use Leverage.</div>
      <ul class="reference-list">
        <li><strong>You win:</strong> Impose and, if new, ratify. Return the stake. If newly ratified, gain 1 Influence unless the Proposal says otherwise.</li>
        <li><strong>You lose:</strong> Do not ratify. The tracker already reflects the lost stake. Political Capital may recover it.</li>
        <li><strong>No winner:</strong> Do not ratify. Return the stake on the tracker.</li>
      </ul>
    </div>
    <div class="pair-key">Reference side A • Pair with Reference side B</div>
  </article>`;
}

function renderReferenceB() {
  return `<article class="print-card reference-card fit-card">
    <div class="reference-heading">INFLUENCE & TREATY</div>
    <div class="reference-subtitle">Side B — Resource and Victory</div>
    <div class="fit-content">
      <div class="reference-block"><strong>Influence:</strong> Track available Influence from 0 to 10 by sliding your Leader Card over the Influence Tracker.</div>
      <div class="reference-block"><strong>Staking:</strong> Lower the tracker by the offered Proposal’s listed Stake. Only available Influence may be staked or spent.</div>
      <div class="reference-block"><strong>Leverage:</strong> Before dice in a battle following refused Terms, spend any amount of available Influence for +1 battle total each.</div>
      <div class="reference-block"><strong>Accepted newly ratified Proposal:</strong> Return the stake and gain additional Influence equal to the listed Stake.</div>
      <div class="reference-block"><strong>Imposed newly ratified Proposal:</strong> Return the stake and normally gain 1 Influence.</div>
      <div class="reference-block"><strong>Already-ratified Proposal:</strong> May be offered again, but cannot count again or generate either normal newly-ratified Influence reward.</div>
      <div class="reference-block"><strong>Peace Treaty:</strong> At the start of your turn, after captures, five different Treaty Articles win the game.</div>
    </div>
    <div class="pair-key">Reference side B • Pair with Reference side A</div>
  </article>`;
}

function renderTracker() {
  const steps = Array.from({ length: 10 }, (_, index) => {
    const value = index + 1;
    return `<div class="influence-step" style="bottom:${(value * 0.30).toFixed(2)}in"><span class="influence-number">${value}</span><span class="influence-label">Influence</span></div>`;
  }).join('');

  return `<article class="print-card tracker-card" aria-label="Diplomat Influence tracker">
    <div class="tracker-heading">DIPLOMAT INFLUENCE</div>
    <div class="tracker-crest">❧</div>
    <div class="tracker-note">Place beneath the selected Leader Card. Fully align at 0; slide the Leader upward until its bottom edge aligns with the current Influence line.</div>
    ${steps}
    <div class="tracker-zero">0 — FULLY COVERED</div>
    <div class="cut-note">Supplemental card — no deckbuilding value</div>
  </article>`;
}

function renderSheets() {
  const treatyBackOrder = [2, 1, 0, 5, 4, 3, 8, 7, 6];
  const pages = [
    { items: cards.slice(0, 9).map(renderFactionCard) },
    {
      items: [
        ...cards.slice(9).map(renderFactionCard),
        ...leaders.map(renderLeaderCard),
        renderReferenceA(),
        renderReferenceB(),
        renderTracker()
      ]
    },
    { items: proposals.map(proposal => renderProposal(proposal, false)), className: 'proposal-front-sheet' },
    { items: treatyBackOrder.map(index => renderProposal(proposals[index], true)), className: 'proposal-back-sheet' }
  ];

  const root = document.getElementById('sheets');
  pages.forEach(page => {
    const pageItems = [...page.items];
    while (pageItems.length < 9) pageItems.push('<div class="print-card placeholder-card"></div>');
    root.insertAdjacentHTML('beforeend', `<section class="sheet ${page.className || ''}">${pageItems.join('')}</section>`);
  });
}

function fitCards() {
  document.querySelectorAll('.fit-card').forEach(card => {
    const content = card.querySelector('.fit-content');
    let bodySize = card.classList.contains('proposal-card') ? 6.15 : 6.25;
    let labelSize = 5.9;
    const minBody = card.classList.contains('reference-card') ? 4.25 : 4.05;
    while (card.scrollHeight > card.clientHeight && bodySize > minBody) {
      bodySize -= 0.14;
      labelSize = Math.max(3.9, labelSize - 0.11);
      card.style.setProperty('--body-size', `${bodySize.toFixed(2)}pt`);
      card.style.setProperty('--label-size', `${labelSize.toFixed(2)}pt`);
      if (card.classList.contains('reference-card')) {
        card.querySelectorAll('.reference-step, .reference-block, .reference-list li').forEach(node => {
          node.style.fontSize = `${Math.max(4.15, bodySize - 0.55).toFixed(2)}pt`;
        });
      }
    }
    if (card.scrollHeight > card.clientHeight && content) content.style.lineHeight = '1.02';
  });
}

renderSheets();
window.addEventListener('load', fitCards);
