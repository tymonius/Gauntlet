(() => {
  const escapeHtml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const factionAccents = {
    Military: '#8f1f25',
    Diplomats: '#244b8f',
    Financiers: '#276744',
    Intelligence: '#34373b',
    Mystics: '#603d78',
    Inquisition: '#9a6e21',
  };

  function furniture(pageNumber, label, leftSide) {
    const number = `<span class="folio-number">${pageNumber}</span>`;
    const text = `<span class="folio-label">${escapeHtml(label)}</span>`;
    return `<div class="footer-rule"></div><div class="folio">${leftSide ? `${number}${text}` : `${text}${number}`}</div>`;
  }

  function applySupplement(page, { title, label, anchor, content }) {
    const pageNumber = Number(page.dataset.page);
    const leftSide = page.classList.contains('left');
    page.classList.remove('intentional-blank');
    page.classList.add('reference-supplement');
    page.dataset.anchor = anchor;
    page.innerHTML = `<div class="page-inner"><div class="running-head"><span>Part IV · Reference</span><span>${escapeHtml(title)}</span></div><div class="production-flow">${content}</div></div>${furniture(pageNumber, label, leftSide)}`;
  }

  function buildFactionReference(data) {
    const cards = Object.entries(data.metadata.factions).map(([name, metadata]) => {
      const opener = document.querySelector(`#reader-root .faction-opener[data-faction="${CSS.escape(name)}"]`);
      const claim = opener?.querySelector('.faction-claim')?.textContent?.trim() || metadata.claim;
      const stats = Object.fromEntries([...opener?.querySelectorAll('.faction-stats > div') || []].map(row => [
        row.querySelector('dt')?.textContent?.trim() || '',
        row.querySelector('dd')?.textContent?.trim() || '',
      ]));
      const victory = stats.Victory || 'Run the Gauntlet';
      const resource = stats.Resource || stats['Normal gain'] || 'See faction chapter';
      return `<article class="faction-reference-card" style="--reference-accent:${factionAccents[name] || '#8f1f25'}"><h3>${escapeHtml(name)}</h3><p class="claim">${escapeHtml(claim)}</p><dl><dt>Leaders</dt><dd>${escapeHtml(metadata.leaders.join(' · '))}</dd><dt>Victory</dt><dd>${escapeHtml(victory)}</dd><dt>Resource</dt><dd>${escapeHtml(resource)}</dd></dl></article>`;
    }).join('');
    return `<p class="flavor-overline">Six institutions contest one battlefield</p><h2 class="page-title">Faction Reference</h2><p class="reference-intro">Use this overview to locate each faction's Leaders, resource system, and path to victory. The complete procedures remain in the faction chapters.</p><div class="faction-reference-grid">${cards}</div>`;
  }

  function buildLeaderDirectory() {
    const entries = [...document.querySelectorAll('#reader-root > .leader-page')].map(page => {
      const name = page.querySelector('.leader-name')?.textContent?.trim() || 'Leader';
      const faction = page.dataset.faction || '';
      const ability = page.querySelector('.leader-ability h3')?.textContent?.trim() || 'Leader ability';
      const pageNumber = page.dataset.page;
      return `<article class="leader-directory-entry"><h3>${escapeHtml(name)}</h3><span class="page-ref">${pageNumber}</span><p class="leader-meta">${escapeHtml(faction)} · ${escapeHtml(ability)}</p></article>`;
    }).join('');
    return `<p class="flavor-overline">Twelve ways to lead</p><h2 class="page-title">Leader Directory</h2><p class="reference-intro">Each Leader has a dedicated profile in its faction chapter. Page numbers refer to the finished reader edition.</p><div class="leader-directory">${entries}</div>`;
  }

  function buildRulesIndex(data, report) {
    const groups = Object.keys(data.metadata.parts).map(part => {
      const partMeta = data.metadata.parts[part];
      const rows = data.metadata.chapters
        .filter(chapter => chapter.part === part && chapter.title !== 'Copyright and Playtest Use')
        .map(chapter => `<div class="rules-index-row"><span>${chapter.number ? `${chapter.number}. ` : ''}${escapeHtml(chapter.title)}</span><span class="page-ref">${report.anchors[chapter.heading] || '—'}</span></div>`)
        .join('');
      return `<section class="rules-index-group"><h3>${escapeHtml(partMeta.label)} · ${escapeHtml(partMeta.title)}</h3>${rows}</section>`;
    }).join('');
    return `<p class="flavor-overline">Find the rule, then return to play</p><h2 class="page-title">Rules Index</h2><p class="reference-intro">Chapter and reference-page locations in the finished reader edition.</p><div class="rules-index">${groups}</div>`;
  }

  function populateBookletPadding() {
    const dataNode = document.querySelector('#rulebook-data');
    const report = window.__rulebookReport;
    if (!dataNode || !report) return;
    const data = JSON.parse(dataNode.textContent);
    const readerPadding = [...document.querySelectorAll('#reader-root > .intentional-blank')]
      .filter(page => page.querySelector('.blank-note')?.textContent?.toUpperCase().includes('BOOKLET PAGINATION'));
    if (readerPadding.length !== 3) return;

    const supplements = [
      { title: 'Factions at a Glance', label: 'FACTION REFERENCE', anchor: 'Faction Reference', content: buildFactionReference(data) },
      { title: 'Leaders', label: 'LEADER DIRECTORY', anchor: 'Leader Directory', content: buildLeaderDirectory() },
      { title: 'Rules Index', label: 'RULES INDEX', anchor: 'Rules Index', content: buildRulesIndex(data, report) },
    ];

    readerPadding.forEach((readerPage, index) => {
      const pageNumber = readerPage.dataset.page;
      for (const page of document.querySelectorAll(`.page[data-page="${pageNumber}"]`)) {
        applySupplement(page, supplements[index]);
      }
      report.anchors[supplements[index].anchor] = Number(pageNumber);
    });
    report.intentionalBlanks = Math.max(0, report.intentionalBlanks - 3);
  }

  function processRulebookStructure() {
    if (document.documentElement.dataset.paginationReady !== 'true') return false;

    /* Some faction parent headings are followed by an ornamental divider before
     * their first child subsection. Group that divider and subsection in a
     * display:contents wrapper without altering layout. */
    for (const flow of document.querySelectorAll('.production-flow')) {
      for (const heading of [...flow.querySelectorAll(':scope > h2, :scope > h3, :scope > h4')]) {
        const divider = heading.nextElementSibling;
        if (!divider?.classList.contains('source-divider')) continue;

        const child = divider.nextElementSibling;
        const directChildHeading = child && /^H[2-5]$/.test(child.tagName);
        const keptChildHeading = child?.classList.contains('keep-group') &&
          child.firstElementChild && /^H[2-5]$/.test(child.firstElementChild.tagName);
        if (!directChildHeading && !keptChildHeading) continue;

        const marker = document.createElement('div');
        marker.className = 'structural-following-section';
        marker.style.display = 'contents';
        flow.insertBefore(marker, divider);
        marker.append(divider, child);
      }
    }

    populateBookletPadding();
    document.documentElement.dataset.postprocessReady = 'true';
    return true;
  }

  if (processRulebookStructure()) return;

  const observer = new MutationObserver(() => {
    if (!processRulebookStructure()) return;
    observer.disconnect();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-pagination-ready'],
  });
})();
