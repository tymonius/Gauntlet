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

  function renderEvents(events) {
    el.eventList.replaceChildren();
    if (!events.length) {
      el.eventList.append(emptyMessage(
        "No event dashboards are saved in this browser yet. Open a private onboarding host URL once, then return here."
      ));
      return;
    }

    events
      .slice()
      .sort(sortRecent)
      .forEach((event) => {
        const card = document.createElement("article");
        card.className = "host-event-card";
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
            ${linkButton(event.dashboardUrl, "Open event dashboard", true)}
            ${linkButton(event.participantUrl, "Preview participant onboarding")}
            ${button("Copy participant link", "copy-participant")}
            ${linkButton(event.registrationControlsUrl, "Registration controls")}
            ${button("Forget event", "forget-event", true)}
          </div>
          <div class="host-table-list">
            <div class="host-table-heading">Table sessions</div>
            <div data-table-list></div>
          </div>
        `;

        card.querySelector('[data-action="copy-participant"]')?.addEventListener("click", () => copy(event.participantUrl, "Participant link copied."));
        card.querySelector('[data-action="forget-event"]')?.addEventListener("click", () => {
          if (!window.confirm(`Forget ${title} on this browser? This does not close the event.`)) return;
          registry.forgetEvent(event.code);
          setStatus("Event removed from Host Home.");
          render();
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
        row.innerHTML = `
          <div>
            <strong>Table ${index + 1} · ${escapeHtml(game.sheetSerial || "Unlabeled session")}</strong>
            <small>Created ${escapeHtml(formatDate(game.createdAt))}</small>
          </div>
          <div class="host-record-actions">
            ${linkButton(withPreview(game.joinUrl), "Preview player page", false, false)}
            ${linkButton(game.joinUrl, "Open clean player page")}
            ${button("Copy player link", "copy-table")}
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

    sessions
      .slice()
      .sort(sortRecent)
      .forEach((session) => {
        const card = document.createElement("article");
        card.className = "host-standalone-card";
        const identity = session.sessionId || session.code || session.hostUrl;
        card.innerHTML = `
          <div class="host-standalone-head">
            <div>
              <p class="eyebrow">Standalone session</p>
              <h3>${escapeHtml(session.sheetSerial || "Coded playtest sheet")}</h3>
              <p class="host-meta">${escapeHtml(session.status || "Saved")} · ${escapeHtml(formatDate(session.createdAt))}</p>
            </div>
          </div>
          <div class="host-record-actions">
            ${linkButton(session.hostUrl, "Open host controls", true)}
            ${linkButton(session.joinUrl, "Open player page")}
            ${button("Copy player link", "copy-standalone")}
            ${button("Forget", "forget-standalone", true)}
          </div>
        `;
        card.querySelector('[data-action="copy-standalone"]')?.addEventListener("click", () => copy(session.joinUrl, "Player link copied."));
        card.querySelector('[data-action="forget-standalone"]')?.addEventListener("click", () => {
          registry.forgetStandalone(identity);
          setStatus("Standalone session removed from Host Home.");
          render();
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

  function linkButton(href, label, primary = false, newTab = true) {
    if (!href) return "";
    const target = newTab ? ' target="_blank" rel="noopener"' : "";
    return `<a${primary ? ' class="primary"' : ""} href="${escapeAttribute(href)}"${target}>${escapeHtml(label)}</a>`;
  }

  function button(label, action, danger = false) {
    return `<button${danger ? ' class="danger"' : ""} type="button" data-action="${escapeAttribute(action)}">${escapeHtml(label)}</button>`;
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
