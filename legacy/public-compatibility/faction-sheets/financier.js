const cards = [
  {
    name: 'Speculation', cost: 1, meta: 'Financiers • Advanced',
    effects: [
      ['Action', 'Choose one Territory you neither control nor occupy. Place this face up beside that Territory. At the start of your next turn, if you occupy or control that Territory, gain 2 Capital and discard this. Otherwise, put this in your Graveyard.'],
      ['Battle', 'If you initiated this battle, you may spend 1 Capital. If you do and win, gain 2 Capital during battle cleanup. If you do and do not win, put this in your Graveyard instead of its normal destination.']
    ]
  },
  {
    name: 'Monetary Crisis', cost: 2, meta: 'Financiers • Basic',
    effects: [
      ['Action', 'Each player discards their hand, then draws two cards.'],
      ['Battle', 'During battle cleanup, each player with more than one card in hand chooses one of those cards and discards the rest.']
    ]
  },
  {
    name: 'Liquidation', cost: 2, meta: 'Financiers • Advanced',
    effects: [
      ['Action', 'Choose one card in your Treasury and put it in your Discard Pile. Gain Capital equal to its deckbuilding value, then you may immediately buy or buy out one Deed.'],
      ['Battle', 'Before dice are rolled, you may choose one card in your Treasury and put it in your Discard Pile. If you do, gain Capital equal to its deckbuilding value, then you may immediately Subsidize.']
    ]
  },
  {
    name: 'Underwriting', cost: 2, meta: 'Financiers • Advanced', form: 'Asset',
    effects: [
      ['Action', 'Bank this as an Asset. After you lose a battle in which you used Subsidize, you may discard this. If you do, gain Capital equal to the bonus you purchased.'],
      ['Battle', 'After this battle, if you lose and used Subsidize, gain Capital equal to the bonus you purchased.']
    ]
  },
  {
    name: 'Capital Gains', cost: 3, meta: 'Financiers • Advanced',
    effects: [
      ['Action', 'Place this beneath one card in your Treasury. At the start of your next turn, after the Capture step and income, return that Treasury card to your hand and gain Capital equal to its deckbuilding value, then discard this. If you lose a battle before then, put both cards in your Discard Pile instead. If the chosen card leaves your Treasury before this effect resolves, discard this.'],
      ['Battle', 'During battle cleanup, if you won, choose one other card you used during this battle that would enter your Discard Pile or Graveyard. Place that card face up in your Treasury instead.']
    ]
  },
  {
    name: 'Tariffs', cost: 3, meta: 'Financiers • Advanced', form: 'Asset',
    effects: [
      ['Action', 'Bank this as an Asset. Draw two cards, then take one additional Action Opportunity this turn.'],
      ['Asset', 'While this is banked, skip your normal draw. You cannot bank this while you control another banked Tariffs. You cannot voluntarily cause this to leave play during the turn it is banked.'],
      ['Battle', 'Your opponent may discard one card from hand. If they do not, add +1 to your battle total.']
    ]
  },
  {
    name: 'Divestment', cost: 3, meta: 'Financiers • Advanced',
    effects: [
      ['Action', 'Make one Deed you own unowned. Gain Capital equal to the number of Deeds you owned before doing so, then take one additional Action Opportunity this turn.'],
      ['Battle', 'Before dice are rolled, you may make one Deed you own unowned. If you do, gain Capital equal to the number of Deeds you owned before doing so, then you may immediately Subsidize.']
    ]
  },
  {
    name: 'Margin Loan', cost: 3, meta: 'Financiers • Advanced', form: 'Asset with collateral',
    effects: [
      ['Action', "Choose one other card in your hand or Treasury and place it beneath this as collateral. Bank this as an Asset. Gain Capital equal to the collateral card's deckbuilding value plus 2, then take one additional Action Opportunity this turn."],
      ['Loan', "At the start of your next turn, after the Capture step and income, choose one: Repay — pay Capital equal to the collateral card's deckbuilding value plus 3, return the collateral card to your hand, then discard this; or Default — put this and its collateral in your Graveyard."],
      ['Battle', 'Before dice are rolled, you may place one other card from your hand or Treasury beneath this as collateral. If you do, gain Capital equal to its deckbuilding value, then you may immediately Subsidize. During battle cleanup, if you won, return the collateral card to your hand. Otherwise, put this and its collateral in your Graveyard.'],
      ['Reminder', 'If this leaves play before the loan is resolved, you default.']
    ]
  },
  {
    name: 'Leveraged Buyout', cost: 4, meta: 'Financiers • Advanced',
    effects: [
      ['Action', 'Buy or buy out one Deed. For this purchase, you may use any number of cards from your hand or Treasury as collateral. Each collateral card contributes payment equal to its deckbuilding value and is put in your Graveyard after the purchase. Collateral may pay the entire cost.'],
      ['Battle', 'During battle cleanup, if you won as the attacking player on a Territory whose Deed you do not own, you may immediately buy or buy out that Deed, treating the Territory as occupied. For this purchase, you may use any number of other cards you used in this battle as collateral. Each contributes payment equal to its deckbuilding value and is put in your Graveyard instead of its normal destination. Collateral may pay the entire cost.']
    ]
  },
  {
    name: 'Foreclosure', cost: 4, meta: 'Financiers • Advanced',
    effects: [
      ['Action', 'Choose one unoccupied Territory whose Deed you own that is adjacent to a Territory you control. Take control of the chosen Territory.'],
      ['Battle', 'If you initiated this battle on a Territory whose Deed you owned when the battle began and you win, capture that Territory immediately instead of occupying it.']
    ]
  },
  {
    name: 'Property Dues', cost: 4, meta: 'Financiers • Advanced', form: 'Asset',
    effects: [
      ['Action', 'Bank this as an Asset. The first time each turn your opponent advances onto a Territory whose Deed you own, they choose one: discard one card from hand, or you gain 2 Capital.'],
      ['Battle', 'If this battle takes place on a Territory whose Deed you own, your opponent chooses one: discard one card from hand, or you gain 3 Capital during battle cleanup.']
    ]
  },
  {
    name: 'Corner the Market', cost: 5, meta: 'Financiers • Advanced', unique: 'Unique — maximum one copy per Playable Deck',
    effects: [
      ['Action', 'Buy or buy out any number of Deeds. Resolve each purchase completely before calculating the cost of the next.'],
      ['Battle', 'During battle cleanup, if you won, you may buy or buy out any number of Deeds. Resolve each purchase completely before calculating the cost of the next.']
    ]
  }
];

