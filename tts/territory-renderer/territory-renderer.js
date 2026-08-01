(() => {
  const catalog = window.GAUNTLET_TTS_CATALOG;
  const target = document.getElementById('renderTarget');
  const territoryId = new URLSearchParams(window.location.search).get('territory');
  const territory = catalog?.territories?.find((item) => item.id === territoryId);

  if (!territory) {
    target.textContent = territoryId ? `Unknown Territory: ${territoryId}` : 'No Territory selected.';
    document.body.dataset.renderReady = 'error';
    return;
  }

  const displayName = territory.arena
    ? territory.name.replace(/^Arena:\s*/i, '')
    : territory.name;
  const paragraphs = territory.text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  target.innerHTML = `
    <article class="territory-card${territory.arena ? ' arena' : ''}" aria-label="${escapeAttribute(territory.name)} Territory card">
      <div class="territory-interior">
        <header class="territory-heading">
          <div class="territory-kind">${territory.arena ? 'Arena Territory' : 'Territory'}</div>
          <h1 class="territory-title">${escapeHtml(displayName)}</h1>
          <div class="territory-complexity">${escapeHtml(territory.complexity)}</div>
        </header>
        <section class="territory-effect" aria-label="Effect">
          ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
        </section>
        <footer class="territory-footer">
          <span>${territory.arena ? 'Arena' : 'Territory'}</span>
          <span>Effect active while face up</span>
          <span>v0.6.1</span>
        </footer>
      </div>
    </article>`;

  window.addEventListener('load', async () => {
    if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    fitTerritory(target.querySelector('.territory-card'));
    document.body.dataset.renderReady = 'true';
  }, { once: true });

  function fitTerritory(card) {
    const title = card.querySelector('.territory-title');
    const effect = card.querySelector('.territory-effect');
    let titleSize = Number.parseFloat(getComputedStyle(title).fontSize);
    let scale = 1;

    while (title.scrollWidth > title.clientWidth + 0.5 && titleSize > 10) {
      titleSize = Math.max(10, titleSize - 0.25);
      title.style.fontSize = `${titleSize}px`;
      forceLayout(card);
    }

    while (overflows(card) && scale > 0.72) {
      scale = Math.max(0.72, scale - 0.01);
      card.style.setProperty('--effect-scale', scale.toFixed(2));
      forceLayout(card);
    }

    if (overflows(card)) {
      card.classList.add('compact');
      forceLayout(card);
    }

    while (overflows(card) && scale > 0.56) {
      scale = Math.max(0.56, scale - 0.01);
      card.style.setProperty('--effect-scale', scale.toFixed(2));
      forceLayout(card);
    }

    card.dataset.effectScale = scale.toFixed(2);
    if (overflows(card)) card.classList.add('fit-warning');
    else card.classList.remove('fit-warning');

    if (!effect.textContent.trim()) card.classList.add('fit-warning');
  }

  function overflows(card) {
    const interior = card.querySelector('.territory-interior');
    const effect = card.querySelector('.territory-effect');
    const footer = card.querySelector('.territory-footer');
    if (!interior || !effect || !footer) return true;

    const interiorRect = interior.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    return effect.scrollHeight > effect.clientHeight + 0.5
      || interior.scrollHeight > interior.clientHeight + 0.5
      || footerRect.bottom > interiorRect.bottom + 0.5;
  }

  function forceLayout(element) {
    void element.offsetHeight;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[character]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
