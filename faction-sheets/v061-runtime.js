(() => {
  const VERSION = 'v0.6.1';
  const CANONICAL_PATH = '../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json';
  const factionId = document.body.dataset.faction;
  const root = document.getElementById('sheets');
  const status = document.getElementById('sheet-status');

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function localImage(url) {
    return String(url || '').replace('https://tymonius.github.io/Gauntlet/', '../');
  }

  function cardMeta(card, faction) {
    return [faction.name, card.complexity, card.trait, card.card_form].filter(Boolean).join(' • ');
  }

  function cardHtml(card, faction) {
    const effects = (card.effects || []).map(effect => `
      <section class="rules-section">
        <div class="card-label">${escapeHtml(effect.label)}</div>
        <div class="card-text">${escapeHtml(effect.text)}</div>
      </section>`).join('');
    return `<article class="print-card main-card fit-target" data-card-name="${escapeHtml(card.name)}">
      <header class="card-header"><span class="card-name">${escapeHtml(card.name)}</span><span class="cost-circle">${escapeHtml(card.cost)}</span></header>
      ${card.unique ? '<div class="unique-flag">Unique</div>' : ''}
      <div class="card-meta">${escapeHtml(cardMeta(card, faction))}</div>
      <div class="card-body">${effects}</div>
      <footer class="card-footer"><span>${escapeHtml(faction.name)}</span><span>© 2026 T. Scott</span><span>${VERSION}</span></footer>
    </article>`;
  }

  function leaderHtml(faction, leader, image) {
    const rules = (leader.rules || []).map(([label, text]) => `
      <section class="rules-section"><div class="card-label">${escapeHtml(label)}</div><div class="card-text">${escapeHtml(text)}</div></section>`).join('');
    return `<article class="print-card leader-card fit-target" data-card-name="${escapeHtml(leader.name)}">
      <div class="leader-art">
        ${image ? `<img src="${escapeHtml(localImage(image))}" alt="${escapeHtml(leader.name)}">` : ''}
        <div class="leader-faction">${escapeHtml(faction.name)} Leader</div>
        <div class="leader-title">${escapeHtml(leader.name)}</div>
      </div>
      <div class="leader-card-body">
        <div class="leader-intro"><div class="leader-tagline">${escapeHtml(leader.tagline || '')}</div><div class="leader-role">${escapeHtml(leader.role || faction.identity || '')}</div></div>
        ${rules}
      </div>
      <footer class="card-footer"><span>${escapeHtml(faction.name)}</span><span>Supplemental Leader</span><span>${VERSION}</span></footer>
    </article>`;
  }

  function referenceHtml(component) {
    const subtitle = component.subtitle || '';
    return `<article class="print-card reference-card fit-target${subtitle ? '' : ' no-subtitle'}" data-card-name="${escapeHtml(component.title)}">
      <header class="supplemental-header">${escapeHtml(component.title)}</header>
      ${subtitle ? `<div class="supplemental-subtitle">${escapeHtml(subtitle)}</div>` : ''}
      <div class="reference-body">${(component.sections || []).map(section => `<section class="reference-section"><div class="card-label">${escapeHtml(section.label)}</div><div class="card-text">${escapeHtml(section.text)}</div></section>`).join('')}</div>
      <footer class="reference-footer">${escapeHtml(component.footer || 'Supplemental reference — not a Playable Deck card')}</footer>
    </article>`;
  }

  function trackerHtml(component) {
    return `<article class="print-card tracker-card" data-card-name="${escapeHtml(component.title)}">
      <div class="tracker-title">${escapeHtml(component.title)}</div>
      <div class="tracker-note">${escapeHtml(component.note)}</div>
      ${(component.steps || []).map(step => `<div class="tracker-step" style="bottom:${Number(step.position).toFixed(2)}in"><span class="tracker-step-value">${escapeHtml(step.value)}</span><span class="tracker-step-label">${escapeHtml(step.label)}</span></div>`).join('')}
      <div class="tracker-zero">${escapeHtml(component.zeroLabel || '0 — Fully covered')}</div>
      <div class="tracker-footer">Supplemental tracker — not a Playable Deck card</div>
    </article>`;
  }

  function purgeHtml(component) {
    return `<article class="print-card purge-card fit-target" data-card-name="${escapeHtml(component.title)}">
      <header class="supplemental-header">${escapeHtml(component.title)}</header>
      <div class="reference-body">
        <div class="purge-intro"><strong>Purge:</strong> ${escapeHtml(component.intro)}</div>
        <div class="purge-list">${(component.rows || []).map(row => `<div class="purge-row"><div class="purge-cost">${escapeHtml(row.cost)}</div><div class="purge-text">${escapeHtml(row.text)}</div></div>`).join('')}</div>
        <div class="purge-reminder">${escapeHtml(component.reminder || '')}</div>
      </div>
      <footer class="reference-footer">Supplemental reference — not a Playable Deck card</footer>
    </article>`;
  }

  function capitalHtml(component) {
    return `<article class="print-card capital-tracker-card" data-card-name="${escapeHtml(component.title)}">
      <header class="supplemental-header">${escapeHtml(component.title)}</header>
      <div class="capital-tracker-body">
        <div class="capital-box"><span>Current Capital</span><div></div></div>
        <div class="capital-box"><span>Capital Limit</span><div></div></div>
        <p>${escapeHtml(component.note)}</p>
        <div class="ledger-lines">${Array.from({ length: 8 }, () => '<div></div>').join('')}</div>
      </div>
      <footer class="reference-footer">Supplemental ledger — not a Playable Deck card</footer>
    </article>`;
  }

  function deedHtml() {
    return `<article class="print-card deed-card" data-card-name="Deed">
      <div class="deed-banner">Deed</div><div class="deed-seal">§</div><div class="deed-title">Territory Ownership</div>
      <div class="deed-rule">When you buy an unowned Deed, place this card beside that Territory on your side.</div>
      <div class="deed-rule">Move it across on a buyout; return it to the supply when unowned.</div>
      <div class="deed-note">One per Territory. Heartlands have no Deeds.</div>
      <footer class="reference-footer">Shared supplemental card — not a Playable Deck card</footer>
    </article>`;
  }

  function componentHtml(component) {
    if (component.type === 'reference') return [referenceHtml(component)];
    if (component.type === 'tracker') return [trackerHtml(component)];
    if (component.type === 'purge') return [purgeHtml(component)];
    if (component.type === 'capital') return [capitalHtml(component)];
    if (component.type === 'deed-set') return Array.from({ length: Number(component.count) || 8 }, deedHtml);
    return [];
  }

  function proposalHtml(proposal, treaty) {
    return `<article class="print-card proposal-card fit-target${treaty ? ' treaty' : ''}" data-card-name="${escapeHtml(`${treaty ? 'Treaty Article' : 'Proposal'} ${proposal.number}: ${proposal.name}`)}">
      <div class="proposal-banner">${treaty ? 'Ratified Treaty Article' : 'Proposal'}</div>
      <div class="proposal-title-row"><div><div class="proposal-number">Article ${escapeHtml(proposal.number)}</div><div class="proposal-title">${escapeHtml(proposal.name)}</div></div><div class="stake-seal">${escapeHtml(proposal.stake)}</div></div>
      ${proposal.requirement ? `<div class="requirement"><strong>Requirement:</strong> ${escapeHtml(proposal.requirement)}</div>` : ''}
      <div class="proposal-body"><div class="proposal-effect"><strong>Accepted:</strong> ${escapeHtml(proposal.accepted)}</div><div class="proposal-effect"><strong>Refused:</strong> ${escapeHtml(proposal.refused)}</div></div>
      <div class="proposal-footer">Pair ${escapeHtml(proposal.number)} · ${treaty ? 'Treaty Article side' : 'Proposal side'} · Full rules remain active</div>
    </article>`;
  }

  function riteHtml(rite, completed) {
    if (completed) {
      return `<article class="print-card rite-card completed fit-target" data-card-name="${escapeHtml(`${rite.name} — Completed`)}">
        <div class="rite-banner">Completed Rite</div><div class="rite-icon">${escapeHtml(rite.icon || '✦')}</div><div class="rite-title">${escapeHtml(rite.name)}</div>
        <div class="rite-body"><div class="rite-complete">This Rite is complete. Keep this side face up; it cannot be begun again.</div><div class="rite-progress"><strong>Progression:</strong> First completed Rite unlocks Invocation. Second unlocks Transmutation. Third unlocks Convergence and permission to begin the Ritual of Ascendance.</div></div>
        <div class="rite-footer">Pair with the incomplete side · not a Playable Deck card</div>
      </article>`;
    }
    return `<article class="print-card rite-card fit-target" data-card-name="${escapeHtml(`${rite.name} — Incomplete`)}">
      <div class="rite-banner">Incomplete Rite</div><div class="rite-icon">${escapeHtml(rite.icon || '✦')}</div><div class="rite-title">${escapeHtml(rite.name)}</div>
      <div class="rite-body">
        ${rite.requirement ? `<div class="rite-section"><strong>Requirement:</strong> ${escapeHtml(rite.requirement)}</div>` : ''}
        <div class="rite-section"><strong>Beginning cost:</strong> ${escapeHtml(rite.beginning)}</div>
        <div class="rite-section"><strong>Completion:</strong> ${escapeHtml(rite.completion)}</div>
        ${rite.result ? `<div class="rite-section"><strong>Result:</strong> ${escapeHtml(rite.result)}</div>` : ''}
        <div class="rite-section"><strong>Interruption:</strong> ${escapeHtml(rite.interruption)}</div>
      </div><div class="rite-footer">Flip when complete · not a Playable Deck card</div>
    </article>`;
  }

  function pageHtml(items, className = '') {
    const padded = [...items];
    while (padded.length < 9) padded.push('<div class="print-card placeholder-card"></div>');
    return `<section class="sheet ${className}">${padded.slice(0, 9).join('')}</section>`;
  }

  function pagesFor(items) {
    const pages = [];
    for (let index = 0; index < items.length; index += 9) pages.push(pageHtml(items.slice(index, index + 9)));
    return pages;
  }

  function fitCards() {
    const results = [];
    document.querySelectorAll('.fit-target').forEach(target => {
      let textSize = target.classList.contains('leader-card') ? 5.7 : target.classList.contains('proposal-card') ? 6.3 : target.classList.contains('rite-card') ? 6 : target.classList.contains('reference-card') || target.classList.contains('purge-card') ? 5.6 : 7;
      let labelSize = Math.max(4.8, textSize - .25);
      const minimum = target.classList.contains('leader-card') ? 4.05 : 4.25;
      while (target.scrollHeight > target.clientHeight && textSize > minimum) {
        textSize = Math.max(minimum, textSize - .12);
        labelSize = Math.max(4, labelSize - .08);
        target.style.setProperty('--card-text-size', `${textSize.toFixed(2)}pt`);
        target.style.setProperty('--card-label-size', `${labelSize.toFixed(2)}pt`);
      }
      results.push({ name: target.dataset.cardName || '', fits: target.scrollHeight <= target.clientHeight, overflow: Math.max(0, target.scrollHeight - target.clientHeight), fontSize: textSize });
    });
    window.__cardFitResults = results;
  }

  async function load() {
    if (!factionId) throw new Error('Faction sheet is missing data-faction.');
    const faction = (window.FACTIONS || []).find(item => item.id === factionId);
    const packageData = window.GAUNTLET_V06_SUPPLEMENTALS?.[factionId];
    if (!faction || !packageData) throw new Error(`No v0.6.1 sheet data for ${factionId}.`);

    const response = await fetch(CANONICAL_PATH, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Canonical data returned ${response.status}.`);
    const canonical = await response.json();
    if (canonical.version !== VERSION) throw new Error(`Expected ${VERSION}; found ${canonical.version}.`);

    const factionCards = canonical.cards.filter(card => card.allegiance === faction.name);
    if (factionCards.length !== 12) throw new Error(`${faction.name} has ${factionCards.length} canonical cards instead of 12.`);

    const baseItems = [
      ...factionCards.map(card => cardHtml(card, faction)),
      ...faction.leaders.map(leader => leaderHtml(faction, leader, packageData.leaderImages?.[leader.id])),
      ...(packageData.components || []).flatMap(componentHtml)
    ];
    const pages = pagesFor(baseItems);

    if (packageData.proposals?.length) {
      const fronts = packageData.proposals.map(proposal => proposalHtml(proposal, false));
      const order = [2, 1, 0, 5, 4, 3, 8, 7, 6];
      const backs = order.map(index => packageData.proposals[index]).filter(Boolean).map(proposal => proposalHtml(proposal, true));
      pages.push(pageHtml(fronts, 'duplex-front'));
      pages.push(pageHtml(backs, 'duplex-back'));
    }

    if (packageData.rites?.length) {
      const fronts = packageData.rites.map(rite => riteHtml(rite, false));
      const backs = [...packageData.rites].reverse().map(rite => riteHtml(rite, true));
      pages.push(pageHtml(fronts, 'duplex-front'));
      pages.push(pageHtml(backs, 'duplex-back'));
    }

    root.innerHTML = pages.join('');
    document.title = `Gauntlet ${VERSION} ${faction.name} Faction Sheets`;
    document.querySelector('[data-faction-title]').textContent = `${faction.name} Faction Sheets`;
    document.querySelector('[data-sheet-description]').textContent = `${factionCards.length} playable cards, two Leader Cards, and all required ${faction.name} supplemental components.`;
    if (status) status.textContent = `${pages.length} Letter-size page${pages.length === 1 ? '' : 's'} · 2.5 × 3.5 inch cards · ${VERSION}`;

    await Promise.all(Array.from(document.images).map(image => image.complete ? Promise.resolve() : new Promise(resolve => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); })));
    if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
    fitCards();
    const failures = window.__cardFitResults.filter(result => !result.fits);
    if (failures.length) throw new Error(`Card overflow: ${failures.map(result => `${result.name} (+${result.overflow}px)`).join(', ')}`);
    document.body.dataset.ready = 'true';
  }

  load().catch(error => {
    console.error(error);
    if (status) status.textContent = `Unable to load faction sheets: ${error.message}`;
    root.innerHTML = `<div class="load-error">${escapeHtml(error.message)}</div>`;
  });
})();
