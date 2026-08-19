(() => {
  const params = new URLSearchParams(window.location.search);
  const kind = String(params.get("kind") || "").trim().toLowerCase();
  const id = String(params.get("id") || "").trim();
  const side = String(params.get("side") || "front").trim().toLowerCase();
  const target = document.getElementById("renderTarget");
  const TIMEOUT_MS = 30000;

  const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));

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
      return side === "reverse" || side === "back" || side === "treaty" ? cards[1] || null : cards[0] || null;
    }

    if (kind === "tracker") {
      return document.querySelector(`.sliding-tracker-card[data-component-id="${CSS.escape(id)}"]`);
    }

    return null;
  }

  function sourceError() {
    if (kind === "proposal") {
      return document.querySelector("#proposalReviewSections .review-note")?.textContent?.trim() || "";
    }
    if (kind === "tracker") {
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

  function fitReady(card) {
    if (card.classList.contains("fit-warning")) {
      throw new Error(`Production ${kind} ${id} reports a fit warning.`);
    }

    if (kind === "leader" || kind === "proposal") {
      return card.dataset.parchmentLoaded === "true" && card.dataset.titleFit === "true";
    }

    if (kind === "tracker") {
      return card.getBoundingClientRect().width > 0 && card.getBoundingClientRect().height > 0;
    }

    return false;
  }

  async function main() {
    if (!target) throw new Error("Missing component print render target.");
    if (!kind || !id) throw new Error("Component print renderer requires kind and id query parameters.");
    if (!new Set(["leader", "proposal", "tracker"]).has(kind)) {
      throw new Error(`Unsupported production component kind: ${kind}`);
    }

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
    document.getElementById("supplementalReviewSections")?.remove();
    document.body.dataset.renderReady = "true";
  }

  main().catch(reportError);
})();
