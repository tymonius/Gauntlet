const CANDIDATE_MODE = 'candidate';
const CARD_ID = 'military-unbroken-ranks';

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
          <span class="card-anatomy-marker marker-left marker-name" aria-hidden="true">1</span>
          <span class="card-anatomy-marker marker-right marker-value" aria-hidden="true">2</span>
          <span class="card-anatomy-marker marker-left marker-faction" aria-hidden="true">3</span>
          <span class="card-anatomy-marker marker-right marker-art" aria-hidden="true">4</span>
          <span class="card-anatomy-marker marker-left marker-heading" aria-hidden="true">5</span>
          <span class="card-anatomy-marker marker-right marker-text" aria-hidden="true">6</span>
          <span class="card-anatomy-marker marker-left marker-reminder" aria-hidden="true">7</span>
          <span class="card-anatomy-marker marker-right marker-footer" aria-hidden="true">8</span>
        </div>
        <figcaption><strong>Unbroken Ranks</strong> shown with the current production card renderer.</figcaption>
      </figure>

      <ol class="card-anatomy-key">
        <li><span>1</span><div><strong>Card name</strong><p>The card's title.</p></div></li>
        <li><span>2</span><div><strong>Card value</strong><p>Used for Deck construction and whenever an effect refers to a card's value.</p></div></li>
        <li><span>3</span><div><strong>Faction identity</strong><p>The border and parchment treatment identify the card's faction. Neutral cards use ivory.</p></div></li>
        <li><span>4</span><div><strong>Artwork</strong><p>The card's illustration.</p></div></li>
        <li><span>5</span><div><strong>Effect heading</strong><p>Shows how that printed effect is used: Action, Gambit, Tactic, Gambit/Tactic, or a faction-specific procedure.</p></div></li>
        <li><span>6</span><div><strong>Effect text</strong><p>Resolve only the printed effect being used unless a rule says otherwise.</p></div></li>
        <li><span>7</span><div><strong>Reminder</strong><p>Optional reminder text may appear beneath the card's effects.</p></div></li>
        <li><span>8</span><div><strong>Metadata footer</strong><p>Shows faction at left, <em>Unique</em> in the center when applicable, and the rules version at right.</p></div></li>
      </ol>
    </div>

    <aside class="card-anatomy-note">
      <strong>Arcane trait:</strong> some playable cards show the Mystics sigil immediately before the card name. The symbol marks the <strong>Arcane</strong> trait; its color follows the card's faction identity.
    </aside>
    <p class="card-anatomy-scope">Territories and faction supplemental components use specialized layouts and are explained with their own rules.</p>
  `;
  return section;
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
  heading.before(anatomyMarkup());
}

document.addEventListener('gauntlet:rulebook-rendered', (event) => {
  injectAnatomy(event.detail?.mode);
});

// The rulebook loader is asynchronous, but this also handles cases where the
// module is evaluated after a rendered candidate view is already present.
queueMicrotask(() => injectAnatomy(document.body.dataset.rulesetMode));
