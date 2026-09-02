(() => {
  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const PREVIEW_HISTORY_KEY = "gauntletDeckbuilderMobilePreview";
  let preview = null;
  let backdrop = null;
  let open = false;

  installRenderedCardAssets();
  document.addEventListener("DOMContentLoaded", installMobileCardPreview);

  function installRenderedCardAssets() {
    ensureStylesheet("rendered-card-preview.css?v=20260819-2", "deckbuilder-rendered-card-preview");
    ensureStylesheet("metadata-ui.css?v=20260819-2", "deckbuilder-metadata-ui");
    ensureStylesheet("../card-reference/card-inspection.css?v=20260819-2", "shared-card-inspection");
    ensureScript("rendered-card-preview.js?v=20260902-1", "deckbuilder-rendered-card-preview");
    ensureScript("metadata-ui.js?v=20260902-1", "deckbuilder-metadata-ui");
    ensureScript("../card-reference/card-inspection.js?v=20260819-2", "shared-card-inspection");
  }

  function ensureStylesheet(href, key) {
    if (document.querySelector(`link[data-preview-asset="${key}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.previewAsset = key;
    document.head.append(link);
  }

  function ensureScript(src, key) {
    if (document.querySelector(`script[data-preview-asset="${key}"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.previewAsset = key;
    document.head.append(script);
  }

  function installMobileCardPreview() {
    preview = document.getElementById("cardPreview");
    if (!preview) return;

    backdrop = document.createElement("div");
    backdrop.className = "mobile-card-preview-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    document.body.append(backdrop);

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeydown);
    backdrop.addEventListener("click", requestClosePreview);
    window.addEventListener("popstate", handlePopState);

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", syncViewportMode);
    } else {
      mobileQuery.addListener(syncViewportMode);
    }

    syncViewportMode();
  }

  function currentHistoryState() {
    return history.state && typeof history.state === "object" ? history.state : {};
  }

  function hasPreviewHistory(state = history.state) {
    return Boolean(state && typeof state === "object" && state[PREVIEW_HISTORY_KEY]);
  }

  function pushPreviewHistory() {
    if (hasPreviewHistory()) return;
    history.pushState(
      { ...currentHistoryState(), [PREVIEW_HISTORY_KEY]: true },
      "",
      window.location.href,
    );
  }

  function clearPreviewHistory() {
    if (!hasPreviewHistory()) return;
    const nextState = { ...currentHistoryState() };
    delete nextState[PREVIEW_HISTORY_KEY];
    history.replaceState(nextState, "", window.location.href);
  }

  function handlePopState(event) {
    if (hasPreviewHistory(event.state)) {
      if (!open && mobileQuery.matches) openPreview(false);
      return;
    }
    if (open) dismissPreview();
  }

  function handleDocumentClick(event) {
    if (!(event.target instanceof Element)) return;

    const cardRow = event.target.closest(".compact-card-row");
    if (cardRow && !event.target.closest("button") && mobileQuery.matches) {
      window.requestAnimationFrame(() => openPreview());
      return;
    }

    if (event.target.closest("#previewAddButton") && open) {
      requestClosePreview();
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && open) requestClosePreview();
  }

  function openPreview(pushHistory = true) {
    if (!mobileQuery.matches || !preview || preview.classList.contains("empty-state")) return;

    ensureCloseButton();
    if (pushHistory && !open) pushPreviewHistory();
    open = true;
    preview.classList.add("mobile-open");
    backdrop?.classList.add("mobile-open");
    document.body.classList.add("mobile-card-preview-open");
    preview.setAttribute("role", "dialog");
    preview.setAttribute("aria-modal", "true");
    preview.setAttribute("aria-hidden", "false");

    const title = preview.querySelector("h3");
    if (title) {
      title.id = "mobileCardPreviewTitle";
      preview.setAttribute("aria-labelledby", title.id);
    } else {
      preview.setAttribute("aria-label", "Card preview");
    }

    preview.querySelector(".mobile-card-preview-close")?.focus({ preventScroll: true });
  }

  function requestClosePreview() {
    if (!open) return;
    if (hasPreviewHistory()) {
      history.back();
      return;
    }
    dismissPreview();
  }

  function dismissPreview() {
    if (!preview) return;

    open = false;
    preview.classList.remove("mobile-open");
    backdrop?.classList.remove("mobile-open");
    document.body.classList.remove("mobile-card-preview-open");
    preview.setAttribute("aria-hidden", mobileQuery.matches ? "true" : "false");

    const selectedRow = document.querySelector(".compact-card-row.selected");
    if (selectedRow instanceof HTMLElement) {
      selectedRow.tabIndex = -1;
      selectedRow.focus({ preventScroll: true });
    }
  }

  function ensureCloseButton() {
    let closeButton = preview.querySelector(".mobile-card-preview-close");
    if (closeButton) return closeButton;

    closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "mobile-card-preview-close";
    closeButton.setAttribute("aria-label", "Close card preview");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", requestClosePreview);
    preview.prepend(closeButton);
    return closeButton;
  }

  function syncViewportMode() {
    if (!preview) return;

    if (!mobileQuery.matches) {
      dismissPreview();
      clearPreviewHistory();
      preview.removeAttribute("role");
      preview.removeAttribute("aria-modal");
      preview.removeAttribute("aria-hidden");
      preview.removeAttribute("aria-labelledby");
      preview.removeAttribute("aria-label");
      return;
    }

    preview.setAttribute("aria-hidden", open ? "false" : "true");
  }
})();
