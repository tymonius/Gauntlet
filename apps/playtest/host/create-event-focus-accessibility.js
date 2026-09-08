(() => {
  let pendingOrigin = null;

  function getStatus() {
    const status = document.getElementById("createEventStatus");
    if (!(status instanceof HTMLElement)) return null;
    status.setAttribute("role", "status");
    status.tabIndex = -1;
    return status;
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "createEventForm") return;
    pendingOrigin = form.contains(document.activeElement) && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    getStatus()?.focus({ preventScroll: true });
  }, true);

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "createEventForm") return;
    const origin = pendingOrigin;
    pendingOrigin = null;
    const status = getStatus();
    if (!(origin instanceof HTMLElement) || !(status instanceof HTMLElement)) return;

    const controls = [...form.querySelectorAll("button, input, select, textarea")];
    const busy = controls.some((control) => control.matches(":disabled"));
    if (!busy) {
      if (document.activeElement === status) origin.focus({ preventScroll: true });
      return;
    }

    const observer = new MutationObserver(() => {
      if (origin.matches(":disabled")) return;
      observer.disconnect();
      if (document.activeElement !== status || status.classList.contains("success")) return;
      if (origin.isConnected) origin.focus({ preventScroll: true });
    });
    observer.observe(origin, { attributes: true, attributeFilter: ["disabled"] });
  });
})();
