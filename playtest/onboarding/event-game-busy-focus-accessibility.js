(() => {
  const CONTROL_IDS = new Set(["eventCreateGames", "eventRefreshGames"]);

  function enhanceStatus() {
    const status = document.getElementById("eventGameStatus");
    if (!status) return null;
    status.setAttribute("role", "status");
    status.tabIndex = -1;
    return status;
  }

  const observer = new MutationObserver(() => {
    if (enhanceStatus()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhanceStatus();

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("button") : null;
    if (!(target instanceof HTMLButtonElement) || !CONTROL_IDS.has(target.id) || !target.disabled) return;

    const status = enhanceStatus();
    if (!status) return;
    status.focus({ preventScroll: true });

    const restoreObserver = new MutationObserver(() => {
      if (target.disabled) return;
      restoreObserver.disconnect();
      if (document.activeElement === status && target.isConnected) {
        target.focus({ preventScroll: true });
      }
    });
    restoreObserver.observe(target, { attributes: true, attributeFilter: ["disabled"] });
  });
})();
