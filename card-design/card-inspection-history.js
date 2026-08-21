(() => {
  const INSPECTION_HISTORY_KEY = 'gauntletCardDesignInspection';
  let closingFromHistory = false;

  function currentHistoryState() {
    return history.state && typeof history.state === 'object' ? history.state : {};
  }

  function hasInspectionHistory(state = history.state) {
    return Boolean(state && typeof state === 'object' && state[INSPECTION_HISTORY_KEY]);
  }

  function openInspectionDialogs() {
    return Array.from(document.querySelectorAll('dialog.card-inspection-dialog[open]'));
  }

  function pushInspectionHistory(dialog) {
    if (!dialog?.open || hasInspectionHistory()) return;
    history.pushState(
      {
        ...currentHistoryState(),
        [INSPECTION_HISTORY_KEY]: true,
      },
      '',
      window.location.href,
    );
  }

  function requestHistoryClose(event, dialog) {
    if (closingFromHistory || !dialog?.open || !hasInspectionHistory()) return false;
    event?.preventDefault();
    event?.stopImmediatePropagation();
    history.back();
    return true;
  }

  function dismissInspectionDialogs() {
    const dialogs = openInspectionDialogs();
    if (!dialogs.length) return;

    closingFromHistory = true;
    try {
      for (const dialog of dialogs) {
        const closeButton = dialog.querySelector('.card-inspection-close');
        if (closeButton instanceof HTMLElement) closeButton.click();
        else dialog.close();
      }
    } finally {
      queueMicrotask(() => {
        closingFromHistory = false;
      });
    }
  }

  document.addEventListener('click', event => {
    if (closingFromHistory || !(event.target instanceof Element)) return;
    const dialog = event.target.closest('dialog.card-inspection-dialog');
    if (!dialog?.open) return;

    const closeControl = event.target.closest('.card-inspection-close');
    const backdropClick = event.target === dialog;
    if (!closeControl && !backdropClick) return;
    requestHistoryClose(event, dialog);
  }, true);

  document.addEventListener('cancel', event => {
    const dialog = event.target;
    if (!(dialog instanceof HTMLDialogElement) || !dialog.matches('.card-inspection-dialog')) return;
    requestHistoryClose(event, dialog);
  }, true);

  window.addEventListener('popstate', event => {
    if (hasInspectionHistory(event.state)) return;
    dismissInspectionDialogs();
  });

  const observer = new MutationObserver(records => {
    for (const record of records) {
      const dialog = record.target;
      if (
        record.type === 'attributes'
        && record.attributeName === 'open'
        && dialog instanceof HTMLDialogElement
        && dialog.matches('.card-inspection-dialog')
        && dialog.open
      ) {
        pushInspectionHistory(dialog);
      }
    }
  });

  observer.observe(document.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ['open'],
  });

  openInspectionDialogs().forEach(pushInspectionHistory);
})();
