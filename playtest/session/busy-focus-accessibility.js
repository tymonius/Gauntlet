(() => {
  let pendingJoinOrigin = null;
  let pendingCloseOrigin = null;

  function enhanceStatus(id) {
    const status = document.getElementById(id);
    if (!(status instanceof HTMLElement)) return null;
    status.setAttribute("role", "status");
    status.tabIndex = -1;
    return status;
  }

  function watchReturn(control, status, panel) {
    if (!(control instanceof HTMLElement) || !(status instanceof HTMLElement)) return;
    status.focus({ preventScroll: true });

    const observer = new MutationObserver(() => {
      if (control.matches(":disabled")) return;
      observer.disconnect();
      if (
        document.activeElement === status &&
        control.isConnected &&
        panel instanceof HTMLElement &&
        !panel.hidden
      ) control.focus({ preventScroll: true });
    });
    observer.observe(control, { attributes: true, attributeFilter: ["disabled"] });
  }

  function installClosedSessionActions() {
    const quickActions = document.querySelector(".quick-actions");
    const eventStatus = enhanceStatus("eventStatus");
    if (!(quickActions instanceof HTMLElement) || !(eventStatus instanceof HTMLElement)) return;

    const controls = () => [...quickActions.querySelectorAll("button, input, select, textarea")];
    const syncClosedState = () => {
      const closed = document.body.classList.contains("session-closed");
      if (closed) {
        if (quickActions.contains(document.activeElement)) eventStatus.focus({ preventScroll: true });
        controls().forEach((control) => {
          if (!(control instanceof HTMLButtonElement || control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;
          if (!control.disabled) {
            control.disabled = true;
            control.dataset.closedSessionDisabled = "true";
          }
        });
        return;
      }

      controls().forEach((control) => {
        if (!(control instanceof HTMLButtonElement || control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;
        if (control.dataset.closedSessionDisabled !== "true") return;
        control.disabled = false;
        delete control.dataset.closedSessionDisabled;
      });
    };

    new MutationObserver(syncClosedState).observe(document.body, {
      attributes: true,
      attributeFilter: ["class"]
    });
    syncClosedState();
  }

  document.addEventListener("DOMContentLoaded", () => {
    enhanceStatus("joinStatus");
    enhanceStatus("closeStatus");
    installClosedSessionActions();
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "joinForm") return;
    pendingJoinOrigin = form.contains(document.activeElement) && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  }, true);

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "joinForm") return;
    if (![...form.querySelectorAll("button, input, select, textarea")].some((control) => control.disabled)) return;
    watchReturn(pendingJoinOrigin, enhanceStatus("joinStatus"), document.getElementById("joinPanel"));
    pendingJoinOrigin = null;
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("#closeSession") : null;
    if (!(target instanceof HTMLButtonElement)) return;
    pendingCloseOrigin = target;
  }, true);

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("#closeSession") : null;
    if (!(target instanceof HTMLButtonElement) || !target.disabled) return;
    watchReturn(pendingCloseOrigin, enhanceStatus("closeStatus"), document.getElementById("hostPanel"));
    pendingCloseOrigin = null;
  });
})();
