const cards = [
  { name: 'Clemency', cost: 1, meta: 'Diplomats • Basic', effects: [['Action', 'Choose a card in the opponent\'s Graveyard. They choose one: move it to their discard pile; you gain 1 Influence; or leave it there; you draw one card.']] },
  { name: 'Trade Concessions', cost: 2, meta: 'Diplomats • Advanced', effects: [['Terms', 'When you offer Terms, before the opponent accepts or refuses, you may reveal this from hand and set it aside.'], ['Accepted', 'The opponent chooses one available option: draw two cards; or bank an Asset from hand without using an Action. Then discard this and draw one card.'], ['Refused', 'Return this to your hand before battle.'], ['Battle', 'The opponent draws one card. Gain +2 battle total.']] },
  { name: 'Safe Conduct', cost: 2, meta: 'Diplomats • Advanced • Asset', effects: [['Action', 'Bank this as an Asset.'], ['Reaction', 'When you would lose a battle following refused Terms, you may discard this to withdraw instead. The opponent remains in or occupies the battle space, and the battle ends without a winner.']] },
  { name: 'Neutral Observers', cost: 2, meta: 'Diplomats • Advanced • Asset', effects: [['Action', 'Bank this as an Asset.'], ['Reaction', 'After Terms are refused, before either player commits from hand, you may discard this. The opponent first commits a Battle card from hand face up or declines to commit; then you commit normally.']] },
  { name: 'Good Faith', cost: 3, meta: 'Diplomats • Advanced • Asset', effects: [['Action', 'Bank this as an Asset.'], ['Terms', 'When you offer Terms, before the opponent accepts or refuses, you may discard this to draw one card, then reveal a card from hand and set it aside.'], ['Accepted', 'Put that card in your Graveyard.'], ['Refused', 'Return it to your hand before battle.']] },
  { name: 'Demilitarized Zone', cost: 3, meta: 'Diplomats • Advanced • Territory Overlay', effects: [['Settlement', 'After your Terms are accepted and the Proposal\'s Accepted effect resolves, you may play this on the battle Territory without using an Action. Each player still there withdraws.'], ['Overlay', 'Neither player may enter this Territory during the turn this is placed. To enter it while unoccupied, discard one card. It cannot be captured or change control while this remains. At the start of your turn, before captures, if you occupy it, discard one card or withdraw. After the first battle here, discard this.']] },
  { name: 'Diplomatic Latitude', cost: 3, meta: 'Diplomats • Advanced', effects: [['Terms', 'When you offer Terms, you may reveal this from hand and offer two eligible Proposals with the same Influence Stake instead of one. Stake that amount once.'], ['Accepted', 'The opponent chooses which Proposal is accepted.'], ['Refused', 'Choose one Proposal before resolving its Refused effect. Only it may be imposed.'], ['Cleanup', 'The other Proposal does not resolve or become ratified. After Terms resolve, discard this.']] },
  { name: 'Nonbinding Resolution', cost: 3, meta: 'Diplomats • Advanced', effects: [['Terms', 'When you offer Terms, before the opponent accepts or refuses, you may reveal this from hand and set it aside.'], ['Accepted', 'If the Proposal is unratified, the opponent chooses one before ratification: ratify it normally; or leave it unratified and you gain 2 Influence. After Terms resolve, discard this, then draw one card.'], ['Refused', 'Discard this, then draw one card before battle.']] },
  { name: 'Sanctions: Censure', cost: 3, meta: 'Diplomats • Advanced • Asset • Sanction', effects: [['Sanction', 'After an opponent refuses your Terms, you may bank this from hand without using an Action.'], ['Asset', 'While banked, the first time each turn that opponent plays an Action card, they choose: discard one card, or you draw one card.'], ['Relief', 'After they accept your Terms, discard this.']] },
  { name: 'Gunboat Diplomacy', cost: 4, meta: 'Diplomats • Advanced', effects: [['Terms', 'When you offer Terms, before the opponent accepts or refuses, you may reveal this from hand.'], ['Accepted', 'Discard this.'], ['Refused', 'Play this face up in the resulting battle as an additional Battle card from hand.'], ['Battle', 'Gain +2 battle total. After the battle, discard this.']] },
  { name: 'Sanctions: Embargo', cost: 4, meta: 'Diplomats • Advanced • Asset • Sanction', effects: [['Sanction', 'After an opponent refuses your Terms, you may bank this from hand without using an Action.'], ['Asset', 'While banked, that opponent\'s Asset-bank limit is reduced by 1, to a minimum of 0.'], ['Relief', 'After they accept your Terms, discard this.']] },
  { name: 'Sanctions: Blockade', cost: 5, meta: 'Diplomats • Advanced • Territory Overlay • Sanction', effects: [['Sanction', 'After the battle following an opponent\'s refusal of your Terms, you may play this on a revealed Territory they control without using an Action.'], ['Overlay', 'The first time each turn they enter or leave this Territory, they choose: discard one card, or you gain 1 Influence.'], ['Relief', 'Discard this after they accept your Terms or lose control of this Territory.']] }
];

