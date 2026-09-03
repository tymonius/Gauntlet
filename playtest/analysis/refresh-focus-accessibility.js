(() => {
  const refresh = document.getElementById("refreshData");
  const status = document.getElementById("connectionStatus");
  if (!refresh || !status) return;

  status.tabIndex = -1;
  let returnFocus = false;

  function restoreRefreshFocus() {
    if (!returnFocus || refresh.disabled) return;
    returnFocus = false;
    refresh.focus({ preventScroll: true });
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("#refreshData");
    if (trigger !== refresh) return;
    returnFocus = true;
    status.focus({ preventScroll: true });
    queueMicrotask(restoreRefreshFocus);
  }, true);

  const observer = new MutationObserver(restoreRefreshFocus);
  observer.observe(refresh, { attributes: true, attributeFilter: ["disabled"] });
})();
