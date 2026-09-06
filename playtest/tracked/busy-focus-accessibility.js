(() => {
  const FORM_CONFIG = Object.freeze({
    createForm: ["createStatus", "createPanel"],
    joinForm: ["joinStatus", "joinPanel"],
    resultForm: ["resultStatus", "resultSection"],
    responseForm: ["responseStatus", "responseSection"]
  });
  const pendingOrigins = new Map();

  function enhanceStatus(id) {
    const status = document.getElementById(id);
    if (!(status instanceof HTMLElement)) return null;
    status.setAttribute("role", "status");
    status.tabIndex = -1;
    return status;
  }

  function panelVisible(id) {
    const panel = document.getElementById(id);
    return panel instanceof HTMLElement && !panel.hidden;
  }

  function watchFormReturn(origin, status, panelId) {
    if (!(origin instanceof HTMLElement) || !(status instanceof HTMLElement)) return;
    const observer = new MutationObserver(() => {
      if (!origin.isConnected) {
        observer.disconnect();
        return;
      }
      if (origin.matches(":disabled")) return;
      observer.disconnect();
      if (document.activeElement === status && panelVisible(panelId)) {
        origin.focus({ preventScroll: true });
      }
    });
    observer.observe(origin, { attributes: true, attributeFilter: ["disabled"] });
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !FORM_CONFIG[form.id]) return;
    const [statusId] = FORM_CONFIG[form.id];
    const origin = form.contains(document.activeElement) && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    pendingOrigins.set(form.id, origin);
    if (origin) enhanceStatus(statusId)?.focus({ preventScroll: true });
  }, true);

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !FORM_CONFIG[form.id]) return;
    const [statusId, panelId] = FORM_CONFIG[form.id];
    const origin = pendingOrigins.get(form.id);
    pendingOrigins.delete(form.id);
    if (!(origin instanceof HTMLElement)) return;

    const busy = [...form.querySelectorAll("button, input, select, textarea")]
      .some((control) => control.matches(":disabled"));
    const status = enhanceStatus(statusId);
    if (!busy) {
      if (document.activeElement === status) origin.focus({ preventScroll: true });
      return;
    }
    watchFormReturn(origin, status, panelId);
  });

  document.addEventListener("click", (event) => {
    const start = event.target instanceof Element ? event.target.closest("#recordStart") : null;
    if (!(start instanceof HTMLButtonElement) || !start.disabled) return;
    const status = enhanceStatus("liveSyncStatus");
    if (!status) return;
    status.focus({ preventScroll: true });
    watchFormReturn(start, status, "playPanel");
  });

  function installDynamicFocus() {
    for (const [statusId] of Object.values(FORM_CONFIG)) enhanceStatus(statusId);
    enhanceStatus("liveSyncStatus");

    const journalForm = document.getElementById("playerJournalForm");
    const journalStatus = enhanceStatus("journalSyncState");
    if (!(journalForm instanceof HTMLFormElement) || !(journalStatus instanceof HTMLElement)) return;

    let lastJournalControl = null;
    document.addEventListener("focusin", (event) => {
      const target = event.target;
      lastJournalControl = target instanceof HTMLElement && journalForm.contains(target) ? target : null;
    });

    const observer = new MutationObserver(() => {
      if (!(lastJournalControl instanceof HTMLElement) || !lastJournalControl.matches(":disabled")) return;
      if (!journalForm.contains(lastJournalControl)) return;
      lastJournalControl = null;
      journalStatus.focus({ preventScroll: true });
    });
    observer.observe(journalForm, { subtree: true, attributes: true, attributeFilter: ["disabled"] });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installDynamicFocus, { once: true });
  } else {
    installDynamicFocus();
  }
})();
