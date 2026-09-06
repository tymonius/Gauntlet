// Compatibility entry point for the Card Design catalog. Inspection history,
// modal lifecycle, artwork inspection, and scaling now live in one shared runtime.
(() => {
  if (!document.querySelector('link[data-gauntlet-card-inspector]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './card-inspector.css?v=20260905-1';
    link.dataset.gauntletCardInspector = 'true';
    document.head.append(link);
  }

  import('./card-inspector.js?v=20260905-1').catch(error => {
    console.error('Shared card inspector failed to load.', error);
  });
})();
