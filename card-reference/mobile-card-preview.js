(() => {
  const mobileQuery = window.matchMedia("(max-width: 700px)");
  let preview = null;
  let backdrop = null;
  let open = false;

  document.addEventListener("DOMContentLoaded", installMobileCardPreview);

  function installMobileCardPreview() {
    preview = document.getElementById("preview");
    if (!preview) return;

    backdrop = document.createElement("div");
    backdrop.className = "mobile-reference-preview-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    document.body.append(backdrop);

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeydown);
    backdrop.addEventListener("click", () => closePreview());

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", syncViewportMode);
    } else {
      mobileQuery.addListener(syncViewportMode);
    }

    syncViewportMode();
  }

  function handleDocumentClick(event) {
    if (!(event.target instanceof Element)) return;

    const resultRow = event.target.closest(".reference-row");
    if (resultRow && mobileQuery.matches) {
      openPreview();
    }
  }

  function handleKeydown(event) {
    if (event.key === "Tab" && open) {
      trapModalFocus(event);
      return;
    }
    if (event.key === "Escape" && open) closePreview();
  }

  function trapModalFocus(event) {
    if (!preview) return;

    const focusable = Array.from(preview.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
    )).filter(element => element instanceof HTMLElement && !element.hidden && element.getClientRects().length > 0);

    if (!focusable.length) {
      event.preventDefault();
      preview.focus?.({ preventScroll: true });
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (!preview.contains(active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
      return;
    }
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function openPreview() {
    if (!mobileQuery.matches || !preview || preview.classList.contains("empty-state")) return;

    ensureCloseButton();
    open = true;
    preview.classList.add("mobile-open");
    backdrop?.classList.add("mobile-open");
    document.body.classList.add("mobile-reference-preview-open");
    preview.setAttribute("role", "dialog");
    preview.setAttribute("aria-modal", "true");
    preview.setAttribute("aria-hidden", "false");

    const title = preview.querySelector("h3");
    if (title) {
      title.id = "mobileReferencePreviewTitle";
      preview.setAttribute("aria-labelledby", title.id);
      preview.removeAttribute("aria-label");
    } else {
      preview.setAttribute("aria-label", "Card details");
      preview.removeAttribute("aria-labelledby");
    }

    preview.querySelector(".mobile-reference-preview-close")?.focus({ preventScroll: true });
  }

  function closePreview(restoreFocus = true) {
    if (!preview) return;

    open = false;
    preview.classList.remove("mobile-open");
    backdrop?.classList.remove("mobile-open");
    document.body.classList.remove("mobile-reference-preview-open");
    preview.setAttribute("aria-hidden", mobileQuery.matches ? "true" : "false");

    if (!restoreFocus) return;
    const selectedRow = document.querySelector(".reference-row.selected");
    if (selectedRow instanceof HTMLElement) {
      selectedRow.focus({ preventScroll: true });
    }
  }

  function ensureCloseButton() {
    let closeButton = preview.querySelector(".mobile-reference-preview-close");
    if (closeButton) return closeButton;

    closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "mobile-reference-preview-close";
    closeButton.setAttribute("aria-label", "Close card details");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", () => closePreview());
    preview.prepend(closeButton);
    return closeButton;
  }

  function syncViewportMode() {
    if (!preview) return;

    if (!mobileQuery.matches) {
      closePreview(false);
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
