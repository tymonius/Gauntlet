(() => {
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
