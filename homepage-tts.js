const factionsSection = document.querySelector('#factions');

if (factionsSection && !document.querySelector('#tabletop-simulator')) {
  loadStylesheet('/homepage-tts.css?v=20260827-1');

  const section = document.createElement('section');
  section.id = 'tabletop-simulator';
  section.className = 'section tts-section';
  section.setAttribute('aria-labelledby', 'tts-title');
  section.innerHTML = `
    <div class="tts-shell">
      <div class="tts-copy">
        <p class="eyebrow declaration-overline">Play remotely</p>
        <p class="tts-status"><span>v0.7.0</span> · Live on Steam Workshop</p>
        <h2 id="tts-title">Bring the Gauntlet to the digital table.</h2>
        <p class="tts-lede">
          Gauntlet v0.7.0 is now available on the Steam Workshop for Tabletop Simulator, with decks, Leaders, Territories, the six-position Gauntlet, starter Bags, player pieces, and faction-specific components ready for online play.
        </p>
        <p class="tts-note">
          Rules remain player-operated rather than automated, so the same Rulebook and card interactions govern play at the digital table.
        </p>
        <div class="tts-actions">
          <a class="button primary" href="https://steamcommunity.com/sharedfiles/filedetails/?id=3790840635" target="_blank" rel="noopener noreferrer">Open on Steam Workshop</a>
          <a class="button secondary" href="/rulebook/">Read the Rulebook</a>
        </div>
      </div>

      <div class="tts-features" aria-label="Tabletop Simulator implementation features">
        <article>
          <span class="tts-feature-number">01</span>
          <h3>Complete play surface</h3>
          <p>White and Green player areas, six Territory positions, hand zones, Player Tokens, battle dice, and the physical spaces needed to run a game.</p>
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
        <figcaption>Gauntlet v0.7.0 set up for online play in Tabletop Simulator.</figcaption>
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
