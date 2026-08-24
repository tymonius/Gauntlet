const CANDIDATE_MODE = 'candidate';
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

function anatomyMarkup() {
  const section = document.createElement('section');
  section.className = 'card-anatomy-guide';
  section.dataset.cardAnatomy = '';
  section.setAttribute('aria-labelledby', 'card-anatomy-title');
  section.innerHTML = `
    <div class="card-anatomy-intro">
      <p class="card-anatomy-kicker">Reading a playable card</p>
      <h3 id="card-anatomy-title">Card anatomy</h3>
      <p>Most ordinary playable cards use the same frame. The labels below show where to find the information that matters during deck construction and play.</p>
    </div>

    <div class="card-anatomy-layout">
      <figure class="card-anatomy-figure">
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
      </figure>

      <ol class="card-anatomy-key">
        <li><span>1</span><div><strong>Card name</strong><p>The card's title.</p></div></li>
        <li><span>2</span><div><strong>Card value</strong><p>Used for Deck construction and whenever an effect refers to a card's value.</p></div></li>
        <li><span>3</span><div><strong>Faction identity</strong><p>The border and parchment treatment identify the card's faction. Neutral cards use ivory.</p></div></li>
        <li><span>4</span><div><strong>Artwork</strong><p>The card's illustration.</p></div></li>
        <li><span>5</span><div><strong>Effect heading</strong><p>Names the effect's role or timing, such as Action, Asset, Gambit, Tactic, Gambit/Tactic, Overlay, Mission, or another faction-specific procedure.</p></div></li>
        <li><span>6</span><div><strong>Effect text</strong><p>Resolve only the printed effect being used unless a rule says otherwise.</p></div></li>
        <li><span>7</span><div><strong>Metadata footer</strong><p>Shows faction at left, <em>Unique</em> in the center when applicable, and the rules version at right.</p></div></li>
      </ol>
    </div>

    <aside class="card-anatomy-arcane">
      <div class="card-anatomy-arcane-crop" aria-hidden="true">
        <iframe
          class="card-anatomy-arcane-card"
          src="../card-design/card-print-render.html?fit=production&amp;card=${ARCANE_CARD_ID}"
          title="Cropped current production render of the Witchcraft card header"
          loading="lazy"
          tabindex="-1"
        ></iframe>
      </div>
      <div class="card-anatomy-arcane-copy">
        <strong>Arcane trait mark</strong>
        <p>Some playable cards show the Mystics sigil immediately before the card name. The symbol marks the <strong>Arcane</strong> trait; its color follows the card's faction identity.</p>
      </div>
    </aside>
    <p class="card-anatomy-scope">Territories and faction supplemental components use specialized layouts and are explained with their own rules.</p>
  `;
  return section;
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

function printedCardEffectsHeading() {
  const content = document.querySelector('[data-rulebook-content]');
  if (!content) return null;
  return content.querySelector('#printed-card-effects')
    || [...content.querySelectorAll('h2')].find((heading) =>
      heading.textContent.replace(/#\s*$/, '').trim() === 'Printed card effects'
    );
}

function removeAnatomy() {
  document.querySelector('[data-card-anatomy]')?.remove();
}

function injectAnatomy(mode) {
  removeAnatomy();
  if (mode !== CANDIDATE_MODE) return;

  const heading = printedCardEffectsHeading();
  if (!heading) return;
  const section = anatomyMarkup();
  heading.before(section);
  wireMarkerPositioning(section);
}

document.addEventListener('gauntlet:rulebook-rendered', (event) => {
  injectAnatomy(event.detail?.mode);
});

window.addEventListener('resize', () => {
  const section = document.querySelector('[data-card-anatomy]');
  if (section) scheduleMarkerPositioning(section);
});

// The rulebook loader is asynchronous, but this also handles cases where the
// module is evaluated after a rendered candidate view is already present.
queueMicrotask(() => injectAnatomy(document.body.dataset.rulesetMode));