const leaders = [
  { name: 'Ambassador', image: '../images/leader-cards/ambassador.jpg', motto: 'Words first. War last.', abilityName: 'Cordiality', ability: 'Once per turn, after the opponent accepts your Terms, draw one card.' },
  { name: 'Senator', image: '../images/leader-cards/senator.jpg', motto: 'Procedure endures.', abilityName: 'Political Capital', ability: 'Once per turn, when you would lose staked Influence after losing a battle following refused Terms, you may send up to that many cards from hand to your Graveyard. Recover 1 staked Influence per card sent; lose the rest.' }
];

const proposals = [
  { number: 1, name: 'De-escalation', stake: 0, accepted: 'Both players withdraw. The opponent draws one card.', refused: 'Draw one card.' },
  { number: 2, name: 'Orderly Withdrawal', stake: 0, requirement: 'You must be attacking.', accepted: 'You withdraw. The opponent remains in or occupies the battle space, then draws one card.', refused: 'Gain +1 battle total.' },
  { number: 3, name: 'Capitulation', stake: 0, requirement: 'You must be defending.', accepted: 'You withdraw. The opponent remains in or occupies the battle space, then draws one card.', refused: 'If you lose, draw two cards.' },
  { number: 4, name: 'Open Channels', stake: 1, requirement: 'You must have a card in hand.', accepted: 'Both players reveal their hands, then withdraw. The opponent draws one card.', refused: 'Look at the opponent\'s hand. During battle draw, draw one additional card before choosing your battle-drawn card.' },
  { number: 5, name: 'Mutual Disarmament', stake: 1, requirement: 'Both players must have a card in hand.', accepted: 'Each player discards one card from hand. The opponent draws one card, then both players withdraw.', refused: 'You may discard one card from hand. If you do, during battle draw, draw one additional card before choosing your battle-drawn card.' },
  { number: 6, name: 'Prisoner Exchange', stake: 1, requirement: 'Each player must have a card in their Graveyard.', accepted: 'Each player may move one card from their Graveyard to their discard pile. Then both players withdraw.', refused: 'If you lose, you may move one card from your Graveyard to your discard pile.' },
  { number: 7, name: 'Rebuilding Pact', stake: 1, requirement: 'You must have a card in hand that can be banked as an Asset.', accepted: 'Each player may bank one Asset from hand without using an Action. Then both players withdraw.', refused: 'After the battle, you may bank one Asset from hand without using an Action.' },
  { number: 8, name: 'Ultimatum', stake: 2, accepted: 'The opponent withdraws. You remain in or occupy the battle space.', refused: 'Gain +1 battle total. If you win and newly ratify this Proposal, gain 2 Influence instead of 1.' },
  { number: 9, name: 'Diplomatic Recognition', stake: 2, requirement: 'You must be defending a counterattack on a Territory you occupy that the opponent controlled immediately before you occupied it.', accepted: 'Capture that Territory immediately. The opponent withdraws, then draws two cards.', refused: 'If you win, capture that Territory immediately, but gain no Influence for imposing this Proposal.' }
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
  </article>`;
}

function renderLeaderCard(leader) {
  return `<article class="print-card leader-card" data-card-name="${escapeHtml(leader.name)}">
    <div class="leader-art">
      <img src="${escapeHtml(leader.image)}" alt="${escapeHtml(leader.name)}">
      <div class="leader-faction">Diplomat Leader</div>
      <div class="leader-title">${escapeHtml(leader.name.toUpperCase())}</div>
    </div>
    <div class="leader-content">
      <div class="leader-motto">${escapeHtml(leader.motto)}</div>
      <div class="leader-rule"><strong>Setup:</strong> Set Influence to 1. Place your nine Proposal cards Proposal side up.</div>
      <div class="leader-rule"><strong>Leverage:</strong> Before dice in a battle following refused Terms, you may spend any amount of available Influence. Gain +1 battle total per Influence spent.</div>
      <div class="leader-rule"><strong>${escapeHtml(leader.abilityName)}:</strong> ${escapeHtml(leader.ability)}</div>
      <div class="leader-rule"><strong>Peace Treaty:</strong> At the start of your turn, after captures, if five different Proposals are ratified, you win.</div>
    </div>
  </article>`;
}

function renderProposal(proposal, treaty = false) {
  return `<article class="print-card proposal-card ${treaty ? 'treaty' : ''} fit-card" data-card-name="${escapeHtml(treaty ? `Treaty Article ${proposal.number}: ${proposal.name}` : `Proposal ${proposal.number}: ${proposal.name}`)}">
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
  return `<article class="print-card reference-card fit-card" data-card-name="Diplomat Reference — Offering Terms">
    <div class="reference-heading">DIPLOMAT REFERENCE</div>
    <div class="reference-subtitle">Side A — Offering Terms</div>
    <div class="fit-content">
      <div class="reference-step"><strong>Before a battle involving you:</strong></div>
      <ol class="reference-list"><li>Choose an eligible Proposal.</li><li>Lower Influence by its listed Stake.</li><li>The opponent accepts or refuses.</li></ol>
      <div class="reference-block"><strong>Accepted:</strong> No battle occurs. Resolve the Accepted effect and return the stake. If newly ratified, flip the Proposal and gain Influence equal to its Stake.</div>
      <div class="reference-block"><strong>Refused:</strong> Resolve the Refused effect, then battle. Before dice, you may use Leverage.</div>
      <ul class="reference-list"><li><strong>You win:</strong> Impose the Proposal and return the stake. If newly ratified, flip it and gain 1 Influence unless stated otherwise.</li><li><strong>You lose:</strong> Do not ratify it. Lose the stake.</li><li><strong>No winner:</strong> Do not ratify it. Return the stake.</li></ul>
    </div><div class="pair-key">Reference side A • Pair with Reference side B</div>
  </article>`;
}

