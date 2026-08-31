(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");

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

  deckbuilder.registerPrintTransform("card-back-orientation", rotateCardBacks, 10);
  deckbuilder.registerPrintTransform("production-face-guard", guardProductionFaces, 100);

  function guardProductionFaces(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    assertNoStalePrintFaces(documentNode);
    return html;
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

(() => {
  const install = async () => {
    try {
      const module = await import("./custom-print.mjs");
      module.installCustomPrintMode();
    } catch (error) {
      console.error("Unable to initialize Deckbuilder custom printing", error);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
