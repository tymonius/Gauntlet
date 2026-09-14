document.addEventListener('click', (event) => {
  const link = event.target.closest?.('[data-rulebook-toc] a[href^="#"]');
  if (!link || !window.matchMedia('(max-width: 900px)').matches) return;

  let targetId = String(link.getAttribute('href') || '').replace(/^#/, '');
  try { targetId = decodeURIComponent(targetId); } catch { /* use the literal fragment */ }
  if (!targetId) return;

  window.requestAnimationFrame(() => {
    const target = document.getElementById(targetId);
    if (!(target instanceof HTMLElement)) return;
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
  });
});
