(() => {
  const STALE_PRINT_FACE_SELECTORS = [
    ".print-card.leader-card",
    ".print-card.main-card:not(.production-render-card)",
    ".print-card.territory:not(.production-render-territory)",
    ".print-card.tracker-card",
    ".print-card.reference-card",
    ".print-card.purge-card",
    ".print-card.capital-tracker-card",
    ".print-card.deed-card",
    ".print-card.proposal-card",
    ".print-card.rite-card",
    ".supplemental-placeholder-card",
  ];

  document.addEventListener("DOMContentLoaded", installCardBackOrientationFix);

  function installCardBackOrientationFix() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const inheritedOpen = window.open;
      let restored = false;

      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        if (window.open === cardBackAwareOpen) window.open = inheritedOpen;
      };

      function cardBackAwareOpen(...args) {
        const printWindow = inheritedOpen.apply(window, args);
        if (!printWindow) {
          restoreOpen();
          return printWindow;
        }

        const inheritedWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => inheritedWrite(rotateCardBacks(html));
        installFinalProductionFaceGuard(printWindow);
        restoreOpen();
        return printWindow;
      }

      window.open = cardBackAwareOpen;
      window.setTimeout(restoreOpen, 0);
    }, true);
  }

  function installFinalProductionFaceGuard(printWindow) {
    if (printWindow.document.__gauntletProductionFaceGuardInstalled) return;

    const inheritedClose = printWindow.document.close.bind(printWindow.document);
    printWindow.document.close = () => {
      try {
        assertNoStalePrintFaces(printWindow.document);
        inheritedClose();
      } catch (error) {
        console.error(error);
        window.alert(`Printing was stopped because an outdated card face survived the production replacement pass: ${error.message}`);
        try {
          printWindow.close();
        } catch (closeError) {
          console.error(closeError);
        }
      }
    };
    printWindow.document.__gauntletProductionFaceGuardInstalled = true;
  }

  function assertNoStalePrintFaces(documentNode) {
    const staleFaces = [...documentNode.querySelectorAll(STALE_PRINT_FACE_SELECTORS.join(","))];
    if (!staleFaces.length) return;

    const labels = staleFaces.slice(0, 5).map(face => {
      return face.getAttribute("aria-label")
        || face.querySelector(".card-name, .territory-name, .supplemental-header, .tracker-title, .proposal-title, .rite-title")?.textContent?.trim()
        || [...face.classList].join(".");
    });
    const remaining = staleFaces.length > labels.length ? ` +${staleFaces.length - labels.length} more` : "";
    throw new Error(`${labels.join("; ")}${remaining}`);
  }

  function rotateCardBacks(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const style = documentNode.querySelector("style");
    if (!style) return html;

    style.textContent += `
.gauntlet-card-back{
  transform:rotate(180deg)!important;
  transform-origin:center center!important;
}`;

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }
})();