const leaders = [
  {
    name: 'Banker', image: '../images/leader-cards/banker.svg', imageClass: 'banker', motto: 'Credit closes the distance.',
    ability: ['Line of Credit', "The first time on your turn that you would buy or buy out a Deed, you may use one card from hand or Treasury as collateral. It contributes payment equal to its deckbuilding value, cannot contribute more than half the purchase cost rounded down, and is put in your Discard Pile after the purchase. Unused value is lost. It cannot fund Subsidize."]
  },
  {
    name: 'Executive', image: '../images/leader-cards/executive.svg', imageClass: 'executive', motto: 'Take the ground. Close the deal.',
    ability: ['Hostile Takeover', "During the Action Opportunity after movement, instead of playing a card for its Action effect, if you won a battle this turn that caused you to occupy an enemy-controlled Territory, you may buy or buy out that Territory's Deed. Treat it as occupied but not controlled for cost. Normal buyout premiums apply. If the purchase succeeds, immediately take control of that Territory."]
  }
];

const sharedLeaderRules = [
  ['Capital Limit', 'Territories you control plus the total deckbuilding value of cards in your Treasury. Reduce excess Capital only at the end of each turn.'],
  ['Treasury', 'During the Action Opportunity after movement, instead of playing a card for its Action effect, place one card from hand face up in Treasury. Treasury cards cannot be played normally and do not use Asset capacity.'],
  ['Controlling Interest', 'Immediately win when you own the Deeds to every Territory currently in the Gauntlet.']
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
    <div class="card-meta">${escapeHtml(card.meta)}${card.form ? ` • ${escapeHtml(card.form)}` : ''}</div>
    <div class="fit-content">${effects}</div>
    ${card.unique ? `<div class="unique">${escapeHtml(card.unique)}</div>` : ''}
  </article>`;
}

function renderLeaderCard(leader) {
  const rules = [sharedLeaderRules[0], sharedLeaderRules[1], leader.ability, sharedLeaderRules[2]]
    .map(([name, text]) => `<div class="leader-rule"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(text)}</div>`)
    .join('');

  return `<article class="print-card leader-card" data-card-name="${escapeHtml(leader.name)}">
    <div class="leader-art">
      <img class="${escapeHtml(leader.imageClass)}" src="${escapeHtml(leader.image)}" alt="${escapeHtml(leader.name)}">
      <div class="leader-faction">Financiers Leader</div>
      <div class="leader-title">${escapeHtml(leader.name.toUpperCase())}</div>
    </div>
    <div class="leader-content">
      <div class="leader-motto">${escapeHtml(leader.motto)}</div>
      ${rules}
    </div>
  </article>`;
}

function renderReference() {
  return `<article class="print-card reference-card" data-card-name="Financier Reference">
    <div class="reference-heading">Financier Reference</div>
    <div class="reference-block"><strong>Capital:</strong> Cannot fall below 0. Limit = controlled Territories + total Treasury value. Reduce excess only at the end of each turn.</div>
    <div class="reference-block"><strong>Treasury:</strong> During the Action Opportunity after movement, instead of playing a card for its Action effect, place one hand card face up in Treasury.</div>
    <div class="formula"><strong>Deed cost</strong> = min(Deeds you own + 1, 6) + position modifier + buyout premium; minimum 1.</div>
    <div class="reference-grid">
      <div class="reference-panel">
        <h3>Position &amp; Buyout</h3>
        <div class="reference-row"><span class="reference-key">−1</span><span>You control it</span></div>
        <div class="reference-row"><span class="reference-key">0</span><span>You occupy it</span></div>
        <div class="reference-row"><span class="reference-key">+1</span><span>Neither</span></div>
        <div class="reference-row"><span class="reference-key">Buyout</span><span>+ min(opposing owner's Deeds, 6)</span></div>
      </div>
      <div class="reference-panel">
        <h3>Subsidize</h3>
        <div class="reference-row"><span class="reference-key">+1</span><span>1 Capital</span></div>
        <div class="reference-row"><span class="reference-key">+2</span><span>3 Capital</span></div>
        <div class="reference-row"><span class="reference-key">+3</span><span>6 Capital</span></div>
        <div class="reference-row"><span class="reference-key">+4</span><span>10 Capital</span></div>
      </div>
      <div class="reference-panel">
        <h3>Play the Market</h3>
        <div class="reference-row"><span class="reference-key">1</span><span>Graveyard; gain 0</span></div>
        <div class="reference-row"><span class="reference-key">2–3</span><span>Gain 1</span></div>
        <div class="reference-row"><span class="reference-key">4–5</span><span>Gain card value</span></div>
        <div class="reference-row"><span class="reference-key">6</span><span>Gain twice value</span></div>
      </div>
      <div class="reference-panel">
        <h3>Income &amp; Victory</h3>
        <div class="reference-row"><span class="reference-key">Income</span><span>After the Capture step, gain 1 per Deed.</span></div>
        <div class="reference-row"><span class="reference-key">Win</span><span>Own every Deed currently in the Gauntlet.</span></div>
      </div>
    </div>
    <div class="reference-reminder"><strong>Additional Action Opportunity:</strong> does not grant movement. Added Territories have normal Deeds.</div>
    <div class="cut-note">Supplemental reference — no deckbuilding value</div>
  </article>`;
}

function renderCapitalTracker() {
  return `<article class="print-card ledger-card" data-card-name="Capital Tracker">
    <div class="ledger-heading">Capital Tracker</div>
    <div class="ledger-stats">
      <div class="ledger-stat"><span>Current Capital</span><div class="write-box"></div></div>
      <div class="ledger-stat"><span>Capital Limit</span><div class="write-box"></div></div>
    </div>
    <div class="capital-rule"><strong>Capital limit:</strong> Territories you control plus total Treasury value. Reduce excess only at the end of each turn.</div>
    <div class="capital-rule"><strong>Income:</strong> After the Capture step at the start of your turn, gain 1 Capital per Deed owned.</div>
    <div class="capital-rule"><strong>Controlling Interest:</strong> Win when every Territory has a Deed Card on your side.</div>
    <div class="ledger-note">The eight Deed Cards are shared components.</div>
    <div class="cut-note">Supplemental tracker — no deckbuilding value</div>
  </article>`;
}

function renderDeedCard() {
  return `<article class="print-card deed-card" data-card-name="Deed">
    <div class="deed-banner">Deed</div>
    <div class="deed-seal" aria-hidden="true">§</div>
    <div class="deed-title">Territory Ownership</div>
    <div class="deed-rule">When you buy an unowned Deed, place this card beside that Territory on your side of the Gauntlet.</div>
    <div class="deed-rule">When a Deed is bought out, move this card to the new owner's side.</div>
    <div class="deed-rule">When a Deed becomes unowned, return this card to the shared supply.</div>
    <div class="deed-note">One Deed Card may be beside each Territory.</div>
    <div class="cut-note dark-note">Shared supplemental card — no deckbuilding value</div>
  </article>`;
}

function renderSheets() {
  const packageItems = [
    ...cards.map(renderFactionCard),
    ...leaders.map(renderLeaderCard),
    renderReference(),
    renderCapitalTracker()
  ];
  const pages = [];
  for (let index = 0; index < Math.ceil(packageItems.length / 9); index += 1) {
    const items = packageItems.slice(index * 9, index * 9 + 9);
    while (items.length < 9) items.push('<div class="print-card placeholder-card"></div>');
    pages.push(items);
  }
  const deedItems = Array.from({ length: 8 }, renderDeedCard);
  deedItems.push('<div class="print-card placeholder-card"></div>');
  pages.push(deedItems);
  document.getElementById('sheets').innerHTML = pages
    .map(items => `<section class="sheet">${items.join('')}</section>`)
    .join('');
}

function fitCards() {
  const results = [];
  document.querySelectorAll('.fit-card').forEach(card => {
    let bodySize = 6.25;
    let labelSize = 5.85;
    const minBody = 4.55;

    while (card.scrollHeight > card.clientHeight && bodySize > minBody) {
      bodySize = Math.max(minBody, bodySize - 0.08);
      labelSize = Math.max(4.35, labelSize - 0.065);
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
