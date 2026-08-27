const factionsSection = document.querySelector('#factions');

if (factionsSection && !document.querySelector('#tabletop-simulator')) {
  loadStylesheet('/homepage-tts.css');

  const section = document.createElement('section');
  section.id = 'tabletop-simulator';
  section.className = 'section tts-section';
  section.setAttribute('aria-labelledby', 'tts-title');
  section.innerHTML = `
    <div class="tts-shell">
      <div class="tts-copy">
        <p class="eyebrow declaration-overline">Play remotely</p>
        <p class="tts-status"><span>v0.7.0</span> Tabletop Simulator build · final in-game QA</p>
        <h2 id="tts-title">Bring the Gauntlet to the digital table.</h2>
        <p class="tts-lede">
          The complete v0.7.0 Tabletop Simulator implementation reproduces Gauntlet's physical play surface for remote two-player games: decks, Leaders, Territories, the six-position Gauntlet, starter Bags, player pieces, and faction-specific components.
        </p>
        <p class="tts-note">
          Rules remain player-operated rather than automated. Workshop publication follows clean-client and full-game QA.
        </p>
        <div class="tts-actions">
          <a class="button primary" href="https://github.com/tymonius/Gauntlet/issues/851" target="_blank" rel="noopener noreferrer">Follow TTS release progress</a>
          <a class="button secondary" href="#updates">Get the Workshop launch update</a>
        </div>
      </div>

      <div class="tts-features" aria-label="Tabletop Simulator implementation features">
        <article>
          <span class="tts-feature-number">01</span>
          <h3>Complete play surface</h3>
          <p>Red and Blue player areas, six Territory positions, hand zones, Player Tokens, battle dice, and the physical spaces needed to run a game.</p>
        </article>
        <article>
          <span class="tts-feature-number">02</span>
          <h3>All six factions</h3>
          <p>Current starter Bags include each Leader, playable deck, Territories, the shared reference, and that faction's required supplemental components.</p>
        </article>
        <article>
          <span class="tts-feature-number">03</span>
          <h3>Physical-first rules</h3>
          <p>The mod reproduces the tabletop game instead of replacing it with rules scripting, so the same Rulebook and card interactions govern play online.</p>
        </article>
      </div>

      <figure class="tts-screenshot">
        <img
          src="/images/artwork/site/gauntlet-tts-playtest-table.webp"
          alt="Tabletop Simulator screenshot of a Gauntlet playtest table with cards, Territory positions, player areas, faction Bags, tokens, and dice."
          width="640"
          height="326"
          loading="lazy"
          decoding="async"
        />
        <figcaption>Gauntlet set up for remote playtesting in Tabletop Simulator.</figcaption>
      </figure>
    </div>
  `;

  factionsSection.insertAdjacentElement('afterend', section);
}

function loadStylesheet(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.append(link);
}
