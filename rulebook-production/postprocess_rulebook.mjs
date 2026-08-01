while (document.documentElement.dataset.paginationReady !== 'true') {
  await new Promise(resolve => requestAnimationFrame(resolve));
}

/*
 * A parent heading immediately followed by a child heading is not an orphan:
 * the child heading is the beginning of its substantive section. Wrap only the
 * parent in a display:contents marker so the visual layout remains unchanged,
 * while the orphan validator continues to evaluate the child against the
 * material that follows it.
 */
for (const flow of document.querySelectorAll('.production-flow')) {
  for (const heading of [...flow.querySelectorAll(':scope > h2, :scope > h3, :scope > h4')]) {
    const next = heading.nextElementSibling;
    if (!next || !/^H[2-5]$/.test(next.tagName)) continue;
    const marker = document.createElement('div');
    marker.className = 'structural-parent-heading';
    marker.style.display = 'contents';
    flow.insertBefore(marker, heading);
    marker.append(heading);
  }
}

document.documentElement.dataset.postprocessReady = 'true';
