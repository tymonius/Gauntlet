(() => {
  const refresh = document.getElementById("refreshData");
  const connectionStatus = document.getElementById("connectionStatus");
  const pendingFormOrigins = new Map();

  function enhanceStatus(node) {
    if (!(node instanceof HTMLElement)) return null;
    node.setAttribute("role", "status");
    node.tabIndex = -1;
    return node;
  }

  const accessStatus = enhanceStatus(document.getElementById("accessStatus"));
  const dialogStatus = enhanceStatus(document.getElementById("dialogStatus"));
  enhanceStatus(connectionStatus);

  const formConfig = {
    accessForm: {
      status: accessStatus,
      context: () => document.getElementById("accessPanel"),
      successTarget: () => document.getElementById("analysisApp") || document.getElementById("integrityApp")
    },
    excludeForm: {
      status: dialogStatus,
      context: () => document.getElementById("excludeDialog"),
      successTarget: () => document.getElementById("excludedRecords")
    }
  };

  function contextVisible(context) {
    if (!(context instanceof HTMLElement)) return false;
    if (context instanceof HTMLDialogElement) return context.open;
    return !context.hidden;
  }

  function focusSuccessTarget(target) {
    if (!(target instanceof HTMLElement) || target.hidden) return;
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }

  function watchReturn(control, status, config, disconnectRoot = null) {
    if (!(control instanceof HTMLElement) || !(status instanceof HTMLElement)) return;

    const observer = new MutationObserver(() => {
      if (!control.isConnected) {
        observer.disconnect();
        return;
      }
      if (control.matches(":disabled")) return;
      observer.disconnect();
      if (document.activeElement !== status) return;

      const context = config.context?.();
      if (contextVisible(context)) {
        control.focus({ preventScroll: true });
      } else {
        focusSuccessTarget(config.successTarget?.());
      }
    });

    observer.observe(control, { attributes: true, attributeFilter: ["disabled"] });
    if (disconnectRoot instanceof HTMLElement) {
      observer.observe(disconnectRoot, { childList: true, subtree: true });
    }
  }

  if (refresh instanceof HTMLElement && connectionStatus instanceof HTMLElement) {
    let returnRefreshFocus = false;

    function restoreRefreshFocus() {
      if (!returnRefreshFocus || refresh.matches(":disabled")) return;
      returnRefreshFocus = false;
      if (document.activeElement === connectionStatus) refresh.focus({ preventScroll: true });
    }

    document.addEventListener("click", (event) => {
      const trigger = event.target instanceof Element ? event.target.closest("#refreshData") : null;
      if (trigger !== refresh) return;
      returnRefreshFocus = true;
      connectionStatus.focus({ preventScroll: true });
      queueMicrotask(restoreRefreshFocus);
    }, true);

    const observer = new MutationObserver(restoreRefreshFocus);
    observer.observe(refresh, { attributes: true, attributeFilter: ["disabled"] });
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !formConfig[form.id]) return;
    const origin = form.contains(document.activeElement) && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    pendingFormOrigins.set(form.id, origin);
    formConfig[form.id].status?.focus({ preventScroll: true });
  }, true);

  document.addEventListener("submit", (event) => {
    const form = event.target;
    const config = form instanceof HTMLFormElement ? formConfig[form.id] : null;
    if (!config) return;
    const origin = pendingFormOrigins.get(form.id);
    pendingFormOrigins.delete(form.id);
    if (!(origin instanceof HTMLElement)) return;
    const busy = [...form.querySelectorAll("button, input, select, textarea")]
      .some((control) => control.matches(":disabled"));
    if (!busy) return;
    watchReturn(origin, config.status, config);
  });

  document.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-restore-id]") : null;
    if (!(button instanceof HTMLButtonElement) || !button.disabled || !(connectionStatus instanceof HTMLElement)) return;
    connectionStatus.focus({ preventScroll: true });
    watchReturn(button, connectionStatus, {
      context: () => document.getElementById("excludedRecords"),
      successTarget: () => document.getElementById("activeRecords")
    }, document.getElementById("excludedRecords"));
  });
})();
