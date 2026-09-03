(() => {
  const params = new URLSearchParams(window.location.search);
  const kind = String(params.get("kind") || "").trim().toLowerCase();
  const id = String(params.get("id") || "").trim();
  const side = String(params.get("side") || "front").trim().toLowerCase();
  const orientation = String(params.get("orientation") || "portrait").trim().toLowerCase();
  const versionOverride = String(params.get("version") || "").trim();
  const target = document.getElementById("renderTarget");
  const TIMEOUT_MS = 30000;
  const supportedKinds = new Set(["leader", "proposal", "reference", "rite", "ritual", "tracker", "supplemental"]);
  const landscape = orientation === "landscape";
  let renderContext = null;
  let renderWidth = "";
  let renderHeight = "";

  const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  const reverseSide = () => side === "reverse" || side === "back" || side === "treaty" || side === "completed";


  async function loadCanonicalRenderContext() {
    const [{ loadRenderContext }, { surfaceCssSize }] = await Promise.all([
      import("/card-design/render-context.mjs"),
      import("/card-design/production-surface.mjs"),
    ]);
    renderContext = await loadRenderContext();
    const size = surfaceCssSize(orientation);
    renderWidth = size.width;
    renderHeight = size.height;
    window.GAUNTLET_ART_DIRECTION = renderContext.artDirection || {};
    document.body.dataset.gameplayAuthority = renderContext.gameplayAuthorityUrl;
    document.body.dataset.artDirectionAuthority = renderContext.visualAuthorityUrl;
    document.body.dataset.renderContextReady = "true";
  }

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

  function canonicalArtworkId(card) {
    if (card?.dataset?.cardId) return card.dataset.cardId;
    if (kind === "leader") return id;
    if (kind === "proposal") return `proposal-${id}${reverseSide() ? "-ratified" : ""}`;
    if (kind === "rite") return `rite-${id}${reverseSide() ? "-completed" : ""}`;
    if (kind === "ritual") return `ritual-${id}`;
    return id;
  }

  async function applyCanonicalArtworkDirection(card) {
    const image = card?.querySelector?.(".card-art img:not([hidden])");
    if (!image) return;

    const artworkId = canonicalArtworkId(card);
    const direction = renderContext.artDirectionFor(artworkId);
    if (!direction || typeof direction !== "object") {
      throw new Error(`Canonical artwork direction is unavailable for ${artworkId}.`);
    }
    if (!window.GauntletArtworkCrop?.apply) {
      throw new Error(`Production artwork crop engine is unavailable for ${artworkId}.`);
    }

    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const result = window.GauntletArtworkCrop.apply(
      image,
      direction,
      { id: artworkId, label: card.getAttribute("aria-label") || artworkId },
    );
    if (!result) throw new Error(`Production artwork direction failed for ${artworkId}.`);
    card.dataset.artDirectionApplied = artworkId;
  }

  function sourceError() {
    if (kind === "leader") {
      const root = document.getElementById("leaderReviewSections");
      if (root?.dataset.leaderCopyReady === "error") {
        return "Current Leader card copy failed to load.";
      }
      return root?.querySelector(".review-note")?.textContent?.trim() || "";
    }

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
    if (!card?.matches?.(".gauntlet-card")) return false;
    if (card.querySelector(".card-interior") && card.dataset.parchmentLoaded === undefined) return true;
    if (!card.matches("[data-art-max]")) return false;
    return card.dataset.titleFit === undefined;
  }

  function leaderCopyReady(card) {
    const root = document.getElementById("leaderReviewSections");
    return root?.dataset.leaderCopyReady === "true"
      && Boolean(card.dataset.leaderCopyVersion)
      && card.classList.contains("leader-card--standardized");
  }

  function validateTrackerVisualContract(card) {
    if (kind !== "tracker") return;

    const interior = card.querySelector(".tracker-interior");
    const title = card.querySelector(".tracker-heading h3");
    if (!interior || !title) {
      throw new Error(`Tracker ${id} is missing its production interior or title.`);
    }

    const background = getComputedStyle(interior).backgroundImage;
    if (card.dataset.parchmentLoaded !== "true" || !background || background === "none") {
      throw new Error(`Tracker ${id} lost its production parchment background.`);
    }
    if (card.dataset.trackerTitleFit !== "true" || title.scrollWidth > title.clientWidth + 0.5) {
      throw new Error(`Tracker ${id} title is clipped after production fitting.`);
    }
  }

  function validateReferenceVisualContract(card) {
    if (kind !== "reference") return;

    const interior = card.querySelector(".reference-card-interior");
    const watermark = card.querySelector(".reference-watermark");
    const emblem = card.querySelector(".reference-faction-emblem");
    const panels = [...card.querySelectorAll(".reference-panel + .reference-panel")];

    if (!interior || !watermark || !emblem) {
      throw new Error(`Reference ${id} is missing production parchment, watermark, or emblem structure.`);
    }

    const interiorStyle = getComputedStyle(interior);
    if (!interiorStyle.backgroundImage || interiorStyle.backgroundImage === "none") {
      throw new Error(`Reference ${id} lost the production parchment/background treatment.`);
    }

    const divided = panels.filter(panel => {
      const style = getComputedStyle(panel);
      return Number.parseFloat(style.borderTopWidth || "0") > 0.01
        && style.borderTopStyle !== "none";
    });
    if (divided.length) {
      throw new Error(`Reference ${id} reintroduced ${divided.length} horizontal body divider(s).`);
    }

    const emblemStyle = getComputedStyle(emblem);
    const emblemPaint = [
      emblemStyle.backgroundImage,
      emblemStyle.maskImage,
      emblemStyle.webkitMaskImage,
    ].filter(Boolean).join(" ");
    if (!emblemPaint || /^(none\s*)+$/.test(emblemPaint.trim())) {
      throw new Error(`Reference ${id} lost its production faction/header emblem.`);
    }

    if (id === "universal-reference") {
      const watermarkStyle = getComputedStyle(watermark);
      const watermarkMask = watermarkStyle.maskImage || watermarkStyle.webkitMaskImage || "";
      if (!watermarkMask.includes("Gauntlet.svg")) {
        throw new Error("Universal Reference lost the Gauntlet G watermark mask.");
      }
      if (!emblemPaint.includes("Gauntlet.svg")) {
        throw new Error("Universal Reference lost the Gauntlet G header emblem.");
      }
    }
  }

  function fitReady(card) {
    const fontState = document.body.dataset.productionFontsReady;
    if (fontState === "false") {
      throw new Error(document.body.dataset.productionFontError || "Production component fonts failed to load.");
    }
    if (fontState !== "true") return false;

    if (card.classList.contains("fit-warning")) {
      throw new Error(`Production ${kind} ${id} reports a fit warning.`);
    }
    if (card.classList.contains("supplemental-placeholder-card")) {
      throw new Error(`Component ${id} still resolves to a production-layout placeholder.`);
    }

    if (kind === "leader") {
      return leaderCopyReady(card)
        && card.dataset.parchmentLoaded === "true"
        && card.dataset.titleFit === "true";
    }

    if (kind === "proposal" || kind === "rite" || (kind === "ritual" && !reverseSide())) {
      return card.dataset.parchmentLoaded === "true" && card.dataset.titleFit === "true";
    }

    if (kind === "ritual" && reverseSide()) return dimensionsReady(card);

    if (kind === "reference") {
      return !card.classList.contains("reference-card-loading")
        && document.getElementById("supplementalReviewSections")?.dataset.referenceCardsReady === "true"
        && dimensionsReady(card);
    }

    if (kind === "tracker") {
      const supplementalRoot = document.getElementById("supplementalReviewSections");
      return card.dataset.parchmentLoaded === "true"
        && card.dataset.trackerTitleFit === "true"
        && supplementalRoot?.dataset.trackerLayoutsReady === "true"
        && dimensionsReady(card);
    }

    if (kind === "supplemental") {
      if (card.classList.contains("reference-card-loading")) return false;
      if (id === "financiers-deed") {
        return card.dataset.parchmentLoaded === "true" && dimensionsReady(card);
      }
      return dimensionsReady(card);
    }

    return false;
  }

  async function main() {
    if (!target) throw new Error("Missing component print render target.");
    if (!kind || !id) throw new Error("Component print renderer requires kind and id query parameters.");
    if (!supportedKinds.has(kind)) throw new Error(`Unsupported production component kind: ${kind}`);
    if (!["portrait", "landscape"].includes(orientation)) throw new Error(`Unsupported production component orientation: ${orientation}`);

    if (document.readyState !== "complete") {
      await new Promise(resolve => window.addEventListener("load", resolve, { once: true }));
    }
    await loadCanonicalRenderContext();
    applyRenderViewport();

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

    validateTrackerVisualContract(card);
    validateReferenceVisualContract(card);

    if (versionOverride) {
      const footer = card.querySelectorAll(".card-footer span");
      const versionNode = footer.item(footer.length - 1);
      if (versionNode) versionNode.textContent = versionOverride;
      card.dataset.renderVersionOverride = versionOverride;
    }

    card.style.width = renderWidth;
    card.style.height = renderHeight;
    target.replaceChildren(card);

    // Reference fitting depends on the final physical mount width. The legacy
    // source catalog is intentionally offscreen and wide, so a fit performed
    // there is not production geometry. Re-run the canonical reference fitter
    // only after the selected face has been mounted at its final surface.
    if (kind === "reference") {
      const [{ fitReferenceCard }, { loadProductionFonts }] = await Promise.all([
        import("/card-design/reference-card.js"),
        import("/card-design/face-preparation.mjs"),
      ]);
      await loadProductionFonts();
      const referenceFit = fitReferenceCard(card);
      if (referenceFit.overflow) {
        throw new Error(`Reference ${id} does not fit after final production mounting.`);
      }
    }

    await applyCanonicalArtworkDirection(card);
    document.getElementById("leaderReviewSections")?.remove();
    document.getElementById("proposalReviewSections")?.remove();
    document.getElementById("riteReviewSections")?.remove();
    document.getElementById("supplementalReviewSections")?.remove();
    document.body.dataset.renderReady = "true";
  }

  main().catch(reportError);
})();
