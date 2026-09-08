(() => {
  const registry = window.GauntletHostRegistry;
  if (!registry) return;

  const el = {};
  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("gauntlet-host-registry-change", render);

  function init() {
    for (const id of ["eventList", "standaloneList", "manifestFile", "clearHostHome", "hostHomeStatus"]) {
      el[id] = document.getElementById(id);
    }
    el.manifestFile?.addEventListener("change", importManifest);
    el.clearHostHome?.addEventListener("click", clearAll);
    render();
  }

  function render() {
    const data = registry.read();
    renderEvents(data.events || []);
    renderStandalone(data.standalone || []);
  }

  function focusReplacement(list, key, headingId) {
    const card = key
      ? [...list.querySelectorAll("[data-host-record-key]")].find(item => item.dataset.hostRecordKey === String(key))
      : null;
    const target = card?.querySelector("a[href], button:not([disabled])") || document.getElementById(headingId);
    target?.focus({ preventScroll: true });
  }

  function renderEvents(events) {
    el.eventList.replaceChildren();
    if (!events.length) {
      el.eventList.append(emptyMessage(
        "No event dashboards are saved in this browser yet. Open a private onboarding host URL once, then return here."
      ));
      return;
    }

    const orderedEvents = events.slice().sort(sortRecent);
    orderedEvents.forEach((event, index) => {
        const card = document.createElement("article");
        card.className = "host-event-card";
        card.dataset.hostRecordKey = String(event.code || event.dashboardUrl || event.sheetSerial || index);
        const title = event.sheetSerial || "Game-night event";
        card.innerHTML = `
          <div class="host-event-head">
            <div>
              <p class="eyebrow">Event dashboard</p>
              <h3>${escapeHtml(title)}</h3>
              <p class="host-meta">Last opened ${escapeHtml(formatDate(event.updatedAt))}</p>
            </div>
          </div>
          <div class="host-record-actions">
            ${linkButton(event.dashboardUrl, "Open event dashboard", true, true, title)}
            ${linkButton(event.participantUrl, "Preview participant onboarding", false, true, title)}
            ${button("Copy participant link", "copy-participant", false, title)}
            ${linkButton(event.registrationControlsUrl, "Registration controls", false, true, title)}
            ${button("Forget event", "forget-event", true, title)}
          </div>
          <div class="host-table-list">
            <div class="host-table-heading">Table sessions</div>
            <div data-table-list></div>
          </div>
        `;

        card.querySelector('[data-action="copy-participant"]')?.addEventListener("click", () => copy(event.participantUrl, "Participant link copied."));
        card.querySelector('[data-action="forget-event"]')?.addEventListener("click", () => {
          if (!window.confirm(`Forget ${title} on this browser? This does not close the event.`)) return;
          const neighbor = orderedEvents[index + 1] || orderedEvents[index - 1] || null;
          const neighborKey = neighbor ? String(neighbor.code || neighbor.dashboardUrl || neighbor.sheetSerial || "") : "";
          registry.forgetEvent(event.code);
          setStatus("Event removed from Host Home.");
          render();
          focusReplacement(el.eventList, neighborKey, "events-title");
        });

        renderTables(card.querySelector("[data-table-list]"), event.games || []);
        el.eventList.append(card);
      });
  }

  function renderTables(container, games) {
    if (!container) return;
    container.replaceChildren();
    if (!games.length) {
      const empty = document.createElement("p");
      empty.className = "host-no-tables";
      empty.textContent = "No table links are saved yet. Create table codes from the event dashboard on this browser.";
      container.append(empty);
      return;
    }

    games
      .slice()
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
      .forEach((game, index) => {
        const row = document.createElement("div");
        row.className = "host-table-row";
        const tableLabel = `Table ${index + 1} · ${game.sheetSerial || "Unlabeled session"}`;
        row.innerHTML = `
          <div>
            <strong>${escapeHtml(tableLabel)}</strong>
            <small>Created ${escapeHtml(formatDate(game.createdAt))}</small>
          </div>
          <div class="host-record-actions">
            ${linkButton(withPreview(game.joinUrl), "Preview player page", false, false, tableLabel)}
            ${linkButton(game.joinUrl, "Open clean player page", false, true, tableLabel)}
            ${button("Copy player link", "copy-table", false, tableLabel)}
          </div>
        `;
        row.querySelector('[data-action="copy-table"]')?.addEventListener("click", () => copy(game.joinUrl, "Table player link copied."));
        container.append(row);
      });
  }

  function renderStandalone(sessions) {
    el.standaloneList.replaceChildren();
    if (!sessions.length) {
      el.standaloneList.append(emptyMessage(
        "No standalone coded sheets are saved. Open a sheet’s host controls once, or restore its batch manifest."
      ));
      return;
    }

    const orderedSessions = sessions.slice().sort(sortRecent);
    orderedSessions.forEach((session, index) => {
        const card = document.createElement("article");
        card.className = "host-standalone-card";
        const identity = session.sessionId || session.code || session.hostUrl;
        card.dataset.hostRecordKey = String(identity || index);
        const title = session.sheetSerial || "Coded playtest sheet";
        card.innerHTML = `
          <div class="host-standalone-head">
            <div>
              <p class="eyebrow">Standalone session</p>
              <h3>${escapeHtml(title)}</h3>
              <p class="host-meta">${escapeHtml(session.status || "Saved")} · ${escapeHtml(formatDate(session.createdAt))}</p>
            </div>
          </div>
          <div class="host-record-actions">
            ${linkButton(session.hostUrl, "Open host controls", true, true, title)}
            ${linkButton(session.joinUrl, "Open player page", false, true, title)}
            ${button("Copy player link", "copy-standalone", false, title)}
            ${button("Forget", "forget-standalone", true, title)}
          </div>
        `;
        card.querySelector('[data-action="copy-standalone"]')?.addEventListener("click", () => copy(session.joinUrl, "Player link copied."));
        card.querySelector('[data-action="forget-standalone"]')?.addEventListener("click", () => {
          const neighbor = orderedSessions[index + 1] || orderedSessions[index - 1] || null;
          const neighborKey = neighbor ? String(neighbor.sessionId || neighbor.code || neighbor.hostUrl || "") : "";
          registry.forgetStandalone(identity);
          setStatus("Standalone session removed from Host Home.");
          render();
          focusReplacement(el.standaloneList, neighborKey, "standalone-title");
        });
        el.standaloneList.append(card);
      });
  }

  async function importManifest(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const manifest = JSON.parse(await file.text());
      const count = registry.importManifest(manifest);
      setStatus(`${count} saved link${count === 1 ? "" : "s"} restored.`, "success");
      render();
    } catch (error) {
      setStatus(error.message || "That manifest could not be imported.", "error");
    } finally {
      event.target.value = "";
    }
  }

  function clearAll() {
    if (!window.confirm("Forget every saved event and session on this browser? This does not close anything on the server.")) return;
    registry.clear();
    setStatus("Host Home cleared.");
    render();
  }

  async function copy(value, message) {
    if (!value) return setStatus("That link is not available on this browser.", "error");
    try {
      await navigator.clipboard.writeText(value);
      setStatus(message, "success");
    } catch {
      window.prompt("Copy this link:", value);
    }
  }

  function withPreview(value) {
    if (!value) return "";
    try {
      const url = new URL(value);
      url.searchParams.set("organizerPreview", "1");
      return url.href;
    } catch {
      return value;
    }
  }

  function linkButton(href, label, primary = false, newTab = true, context = "") {
    if (!href) return "";
    const target = newTab ? ' target="_blank" rel="noopener"' : "";
    const accessibleName = context ? ` aria-label="${escapeAttribute(`${label} — ${context}`)}"` : "";
    return `<a${primary ? ' class="primary"' : ""} href="${escapeAttribute(href)}"${target}${accessibleName}>${escapeHtml(label)}</a>`;
  }

  function button(label, action, danger = false, context = "") {
    const accessibleName = context ? ` aria-label="${escapeAttribute(`${label} — ${context}`)}"` : "";
    return `<button${danger ? ' class="danger"' : ""} type="button" data-action="${escapeAttribute(action)}"${accessibleName}>${escapeHtml(label)}</button>`;
  }

  function emptyMessage(message) {
    const element = document.createElement("p");
    element.className = "host-empty";
    element.textContent = message;
    return element;
  }

  function sortRecent(a, b) {
    return String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
  }

  function formatDate(value) {
    if (!value) return "unknown date";
    const date = new Date(value);
    return Number.isNaN(date.valueOf())
      ? String(value)
      : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function setStatus(message, kind = "") {
    el.hostHomeStatus.textContent = message;
    el.hostHomeStatus.className = `form-status${kind ? ` ${kind}` : ""}`;
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
})();
