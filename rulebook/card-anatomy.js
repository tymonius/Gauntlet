const CARD_ANATOMY_EMBED = new URLSearchParams(window.location.search).get('embed') === 'card-anatomy';
const CARD_ID = 'military-unbroken-ranks';
const ARCANE_CARD_ID = 'mystics-witchcraft';

const MARKER_TARGETS = {
  name: { selector: '.card-title' },
  value: { selector: '.value-medallion' },
  faction: { selector: '.gauntlet-card', ratio: 0.23 },
  art: { selector: '.card-art' },
  heading: { selector: '.rule-section h4' },
  text: { selector: '.rule-section p' },
  footer: { selector: '.card-footer' },
};

function cardFigureMarkup() {
  const figure = document.createElement('figure');
  figure.className = 'card-anatomy-figure';
  figure.innerHTML = `
    <div class="card-anatomy-card-wrap">
      <iframe
        class="card-anatomy-card"
        src="../card-design/card-print-render.html?fit=production&amp;card=${CARD_ID}"
        title="Current production render of Unbroken Ranks"
        loading="lazy"
        tabindex="-1"
        aria-hidden="true"
      ></iframe>
      <span class="card-anatomy-marker marker-left" data-marker-target="name" aria-hidden="true">1</span>
      <span class="card-anatomy-marker marker-right" data-marker-target="value" aria-hidden="true">2</span>
      <span class="card-anatomy-marker marker-left marker-faction-edge" data-marker-target="faction" aria-hidden="true">3</span>
      <span class="card-anatomy-marker marker-right" data-marker-target="art" aria-hidden="true">4</span>
      <span class="card-anatomy-marker marker-left" data-marker-target="heading" aria-hidden="true">5</span>
      <span class="card-anatomy-marker marker-right" data-marker-target="text" aria-hidden="true">6</span>
      <span class="card-anatomy-marker marker-right" data-marker-target="footer" aria-hidden="true">7</span>
    </div>
    <figcaption><strong>Unbroken Ranks</strong> shown with the current production card renderer.</figcaption>
  `;
  return figure;
}

function arcaneCropMarkup() {
  const crop = document.createElement('div');
  crop.className = 'card-anatomy-arcane-crop';
  crop.setAttribute('aria-hidden', 'true');
  crop.innerHTML = `
    <iframe
      class="card-anatomy-arcane-card"
      src="../card-design/card-print-render.html?fit=production&amp;card=${ARCANE_CARD_ID}"
      title="Cropped current production render of the Witchcraft card header"
      loading="lazy"
      tabindex="-1"
    ></iframe>
  `;
  return crop;
}

function markerAnchorY(frame, wrap, target, config) {
  const frameWindow = frame.contentWindow;
  const frameRect = frame.getBoundingClientRect();
  const wrapRect = wrap.getBoundingClientRect();
  const viewportHeight = frameWindow?.innerHeight || frame.clientHeight || frameRect.height;
  const scaleY = frameRect.height / viewportHeight;
  const targetRect = target.getBoundingClientRect();
  const ratio = config.ratio ?? 0.5;
  const targetY = targetRect.top + (targetRect.height * ratio);
  return (frameRect.top - wrapRect.top) + (targetY * scaleY);
}

function positionCardMarkers(section) {
  const frame = section.querySelector('.card-anatomy-card');
  const wrap = section.querySelector('.card-anatomy-card-wrap');
  const frameDocument = frame?.contentDocument;
  if (!frame || !wrap || !frameDocument) return false;
  if (frameDocument.body?.dataset.renderReady !== 'true') return false;

  const positions = new Map();
  for (const [name, config] of Object.entries(MARKER_TARGETS)) {
    const target = frameDocument.querySelector(config.selector);
    if (!target) return false;
    positions.set(name, markerAnchorY(frame, wrap, target, config));
  }

  for (const marker of wrap.querySelectorAll('[data-marker-target]')) {
    const anchorY = positions.get(marker.dataset.markerTarget);
    if (anchorY === undefined) continue;
    marker.style.top = `${anchorY - (marker.offsetHeight / 2)}px`;
  }

  section.classList.add('markers-positioned');
  return true;
}

function updateEmbedReadiness(section, attempts = 0) {
  if (!CARD_ANATOMY_EMBED || !section?.isConnected) return;
  const mainFrame = section.querySelector('.card-anatomy-card');
  const arcaneFrame = section.querySelector('.card-anatomy-arcane-card');
  const mainReady = mainFrame?.contentDocument?.body?.dataset.renderReady === 'true';
  const arcaneReady = arcaneFrame?.contentDocument?.body?.dataset.renderReady === 'true';
  if (section.classList.contains('markers-positioned') && mainReady && arcaneReady) {
    document.documentElement.dataset.cardAnatomyEmbedReady = 'true';
    return;
  }
  if (attempts < 240) setTimeout(() => updateEmbedReadiness(section, attempts + 1), 25);
}

