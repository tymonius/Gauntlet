(() => {
  const CSS_PIXELS_PER_INCH = 96;
  const TERRITORY_WIDTH = 3.5 * CSS_PIXELS_PER_INCH;
  const TERRITORY_HEIGHT = 2.5 * CSS_PIXELS_PER_INCH;
  const INSPECTION_MAX_SCALE = 2.4;
  const FACTION_ORDER = [['neutral','Neutral'],['military','Military'],['diplomats','Diplomats'],['financiers','Financiers'],['intelligence','Intelligence'],['mystics','Mystics'],['inquisition','Inquisition']];

  let currentGamePromise;
  let territoryInspectionDialog;
  let territoryInspectionStage;
  let territoryInspectionFrame;
  let territoryInspectionSource;
  let territoryArtworkImage;

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

  function componentRenderSource(kind, id, side = 'front', orientation = 'portrait') {
    const params = new URLSearchParams({ kind, id, side });
    if (orientation === 'landscape') params.set('orientation', 'landscape');
    const rules = new URLSearchParams(window.location.search).get('rules');
    if (rules) params.set('rules', rules);
    return `/card-design/component-render.html?${params.toString()}`;
  }

  function componentReviewFrame(kind, id, label, side = 'front', orientation = 'portrait') {
    const landscape = orientation === 'landscape';
    return `<iframe class="component-review-frame${landscape ? ' component-review-frame-landscape' : ''}" loading="lazy" src="${esc(componentRenderSource(kind, id, side, orientation))}" title="${esc(label)} canonical Card Design render"></iframe>`;
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
      return `<div class="leader-specimen" id="${specimenId}"><p class="leader-review-label screen-only"><strong>${esc(leader.name)}</strong><span>${esc(leader.note)}</span></p>${componentReviewFrame('leader', specimenId, `${leader.name} ${leader.factionLabel} Leader`)}</div>`;
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
        return `<section class="review-faction-block" id="playable-${faction}" aria-labelledby="playable-${faction}-title"><div class="review-faction-heading screen-only"><h3 id="playable-${faction}-title">${esc(label)}</h3><span>${list.length} cards</span></div><div class="full-card-review-grid">${list.map(card=>`<div class="specimen-column"><p class="review-card-label screen-only"><strong title="${esc(card.name)}">${esc(card.name)}</strong><span>Value ${Number(card.cost)}</span></p><iframe class="full-card-review-frame" loading="lazy" src="card-review-render.html?fit=production&amp;card=${encodeURIComponent(card.id)}" title="${esc(card.name)} ${esc(current.displayVersion)} production render"></iframe></div>`).join('')}</div></section>`;
      }).join('');
    } catch (error) {
      root.innerHTML = `<p class="review-note">Unable to load current playable-card catalog: ${esc(error.message)}</p>`;
      console.error(error);
    }
  }

  function territoryItem(territory, version) {
    const meta = territory.arena ? `Arena · No. ${Number(territory.number)}` : `No. ${Number(territory.number)}`;
    return `<div class="territory-review-item"><p class="territory-review-label screen-only"><strong title="${esc(territory.name)}">${esc(territory.name)}</strong><span>${esc(meta)}</span></p><iframe class="territory-review-frame" loading="lazy" src="territory-review-render.html?territory=${encodeURIComponent(territory.id)}" title="${esc(territory.name)} ${esc(version)} Territory render"></iframe></div>`;
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

  function ensureArtworkInspectionStyles() {
    if (document.querySelector('link[data-card-art-inspection-styles]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/card-design/card-art-lightbox.css';
    link.dataset.cardArtInspectionStyles = 'true';
    document.head.append(link);
  }

  function ensureTerritoryInspectionDialog() {
    if (territoryInspectionDialog) return territoryInspectionDialog;
    ensureArtworkInspectionStyles();
    territoryInspectionDialog = document.createElement('dialog');
    territoryInspectionDialog.className = 'card-inspection-dialog territory-inspection-dialog';
    territoryInspectionDialog.innerHTML = `
      <button class="card-art-inspection-back" type="button">← Back to card</button>
      <button class="card-inspection-close" type="button" aria-label="Close enlarged Territory view">×</button>
      <div class="card-inspection-stage"></div>
      <div class="card-art-inspection" aria-hidden="true">
        <img class="card-art-inspection-image" alt="" />
      </div>`;
    document.body.append(territoryInspectionDialog);
    territoryInspectionStage = territoryInspectionDialog.querySelector('.card-inspection-stage');
    territoryArtworkImage = territoryInspectionDialog.querySelector('.card-art-inspection-image');
    territoryInspectionDialog.querySelector('.card-inspection-close')?.addEventListener('click', closeTerritoryInspection);
    territoryInspectionDialog.querySelector('.card-art-inspection-back')?.addEventListener('click', closeTerritoryArtworkInspection);
    territoryInspectionDialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeTerritoryInspection();
    });
    territoryInspectionDialog.addEventListener('click', event => {
      if (event.target === territoryInspectionDialog) closeTerritoryInspection();
    });
    return territoryInspectionDialog;
  }

  function layoutTerritoryInspection() {
    if (!territoryInspectionStage || !territoryInspectionFrame) return;
    const horizontalMargin = Math.min(96, window.innerWidth * 0.1);
    const verticalMargin = Math.min(96, window.innerHeight * 0.1);
    const availableWidth = Math.max(1, window.innerWidth - horizontalMargin);
    const availableHeight = Math.max(1, window.innerHeight - verticalMargin);
    const scale = Math.min(
      INSPECTION_MAX_SCALE,
      availableWidth / TERRITORY_WIDTH,
      availableHeight / TERRITORY_HEIGHT,
    );
    territoryInspectionStage.style.width = `${TERRITORY_WIDTH * scale}px`;
    territoryInspectionStage.style.height = `${TERRITORY_HEIGHT * scale}px`;
    territoryInspectionFrame.style.width = `${TERRITORY_WIDTH}px`;
    territoryInspectionFrame.style.height = `${TERRITORY_HEIGHT}px`;
    territoryInspectionFrame.style.transform = `scale(${scale})`;
  }

  function closeTerritoryArtworkInspection() {
    if (!territoryInspectionDialog) return;
    territoryInspectionDialog.classList.remove('artwork-inspection-open');
    const artwork = territoryInspectionDialog.querySelector('.card-art-inspection');
    artwork?.setAttribute('aria-hidden', 'true');
    if (territoryArtworkImage) {
      territoryArtworkImage.removeAttribute('src');
      territoryArtworkImage.alt = '';
    }
  }

  function closeTerritoryInspection() {
    if (!territoryInspectionDialog) return;
    closeTerritoryArtworkInspection();
    if (territoryInspectionDialog.open) territoryInspectionDialog.close();
    document.body.classList.remove('card-inspection-open');
    territoryInspectionStage?.replaceChildren();
    territoryInspectionFrame = null;
    const source = territoryInspectionSource;
    territoryInspectionSource = null;
    if (source instanceof HTMLElement) source.focus({ preventScroll: true });
  }

  function openTerritoryInspection(href, label, sourceFrame) {
    const dialog = ensureTerritoryInspectionDialog();
    closeTerritoryArtworkInspection();
    territoryInspectionStage.replaceChildren();
    territoryInspectionSource = sourceFrame || null;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    url.searchParams.set('inspection', '1');
    territoryInspectionFrame = document.createElement('iframe');
    territoryInspectionFrame.className = 'card-inspection-frame territory-inspection-frame';
    territoryInspectionFrame.src = url.href;
    territoryInspectionFrame.title = `Enlarged ${label}`;
    territoryInspectionStage.append(territoryInspectionFrame);
    dialog.setAttribute('aria-label', `Enlarged view of ${label}`);
    document.body.classList.add('card-inspection-open');
    if (!dialog.open) dialog.showModal();
    layoutTerritoryInspection();
    dialog.querySelector('.card-inspection-close')?.focus({ preventScroll: true });
  }

  function openTerritoryArtworkInspection(source, label) {
    const dialog = ensureTerritoryInspectionDialog();
    if (!source || !territoryArtworkImage) return;
    territoryArtworkImage.src = new URL(source, document.baseURI).href;
    territoryArtworkImage.alt = `Full uncropped artwork for ${label}`;
    dialog.querySelector('.card-art-inspection')?.setAttribute('aria-hidden', 'false');
    dialog.classList.add('artwork-inspection-open');
    dialog.querySelector('.card-art-inspection-back')?.focus({ preventScroll: true });
  }

  function handleTerritoryInspectionMessage(event) {
    if (event.origin !== window.location.origin) return;
    const sourceFrame = Array.from(document.querySelectorAll('iframe')).find(frame => frame.contentWindow === event.source);
    if (!sourceFrame) return;
    if (event.data?.type === 'gauntlet-territory-inspect') {
      const href = String(event.data.href || '');
      if (!href) return;
      openTerritoryInspection(href, String(event.data.label || 'Gauntlet Territory'), sourceFrame);
      return;
    }
    if (event.data?.type === 'gauntlet-territory-art-inspect') {
      const source = String(event.data.source || '');
      if (!source) return;
      openTerritoryArtworkInspection(source, String(event.data.label || 'Gauntlet Territory'));
    }
  }

  renderLeaders();
  renderPlayable();
  renderTerritories();
  ensureTerritoryInspectionDialog();
  window.addEventListener('message', handleTerritoryInspectionMessage);
  window.addEventListener('resize', layoutTerritoryInspection);
})();