function renderReferenceB() {
  return `<article class="print-card reference-card fit-card" data-card-name="Diplomat Reference — Influence and Treaty">
    <div class="reference-heading">INFLUENCE & TREATY</div><div class="reference-subtitle">Side B — Resource and Victory</div>
    <div class="fit-content"><div class="reference-block"><strong>Influence:</strong> Track available Influence from 0 to 10. Excess gains are lost.</div><div class="reference-block"><strong>Staking:</strong> Lower the tracker by the Proposal’s Stake. That Influence is unavailable until Terms resolve.</div><div class="reference-block"><strong>Leverage:</strong> Before dice in a battle following refused Terms, spend any amount of available Influence for +1 battle total each.</div><div class="reference-block"><strong>Treaty Articles:</strong> A ratified Proposal may be offered again, but cannot be ratified again or grant normal newly-ratified Influence rewards.</div><div class="reference-block"><strong>Peace Treaty:</strong> At the start of your turn, after captures, five different Treaty Articles win the game.</div></div>
    <div class="pair-key">Reference side B • Pair with Reference side A</div>
  </article>`;
}

function renderTracker() {
  const steps = Array.from({ length: 10 }, (_, index) => {
    const value = index + 1;
    return `<div class="influence-step" style="bottom:${(value * 0.30).toFixed(2)}in"><span class="influence-number">${value}</span><span class="influence-label">Influence</span></div>`;
  }).join('');

  return `<article class="print-card tracker-card" data-card-name="Diplomat Influence Tracker" aria-label="Diplomat Influence tracker">
    <div class="tracker-heading">DIPLOMAT INFLUENCE</div>
    <div class="tracker-crest">❧</div>
    <div class="tracker-note">Slide your Leader Card until its lower edge aligns with your current Influence. Fully cover this card at 0. Maximum 10.</div>
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
  const results = [];
  document.querySelectorAll('.fit-card').forEach(card => {
    const content = card.querySelector('.fit-content');
    const isProposal = card.classList.contains('proposal-card');
    const isReference = card.classList.contains('reference-card');
    let bodySize = isReference ? 5.8 : (isProposal ? 6.9 : 7.2);
    let labelSize = isReference ? 5.5 : (isProposal ? 6.25 : 6.6);
    const minBody = isReference ? 4.8 : (isProposal ? 5.25 : 5.5);

    card.style.setProperty('--body-size', `${bodySize.toFixed(2)}pt`);
    card.style.setProperty('--label-size', `${labelSize.toFixed(2)}pt`);

    while (card.scrollHeight > card.clientHeight && bodySize > minBody) {
      bodySize = Math.max(minBody, bodySize - 0.1);
      labelSize = Math.max(isReference ? 4.6 : 5.1, labelSize - 0.08);
      card.style.setProperty('--body-size', `${bodySize.toFixed(2)}pt`);
      card.style.setProperty('--label-size', `${labelSize.toFixed(2)}pt`);
      if (isReference) {
        card.querySelectorAll('.reference-step, .reference-block, .reference-list li').forEach(node => {
node.style.fontSize = `${bodySize.toFixed(2)}pt`;
        });
      }
    }

    if (card.scrollHeight > card.clientHeight && content) content.style.lineHeight = '1.02';
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