function scheduleMarkerPositioning(section, attempts = 0) {
  if (!section.isConnected) return;
  if (positionCardMarkers(section)) return;
  if (attempts >= 120) return;
  setTimeout(() => scheduleMarkerPositioning(section, attempts + 1), 25);
}

function wireMarkerPositioning(section) {
  const frame = section.querySelector('.card-anatomy-card');
  frame?.addEventListener('load', () => scheduleMarkerPositioning(section), { once: true });
  scheduleMarkerPositioning(section);
}

function transformKey(list) {
  list.classList.add('card-anatomy-key');
  [...list.children].forEach((item, index) => {
    const label = item.querySelector('strong')?.textContent?.trim() || `Item ${index + 1}`;
    const text = item.textContent
      .replace(item.querySelector('strong')?.textContent || '', '')
      .replace(/^\s*[—-]\s*/, '')
      .trim();
    item.replaceChildren();
    const number = document.createElement('span');
    number.textContent = String(index + 1);
    const copy = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = label;
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    copy.append(strong, paragraph);
    item.append(number, copy);
  });
}

function wrapAuthoredAnatomy() {
  const content = document.querySelector('[data-rulebook-content]');
  const heading = content?.querySelector('#card-anatomy');
  const nextHeading = content?.querySelector('#printed-card-effects');
  if (!content || !heading || !nextHeading || heading.compareDocumentPosition(nextHeading) & Node.DOCUMENT_POSITION_PRECEDING) return null;

  const section = document.createElement('section');
  section.className = 'card-anatomy-guide';
  section.dataset.cardAnatomy = '';
  section.setAttribute('aria-labelledby', heading.id);
  heading.before(section);

  let node = heading;
  while (node && node !== nextHeading) {
    const following = node.nextSibling;
    section.append(node);
    node = following;
  }

  // The Markdown source carries a deterministic static figure for print/PDF.
  // The published browser Rulebook replaces that fallback with the live production renderer.
  section.querySelector('img[alt="Card anatomy diagram"]')?.remove();

  const introParagraph = heading.nextElementSibling?.tagName === 'P' ? heading.nextElementSibling : null;
  const intro = document.createElement('div');
  intro.className = 'card-anatomy-intro';
  const kicker = document.createElement('p');
  kicker.className = 'card-anatomy-kicker';
  kicker.textContent = 'Reading a playable card';
  heading.before(kicker);
  if (introParagraph) {
    kicker.before(intro);
    intro.append(kicker, heading, introParagraph);
  }

  const list = section.querySelector('ol');
  if (list) {
    transformKey(list);
    const layout = document.createElement('div');
    layout.className = 'card-anatomy-layout';
    list.before(layout);
    layout.append(cardFigureMarkup(), list);
  }

  const arcaneHeading = section.querySelector('#arcane-trait-mark');
  if (arcaneHeading) {
    const arcaneParagraph = arcaneHeading.nextElementSibling?.tagName === 'P' ? arcaneHeading.nextElementSibling : null;
    const aside = document.createElement('aside');
    aside.className = 'card-anatomy-arcane';
    arcaneHeading.before(aside);
    const copy = document.createElement('div');
    copy.className = 'card-anatomy-arcane-copy';
    copy.append(arcaneHeading);
    if (arcaneParagraph) copy.append(arcaneParagraph);
    aside.append(arcaneCropMarkup(), copy);
  }

  const trailingParagraphs = [...section.querySelectorAll(':scope > p')];
  trailingParagraphs.at(-1)?.classList.add('card-anatomy-scope');
  return section;
}

function removeEnhancement() {
  const section = document.querySelector('[data-card-anatomy]');
  if (!section) return;
  const content = document.querySelector('[data-rulebook-content]');
  while (section.firstChild) content.insertBefore(section.firstChild, section);
  section.remove();
}

function enhanceAnatomy() {
  removeEnhancement();
  const section = wrapAuthoredAnatomy();
  if (!section) return;
  if (CARD_ANATOMY_EMBED) document.body.classList.add('card-anatomy-embed');
  wireMarkerPositioning(section);
  updateEmbedReadiness(section);
}

document.addEventListener('gauntlet:rulebook-rendered', (event) => {
  enhanceAnatomy();
});

window.addEventListener('resize', () => {
  const section = document.querySelector('[data-card-anatomy]');
  if (section) scheduleMarkerPositioning(section);
});

queueMicrotask(() => enhanceAnatomy());
