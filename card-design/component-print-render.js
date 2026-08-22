(() => {
  const params = new URLSearchParams(window.location.search);
  const kind = String(params.get("kind") || "").trim().toLowerCase();
  const id = String(params.get("id") || "").trim();
  const side = String(params.get("side") || "front").trim().toLowerCase();
  const orientation = String(params.get("orientation") || "portrait").trim().toLowerCase();
  const target = document.getElementById("renderTarget");
  const TIMEOUT_MS = 30000;
  const supportedKinds = new Set(["leader", "proposal", "reference", "rite", "ritual", "tracker", "supplemental"]);
  const landscape = orientation === "landscape";
  const renderWidth = landscape ? "3.5in" : "2.5in";
  const renderHeight = landscape ? "2.5in" : "3.5in";

  const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  const reverseSide = () => side === "reverse" || side === "back" || side === "treaty" || side === "completed";

  function applyRenderViewport() {
    for (const node of [document.documentElement, document.body, target]) {
      if (!node) continue;
      node.style.width = renderWidth;
      node.style.height = renderHeight;
    }
    if (document.body) document.body.dataset.renderOrientation = landscape ? "landscape" : "portrait";
  }

  function reportError(error) {
    const message = error?.stack || error?.message || String(error);
    console.error(error);
    document.body.dataset.renderErrorMessage = message;
    document.body.dataset.renderError = "true";
    document.body.dataset.renderReady = "error";
    if (target) {
      const pre = document.createElement("pre");
      pre.textContent = message;
      target.replaceChildren(pre);
    }
  }

  function selectedCard() {
    if (!id) return null;

    if (kind === "leader") {
      return document.querySelector(`#${CSS.escape(id)} .leader-card`);
    }

    if (kind === "proposal") {
      const pair = document.querySelector(`#proposal-${CSS.escape(id)}`);
      const cards = [...(pair?.querySelectorAll(".proposal-card") || [])];
      if (!cards.length) return null;
      return reverseSide() ? cards[1] || null : cards[0] || null;
    }

    if (kind === "reference") {
      const referenceSide = reverseSide() ? "reverse" : "front";
      return document.querySelector(`.reference-card[data-component-id="${CSS.escape(id)}"][data-reference-side="${referenceSide}"]`);
    }

    if (kind === "rite") {
      const pair = document.querySelector(`#rite-${CSS.escape(id)}`);
      const cards = [...(pair?.querySelectorAll(".rite-card") || [])];
      if (!cards.length) return null;
      return reverseSide() ? cards[1] || null : cards[0] || null;
    }

    if (kind === "ritual") {
      const pair = document.querySelector(`#ritual-${CSS.escape(id)}`);
      if (!pair) return null;
      return reverseSide()
        ? pair.querySelector(".ritual-card-back")
        : pair.querySelector(".ritual-card");
    }

    if (kind === "tracker") {
      return document.querySelector(`.sliding-tracker-card[data-component-id="${CSS.escape(id)}"]`);
    }

    if (kind === "supplemental") {
      const direct = document.querySelector(`[data-component-id="${CSS.escape(id)}"]`);
      if (direct) return direct;
      const specimen = [...document.querySelectorAll(".supplemental-review-item")].find(section => {
        return section.id === `supplemental-${id}` || section.id.endsWith(`-${id}`);
      });
      return specimen?.querySelector(".gauntlet-card") || null;
    }

    return null;
  }

  function sourceError() {
    if (kind === "proposal") {
      return document.querySelector("#proposalReviewSections .review-note")?.textContent?.trim() || "";
    }
    if (kind === "rite" || kind === "ritual") {
      return document.querySelector("#riteReviewSections .review-note")?.textContent?.trim() || "";
    }

    if (kind === "reference" || kind === "tracker" || kind === "supplemental") {
      const root = document.getElementById("supplementalReviewSections");
      if (root?.dataset.referenceCardsReady === "error") {
        return root.querySelector(".supplemental-render-error")?.textContent?.trim() || "Supplemental component renderer failed.";
      }
    }

    return "";
  }

  function imagesReady(card) {
    return [...card.querySelectorAll("img")].every(image => image.complete && image.naturalWidth > 0);
  }

  function dimensionsReady(card) {
    const rect = card.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function needsSharedCardPreparation(card) {
    if (!card?.matches?.(".gauntlet-card[data-art-max]")) return false;
    return card.dataset.parchmentLoaded === undefined || card.dataset.titleFit === undefined;
  }

  function fitReady(card) {
    if (card.classList.contains("fit-warning")) {
      throw new Error(`Production ${kind} ${id} reports a fit warning.`);
    }
    if (card.classList.contains("supplemental-placeholder-card")) {
      // The Deed catalog is hydrated from the historical supplemental shell.
      // Wait for deed-card.js to normalize that shell into the finalized Deed
      // instead of treating the transient pre-hydration class as a hard error.
      if (kind === "supplemental" && id === "financiers-deed") return false;
      throw new Error(`Component ${id} still resolves to a production-layout placeholder.`);
    }

    if (kind === "leader" || kind === "proposal" || kind === "rite" || (kind === "ritual" && !reverseSide())) {
      return card.dataset.parchmentLoaded === "true" && card.dataset.titleFit === "true";
    }

    if (kind === "ritual" && reverseSide()) return dimensionsReady(card);

    if (kind === "reference") {
      return !card.classList.contains("reference-card-loading")
        && document.getElementById("supplementalReviewSections")?.dataset.referenceCardsReady === "true"
        && dimensionsReady(card);
    }

    if (kind === "tracker") return dimensionsReady(card);

    if (kind === "supplemental") {
      if (card.classList.contains("reference-card-loading")) return false;
      return dimensionsReady(card);
    }

    return false;
  }

  async function main() {
    if (!target) throw new Error("Missing component print render target.");
    if (!kind || !id) throw new Error("Component print renderer requires kind and id query parameters.");
    if (!supportedKinds.has(kind)) throw new Error(`Unsupported production component kind: ${kind}`);
    if (!["portrait", "landscape"].includes(orientation)) throw new Error(`Unsupported production component orientation: ${orientation}`);

    applyRenderViewport();

    if (document.readyState !== "complete") {
      await new Promise(resolve => window.addEventListener("load", resolve, { once: true }));
    }
    if (document.fonts?.ready) await document.fonts.ready;

    const deadline = performance.now() + TIMEOUT_MS;
    let card = null;
    let sharedPreparationRequested = false;
    while (performance.now() < deadline) {
      const error = sourceError();
      if (error) throw new Error(error);
      card = selectedCard();

      // Leader/Proposal/Rite catalogs are populated asynchronously. The shared
      // card fitter normally runs on window.load, which can occur before the
      // selected component has been inserted. Replay the established load
      // lifecycle once after the requested card actually exists so parchment,
      // title fitting, and art sizing are deterministic instead of timing-based.
      if (card && !sharedPreparationRequested && needsSharedCardPreparation(card)) {
        sharedPreparationRequested = true;
        window.dispatchEvent(new Event("load"));
      }

      if (card && fitReady(card) && imagesReady(card)) break;
      await delay(25);
    }

    if (!card) throw new Error(`Timed out locating production ${kind} component ${id}.`);
    if (!fitReady(card) || !imagesReady(card)) {
      throw new Error(`Timed out waiting for production ${kind} component ${id} to finish rendering.`);
    }

    card.style.width = renderWidth;
    card.style.height = renderHeight;
    target.replaceChildren(card);
    document.getElementById("leaderReviewSections")?.remove();
    document.getElementById("proposalReviewSections")?.remove();
    document.getElementById("riteReviewSections")?.remove();
    document.getElementById("supplementalReviewSections")?.remove();
    document.body.dataset.renderReady = "true";
  }

  main().catch(reportError);
})();
