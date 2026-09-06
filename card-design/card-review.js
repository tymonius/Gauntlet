(() => {
  const FACTION_ORDER = [['neutral','Neutral'],['military','Military'],['diplomats','Diplomats'],['financiers','Financiers'],['intelligence','Intelligence'],['mystics','Mystics'],['inquisition','Inquisition']];
  let currentGamePromise;

  const slugify = value => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const esc = value => String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]);

  function catalogFilter() {
    return document.body?.classList.contains('developer-catalog-page')
      ? window.GauntletCatalogFilter || null
      : null;
  }

  function catalogTypeMatches(...types) {
    const filter = catalogFilter();
    return !filter || filter.typeMatches(...types);
  }

  function catalogFactionMatches(faction) {
    const filter = catalogFilter();
    return !filter || filter.factionMatches(faction);
  }

  function alphabetical(items, selector = item => item.name) {
    return items.slice().sort((a, b) => String(selector(a) || '').localeCompare(String(selector(b) || '')));
  }

  function faceRenderSource(faceId) {
    return `/card-design/face-render.html?id=${encodeURIComponent(faceId)}`;
  }

  function componentReviewFrame(faceId, label, orientation = 'portrait') {
    const landscape = orientation === 'landscape';
    return `<iframe class="component-review-frame${landscape ? ' component-review-frame-landscape' : ''}" loading="lazy" src="${esc(faceRenderSource(faceId))}" title="${esc(label)} canonical Card Design render"></iframe>`;
  }

  async function currentGame() {
    if (!currentGamePromise) {
      currentGamePromise = import('../game-data/current-game.mjs').then(module => module.loadCurrentGame());
    }
    return currentGamePromise;
  }

  function leaderSectionText(section) {
    if (section?.text) return section.text;
    if (Array.isArray(section?.items)) {
      return section.items.map(item => `${item.name}: ${item.text}`).join(' ');
    }
    return '';
  }

  function leaderCard(leader, version) {
    const specimenId = `${leader.faction}-${slugify(leader.name)}`;
    if (catalogFilter()) {
      return `<div class="leader-specimen" id="${specimenId}"><p class="leader-review-label screen-only"><strong>${esc(leader.name)}</strong><span>${esc(leader.note)}</span></p>${componentReviewFrame(`leader:${leader.faction}-${leader.id}`, `${leader.name} ${leader.factionLabel} Leader`)}</div>`;
    }

    const extra = leader.name === 'Commandant' ? ' commandant-card' : '';
    return `<div class="leader-specimen" id="${specimenId}"><p class="leader-review-label screen-only"><strong>${esc(leader.name)}</strong><span>${esc(leader.note)}</span></p><article class="gauntlet-card faction-component-card leader-card ${esc(leader.faction)}-card${extra}" data-faction="${esc(leader.faction)}" data-art-max="1.86" data-art-min="1.34" data-title-min="10" aria-label="${esc(leader.name)} ${esc(leader.factionLabel)} Leader card"><div class="card-interior"><header class="card-heading"><h3 class="card-title">${esc(leader.name)}</h3><div class="leader-faction-line"><span class="leader-faction-emblem" aria-hidden="true"></span><span>${esc(leader.factionLabel)}</span></div></header><figure class="card-art has-image"><img src="${esc(leader.image)}" alt="Portrait of the ${esc(leader.name)}" /></figure><div class="card-rules">${(leader.sections || []).map(section=>`<section class="leader-rule-section"><h4>${esc(section.name)}${section.cost?`<span>${esc(section.cost)}</span>`:''}</h4><p>${esc(leaderSectionText(section))}</p></section>`).join('')}</div><footer class="card-footer"><span>${esc(leader.factionLabel)}</span><span>Leader</span><span>${esc(version)}</span></footer></div></article></div>`;
  }

  async function renderLeaders() {
    const root = document.querySelector('#leaderReviewSections');
    if (!root) return;
    if (!catalogTypeMatches('leader')) {
      root.replaceChildren();
      return;
    }
    try {
      const current = await currentGame();
      root.dataset.currentGameAuthority = current.authorityUrl;
      let leaders = FACTION_ORDER
        .filter(([id]) => id !== 'neutral')
        .flatMap(([faction]) => current.leaders.filter(leader => leader.faction === faction))
        .filter(leader => catalogFactionMatches(leader.faction));
      if (catalogFilter()?.sort === 'name') leaders = alphabetical(leaders);
      root.innerHTML = leaders.length
        ? `<div class="review-faction-block leader-review-block"><div class="leader-review-grid">${leaders.map(leader => leaderCard(leader, current.displayVersion)).join('')}</div></div>`
        : '';
    } catch (error) {
      root.innerHTML = `<p class="review-note">Unable to load current Leader catalog: ${esc(error.message)}</p>`;
      console.error(error);
    }
  }

  async function renderPlayable() {
    const root = document.querySelector('#playableReviewSections');
    if (!root) return;
    if (!catalogTypeMatches('playable')) {
      root.replaceChildren();
      return;
    }
    try {
      const current = await currentGame();
      const allCards = current.cards || [];
      const cards = allCards.filter(card => catalogFactionMatches(slugify(card.allegiance)));
      root.dataset.currentGameAuthority = current.authorityUrl;
      document.querySelectorAll('[data-playable-count]').forEach(node => node.textContent = String(allCards.length));
      root.innerHTML = FACTION_ORDER.map(([faction, label]) => {
        let list = cards.filter(card => slugify(card.allegiance) === faction);
        if (catalogFilter()?.sort === 'name') list = alphabetical(list);
        if (!list.length) return '';
        return `<section class="review-faction-block" id="playable-${faction}" aria-labelledby="playable-${faction}-title"><div class="review-faction-heading screen-only"><h3 id="playable-${faction}-title">${esc(label)}</h3><span>${list.length} cards</span></div><div class="full-card-review-grid">${list.map(card=>`<div class="specimen-column"><p class="review-card-label screen-only"><strong title="${esc(card.name)}">${esc(card.name)}</strong><span>Value ${Number(card.cost)}</span></p><iframe class="full-card-review-frame" loading="lazy" src="${esc(faceRenderSource(`card:${card.id}`))}" title="${esc(card.name)} ${esc(current.displayVersion)} production render"></iframe></div>`).join('')}</div></section>`;
      }).join('');
    } catch (error) {
      root.innerHTML = `<p class="review-note">Unable to load current playable-card catalog: ${esc(error.message)}</p>`;
      console.error(error);
    }
  }

  function territoryItem(territory, version) {
    const meta = territory.arena ? `Arena · No. ${Number(territory.number)}` : `No. ${Number(territory.number)}`;
    return `<div class="territory-review-item"><p class="territory-review-label screen-only"><strong title="${esc(territory.name)}">${esc(territory.name)}</strong><span>${esc(meta)}</span></p><iframe class="territory-review-frame" loading="lazy" src="${esc(faceRenderSource(`territory:${territory.id}`))}" title="${esc(territory.name)} ${esc(version)} Territory render"></iframe></div>`;
  }

  async function renderTerritories() {
    const root = document.querySelector('#territoryReviewSections');
    if (!root) return;
    if (!catalogTypeMatches('territory') || !catalogFactionMatches('neutral')) {
      root.replaceChildren();
      return;
    }
    try {
      const current = await currentGame();
      let territories = (current.territories || []).slice().sort((a,b)=>(Number(a.number)||999)-(Number(b.number)||999)||a.name.localeCompare(b.name));
      if (catalogFilter()?.sort === 'name') territories = alphabetical(territories);
      const arenas = territories.filter(territory => territory.arena);
      root.dataset.currentGameAuthority = current.authorityUrl;
      document.querySelectorAll('[data-territory-count]').forEach(node => node.textContent = String(territories.length));
      document.querySelectorAll('[data-arena-count]').forEach(node => node.textContent = String(arenas.length));
      root.innerHTML = `<div class="territory-review-block"><div class="territory-review-grid">${territories.map(territory => territoryItem(territory, current.displayVersion)).join('')}</div></div>`;
    } catch (error) {
      root.innerHTML = `<p class="review-note">Unable to load current Territory catalog: ${esc(error.message)}</p>`;
      console.error(error);
    }
  }

  renderLeaders();
  renderPlayable();
  renderTerritories();
})();
