import './candidate-publication.js';
import { RULES_PUBLICATION_ASSETS } from './assets/publication-assets.mjs';

const content = document.querySelector('[data-rulebook-content]');

const heroArt = document.querySelector('.hero-art img');
const DEFAULT_HERO_ART = '../images/woodcuts/hero compositions/hero 1.png';

function updateHeroArt(mode, documentId) {
  if (!heroArt) return;

  if (mode === 'candidate' && documentId === 'complete-rules') {
    heroArt.src = RULES_PUBLICATION_ASSETS.completeRulesWoodcut.publicUrl;
    heroArt.alt = 'All twelve faction Leaders woodcut';
    return;
  }

  const faction = mode === 'candidate' ? RULES_PUBLICATION_ASSETS.factions[documentId] : null;
  heroArt.src = faction?.guideWoodcut?.publicUrl || DEFAULT_HERO_ART;
  heroArt.alt = faction ? `${faction.name} faction Leaders woodcut` : '';
}

// Keep the frozen released-v0.7.1 presentation exactly on its established
// woodcut assets. Candidate publications reuse the same approved woodcut
// Leader art through the modular publication asset registry.
const RELEASED_FACTION_LEADERS = [
  ['Military', [
    ['General', '../images/woodcuts/general.png'],
    ['Commandant', '../images/woodcuts/commandant.png'],
  ]],
  ['Diplomats', [
    ['Ambassador', '../images/woodcuts/ambassador.png'],
    ['Senator', '../images/woodcuts/senator.png'],
  ]],
  ['Financiers', [
    ['Banker', '../images/woodcuts/banker.png'],
    ['Executive', '../images/woodcuts/executive.png'],
  ]],
  ['Intelligence', [
    ['Ranger', '../images/woodcuts/ranger.png'],
    ['Spymaster', '../images/woodcuts/spymaster.png'],
  ]],
  ['Mystics', [
    ['Alchemist', '../images/woodcuts/alchemist.png'],
    ['Spirit Walker', '../images/woodcuts/spirit-walker.png'],
  ]],
  ['Inquisition', [
    ['Grand Inquisitor', '../images/woodcuts/grand-inquisitor.png'],
    ['Witch Hunter', '../images/woodcuts/witch-hunter.png'],
  ]],
];

const CANDIDATE_FACTION_DOCUMENTS = new Set(Object.keys(RULES_PUBLICATION_ASSETS.factions));

