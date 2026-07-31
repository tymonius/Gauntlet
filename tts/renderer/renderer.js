(() => {
  const catalog = window.GAUNTLET_TTS_CATALOG;
  const target = document.getElementById('renderTarget');
  const cardId = new URLSearchParams(window.location.search).get('card');
  const card = catalog?.playableCards?.find((item) => item.id === cardId);

  if (!card) {
    target.textContent = cardId ? `Unknown card: ${cardId}` : 'No card selected.';
    document.body.dataset.renderReady = 'error';
    return;
  }

  const sectionEntries = Object.entries(card.sections || {});
  const action = sectionEntries.find(([label]) => label.toLowerCase() === 'action');
  const battle = sectionEntries.find(([label]) => label.toLowerCase() === 'battle');
  const reminder = sectionEntries.find(([label]) => label.toLowerCase() === 'reminder');
  const other = sectionEntries.filter(([label]) => !['action', 'battle', 'reminder'].includes(label.toLowerCase()));
  const sections = [action, battle, ...other].filter(Boolean);
  const art = card.artwork
    ? `<img src="/${escapeAttribute(card.artwork)}" alt="">`
    : '<span class="pending-label">Artwork pending</span>';

  target.innerHTML = `
    <article class="gauntlet-card" data-faction="${escapeAttribute(card.faction)}" data-art-max="1.72" data-art-min="0.62" aria-label="${escapeAttribute(card.name)} card">
      <div class="card-interior">
        <header class="card-heading">
          <h1 class="card-title">${escapeHtml(card.name)}</h1>
          <div class="value-medallion" aria-label="Deckbuilding value ${card.cost}">${card.cost}</div>
        </header>
        <figure class="card-art${card.artwork ? '' : ' pending-art'}">${art}</figure>
        <div class="card-rules">
          ${sections.map(([label, text]) => `
            <section class="rule-section">
              <h4>${escapeHtml(label)}</h4>
              <p>${formatText(text)}</p>
            </section>`).join('')}
          ${reminder ? `<aside class="card-reminder"><strong>Reminder:</strong> ${formatText(reminder[1])}</aside>` : ''}
        </div>
        <footer class="card-footer">
          <span>${escapeHtml(card.id)}</span>
          <span>${escapeHtml(card.complexity)}</span>
          <span>v0.6.1</span>
        </footer>
      </div>
    </article>`;

  const artImage = target.querySelector('.card-art img');
  artImage?.addEventListener('error', () => {
    const frame = artImage.closest('.card-art');
    frame.classList.add('pending-art');
    frame.innerHTML = '<span class="pending-label">Artwork unavailable</span>';
  }, { once: true });

  window.addEventListener('load', async () => {
    if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
    await waitFor(() => target.querySelector('.gauntlet-card')?.dataset.parchmentLoaded !== undefined, 5000);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    document.body.dataset.renderReady = 'true';
  }, { once: true });

  async function waitFor(predicate, timeoutMs) {
    const started = performance.now();
    while (!predicate()) {
      if (performance.now() - started > timeoutMs) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  function formatText(value) {
    return escapeHtml(value).replaceAll('\n', '<br>');
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
