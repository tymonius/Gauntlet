(() => {
  const COLUMNS = 3;
  const RENDER_TIMEOUT_MS = 30000;
  const TRACKER_COMPONENT_IDS = Object.freeze({
    "military command": "command-tracker",
    "diplomat influence": "influence-tracker",
    "intel tracker": "intel-tracker",
    "operation progress": "operation-progress-tracker",
    "inquisition conviction": "conviction-tracker",
  });
  const REFERENCE_COMPONENTS = Object.freeze({
    "diplomat reference": { id: "diplomats-reference", side: "front" },
    "influence treaty": { id: "diplomats-reference", side: "reverse" },
    "financier reference": { id: "financiers-reference", side: "front" },
    "mission reference": { id: "intelligence-mission-reference", side: "front" },
    "operations reference": { id: "intelligence-operations-reference", side: "front" },
    "mystics reference": { id: "mystics-reference", side: "front" },
    "inquisition doctrine": { id: "inquisition-doctrine-reference", side: "front" },
    "purge reference": { id: "inquisition-purge-reference", side: "front" },
  });

  document.addEventListener("DOMContentLoaded", installDuplexSheetPairingFix);

  function installDuplexSheetPairingFix() {
    installFactionBackOption();

    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const inheritedOpen = window.open;
      let restored = false;

      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        if (window.open === pairingAwareOpen) window.open = inheritedOpen;
      };

      function pairingAwareOpen(...args) {
        const printWindow = inheritedOpen.apply(window, args);
        if (!printWindow) {
          restoreOpen();
          return printWindow;
        }

        const inheritedWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => {
          try {
            inheritedWrite(prepareProductionPrintDocument(html));
          } catch (error) {
            console.error(error);
            window.alert(`Unable to prepare the production card print package: ${error.message}`);
            printWindow.close();
          }
        };
        restoreOpen();
        return printWindow;
      }

      window.open = pairingAwareOpen;
      window.setTimeout(restoreOpen, 0);
    }, true);
  }

  function installFactionBackOption() {
    const printBacks = document.getElementById("printCardBacks");
    const existing = document.getElementById("factionColorCardBack");
    if (!printBacks || existing) return;

    const parentOption = printBacks.closest(".print-option");
    if (!parentOption) return;

    const option = document.createElement("label");
    option.className = "print-option faction-back-option";

    const checkbox = document.createElement("input");
    checkbox.id = "factionColorCardBack";
    checkbox.type = "checkbox";

    const label = document.createElement("span");
    label.textContent = "Faction color card back";

    option.append(checkbox, label);
    parentOption.after(option);

    const syncAvailability = () => {
      checkbox.disabled = !printBacks.checked;
      option.classList.toggle("disabled", checkbox.disabled);
    };
    printBacks.addEventListener("change", syncAvailability);
    syncAvailability();
  }

  function prepareProductionPrintDocument(html) {
    const printCardBacks = Boolean(document.getElementById("printCardBacks")?.checked);
    const documentNode = new DOMParser().parseFromString(html, "text/html");

    if (printCardBacks) ensureSheetBackPages(documentNode);
    replaceProductionFronts(documentNode);
    ensureReferenceReversePages(documentNode);
    if (printCardBacks) replaceProductionBacks(documentNode);
    injectProductionPrintStyles(documentNode);
    installProductionReadinessGate(documentNode);

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }

  function normalizeLabel(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function ensureSheetBackPages(documentNode) {
    const frontPages = [
      documentNode.querySelector(".first-page"),
      ...documentNode.querySelectorAll(".card-page:not(.duplex-page):not(.deck-card-back-page)")
    ].filter(Boolean);

    frontPages.forEach((frontPage, index) => {
      const existingBackPage = frontPage.nextElementSibling?.classList.contains("deck-card-back-page")
        ? frontPage.nextElementSibling
        : null;
      const pairName = frontPage.dataset.duplexPair
        || existingBackPage?.dataset.duplexPair
        || `deck-sheet-${index + 1}`;

      frontPage.classList.add("deck-card-front-page");
      frontPage.dataset.duplexPair = pairName;

      if (existingBackPage) {
        existingBackPage.dataset.duplexPair = pairName;
        return;
      }

      const frontTable = frontPage.querySelector(".card-table");
      if (!frontTable) return;
      const rowCount = frontTable.classList.contains("two-row") ? 2 : 3;
      const isFirstPage = frontPage.classList.contains("first-page");
      const backPage = makeBlankBackPage(documentNode, rowCount, isFirstPage);
      backPage.dataset.duplexPair = pairName;
      frontPage.after(backPage);
    });
  }

  function replaceProductionFronts(documentNode) {
    replaceProductionLeader(documentNode);
    replaceProductionTrackers(documentNode);
    replaceProductionReferences(documentNode);
    replaceProductionProposals(documentNode);
    replaceProductionRites(documentNode);
    replacePlayableAndTerritoryFronts(documentNode);
  }

  function replaceProductionLeader(documentNode) {
    const legacyLeader = documentNode.querySelector(".print-card.leader-card");
    if (!legacyLeader) return;

    const faction = String(state.factionId || "").trim().toLowerCase();
    const leader = String(state.leaderId || "").trim().toLowerCase();
    if (!faction || !leader) throw new Error("Could not resolve the selected Leader for production printing.");

    legacyLeader.replaceWith(makeProductionComponent(documentNode, {
      kind: "leader",
      id: `${faction}-${leader}`,
      label: `${legacyLeader.querySelector(".leader-title")?.textContent.trim() || leader} Leader`,
      standardBack: true,
    }));
  }

  function replaceProductionTrackers(documentNode) {
    documentNode.querySelectorAll(".print-card.tracker-card").forEach(legacyTracker => {
      const title = normalizeLabel(legacyTracker.querySelector(".tracker-title")?.textContent);
      const id = TRACKER_COMPONENT_IDS[title];
      if (!id) return;

      legacyTracker.replaceWith(makeProductionComponent(documentNode, {
        kind: "tracker",
        id,
        label: legacyTracker.querySelector(".tracker-title")?.textContent.trim() || id,
        standardBack: true,
      }));
    });
  }

  function referenceDescriptor(legacyReference) {
    const title = normalizeLabel(legacyReference.querySelector(".supplemental-header")?.textContent);
    const descriptor = REFERENCE_COMPONENTS[title];
    if (!descriptor) return null;

    const subtitle = normalizeLabel(legacyReference.querySelector(".supplemental-subtitle")?.textContent);
    if (descriptor.id === "diplomats-reference" && /side b/.test(subtitle)) {
      return { ...descriptor, side: "reverse" };
    }
    return descriptor;
  }

  function replaceProductionReferences(documentNode) {
    documentNode.querySelectorAll(".print-card.reference-card, .print-card.purge-card").forEach(legacyReference => {
      const descriptor = referenceDescriptor(legacyReference);
      if (!descriptor) return;
      const label = legacyReference.querySelector(".supplemental-header")?.textContent.trim() || descriptor.id;

      legacyReference.replaceWith(makeProductionComponent(documentNode, {
        kind: "reference",
        id: descriptor.id,
        side: descriptor.side,
        label,
        reference: true,
      }));
    });
  }

  function replaceProductionProposals(documentNode) {
    documentNode.querySelectorAll(".print-card.proposal-card").forEach(legacyProposal => {
      const name = legacyProposal.querySelector(".proposal-title")?.textContent.trim() || "";
      if (!name) throw new Error("Could not resolve a Proposal name for production printing.");
      const side = legacyProposal.classList.contains("treaty") ? "reverse" : "front";

      legacyProposal.replaceWith(makeProductionComponent(documentNode, {
        kind: "proposal",
        id: slugify(name),
        side,
        label: `${name} ${side === "reverse" ? "Treaty Article" : "Proposal"}`,
      }));
    });
  }

  function replaceProductionRites(documentNode) {
    documentNode.querySelectorAll(".print-card.rite-card").forEach(legacyRite => {
      const name = legacyRite.dataset.riteName || legacyRite.querySelector(".rite-title")?.textContent.trim() || "";
      if (!name) throw new Error("Could not resolve a Rite name for production printing.");
      const riteId = slugify(name).replace(/^rite-of-/, "");
      const side = legacyRite.classList.contains("rite-back-card") || legacyRite.classList.contains("completed")
        ? "reverse"
        : "front";

      legacyRite.replaceWith(makeProductionComponent(documentNode, {
        kind: "rite",
        id: riteId,
        side,
        label: `${name} ${side === "reverse" ? "Completed" : "Rite"}`,
      }));
    });
  }

  function replacePlayableAndTerritoryFronts(documentNode) {
    const cardsByName = new Map(
      (Array.isArray(state.cards) ? state.cards : []).map(card => [String(card.name || "").trim(), card])
    );
    const territoriesByName = new Map(
      (Array.isArray(state.territoryPool) ? state.territoryPool : []).map(territory => [String(territory.name || "").trim(), territory])
    );
    const unresolved = [];

    documentNode.querySelectorAll(".print-card.main-card").forEach(legacyCard => {
      const name = legacyCard.querySelector(".card-name")?.textContent.trim() || "";
      const card = cardsByName.get(name);
      if (!card?.id) {
        unresolved.push(name || "unnamed playable card");
        return;
      }
      legacyCard.replaceWith(makeProductionCard(documentNode, card));
    });

    documentNode.querySelectorAll(".print-card.territory").forEach(legacyTerritory => {
      const name = legacyTerritory.querySelector(".territory-name")?.textContent.trim() || "";
      const territory = territoriesByName.get(name);
      if (!territory?.id) {
        unresolved.push(name || "unnamed Territory");
        return;
      }
      legacyTerritory.replaceWith(makeProductionTerritory(documentNode, territory));
    });

    if (unresolved.length) {
      throw new Error(`Could not resolve production render IDs for: ${unresolved.join(", ")}`);
    }
  }

  function makeProductionComponent(documentNode, options) {
    const { kind, id, side = "front", label, standardBack = false, reference = false } = options;
    const wrapper = documentNode.createElement("article");
    wrapper.className = `print-card production-render-component production-render-${kind}${standardBack ? " production-standard-back" : ""}${reference ? " production-render-reference" : ""}`;
    wrapper.dataset.productionComponentKind = kind;
    wrapper.dataset.productionComponentId = id;
    wrapper.dataset.productionComponentSide = side;
    wrapper.setAttribute("aria-label", `${label} production render`);

    const frame = documentNode.createElement("iframe");
    frame.className = "production-component-frame";
    frame.dataset.productionRenderFrame = "true";
    frame.dataset.productionRenderKind = "component";
    frame.src = `/card-design/component-print-render.html?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}&side=${encodeURIComponent(side)}`;
    frame.title = `${label} production render`;
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("loading", "eager");
    wrapper.append(frame);
    return wrapper;
  }

  function makeProductionCard(documentNode, card) {
    const wrapper = documentNode.createElement("article");
    wrapper.className = "print-card main-card production-render-card production-standard-back";
    wrapper.dataset.productionCardId = card.id;
    wrapper.setAttribute("aria-label", `${card.name} production card`);

    const frame = documentNode.createElement("iframe");
    frame.className = "production-card-frame";
    frame.dataset.productionRenderFrame = "true";
    frame.dataset.productionRenderKind = "card";
    frame.src = `/card-design/card-print-render.html?card=${encodeURIComponent(card.id)}&fit=production`;
    frame.title = `${card.name} production card`;
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("loading", "eager");
    wrapper.append(frame);
    return wrapper;
  }

  function makeProductionTerritory(documentNode, territory) {
    const wrapper = documentNode.createElement("article");
    wrapper.className = "print-card territory production-render-territory production-standard-back";
    wrapper.dataset.productionTerritoryId = territory.id;
    wrapper.setAttribute("aria-label", `${territory.name} production Territory`);

    const rotate = documentNode.createElement("div");
    rotate.className = "production-territory-rotate";

    const frame = documentNode.createElement("iframe");
    frame.className = "production-territory-frame";
    frame.dataset.productionRenderFrame = "true";
    frame.dataset.productionRenderKind = "territory";
    frame.src = `/card-design/territory-print-render.html?territory=${encodeURIComponent(territory.id)}`;
    frame.title = `${territory.name} production Territory`;
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("loading", "eager");

    rotate.append(frame);
    wrapper.append(rotate);
    return wrapper;
  }

  function ensureReferenceReversePages(documentNode) {
    const referenceFronts = [...documentNode.querySelectorAll('.production-render-reference[data-production-component-side="front"]')];
    referenceFronts.forEach((front, index) => {
      const componentId = front.dataset.productionComponentId;
      if (!componentId) return;

      const existingReverse = [...documentNode.querySelectorAll('.production-render-reference[data-production-component-side="reverse"]')]
        .find(card => card.dataset.productionComponentId === componentId);
      if (existingReverse) return;

      const frontPage = front.closest(".first-page, .card-page");
      const frontCell = front.closest("td");
      if (!frontPage || !frontCell || frontPage.classList.contains("duplex-back-page")) return;

      const frontTable = frontPage.querySelector(".card-table");
      if (!frontTable) return;
      const frontCells = [...frontTable.querySelectorAll("td")];
      const frontIndex = frontCells.indexOf(frontCell);
      if (frontIndex < 0) return;

      const backPage = ensureBackPageForFront(documentNode, frontPage, `reference-sheet-${index + 1}`);
      const backCells = [...backPage.querySelectorAll(".card-table td")];
      const backCell = backCells[mirrorIndexForLongEdge(frontIndex)];
      if (!backCell) throw new Error(`Could not align reverse face for ${componentId}.`);

      backCell.replaceChildren(makeProductionComponent(documentNode, {
        kind: "reference",
        id: componentId,
        side: "reverse",
        label: `${componentId} reverse reference`,
        reference: true,
      }));
    });
  }

  function ensureBackPageForFront(documentNode, frontPage, fallbackPairName) {
    const existingDirect = frontPage.nextElementSibling?.classList.contains("deck-card-back-page")
      ? frontPage.nextElementSibling
      : null;
    const existingPairName = frontPage.dataset.duplexPair;
    const existingByPair = existingPairName
      ? [...documentNode.querySelectorAll(".deck-card-back-page[data-duplex-pair]")].find(page => page.dataset.duplexPair === existingPairName)
      : null;
    const existing = existingDirect || existingByPair;
    if (existing) {
      const pairName = existingPairName || existing.dataset.duplexPair || fallbackPairName;
      frontPage.classList.add("deck-card-front-page");
      frontPage.dataset.duplexPair = pairName;
      existing.dataset.duplexPair = pairName;
      return existing;
    }

    const frontTable = frontPage.querySelector(".card-table");
    if (!frontTable) throw new Error("Reference front page has no card table.");
    const rowCount = frontTable.classList.contains("two-row") ? 2 : 3;
    const isFirstPage = frontPage.classList.contains("first-page");
    const pairName = frontPage.dataset.duplexPair || fallbackPairName;
    const backPage = makeBlankBackPage(documentNode, rowCount, isFirstPage);

    frontPage.classList.add("deck-card-front-page");
    frontPage.dataset.duplexPair = pairName;
    backPage.dataset.duplexPair = pairName;
    frontPage.after(backPage);
    return backPage;
  }

  function selectedBackFaction() {
    const useFactionColor = Boolean(document.getElementById("factionColorCardBack")?.checked);
    if (!useFactionColor) return "intelligence";
    return String(state.factionId || "intelligence").trim().toLowerCase();
  }

  function replaceProductionBacks(documentNode) {
    const faction = selectedBackFaction();
    const backPages = [...documentNode.querySelectorAll(".deck-card-back-page[data-duplex-pair]")];

    documentNode.querySelectorAll(".deck-card-front-page[data-duplex-pair]").forEach(frontPage => {
      const pairName = frontPage.dataset.duplexPair;
      const backPage = backPages.find(page => page.dataset.duplexPair === pairName);
      if (!backPage) return;

      const frontCells = [...frontPage.querySelectorAll(".card-table td")];
      const backCells = [...backPage.querySelectorAll(".card-table td")];
      frontCells.forEach((frontCell, frontIndex) => {
        const needsStandardBack = frontCell.querySelector(".production-standard-back, .capital-tracker-card, .deed-card");
        if (!needsStandardBack) return;
        const backCell = backCells[mirrorIndexForLongEdge(frontIndex)];
        if (!backCell) return;
        backCell.replaceChildren(makeProductionDeckBack(documentNode, faction));
      });
    });
  }

  function makeProductionDeckBack(documentNode, faction) {
    const wrapper = documentNode.createElement("article");
    wrapper.className = "print-card production-render-back";
    wrapper.setAttribute("aria-label", `${faction} production deck-card back, rotated 180 degrees for duplex printing`);

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

  function injectProductionPrintStyles(documentNode) {
    const style = documentNode.createElement("style");
    style.dataset.productionPrintRender = "true";
    style.textContent = `
.print-card.production-render-card,
.print-card.production-render-territory,
.print-card.production-render-component,
.print-card.production-render-back {
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
.print-card.production-render-card,
.print-card.production-render-component,
.print-card.production-render-back {
  display: block !important;
  width: 2.5in;
  height: 3.5in;
}
.production-card-frame,
.production-component-frame,
.production-back-frame {
  display: block;
  width: 2.5in;
  height: 3.5in;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}
.print-card.production-render-territory {
  position: relative !important;
}
.production-territory-rotate {
  position: absolute;
  top: 0;
  left: 2.5in;
  width: 3.5in;
  height: 2.5in;
  transform: rotate(90deg);
  transform-origin: top left;
}
.production-territory-frame {
  display: block;
  width: 3.5in;
  height: 2.5in;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}
.print-card.production-render-back {
  transform: none !important;
}`;
    documentNode.head.append(style);
  }

  function installProductionReadinessGate(documentNode) {
    const script = documentNode.createElement("script");
    script.dataset.productionPrintGate = "true";
    script.textContent = `(() => {
  const timeoutMs = ${RENDER_TIMEOUT_MS};
  const previousPreparePrint = window.preparePrint;
  if (typeof previousPreparePrint !== 'function') return;

  window.removeEventListener('load', previousPreparePrint);

  const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));

  async function waitForFrame(frame) {
    const deadline = performance.now() + timeoutMs;
    while (performance.now() < deadline) {
      try {
        const doc = frame.contentDocument;
        const body = doc?.body;
        const kind = frame.dataset.productionRenderKind;
        if (kind === 'back') {
          if (doc?.readyState === 'complete' && doc.querySelector('.gauntlet-card-back__frame')) return 'true';
        } else {
          const status = body?.dataset?.renderReady;
          if (status === 'true' || status === 'error') return status;
        }
      } catch (error) {
        console.error('Unable to inspect production print frame', frame.src, error);
        return 'error';
      }
      await delay(25);
    }
    console.error('Timed out waiting for production print frame', frame.src);
    return 'timeout';
  }

  async function prepareProductionPrint() {
    const frames = [...document.querySelectorAll('[data-production-render-frame]')];
    const results = await Promise.all(frames.map(waitForFrame));
    if (results.some(result => result !== 'true')) {
      window.alert('One or more production card faces failed to finish rendering. Printing was stopped so the Deck is not printed with incomplete cards.');
      return;
    }
    await previousPreparePrint();
  }

  window.addEventListener('load', prepareProductionPrint, { once: true });
})();`;
    documentNode.body.append(script);
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
      for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex += 1) {
        row.append(documentNode.createElement("td"));
      }
      body.append(row);
    }

    table.append(body);
    section.append(table);
    return section;
  }
})();