function headingLabel(heading) {
  return heading.textContent.replace(/#\s*$/, '').trim();
}

function findReleasedFactionHeading(faction) {
  return [...content.querySelectorAll('h1')].find((heading) => {
    if (heading.dataset.chapterTitle === faction) return true;
    const label = headingLabel(heading);
    return label === faction || new RegExp(`^\\d+\\.\\s*${faction}$`, 'i').test(label);
  });
}

function buildGallery(faction, leaders, { candidate = false } = {}) {
  const gallery = document.createElement('section');
  gallery.className = 'leader-portrait-gallery';
  if (candidate) gallery.classList.add('candidate-leader-portrait-gallery');
  gallery.dataset.leaderPortraitGallery = faction;
  gallery.setAttribute('aria-label', `${faction} Leaders`);

  for (const leader of leaders) {
    const [name, src] = Array.isArray(leader)
      ? leader
      : [leader.name, leader.publicUrl];
    const figure = document.createElement('figure');
    figure.className = 'leader-portrait-figure';

    const image = document.createElement('img');
    image.className = 'leader-portrait';
    image.src = src;
    image.alt = `${name} Leader woodcut`;
    image.loading = 'lazy';
    image.decoding = 'async';

    const caption = document.createElement('figcaption');
    caption.textContent = name;

    figure.append(image, caption);
    gallery.append(figure);
  }

  return gallery;
}

function injectReleasedLeaderPortraits() {
  if (!content) return;
  for (const [faction, leaders] of RELEASED_FACTION_LEADERS) {
    if (content.querySelector(`[data-leader-portrait-gallery="${faction}"]`)) continue;
    const heading = findReleasedFactionHeading(faction);
    if (!heading) continue;
    heading.insertAdjacentElement('afterend', buildGallery(faction, leaders));
  }
}

function applyFactionSymbol(heading, factionId) {
  const asset = RULES_PUBLICATION_ASSETS.factions[factionId];
  if (!heading || !asset) return;
  heading.classList.add('publication-faction-heading');
  heading.dataset.publicationFaction = factionId;
  heading.style.setProperty('--publication-faction-symbol', `url("${asset.symbol.publicUrl}")`);
}

function decoratePlayerGuideFactions() {
  for (const [factionId, asset] of Object.entries(RULES_PUBLICATION_ASSETS.factions)) {
    const heading = [...content.querySelectorAll('h3')]
      .find(candidate => headingLabel(candidate).startsWith(`${asset.name} —`));
    applyFactionSymbol(heading, factionId);
  }
}

function decorateCompleteRulesFactions() {
  const technicalTitles = {
    military: 'Military Rules',
    diplomats: 'Diplomat Rules',
    financiers: 'Financier Rules',
    intelligence: 'Intelligence Rules',
    mystics: 'Mystics Rules',
    inquisition: 'Inquisition Rules',
  };
  for (const [factionId, title] of Object.entries(technicalTitles)) {
    const heading = [...content.querySelectorAll('h2')]
      .find(candidate => headingLabel(candidate).endsWith(`— ${title}`));
    applyFactionSymbol(heading, factionId);
  }
}

const candidateLeaderArtwork = new Map();

async function measureCandidateLeaderBounds(image) {
  if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
    try { await image.decode(); } catch { return { left: 0, top: 0, right: 1, bottom: 1 }; }
  }
  if (!image.naturalWidth || !image.naturalHeight) return { left: 0, top: 0, right: 1, bottom: 1 };

  const maxSample = 512;
  const sampleScale = Math.min(1, maxSample / image.naturalWidth, maxSample / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * sampleScale));
  const height = Math.max(1, Math.round(image.naturalHeight * sampleScale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { left: 0, top: 0, right: 1, bottom: 1 };
  context.drawImage(image, 0, 0, width, height);

  const pixels = context.getImageData(0, 0, width, height).data;
  const corners = [0, (width - 1) * 4, ((height - 1) * width) * 4, ((height * width) - 1) * 4];
  const background = corners.reduce((sum, offset) => {
    sum.r += pixels[offset];
    sum.g += pixels[offset + 1];
    sum.b += pixels[offset + 2];
    sum.a += pixels[offset + 3];
    return sum;
  }, { r: 0, g: 0, b: 0, a: 0 });
  for (const channel of ['r', 'g', 'b', 'a']) background[channel] /= corners.length;
  const transparentBackground = background.a < 48;

  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = ((y * width) + x) * 4;
      if (pixels[offset + 3] < 24) continue;
      let artwork = transparentBackground;
      if (!transparentBackground) {
        const distance = Math.abs(pixels[offset] - background.r)
          + Math.abs(pixels[offset + 1] - background.g)
          + Math.abs(pixels[offset + 2] - background.b);
        artwork = distance > 42;
      }
      if (!artwork) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return { left: 0, top: 0, right: 1, bottom: 1 };

  const artworkWidth = maxX - minX + 1;
  const artworkHeight = maxY - minY + 1;
  const padX = Math.max(2, Math.ceil(artworkWidth * 0.025));
  const padY = Math.max(2, Math.ceil(artworkHeight * 0.02));
  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(width - 1, maxX + padX);
  maxY = Math.min(height - 1, maxY + padY);

  return {
    left: minX / width,
    top: minY / height,
    right: (maxX + 1) / width,
    bottom: (maxY + 1) / height,
  };
}

function paintCandidateLeaderArtwork(figure, image, canvas, bounds) {
  if (!figure.isConnected || !image.naturalWidth || !image.naturalHeight) return;
  const boxWidth = figure.clientWidth;
  const boxHeight = figure.clientHeight;
  if (!boxWidth || !boxHeight) return;

  const sourceX = bounds.left * image.naturalWidth;
  const sourceY = bounds.top * image.naturalHeight;
  const sourceWidth = (bounds.right - bounds.left) * image.naturalWidth;
  const sourceHeight = (bounds.bottom - bounds.top) * image.naturalHeight;
  if (!sourceWidth || !sourceHeight) return;

  const rasterScale = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
  canvas.width = Math.max(1, Math.round(boxWidth * rasterScale));
  canvas.height = Math.max(1, Math.round(boxHeight * rasterScale));
  const context = canvas.getContext('2d');
  if (!context) return;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const scale = Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
  const destinationWidth = sourceWidth * scale;
  const destinationHeight = sourceHeight * scale;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    (canvas.width - destinationWidth) / 2,
    (canvas.height - destinationHeight) / 2,
    destinationWidth,
    destinationHeight,
  );
}

async function fitCandidateLeaderArtwork(figure, image, canvas) {
  const bounds = await measureCandidateLeaderBounds(image);
  const artworkWidth = (bounds.right - bounds.left) * image.naturalWidth;
  const artworkHeight = (bounds.bottom - bounds.top) * image.naturalHeight;
  if (artworkWidth > 0 && artworkHeight > 0) {
    figure.style.aspectRatio = `${artworkWidth} / ${artworkHeight}`;
  }
  candidateLeaderArtwork.set(figure, { image, canvas, bounds });
  paintCandidateLeaderArtwork(figure, image, canvas, bounds);
  figure.dataset.leaderArtworkFitted = 'true';
}

function buildCandidateLeaderFigure(name, src) {
  const figure = document.createElement('figure');
  figure.className = 'candidate-leader-figure';

  const image = document.createElement('img');
  image.className = 'candidate-leader-art-source';
  image.src = src;
  image.alt = `${name} Leader woodcut`;
  image.loading = 'eager';
  image.decoding = 'async';

  const canvas = document.createElement('canvas');
  canvas.className = 'candidate-leader-art-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  figure.append(image, canvas);
  return { figure, image, canvas };
}

