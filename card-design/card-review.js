(() => {
  const CANONICAL_SOURCE = '/artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json';
  const CSS_PIXELS_PER_INCH = 96;
  const TERRITORY_WIDTH = 3.5 * CSS_PIXELS_PER_INCH;
  const TERRITORY_HEIGHT = 2.5 * CSS_PIXELS_PER_INCH;
  const INSPECTION_MAX_SCALE = 2.4;
  const FACTIONS = [['neutral','Neutral'],['military','Military'],['diplomats','Diplomats'],['financiers','Financiers'],['intelligence','Intelligence'],['mystics','Mystics'],['inquisition','Inquisition']];
  const LEADERS = [
    {faction:'military',factionLabel:'Military',name:'General',image:'../images/general.png',note:'Movement and attack',sections:[['Command','Maximum 2. The first time each turn you win a battle, gain 1 Command.'],['Onward','During your Movement, before a pending battle is created, move one additional Position. This movement may create a pending battle.','1 Command'],['Rally','Before dice are rolled in a battle you initiated, add +1 to your battle total.','1 Command'],['Rout','At the end of the Aftermath of a battle you initiated and won, advance one Position. This movement may create a pending battle.','2 Command']]},
    {faction:'military',factionLabel:'Military',name:'Commandant',image:'../images/commandant.png',note:'Defense and control',sections:[['Command','Maximum 2. The first time each turn you win a battle, gain 1 Command.'],['Entrench','Before dice are rolled in a battle you did not initiate, add +1 to your battle total.','1 Command'],['Repel',"During the Aftermath of a battle you did not initiate and won, after the opponent's normal retreat, they retreat one additional Position, if able.",'1 Command'],['Fortify','During the Aftermath of a battle you won while occupying an enemy-controlled Territory, advance your Front Line by one Territory, if able.','2 Command']]},
    {faction:'diplomats',factionLabel:'Diplomats',name:'Ambassador',image:'../images/ambassador.png',note:'Agreement and card flow',sections:[['Influence','Begin with 1 Influence and build toward a maximum of 10.'],['Cordiality','Once per turn, after the opponent accepts your Terms, draw one card.'],['Peace Treaty','At the start of your turn, after Capture, five different ratified Proposals win the game.']]},
    {faction:'diplomats',factionLabel:'Diplomats',name:'Senator',image:'../images/senator.png',note:'Risk management and resilience',sections:[['Influence','Begin with 1 Influence and build toward a maximum of 10.'],['Political Capital','Once per turn, sacrifice cards from Hand to recover an equal amount of Influence that would otherwise be lost after refused Terms.'],['Peace Treaty','At the start of your turn, after Capture, five different ratified Proposals win the game.']]},
    {faction:'financiers',factionLabel:'Financiers',name:'Banker',image:'../images/banker.png',note:'Collateral and flexible financing',sections:[['Capital','Begin with 2 Capital. Cards in Treasury raise the amount of Capital you can retain.'],['Line of Credit','On the first Deed purchase of your turn, one card may contribute part of the price as collateral; pay the remainder with Capital.'],['Controlling Interest','Own the Deed to every Territory currently in the Gauntlet and win immediately.']]},
    {faction:'financiers',factionLabel:'Financiers',name:'Executive',image:'../images/executive.png',note:'Offensive acquisition and control',sections:[['Capital','Begin with 2 Capital. Cards in Treasury raise the amount of Capital you can retain.'],['Hostile Takeover','During Denouement, after winning as attacker and becoming the occupier of an enemy Territory, take the Faction Action to buy or buy out its Deed. A successful purchase advances your Front Line by one Territory, if able; it never creates isolated control.'],['Controlling Interest','Own the Deed to every Territory currently in the Gauntlet and win immediately.']]},
    {faction:'intelligence',factionLabel:'Intelligence',name:'Ranger',image:'../images/ranger.png',note:'Terrain and field operations',sections:[['Missions',"Completed normal Missions grant 1 Operation Progress and Intel equal to the card's value."],['Fieldcraft',"Once per turn, spend 1 Intel to ignore a Territory's printed effect when it would affect you, your movement, or a battle involving you.",'1 Intel'],['Special Operation','When Operation Progress exceeds opposing controlled Territories, prepare and complete a Special Operation to win.']]},
    {faction:'intelligence',factionLabel:'Intelligence',name:'Spymaster',image:'../images/spymaster.png',note:'Mission tempo and coordination',sections:[['Missions',"Completed normal Missions grant 1 Operation Progress and Intel equal to the card's value."],['Mission Control','Once per turn, after completing a normal Mission, immediately start another eligible Mission from Hand without spending an Action. It cannot complete that turn and cannot be a Special Operation.'],['Special Operation','When Operation Progress exceeds opposing controlled Territories, prepare and complete a Special Operation to win.']]},
    {faction:'mystics',factionLabel:'Mystics',name:'Alchemist',image:'../images/alchemist.png',note:'Sacrifice sequencing and conversion',sections:[['Rites','The first completed Rite unlocks Invocation; the second unlocks Transmutation; the third unlocks Convergence and the Ritual of Ascendance.'],['Materia Prima','The first qualifying sacrifice from Hand on your turn draws one replacement card; during battle, draw after the battle resolves.'],['Ascendance','Complete all three Rites, then complete the Ritual of Ascendance to win.']]},
    {faction:'mystics',factionLabel:'Mystics',name:'Spirit Walker',image:'../images/spirit walker.png',note:'Ritual endurance and protection',sections:[['Rites','The first completed Rite unlocks Invocation; the second unlocks Transmutation; the third unlocks Convergence and the Ritual of Ascendance.'],['Guardians of the Circle','The first time on your turn a battle loss would interrupt a begun Rite or Ritual, put an Arcane card from Hand in your Graveyard of the required value to prevent that interruption.'],['Ascendance','Complete all three Rites, then complete the Ritual of Ascendance to win.']]},
    {faction:'inquisition',factionLabel:'Inquisition',name:'Grand Inquisitor',image:'../images/grand inquisitor.png',note:'Judgment and efficient Purges',sections:[['Conviction','Gain Conviction from qualifying opposing post-battle Graveyard entries, up to 4.'],['Final Judgment','Once per turn during the Aftermath of a battle you won, after battle cards are cleared, immediately Purge without spending an Action and reduce its Conviction cost by 1, minimum 1.'],['Purification',"If the opponent's normal Draw produces nothing because both Draw Pile and Discard Pile are empty, win immediately."]]},
    {faction:'inquisition',factionLabel:'Inquisition',name:'Witch Hunter',image:'../images/witch hunter.png',note:'Defense, retaliation, and pursuit',sections:[['Conviction','Gain Conviction from qualifying opposing post-battle Graveyard entries, up to 4.'],['Relentless Pursuit','Once per turn, at the end of the Aftermath of a battle an opponent initiated against you and lost, spend 2 Conviction to end their turn and advance one Position toward their end. Any resulting pending battle uses you as attacker.','2 Conviction'],['Purification',"If the opponent's normal Draw produces nothing because both Draw Pile and Discard Pile are empty, win immediately."]]}
  ];

  let canonicalPromise;
  let territoryInspectionDialog;
  let territoryInspectionStage;
  let territoryInspectionFrame;
  let territoryInspectionSource;
  let territoryArtworkImage;

  const slugify = value => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const esc = value => String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]);

  async function canonicalData() {
    if (!canonicalPromise) {
      canonicalPromise = fetch(CANONICAL_SOURCE, { cache: 'no-cache' }).then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      });
    }
    return canonicalPromise;
  }

  function leaderCard(l){const extra=l.name==='Commandant'?' commandant-card':'';return `<div class="leader-specimen" id="${l.faction}-${slugify(l.name)}"><p class="leader-review-label screen-only"><strong>${esc(l.name)}</strong><span>${esc(l.note)}</span></p><article class="gauntlet-card faction-component-card leader-card ${esc(l.faction)}-card${extra}" data-faction="${esc(l.faction)}" data-art-max="1.86" data-art-min="1.34" data-title-min="10" aria-label="${esc(l.name)} ${esc(l.factionLabel)} Leader card"><div class="card-interior"><header class="card-heading"><h3 class="card-title">${esc(l.name)}</h3><div class="leader-faction-line"><span class="leader-faction-emblem" aria-hidden="true"></span><span>${esc(l.factionLabel)}</span></div></header><figure class="card-art has-image"><img src="${esc(l.image)}" alt="Portrait of the ${esc(l.name)}" /></figure><div class="card-rules">${l.sections.map(([label,text,cost])=>`<section class="leader-rule-section"><h4>${esc(label)}${cost?`<span>${esc(cost)}</span>`:''}</h4><p>${esc(text)}</p></section>`).join('')}</div><footer class="card-footer"><span>${esc(l.factionLabel)}</span><span>Leader</span><span>v0.6.3</span></footer></div></article></div>`}

  function renderLeaders(){const root=document.querySelector('#leaderReviewSections');if(!root)return;root.innerHTML=FACTIONS.filter(([id])=>id!=='neutral').map(([f,label])=>{const ls=LEADERS.filter(l=>l.faction===f);return `<section class="review-faction-block" id="leaders-${f}" aria-labelledby="leaders-${f}-title"><div class="review-faction-heading screen-only"><h3 id="leaders-${f}-title">${esc(label)}</h3><span>${ls.length} Leaders</span></div><div class="leader-review-grid">${ls.map(leaderCard).join('')}</div></section>`}).join('')}

  async function renderPlayable(){const root=document.querySelector('#playableReviewSections');if(!root)return;try{const canonical=await canonicalData();const cards=canonical.cards||[];document.querySelectorAll('[data-playable-count]').forEach(n=>n.textContent=String(cards.length));root.innerHTML=FACTIONS.map(([f,label])=>{const list=cards.filter(c=>slugify(c.allegiance)===f).sort((a,b)=>a.name.localeCompare(b.name));if(!list.length)return '';return `<section class="review-faction-block" id="playable-${f}" aria-labelledby="playable-${f}-title"><div class="review-faction-heading screen-only"><h3 id="playable-${f}-title">${esc(label)}</h3><span>${list.length} cards</span></div><div class="full-card-review-grid">${list.map(c=>`<div class="specimen-column"><p class="review-card-label screen-only"><strong title="${esc(c.name)}">${esc(c.name)}</strong><span>Value ${Number(c.cost)}</span></p><iframe class="full-card-review-frame" loading="lazy" src="card-review-render.html?fit=production&amp;card=${encodeURIComponent(c.id)}" title="${esc(c.name)} v0.6.3 production render"></iframe></div>`).join('')}</div></section>`}).join('')}catch(error){root.innerHTML=`<p class="review-note">Unable to load the v0.6.3 canonical card catalog: ${esc(error.message)}</p>`;console.error(error)}}

  function territoryGroup(id, label, list) {
    if (!list.length) return '';
    return `<section class="review-faction-block territory-review-block" id="territories-${id}" aria-labelledby="territories-${id}-title"><div class="review-faction-heading screen-only"><h3 id="territories-${id}-title">${esc(label)}</h3><span>${list.length} cards</span></div><div class="territory-review-grid">${list.map(territory=>`<div class="territory-review-item"><p class="territory-review-label screen-only"><strong title="${esc(territory.name)}">${esc(territory.name)}</strong><span>No. ${Number(territory.number)}</span></p><iframe class="territory-review-frame" loading="lazy" src="territory-review-render.html?territory=${encodeURIComponent(territory.id)}" title="${esc(territory.name)} v0.6.3 Territory render"></iframe></div>`).join('')}</div></section>`;
  }

  async function renderTerritories(){const root=document.querySelector('#territoryReviewSections');if(!root)return;try{const canonical=await canonicalData();const territories=(canonical.territories||[]).slice().sort((a,b)=>(Number(a.number)||999)-(Number(b.number)||999)||a.name.localeCompare(b.name));const arenas=territories.filter(t=>t.arena);const ordinary=territories.filter(t=>!t.arena);document.querySelectorAll('[data-territory-count]').forEach(n=>n.textContent=String(territories.length));document.querySelectorAll('[data-arena-count]').forEach(n=>n.textContent=String(arenas.length));root.innerHTML=territoryGroup('standard','Territories',ordinary)+territoryGroup('arenas','Arenas',arenas)}catch(error){root.innerHTML=`<p class="review-note">Unable to load the v0.6.3 canonical Territory catalog: ${esc(error.message)}</p>`;console.error(error)}}

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
