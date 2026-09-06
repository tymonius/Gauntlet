(() => {
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
  const params = new URLSearchParams(window.location.search);
  const code = String(params.get("code") || "").trim();
  const hostKey = String(params.get("host") || "").trim();
  if (!TOKEN_PATTERN.test(code) || !hostKey) return;

  const localKey = `gauntlet_event_games_${code.slice(0, 16)}`;
  const state = {
    event: null,
    games: [],
    localGames: readLocalGames(),
    qrReady: false,
    printableGames: []
  };
  const el = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    const organizer = document.getElementById("organizerPanel");
    if (!organizer) return;
    injectStyles();
    injectManager(organizer);
    window.addEventListener("afterprint", () => document.body.classList.remove("printing-event-games"));
    await refreshGames();
  }

  function injectManager(organizer) {
    const section = document.createElement("section");
    section.className = "event-games-manager";
    section.setAttribute("aria-labelledby", "event-games-title");
    section.innerHTML = `
      <div class="section-heading split-heading">
        <div>
          <p class="eyebrow">Table sessions</p>
          <h2 id="event-games-title" tabindex="-1">One QR code per game.</h2>
        </div>
        <p>Place one code at each table. Both players scan the same code, confirm who they are, and every Rules Arbiter question stays with that game and player.</p>
      </div>
      <div class="event-game-controls">
        <label>
          Table QR codes to create
          <input id="eventGameCount" type="number" min="1" max="20" value="4" />
        </label>
        <button id="eventCreateGames" class="button primary" type="button">Create table codes</button>
        <button id="eventRefreshGames" class="button secondary" type="button">Refresh games</button>
        <button id="eventPrintGames" class="button secondary" type="button">Print QR cards</button>
        <button id="eventDownloadGames" class="button secondary" type="button">Download table manifest</button>
      </div>
      <p id="eventGameStatus" class="form-status" aria-live="polite"></p>
      <div id="eventGameSummary" class="event-game-summary"></div>
      <div id="eventGameList" class="event-game-list"></div>
      <div class="event-game-note">
        <strong>Keep this organizer page or the downloaded manifest.</strong>
        <span>For security, a table's public join code is returned only when that table session is created. Game status and player seats remain available from any organizer device.</span>
      </div>
    `;
    organizer.append(section);

    for (const id of [
      "eventGameCount", "eventCreateGames", "eventRefreshGames", "eventPrintGames",
      "eventDownloadGames", "eventGameStatus", "eventGameSummary", "eventGameList"
    ]) el[id] = section.querySelector(`#${id}`);

    el.eventCreateGames.addEventListener("click", createGames);
    el.eventRefreshGames.addEventListener("click", refreshGames);
    el.eventPrintGames.addEventListener("click", printGames);
    el.eventDownloadGames.addEventListener("click", downloadManifest);
  }

  async function createGames() {
    const count = Math.max(1, Math.min(20, Number(el.eventGameCount.value) || 0));
    if (!count) return;
    const confirmed = window.confirm(
      `Create ${count} single-use table session${count === 1 ? "" : "s"}? Each public QR code becomes active immediately.`
    );
    if (!confirmed) return;

    setBusy(true);
    setStatus(`Creating ${count} table session${count === 1 ? "" : "s"}…`);
    try {
      const payload = await api(`/api/sessions/${encodeURIComponent(code)}/games`, {
        method: "POST",
        body: {
          count,
          metadata: { generatedFrom: "game-night-event-dashboard" }
        }
      });
      const created = Array.isArray(payload.games) ? payload.games : [];
      for (const game of created) {
        rememberLocalGame({
          sessionId: game.sessionId,
          sheetSerial: game.sheetSerial,
          joinUrl: game.joinUrl,
          createdAt: game.createdAt
        });
      }
      saveLocalGames();
      await refreshGames();
      setStatus(`${created.length} table code${created.length === 1 ? "" : "s"} created. Print or download them before leaving this browser.`, "success");
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Table sessions could not be created.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function refreshGames() {
    setStatus("Loading table sessions…");
    el.eventRefreshGames.disabled = true;
    try {
      const payload = await api(`/api/sessions/${encodeURIComponent(code)}/games`);
      state.event = payload.event || null;
      state.games = Array.isArray(payload.games) ? payload.games : [];
      mergeLocalRecords();
      await ensureQrRenderer();
      await renderGames();
      setStatus(`Table sessions refreshed ${formatDate(payload.generatedAt)}.`, "success");
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Table sessions could not be loaded.", "error");
    } finally {
      el.eventRefreshGames.disabled = false;
    }
  }

  function mergeLocalRecords() {
    const byId = new Map(state.localGames.map((game) => [game.sessionId, game]));
    state.games = state.games.map((game) => ({ ...game, ...(byId.get(game.sessionId) || {}) }));
  }

  function focusGameAfterRefresh(sessionId) {
    const card = [...el.eventGameList.querySelectorAll("[data-game-session-id]")]
      .find(item => item.dataset.gameSessionId === String(sessionId));
    const target = card?.querySelector("a[href], button:not([disabled])") || document.getElementById("event-games-title");
    target?.focus({ preventScroll: true });
  }

  async function renderGames() {
    const games = state.games;
    const open = games.filter((game) => game.status === "open").length;
    const active = games.filter((game) => Array.isArray(game.players) && game.players.length > 0 && game.status === "open").length;
    const complete = games.filter((game) => game.status === "closed").length;
    el.eventGameSummary.innerHTML = `
      <div><strong>${games.length}</strong><span>Total table codes</span></div>
      <div><strong>${open}</strong><span>Open</span></div>
      <div><strong>${active}</strong><span>With players</span></div>
      <div><strong>${complete}</strong><span>Closed</span></div>
    `;
    el.eventGameList.replaceChildren();

    if (!games.length) {
      const empty = document.createElement("p");
      empty.className = "event-game-empty";
      empty.textContent = "No table sessions have been created for this event yet.";
      el.eventGameList.append(empty);
      state.printableGames = [];
      updateActionAvailability();
      renderPrintSheets([]);
      return;
    }

    const printable = [];
    for (const [index, game] of games.entries()) {
      const card = document.createElement("article");
      card.className = `event-game-card${game.status === "closed" ? " closed" : ""}`;
      card.dataset.gameSessionId = String(game.sessionId || "");
      const local = Boolean(game.joinUrl);
      let qrDataUrl = "";
      if (local && state.qrReady) {
        try { qrDataUrl = await createQrCode(game.joinUrl); }
        catch (error) { console.warn("QR code could not be rendered.", error); }
      }
      if (qrDataUrl) printable.push({ ...game, qrDataUrl, tableNumber: index + 1 });

      const players = Array.isArray(game.players) ? game.players : [];
      const playerMarkup = [1, 2].map((seat) => {
        const player = players.find((item) => Number(item.seatIndex) === seat);
        return player
          ? `<li><strong>Seat ${seat}</strong><span>${escapeHtml(player.displayName)} — ${escapeHtml(player.leader || "")}${player.faction ? ` / ${escapeHtml(titleCase(player.faction))}` : ""}</span></li>`
          : `<li class="empty"><strong>Seat ${seat}</strong><span>Waiting for player</span></li>`;
      }).join("");

      card.innerHTML = `
        <div class="event-game-card-head">
          <div>
            <p class="eyebrow">Table ${index + 1}</p>
            <h3>${escapeHtml(game.sheetSerial)}</h3>
          </div>
          <span class="event-game-state">${game.status === "closed" ? "Closed" : players.length === 2 ? "Ready" : players.length ? "Joining" : "Unused"}</span>
        </div>
        <div class="event-game-card-body">
          <div class="event-game-qr ${qrDataUrl ? "" : "missing"}">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR code for table ${index + 1}" />` : `<span>${local ? "QR unavailable" : "Code not saved on this browser"}</span>`}
          </div>
          <div>
            <p class="event-game-instruction">Both players scan this code and confirm their identity.</p>
            <ul class="event-game-seats">${playerMarkup}</ul>
          </div>
        </div>
        <div class="event-game-actions">
          ${local ? `<a class="button secondary" href="${escapeAttribute(game.joinUrl)}" target="_blank" rel="noopener">Open player link</a>` : ""}
          ${game.status === "open" ? `<button class="button secondary" type="button" data-close-game="${escapeAttribute(game.sessionId)}">Close game</button>` : ""}
        </div>
      `;
      card.querySelector("[data-close-game]")?.addEventListener("click", () => closeGame(game));
      el.eventGameList.append(card);
    }

    state.printableGames = printable;
    renderPrintSheets(printable);
    updateActionAvailability();
  }

  function renderPrintSheets(games) {
    let printRoot = document.getElementById("eventGamePrintRoot");
    if (!printRoot) {
      printRoot = document.createElement("main");
      printRoot.id = "eventGamePrintRoot";
      printRoot.className = "event-game-print-root";
      printRoot.setAttribute("aria-label", "Printable table QR cards");
      document.body.append(printRoot);
    }
    printRoot.replaceChildren();
    games.forEach((game) => {
      const card = document.createElement("section");
      card.className = "event-game-print-card";
      card.innerHTML = `
        <p class="eyebrow">Gauntlet game-night playtest</p>
        <h1>Table ${game.tableNumber}</h1>
        <img src="${game.qrDataUrl}" alt="Table ${game.tableNumber} game QR code" />
        <h2>${escapeHtml(game.sheetSerial)}</h2>
        <p><strong>Both players:</strong> scan this code, confirm your name, and join the game.</p>
        <p>Rules Arbiter questions and feedback will be attached to this table session and the player who submitted them.</p>
      `;
      printRoot.append(card);
    });
  }

  async function closeGame(game) {
    const confirmed = window.confirm(
      `Close ${game.sheetSerial}? This retires its QR code and blocks future joins and game events.`
    );
    if (!confirmed) return;
    setStatus(`Closing ${game.sheetSerial}…`);
    try {
      await api(`/api/sessions/${encodeURIComponent(code)}/games/${encodeURIComponent(game.sessionId)}/close`, {
        method: "POST",
        body: {}
      });
      await refreshGames();
      setStatus(`${game.sheetSerial} closed.`, "success");
      focusGameAfterRefresh(game.sessionId);
    } catch (error) {
      setStatus(error.message || "The game could not be closed.", "error");
    }
  }

  function printGames() {
    if (!state.printableGames.length) {
      setStatus("No QR cards are available to print from this browser.", "error");
      return;
    }
    document.body.classList.add("printing-event-games");
    window.print();
  }

  function downloadManifest() {
    const local = state.localGames.filter((game) => game.joinUrl);
    if (!local.length) {
      setStatus("No table links are available to download from this browser.", "error");
      return;
    }
    const manifest = {
      eventSessionId: state.event?.sessionId || null,
      eventSheetSerial: state.event?.sheetSerial || null,
      generatedAt: new Date().toISOString(),
      sensitive: false,
      note: "Contains public player join links only. The event host link closes and reviews these games.",
      games: local.map((game) => ({
        sessionId: game.sessionId,
        sheetSerial: game.sheetSerial,
        joinUrl: game.joinUrl,
        createdAt: game.createdAt
      }))
    };
    const blob = new Blob([`${JSON.stringify(manifest, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.event?.sheetSerial || "gauntlet"}-table-sessions.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function ensureQrRenderer() {
    if (window.QRCode?.toDataURL) {
      state.qrReady = true;
      return;
    }
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-event-qr-loader="true"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "../batch/qrcode-loader.js?v=20260730-1";
      script.dataset.eventQrLoader = "true";
      script.onload = resolve;
      script.onerror = () => reject(new Error("The QR renderer loader could not be opened."));
      document.head.append(script);
    });
    state.qrReady = Boolean(window.QRCode?.toDataURL);
  }

  function createQrCode(value) {
    if (!state.qrReady || !window.QRCode?.toDataURL) throw new Error("QR renderer unavailable");
    return window.QRCode.toDataURL(value, {
      width: 300,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#111111", light: "#ffffff" }
    });
  }

  async function api(path, options = {}) {
    const headers = { "X-Host-Key": hostKey, ...(options.headers || {}) };
    const init = { method: options.method || "GET", headers, cache: "no-store" };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const response = await fetch(`${API_ORIGIN}${path}`, init);
    let payload = null;
    try { payload = await response.json(); } catch { /* handled below */ }
    if (!response.ok) {
      const error = new Error(payload?.error || `Session service returned ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function rememberLocalGame(game) {
    const index = state.localGames.findIndex((item) => item.sessionId === game.sessionId);
    if (index >= 0) state.localGames[index] = { ...state.localGames[index], ...game };
    else state.localGames.push(game);
  }

  function readLocalGames() {
    try {
      const parsed = JSON.parse(localStorage.getItem(localKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveLocalGames() {
    try { localStorage.setItem(localKey, JSON.stringify(state.localGames)); }
    catch { /* The download remains available during this page visit. */ }
  }

  function updateActionAvailability() {
    const localCount = state.localGames.filter((game) => game.joinUrl).length;
    el.eventPrintGames.disabled = !state.printableGames.length;
    el.eventDownloadGames.disabled = localCount === 0;
  }

  function setBusy(busy) {
    el.eventCreateGames.disabled = busy;
    el.eventGameCount.disabled = busy;
  }

  function setStatus(message, kind = "") {
    el.eventGameStatus.textContent = message;
    el.eventGameStatus.className = `form-status${kind ? ` ${kind}` : ""}`;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.valueOf())
      ? String(value)
      : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function titleCase(value) {
    return String(value || "").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .event-games-manager { margin-top: 72px; padding-top: 70px; border-top: 1px solid var(--line); }
      .event-game-controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; margin: 28px 0 8px; }
      .event-game-controls label { display: grid; gap: 8px; min-width: 190px; font-weight: 800; }
      .event-game-controls input { min-height: 48px; padding: 0 12px; border: 1px solid var(--line); background: var(--surface); }
      .event-game-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 28px 0 18px; }
      .event-game-summary div { padding: 18px; border: 1px solid var(--line); background: var(--surface); }
      .event-game-summary strong { display: block; font-family: var(--serif); font-size: 1.8rem; }
      .event-game-summary span { color: var(--muted); font-size: .76rem; text-transform: uppercase; letter-spacing: .07em; }
      .event-game-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      .event-game-card { padding: 24px; border: 1px solid var(--line); border-top: 5px solid var(--crimson); background: var(--surface); box-shadow: 0 12px 32px rgba(55,38,18,.06); }
      .event-game-card.closed { opacity: .72; border-top-color: var(--muted); }
      .event-game-card-head { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
      .event-game-card h3 { margin: 4px 0 0; font-size: 1.45rem; }
      .event-game-state { padding: 6px 9px; border: 1px solid var(--line); color: var(--muted); font-size: .74rem; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; }
      .event-game-card-body { margin-top: 20px; display: grid; grid-template-columns: 150px 1fr; gap: 20px; align-items: start; }
      .event-game-qr { aspect-ratio: 1; border: 1px solid var(--line); background: #fff; }
      .event-game-qr img { display: block; width: 100%; height: 100%; object-fit: contain; }
      .event-game-qr.missing { display: grid; place-items: center; padding: 12px; color: var(--muted); text-align: center; font-size: .78rem; }
      .event-game-instruction { margin: 0 0 14px; color: var(--muted); line-height: 1.5; }
      .event-game-seats { list-style: none; margin: 0; padding: 0; }
      .event-game-seats li { display: grid; gap: 3px; padding: 9px 0; border-top: 1px solid var(--line); }
      .event-game-seats li span { color: var(--muted); font-size: .88rem; }
      .event-game-seats li.empty { opacity: .62; }
      .event-game-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
      .event-game-note { margin-top: 18px; display: grid; gap: 5px; color: var(--muted); font-size: .88rem; line-height: 1.5; }
      .event-game-empty { padding: 28px; border: 1px dashed var(--line); color: var(--muted); }
      .event-game-print-root { display: none; }
      @media (max-width: 760px) {
        .event-game-summary { grid-template-columns: repeat(2, 1fr); }
        .event-game-list { grid-template-columns: 1fr; }
        .event-game-card-body { grid-template-columns: 120px 1fr; }
      }
      @media print {
        body.printing-event-games > :not(#eventGamePrintRoot) { display: none !important; }
        body.printing-event-games #eventGamePrintRoot { display: block !important; }
        .event-game-print-card { min-height: 9.5in; padding: .6in; break-after: page; display: grid; justify-items: center; align-content: start; text-align: center; color: #111; background: #fff; }
        .event-game-print-card:last-child { break-after: auto; }
        .event-game-print-card h1 { margin: .25in 0 .12in; font-size: 42pt; }
        .event-game-print-card h2 { margin: .15in 0; font-size: 18pt; }
        .event-game-print-card img { width: 4.2in; height: 4.2in; margin: .15in 0; }
        .event-game-print-card p { max-width: 5.8in; font-size: 14pt; line-height: 1.45; }
      }
    `;
    document.head.append(style);
  }
})();