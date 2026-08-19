(() => {
  const params = new URLSearchParams(window.location.search);
  const kind = String(params.get("kind") || "").trim().toLowerCase();
  const id = String(params.get("id") || "").trim();
  const side = String(params.get("side") || "front").trim().toLowerCase();
  const target = document.getElementById("renderTarget");
  const TIMEOUT_MS = 30000;
  const supportedKinds = new Set(["leader", "proposal", "reference", "rite", "tracker", "supplemental"]);

  const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  const reverseSide = () => side === "reverse" || side === "back" || side === "treaty" || side === "completed";

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

    if (kind === "tracker") {
      return document.querySelector(`.sliding-tracker-card[data-component-id="${CSS.escape(id)}"]`);
    }

    if (kind === "supplemental") {
      // Generic contract handoff: a finalized component may expose its
      // supplemental-card componentId without requiring a Deckbuilder mapping.
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

  function fitReady(card) {
    if (card.classList.contains("fit-warning")) {
      throw new Error(`Production ${kind} ${id} reports a fit warning.`);
    }
    if (card.classList.contains("supplemental-placeholder-card")) {
      throw new Error(`Component ${id} still resolves to a production-layout placeholder.`);
    }

    if (kind === "leader" || kind === "proposal" || kind === "rite") {
      return card.dataset.parchmentLoaded === "true" && card.dataset.titleFit === "true";
    }

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

    if (document.readyState !== "complete") {
      await new Promise(resolve => window.addEventListener("load", resolve, { once: true }));
    }
    if (document.fonts?.ready) await document.fonts.ready;

    const deadline = performance.now() + TIMEOUT_MS;
    let card = null;
    while (performance.now() < deadline) {
      const error = sourceError();
      if (error) throw new Error(error);
      card = selectedCard();
      if (card && fitReady(card) && imagesReady(card)) break;
      await delay(25);
    }

    if (!card) throw new Error(`Timed out locating production ${kind} component ${id}.`);
    if (!fitReady(card) || !imagesReady(card)) {
      throw new Error(`Timed out waiting for production ${kind} component ${id} to finish rendering.`);
    }

    target.replaceChildren(card);
    document.getElementById("leaderReviewSections")?.remove();
    document.getElementById("proposalReviewSections")?.remove();
    document.getElementById("riteReviewSections")?.remove();
    document.getElementById("supplementalReviewSections")?.remove();
    document.body.dataset.renderReady = "true";
  }

  main().catch(reportError);
})();
