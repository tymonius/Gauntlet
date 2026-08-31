(() => {
  const COLUMNS = 3;
  const RENDER_TIMEOUT_MS = 30000;

  document.addEventListener("DOMContentLoaded", installProductionPrintIntegration);

  function installProductionPrintIntegration() {
    installFactionBackOption();

    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const inheritedOpen = window.open;
      let restored = false;

      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        if (window.open === productionAwareOpen) window.open = inheritedOpen;
      };

      function productionAwareOpen(...args) {
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

      window.open = productionAwareOpen;
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

  function resolvedCurrentGame() {
    const currentGame = state.currentGameData || window.GAUNTLET_CURRENT_GAME_DATA;
    if (!currentGame?.cards?.length || !currentGame?.territories?.length || !currentGame?.componentContract) {
      throw new Error("The shared current-game authority has not finished loading.");
    }
    return currentGame;
  }

  function prepareProductionPrintDocument(html) {
    const currentGame = resolvedCurrentGame();
    const printCardBacks = Boolean(document.getElementById("printCardBacks")?.checked);
    const documentNode = new DOMParser().parseFromString(html, "text/html");

    replaceProductionFronts(documentNode, currentGame);
    ensureIntrinsicReversePages(documentNode, currentGame);
    if (printCardBacks) {
      ensureStandardBackPages(documentNode);
      replaceProductionBacks(documentNode);
    }
    injectProductionPrintStyles(documentNode);
    installProductionReadinessGate(documentNode);

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }

  function contractComponentForShell(shell, currentGame) {
    const componentId = String(shell.dataset.contractComponentId || "").trim();
    if (!componentId) return null;
    return [
      ...(currentGame.sharedComponents || []),
      ...(currentGame.components || []),
    ].find(component => component.id === componentId) || null;
  }

  function renderDescriptorForComponent(component) {
    const explicit = component.renderSource || {};
    if (explicit.printUrl || explicit.printEndpoint) {
      return {
        kind: "external",
        id: component.id,
        src: explicit.printUrl || explicit.printEndpoint,
      };
    }

    const surface = String(explicit.surface || "");
    const componentId = String(explicit.componentId || "").trim();
    const explicitKind = String(explicit.kind || "").trim();
    if (explicitKind && componentId) return { kind: explicitKind, id: componentId };
    if (/supplemental-card\.js$/i.test(surface) && componentId) {
      return { kind: "supplemental", id: componentId };
    }
    if (/reference-card\.js$/i.test(surface)) {
      return { kind: "reference", id: componentId || component.id };
    }
    if (/proposal-card\.js$/i.test(surface)) {
      return { kind: "proposal", id: componentId || component.id.replace(/^diplomats-proposal-/, "") };
    }
    if (/rite-card\.js$/i.test(surface)) {
      return { kind: "rite", id: componentId || component.id.replace(/^mystics-rite-/, "") };
    }

    if (component.family === "tracker" && componentId) return { kind: "tracker", id: componentId };
    if (component.family === "reference-card") return { kind: "reference", id: component.id };
    if (component.family === "proposal-treaty-card") return { kind: "proposal", id: component.id.replace(/^diplomats-proposal-/, "") };
    if (component.family === "rite-card") return { kind: "rite", id: component.id.replace(/^mystics-rite-/, "") };
    if (component.family === "ritual-card") return { kind: "ritual", id: componentId || component.id.replace(/^mystics-ritual-of-/, "") };
    if (component.family === "ledger") return { kind: "supplemental", id: component.id };
    if (component.family === "deed-card") return { kind: "supplemental", id: component.id, orientation: "landscape" };
    return null;
  }

  function componentIsPrintableProduction(component, descriptor) {
    if (!descriptor) return false;
    if (component.productionStatus === "ready") return true;
    // Final card faces may be printable before their separate supplemental/TTS
    // export status is promoted. The Deckbuilder still uses the canonical
    // production renderer and never falls back to placeholder design.
    return ["proposal-treaty-card", "ledger", "deed-card"].includes(component.family)
      && (component.designStatus || "final") === "final"
      && component.productionStatus === "export-pending";
  }

  function annotateContract(shell, component) {
    shell.dataset.contractFamily = component.family;
    shell.dataset.contractDesignStatus = component.designStatus || "final";
    shell.dataset.contractProductionStatus = component.productionStatus;
    shell.dataset.contractBackPolicy = component.backPolicy || "";
    if (component.backPolicy === "standardBack") shell.classList.add("production-standard-back");
  }

  function replaceProductionFronts(documentNode, currentGame) {
    replaceProductionLeader(documentNode, currentGame);
    replaceSupplementalFronts(documentNode, currentGame);
    replacePlayableAndTerritoryFronts(documentNode, currentGame);
  }

  function replaceProductionLeader(documentNode, currentGame) {
    const leaderShell = documentNode.querySelector(".print-card.leader-card");
    if (!leaderShell) return;

    const faction = String(state.factionId || "").trim().toLowerCase();
    const leaderId = String(state.leaderId || "").trim().toLowerCase();
    const leader = currentGame.findLeader?.(faction, leaderId)
      || currentGame.leaders?.find(item => item.faction === faction && item.id === leaderId);
    if (!leader) throw new Error(`Current-game authority cannot resolve selected Leader ${faction}/${leaderId}.`);

    leaderShell.replaceWith(makeProductionComponent(documentNode, {
      kind: "leader",
      id: `${faction}-${leader.id}`,
      label: `${leader.name} Leader`,
      side: "front",
      backPolicy: "standardBack",
      componentId: `leader:${faction}:${leader.id}`,
    }));
  }

  function replaceSupplementalFronts(documentNode, currentGame) {
    const shells = [...documentNode.querySelectorAll(
      ".print-card.tracker-card, .print-card.reference-card, .print-card.purge-card, .print-card.capital-tracker-card, .print-card.deed-card, .print-card.proposal-card, .print-card.rite-card"
    )];

    const unresolved = [];
    for (const shell of shells) {
      if (!shell.isConnected) continue;

      const component = contractComponentForShell(shell, currentGame);
      if (!component) {
        unresolved.push(shell.dataset.contractComponentId || shell.getAttribute("aria-label") || "unnamed supplemental component");
        continue;
      }
      annotateContract(shell, component);

      const descriptor = renderDescriptorForComponent(component);
      if (!componentIsPrintableProduction(component, descriptor)) {
        unresolved.push(component.name || component.id);
        continue;
      }

      let side = "front";
      if (shell.classList.contains("proposal-card") && shell.classList.contains("treaty")) side = "reverse";
      if (shell.classList.contains("rite-card") && (shell.classList.contains("rite-back-card") || shell.classList.contains("completed"))) side = "reverse";

      shell.replaceWith(makeProductionComponent(documentNode, {
        ...descriptor,
        label: component.name,
        side,
        backPolicy: component.backPolicy,
        componentId: component.id,
      }));
    }

    if (unresolved.length) {
      throw new Error(`Current-game authority could not resolve production supplemental renders for: ${unresolved.join(", ")}`);
    }
  }

  function replacePlayableAndTerritoryFronts(documentNode, currentGame) {
    const cardsById = new Map((currentGame.cards || []).map(card => [card.id, card]));
    const territoriesById = new Map((currentGame.territories || []).map(territory => [territory.id, territory]));
    const unresolved = [];

    documentNode.querySelectorAll(".print-card.main-card").forEach(cardShell => {
      const id = cardShell.dataset.cardId || "";
      const card = cardsById.get(id);
      if (!card?.id) {
        unresolved.push(id || "playable card without authority id");
        return;
      }
      cardShell.replaceWith(makeProductionCard(documentNode, card));
    });

    documentNode.querySelectorAll(".print-card.territory").forEach(territoryShell => {
      const id = territoryShell.dataset.territoryId || "";
      const territory = territoriesById.get(id);
      if (!territory?.id) {
        unresolved.push(id || "Territory without authority id");
        return;
      }
      territoryShell.replaceWith(makeProductionTerritory(documentNode, territory));
    });

    if (unresolved.length) {
      throw new Error(`Current-game authority could not resolve production render IDs for: ${unresolved.join(", ")}`);
    }
  }

  function selectedRulesetMode() {
    return window.GAUNTLET_DECKBUILDER_RULESET?.mode
      || (new URLSearchParams(window.location.search).get("rules") === "candidate" ? "candidate" : "released");
  }

  function productionFrameSource(options) {
    if (options.kind === "external") return options.src;
    const orientation = options.orientation === "landscape" ? "&orientation=landscape" : "";
    return `/card-design/component-print-render.html?kind=${encodeURIComponent(options.kind)}&id=${encodeURIComponent(options.id)}&side=${encodeURIComponent(options.side || "front")}${orientation}&rules=${encodeURIComponent(selectedRulesetMode())}`;
  }

  function makeProductionComponent(documentNode, options) {
    const {
      kind,
      id,
      side = "front",
      label,
      backPolicy = "",
      componentId = id,
      orientation = "portrait",
    } = options;
    const landscape = orientation === "landscape";
    const wrapper = documentNode.createElement("article");
    wrapper.className = `print-card production-render-component production-render-${kind}${landscape ? " production-render-landscape" : ""}${backPolicy === "standardBack" ? " production-standard-back" : ""}`;
    wrapper.dataset.productionComponentKind = kind;
    wrapper.dataset.productionComponentId = componentId;
    wrapper.dataset.productionComponentRenderId = id;
    wrapper.dataset.productionComponentSide = side;
    wrapper.dataset.productionBackPolicy = backPolicy;
    wrapper.dataset.productionOrientation = orientation;
    wrapper.setAttribute("aria-label", `${label} production render`);

    const frame = documentNode.createElement("iframe");
    frame.className = `production-component-frame${landscape ? " production-component-frame-landscape" : ""}`;
    frame.dataset.productionRenderFrame = "true";
    frame.dataset.productionRenderKind = "component";
    frame.src = productionFrameSource({ ...options, kind, id, side, orientation });
    frame.title = `${label} production render`;
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("loading", "eager");

    if (landscape) {
      const rotate = documentNode.createElement("div");
      rotate.className = "production-component-landscape-rotate";
      rotate.append(frame);
      wrapper.append(rotate);
    } else {
      wrapper.append(frame);
    }
    return wrapper;
  }

  function makeProductionCard(documentNode, card) {
    const wrapper = documentNode.createElement("article");
    wrapper.className = "print-card main-card production-render-card production-standard-back";
    wrapper.dataset.productionCardId = card.id;
    wrapper.dataset.productionBackPolicy = "standardBack";
    wrapper.setAttribute("aria-label", `${card.name} production card`);

    const frame = documentNode.createElement("iframe");
    frame.className = "production-card-frame";
    frame.dataset.productionRenderFrame = "true";
    frame.dataset.productionRenderKind = "card";
    frame.src = `/card-design/card-print-render.html?card=${encodeURIComponent(card.id)}&fit=production&rules=${encodeURIComponent(selectedRulesetMode())}`;
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
    wrapper.dataset.productionBackPolicy = "standardBack";
    wrapper.setAttribute("aria-label", `${territory.name} production Territory`);

    const rotate = documentNode.createElement("div");
    rotate.className = "production-territory-rotate";

    const frame = documentNode.createElement("iframe");
    frame.className = "production-territory-frame";
    frame.dataset.productionRenderFrame = "true";
    frame.dataset.productionRenderKind = "territory";
    frame.src = `/card-design/territory-print-render.html?territory=${encodeURIComponent(territory.id)}&rules=${encodeURIComponent(selectedRulesetMode())}`;
    frame.title = `${territory.name} production Territory`;
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("loading", "eager");

    rotate.append(frame);
    wrapper.append(rotate);
    return wrapper;
  }

  function reverseOptionsFor(front, currentGame) {
    const kind = front.dataset.productionComponentKind;
    const componentId = front.dataset.productionComponentId;
    const renderId = front.dataset.productionComponentRenderId;
    const backPolicy = front.dataset.productionBackPolicy;
    if (!["twoSided", "specialBack"].includes(backPolicy)) return null;

    const component = [
      ...(currentGame.sharedComponents || []),
      ...(currentGame.components || []),
    ].find(item => item.id === componentId);
    const descriptor = component ? renderDescriptorForComponent(component) : null;
    if (!component || !descriptor) return null;
    return {
      ...descriptor,
      label: `${component.name} reverse`,
      side: "reverse",
      backPolicy,
      componentId,
    };
  }

  function ensureIntrinsicReversePages(documentNode, currentGame) {
    const fronts = [...documentNode.querySelectorAll(
      '.production-render-component[data-production-component-side="front"][data-production-back-policy="twoSided"], .production-render-component[data-production-component-side="front"][data-production-back-policy="specialBack"]'
    )];

    fronts.forEach((front, index) => {
      const componentId = front.dataset.productionComponentId;
      if (!componentId) return;
      const existingReverse = [...documentNode.querySelectorAll('.production-render-component[data-production-component-side="reverse"]')]
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

      const reverseOptions = reverseOptionsFor(front, currentGame);
      if (!reverseOptions) throw new Error(`No current-game reverse renderer is declared for ${componentId}.`);

      const backPage = ensureBackPageForFront(documentNode, frontPage, `intrinsic-sheet-${index + 1}`);
      const backCells = [...backPage.querySelectorAll(".card-table td")];
      const backCell = backCells[mirrorIndexForLongEdge(frontIndex)];
      if (!backCell) throw new Error(`Could not align reverse face for ${componentId}.`);
      backCell.replaceChildren(makeProductionComponent(documentNode, reverseOptions));
    });
  }

  function pageNeedsStandardBack(frontPage) {
    return Boolean(frontPage.querySelector(
      '.production-standard-back, [data-contract-back-policy="standardBack"]'
    ));
  }

  function ensureStandardBackPages(documentNode) {
    const frontPages = [
      documentNode.querySelector(".first-page"),
      ...documentNode.querySelectorAll(".card-page:not(.duplex-back-page):not(.deck-card-back-page)")
    ].filter(Boolean);

    frontPages.forEach((frontPage, index) => {
      if (!pageNeedsStandardBack(frontPage)) return;
      ensureBackPageForFront(documentNode, frontPage, `deck-sheet-${index + 1}`);
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
    if (!frontTable) throw new Error("A print front page has no card table.");
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
        const needsStandardBack = frontCell.querySelector(
          '.production-standard-back, [data-contract-back-policy="standardBack"]'
        );
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
.print-card.production-render-territory,
.print-card.production-render-component.production-render-landscape {
  position: relative !important;
}
.production-component-landscape-rotate {
  position: absolute;
  top: 0;
  left: 2.5in;
  width: 3.5in;
  height: 2.5in;
  transform: rotate(90deg);
  transform-origin: top left;
}
.production-render-landscape .production-component-frame {
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
