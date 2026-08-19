(() => {
  const PREVIEW_RETRY_LIMIT = 10;
  const COLUMNS = 3;
  const COMPONENT_CONTRACT_URL = "/config/tts-component-contract.json";
  const LEGACY_COMPONENT_SELECTOR = [
    ".print-card.tracker-card",
    ".print-card.reference-card",
    ".print-card.purge-card",
    ".print-card.capital-tracker-card",
    ".print-card.deed-card",
    ".print-card.proposal-card",
    ".print-card.rite-card",
  ].join(", ");

  let componentContract = null;
  let componentContractError = null;
  let waitingForContract = false;

  const componentContractPromise = fetch(COMPONENT_CONTRACT_URL, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(contract => {
      if (!contract || !Array.isArray(contract.components)) throw new Error("Missing components array.");
      componentContract = contract;
      return contract;
    })
    .catch(error => {
      componentContractError = error;
      console.error("Unable to load component contract for Deckbuilder printing", error);
      return null;
    });

  installContractProductionUpgrade();
  document.addEventListener("DOMContentLoaded", () => installCardBackPreview());

  function installContractProductionUpgrade() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    // This listener is registered while deferred scripts are executing, before
    // the older DOMContentLoaded-installed print wrappers. That makes this the
    // innermost document.write transform, so it sees the package after those
    // established transforms have run and can upgrade any fallback they left.
    button.addEventListener("click", event => {
      if (!componentContract) {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (componentContractError) {
          window.alert(`Unable to load the production component contract: ${componentContractError.message}`);
          return;
        }
        if (waitingForContract) return;

        waitingForContract = true;
        componentContractPromise.then(contract => {
          waitingForContract = false;
          if (!contract) {
            const message = componentContractError?.message || "Unknown component-contract error.";
            window.alert(`Unable to load the production component contract: ${message}`);
            return;
          }
          button.click();
        });
        return;
      }

      const inheritedOpen = window.open;
      let restored = false;
      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        if (window.open === contractAwareOpen) window.open = inheritedOpen;
      };

      function contractAwareOpen(...args) {
        const printWindow = inheritedOpen.apply(window, args);
        if (!printWindow) {
          restoreOpen();
          return printWindow;
        }

        const inheritedWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => inheritedWrite(upgradeContractProductionFallbacks(html));
        restoreOpen();
        return printWindow;
      }

      window.open = contractAwareOpen;
      window.setTimeout(restoreOpen, 0);
    }, true);
  }

  function normalizeLabel(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function meaningfulLabel(value) {
    const ignored = new Set(["card", "cards", "reference", "tracker", "tracking", "supplemental", "shared", "full", "size"]);
    return normalizeLabel(value)
      .split(/\s+/)
      .filter(Boolean)
      .filter(token => !ignored.has(token))
      .join(" ");
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function selectedFactionId() {
    return String(window.state?.factionId || document.getElementById("factionSelect")?.value || "")
      .trim()
      .toLowerCase();
  }

  function selectedBackFaction() {
    const useFactionColor = Boolean(document.getElementById("factionColorCardBack")?.checked);
    return useFactionColor ? (selectedFactionId() || "intelligence") : "intelligence";
  }

  function contractComponentsForSelectedFaction() {
    const faction = selectedFactionId();
    return (componentContract?.components || []).filter(component => {
      return component.cardLike && String(component.faction || "").trim().toLowerCase() === faction;
    });
  }

  function legacyFamily(card) {
    if (card.classList.contains("proposal-card")) return "proposal-treaty-card";
    if (card.classList.contains("rite-card")) return "rite-card";
    if (card.classList.contains("capital-tracker-card")) return "ledger";
    if (card.classList.contains("deed-card")) return "deed-card";
    if (card.classList.contains("tracker-card")) return "tracker";
    if (card.classList.contains("reference-card") || card.classList.contains("purge-card")) return "reference-card";
    return "";
  }

  function legacyName(card) {
    if (card.classList.contains("proposal-card")) return card.querySelector(".proposal-title")?.textContent.trim() || "";
    if (card.classList.contains("rite-card")) return card.dataset.riteName || card.querySelector(".rite-title")?.textContent.trim() || "";
    if (card.classList.contains("tracker-card")) return card.querySelector(".tracker-title")?.textContent.trim() || "";
    if (card.classList.contains("reference-card") || card.classList.contains("purge-card") || card.classList.contains("capital-tracker-card")) {
      return card.querySelector(".supplemental-header")?.textContent.trim() || "";
    }
    if (card.classList.contains("deed-card")) {
      return card.querySelector(".deed-banner")?.textContent.trim() || card.querySelector(".deed-title")?.textContent.trim() || "Deed";
    }
    return "";
  }

  function similarity(left, right) {
    const a = new Set(meaningfulLabel(left).split(/\s+/).filter(Boolean));
    const b = new Set(meaningfulLabel(right).split(/\s+/).filter(Boolean));
    if (!a.size || !b.size) return 0;
    let intersection = 0;
    a.forEach(token => { if (b.has(token)) intersection += 1; });
    return intersection / new Set([...a, ...b]).size;
  }

  function contractComponentForLegacy(card) {
    const family = legacyFamily(card);
    if (!family) return null;
    const candidates = contractComponentsForSelectedFaction().filter(component => component.family === family);
    if (!candidates.length) return null;

    const name = legacyName(card);
    const target = meaningfulLabel(name);
    const exact = candidates.filter(component => meaningfulLabel(component.name) === target);
    if (exact.length === 1) return exact[0];
    if (candidates.length === 1) return candidates[0];

    const ranked = candidates
      .map(component => ({ component, score: similarity(name, component.name) }))
      .sort((a, b) => b.score - a.score);
    if (!ranked[0] || ranked[0].score <= 0) return null;
    if (ranked[1] && ranked[1].score === ranked[0].score) return null;
    return ranked[0].component;
  }

  function componentSide(card, component) {
    if (component.backPolicy !== "twoSided") return "front";
    if (card.classList.contains("treaty") || card.classList.contains("rite-back-card") || card.classList.contains("completed")) return "reverse";
    const subtitle = normalizeLabel(card.querySelector(".supplemental-subtitle")?.textContent);
    return /\bside b\b/.test(subtitle) || /\breverse\b/.test(subtitle) ? "reverse" : "front";
  }

  function productionRenderUrl(component) {
    const explicit = String(component.renderSource?.printEndpoint || component.renderSource?.printUrl || "").trim();
    if (explicit) return explicit;

    const family = String(component.family || "");
    const status = String(component.productionStatus || "").toLowerCase();
    const componentId = String(component.renderSource?.componentId || "").trim();
    const surface = String(component.renderSource?.surface || "").trim();

    if (status === "ready" && componentId && /(^|\/)card-design\/supplemental-card\.js$/.test(surface)) {
      return `/card-design/component-print-render.html?kind=supplemental&id=${encodeURIComponent(componentId)}`;
    }
    if (family === "reference-card" && status === "ready") {
      return `/card-design/component-print-render.html?kind=reference&id=${encodeURIComponent(component.id)}`;
    }
    if (family === "rite-card" && status === "ready") {
      const riteId = slugify(component.name).replace(/^rite-of-/, "");
      return `/card-design/component-print-render.html?kind=rite&id=${encodeURIComponent(riteId)}`;
    }
    if (family === "proposal-treaty-card" && (status === "ready" || status === "artwork-pending")) {
      return `/card-design/component-print-render.html?kind=proposal&id=${encodeURIComponent(slugify(component.name))}`;
    }
    return "";
  }

  function renderUrlForSide(renderUrl, side) {
    const url = new URL(renderUrl, window.location.origin);
    url.searchParams.set("side", side);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function makeProductionComponent(documentNode, component, side, renderUrl) {
    const wrapper = documentNode.createElement("article");
    wrapper.className = `print-card production-render-component production-render-contract${component.backPolicy === "standardBack" ? " production-standard-back" : ""}${component.family === "reference-card" ? " production-render-reference" : ""}`;
    wrapper.dataset.productionContractId = component.id;
    wrapper.dataset.productionComponentId = component.id;
    wrapper.dataset.productionComponentSide = side;
    wrapper.dataset.productionBackPolicy = component.backPolicy || "none";
    wrapper.setAttribute("aria-label", `${component.name} production render`);

    const frame = documentNode.createElement("iframe");
    frame.className = "production-component-frame";
    frame.dataset.productionRenderFrame = "true";
    frame.dataset.productionRenderKind = "component";
    frame.src = renderUrlForSide(renderUrl, side);
    frame.title = `${component.name} production render`;
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("loading", "eager");
    wrapper.append(frame);
    return wrapper;
  }

  function mirrorIndexForLongEdge(index) {
    const row = Math.floor(index / COLUMNS);
    const column = index % COLUMNS;
    return row * COLUMNS + (COLUMNS - 1 - column);
  }

  function makeBlankBackPage(documentNode, rowCount, firstPageBack) {
    const section = documentNode.createElement("section");
    section.className = `card-page deck-card-back-page duplex-back-page blank-card-back-page${firstPageBack ? " first-page-back" : ""}`;
    if (firstPageBack) {
      const spacer = documentNode.createElement("div");
      spacer.className = "first-page-back-spacer";
      section.append(spacer);
    }
    const table = documentNode.createElement("table");
    table.className = `card-table ${rowCount === 2 ? "two-row" : "three-row"}`;
    const body = documentNode.createElement("tbody");
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row = documentNode.createElement("tr");
      for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex += 1) row.append(documentNode.createElement("td"));
      body.append(row);
    }
    table.append(body);
    section.append(table);
    return section;
  }

  function ensureBackPage(documentNode, frontPage, fallbackPairName) {
    const pairName = frontPage.dataset.duplexPair || fallbackPairName;
    const existing = [...documentNode.querySelectorAll(".deck-card-back-page[data-duplex-pair]")]
      .find(page => page.dataset.duplexPair === pairName)
      || (frontPage.nextElementSibling?.classList.contains("deck-card-back-page") ? frontPage.nextElementSibling : null);
    if (existing) {
      frontPage.classList.add("deck-card-front-page");
      frontPage.dataset.duplexPair = pairName;
      existing.dataset.duplexPair = pairName;
      return existing;
    }

    const table = frontPage.querySelector(".card-table");
    if (!table) return null;
    const rowCount = table.classList.contains("two-row") ? 2 : 3;
    const backPage = makeBlankBackPage(documentNode, rowCount, frontPage.classList.contains("first-page"));
    frontPage.classList.add("deck-card-front-page");
    frontPage.dataset.duplexPair = pairName;
    backPage.dataset.duplexPair = pairName;
    frontPage.after(backPage);
    return backPage;
  }

  function makeProductionBack(documentNode) {
    const faction = selectedBackFaction();
    const wrapper = documentNode.createElement("article");
    wrapper.className = "print-card production-render-back";
    const frame = documentNode.createElement("iframe");
    frame.className = "production-back-frame";
    frame.dataset.productionRenderFrame = "true";
    frame.dataset.productionRenderKind = "back";
    frame.src = `/tts/back-renderer/index.html?faction=${encodeURIComponent(faction)}&rotation=180`;
    frame.title = `${faction} production deck-card back`;
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("loading", "eager");
    wrapper.append(frame);
    return wrapper;
  }

  function ensureStandardBack(documentNode, front) {
    if (!document.getElementById("printCardBacks")?.checked) return;
    const frontPage = front.closest(".first-page, .card-page");
    const frontCell = front.closest("td");
    if (!frontPage || !frontCell) return;
    const frontCells = [...frontPage.querySelectorAll(".card-table td")];
    const frontIndex = frontCells.indexOf(frontCell);
    if (frontIndex < 0) return;
    const backPage = ensureBackPage(documentNode, frontPage, `contract-standard-${frontIndex}`);
    const backCell = [...(backPage?.querySelectorAll(".card-table td") || [])][mirrorIndexForLongEdge(frontIndex)];
    if (!backCell || backCell.querySelector(".production-render-back")) return;
    backCell.replaceChildren(makeProductionBack(documentNode));
  }

  function ensureIntrinsicReverse(documentNode, front, component, renderUrl) {
    if (component.backPolicy !== "twoSided" || front.dataset.productionComponentSide !== "front") return;
    const existing = [...documentNode.querySelectorAll('.production-render-component[data-production-component-side="reverse"]')]
      .find(card => card.dataset.productionContractId === component.id || card.dataset.productionComponentId === component.id);
    if (existing) return;

    const frontPage = front.closest(".first-page, .card-page");
    const frontCell = front.closest("td");
    if (!frontPage || !frontCell) return;
    const frontCells = [...frontPage.querySelectorAll(".card-table td")];
    const frontIndex = frontCells.indexOf(frontCell);
    if (frontIndex < 0) return;
    const backPage = ensureBackPage(documentNode, frontPage, `contract-reverse-${component.id}`);
    const backCell = [...(backPage?.querySelectorAll(".card-table td") || [])][mirrorIndexForLongEdge(frontIndex)];
    if (!backCell) return;
    backCell.replaceChildren(makeProductionComponent(documentNode, component, "reverse", renderUrl));
  }

  function upgradeContractProductionFallbacks(html) {
    if (!componentContract) return html;
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const unresolved = [];

    documentNode.querySelectorAll(LEGACY_COMPONENT_SELECTOR).forEach(legacyCard => {
      const component = contractComponentForLegacy(legacyCard);
      if (!component) {
        unresolved.push(legacyName(legacyCard) || legacyFamily(legacyCard) || "unnamed component");
        return;
      }

      const renderUrl = productionRenderUrl(component);
      if (!renderUrl) return;
      const side = componentSide(legacyCard, component);
      const replacement = makeProductionComponent(documentNode, component, side, renderUrl);
      legacyCard.replaceWith(replacement);
      if (component.backPolicy === "standardBack") ensureStandardBack(documentNode, replacement);
      ensureIntrinsicReverse(documentNode, replacement, component, renderUrl);
    });

    if (unresolved.length) {
      throw new Error(`Printed faction components are missing from the production component contract: ${unresolved.join(", ")}`);
    }
    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }

  function installCardBackPreview(attempt = 0) {
    if (document.getElementById("cardBackPreview")) return;

    const printBacks = document.getElementById("printCardBacks");
    const factionColor = document.getElementById("factionColorCardBack");
    const factionSelect = document.getElementById("factionSelect");
    const primaryOption = printBacks?.closest(".print-option");
    const factionOption = factionColor?.closest(".print-option");

    if (!printBacks || !factionColor || !primaryOption || !factionOption) {
      if (attempt < PREVIEW_RETRY_LIMIT) window.requestAnimationFrame(() => installCardBackPreview(attempt + 1));
      return;
    }

    const controls = document.createElement("div");
    controls.className = "card-back-controls";
    const options = document.createElement("div");
    options.className = "card-back-options";
    const preview = document.createElement("figure");
    preview.id = "cardBackPreview";
    preview.className = "card-back-preview";
    preview.setAttribute("aria-label", "Selected card back preview");
    const stage = document.createElement("div");
    stage.className = "card-back-preview-stage";
    const frame = document.createElement("iframe");
    frame.id = "cardBackPreviewFrame";
    frame.className = "card-back-preview-frame";
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("loading", "eager");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    const caption = document.createElement("figcaption");
    caption.id = "cardBackPreviewCaption";

    stage.append(frame);
    preview.append(stage, caption);
    primaryOption.before(controls);
    controls.append(options, preview);
    options.append(primaryOption, factionOption);

    const selectedFaction = () => {
      if (!factionColor.checked) return "intelligence";
      return String(factionSelect?.value || "intelligence").trim().toLowerCase() || "intelligence";
    };

    const updatePreview = () => {
      const faction = selectedFaction();
      const src = `/tts/back-renderer/index.html?faction=${encodeURIComponent(faction)}`;
      if (frame.dataset.faction !== faction) {
        frame.dataset.faction = faction;
        frame.src = src;
      }
      const factionLabel = faction.charAt(0).toUpperCase() + faction.slice(1);
      const useFactionColor = factionColor.checked;
      frame.title = useFactionColor ? `${factionLabel} faction card back preview` : "Black card back preview";
      caption.textContent = useFactionColor ? `${factionLabel} faction back` : "Black back (default)";
      preview.classList.toggle("disabled", !printBacks.checked);
    };

    printBacks.addEventListener("change", updatePreview);
    factionColor.addEventListener("change", updatePreview);
    factionSelect?.addEventListener("change", () => window.requestAnimationFrame(updatePreview));
    updatePreview();
  }
})();