function buildCandidateLeaderProfile(name, src) {
  const heading = [...content.querySelectorAll(':scope > h3')]
    .find(candidate => headingLabel(candidate) === name);
  if (!heading || heading.closest('.candidate-leader-profile')) return;

  const profile = document.createElement('section');
  profile.className = 'candidate-leader-profile';
  profile.dataset.leaderProfile = name;
  heading.before(profile);

  let node = heading;
  while (node && (node === heading || !['H2', 'H3'].includes(node.tagName))) {
    const next = node.nextElementSibling;
    profile.append(node);
    node = next;
  }

  heading.classList.add('candidate-leader-name');

  const playstyle = [...profile.children]
    .find(element => element.tagName === 'P' && /^Playstyle:/i.test(element.textContent.trim()));
  const motto = [...profile.children]
    .find(element => element.tagName === 'P' && /^Motto:/i.test(element.textContent.trim()));
  const ability = [...profile.children]
    .find(element => /^(UL|OL)$/.test(element.tagName));

  const hero = document.createElement('div');
  hero.className = 'candidate-leader-hero';
  const identity = document.createElement('div');
  identity.className = 'candidate-leader-identity';
  if (playstyle) {
    playstyle.classList.add('candidate-leader-playstyle');
    identity.append(playstyle);
  }
  if (motto) {
    motto.classList.add('candidate-leader-motto');
    motto.querySelector('strong')?.remove();
  }
  if (ability) {
    ability.classList.add('candidate-leader-ability');
    identity.append(ability);
  }

  const artwork = buildCandidateLeaderFigure(name, src);
  hero.append(artwork.figure, identity);
  if (motto) {
    heading.insertAdjacentElement('afterend', motto);
    motto.insertAdjacentElement('afterend', hero);
  } else {
    heading.insertAdjacentElement('afterend', hero);
  }
  fitCandidateLeaderArtwork(artwork.figure, artwork.image, artwork.canvas);
}

function decorateFactionGuide(factionId) {
  const asset = RULES_PUBLICATION_ASSETS.factions[factionId];
  if (!asset) return;

  const title = [...content.querySelectorAll('h1')]
    .find(heading => headingLabel(heading) === `${asset.name} Guide`);
  applyFactionSymbol(title, factionId);

  for (const leader of asset.leaders) {
    buildCandidateLeaderProfile(leader.name, leader.publicUrl);
  }
}

function clearInjectedPublicationAssets() {
  content?.querySelectorAll('[data-leader-portrait-gallery]').forEach(node => node.remove());
  content?.querySelectorAll('.publication-faction-heading').forEach((heading) => {
    heading.classList.remove('publication-faction-heading');
    heading.removeAttribute('data-publication-faction');
    heading.style.removeProperty('--publication-faction-symbol');
  });
}

function decorateForRender({ mode = 'released', document: documentId = 'released-rulebook' } = {}) {
  if (!content) return;
  clearInjectedPublicationAssets();
  updateHeroArt(mode, documentId);

  if (mode !== 'candidate') {
    injectReleasedLeaderPortraits();
    return;
  }

  if (documentId === 'player-guide') {
    decoratePlayerGuideFactions();
    return;
  }
  if (documentId === 'complete-rules') {
    decorateCompleteRulesFactions();
    return;
  }
  if (CANDIDATE_FACTION_DOCUMENTS.has(documentId)) {
    decorateFactionGuide(documentId);
  }
}

function inferredRenderContext() {
  const url = new URL(window.location.href);
  const mode = document.body.dataset.rulesetMode === 'candidate' || url.searchParams.get('rules') === 'candidate'
    ? 'candidate'
    : 'released';
  return {
    mode,
    document: mode === 'candidate' ? (url.searchParams.get('doc') || 'player-guide') : 'released-rulebook',
  };
}

window.addEventListener('resize', () => {
  for (const [figure, entry] of candidateLeaderArtwork) {
    if (!figure.isConnected) {
      candidateLeaderArtwork.delete(figure);
      continue;
    }
    paintCandidateLeaderArtwork(figure, entry.image, entry.canvas, entry.bounds);
  }
});

if (content) {
  const observer = new MutationObserver(() => {
    if (content.classList.contains('candidate-publication')) return;
    if (!content.querySelector('h1')) return;
    observer.disconnect();
    decorateForRender(inferredRenderContext());
    observer.observe(content, { childList: true, subtree: true });
  });
  observer.observe(content, { childList: true, subtree: true });

  document.addEventListener('gauntlet:rulebook-rendered', (event) => {
    observer.disconnect();
    decorateForRender(event.detail || inferredRenderContext());
    observer.observe(content, { childList: true, subtree: true });
  });

  queueMicrotask(() => {
    if (content.querySelector('h1')) decorateForRender(inferredRenderContext());
  });
}
