(() => {
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");

  let sessions = [];
  let sheetTemplate = null;
  let batchMetadata = null;
  const el = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    for (const id of [
      "batchForm", "sheetCount", "batchLabel", "adminToken", "generateButton",
      "generationStatus", "resultPanel", "resultCount", "resultSummary", "downloadManifest",
      "printSheets", "clearBatch", "sessionList", "printBatch"
    ]) el[id] = document.getElementById(id);

    el.batchForm.addEventListener("submit", generateBatch);
    el.downloadManifest.addEventListener("click", downloadManifest);
    el.printSheets.addEventListener("click", () => window.print());
    el.clearBatch.addEventListener("click", clearBatch);
  }

  async function generateBatch(event) {
    event.preventDefault();
    const count = Math.max(1, Math.min(Number(el.sheetCount.value) || 0, 50));
    const label = el.batchLabel.value.trim();
    const adminToken = el.adminToken.value.trim();
    if (!count || !adminToken) return;

    const confirmed = window.confirm(
      `Create ${count} live formal playtest session${count === 1 ? "" : "s"}? Each generated QR code becomes active immediately.`
    );
    if (!confirmed) return;

    setBusy(true);
    setStatus("Checking the session service…");
    try {
      await checkService();
      sheetTemplate ||= await loadSheetTemplate();
      sessions = [];
      el.printBatch.replaceChildren();
      el.sessionList.replaceChildren();
      el.resultPanel.hidden = true;
      el.printSheets.disabled = false;

      const batchId = typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `batch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      batchMetadata = {
        batchId,
        label,
        generatedAt: new Date().toISOString(),
        rulesVersion: "v0.7.0",
        sessionApiOrigin: API_ORIGIN
      };

      for (let index = 0; index < count; index += 1) {
        setStatus(`Creating sheet ${index + 1} of ${count}…`);
        const created = await createSession(adminToken, {
          batchId,
          batchLabel: label,
          batchIndex: index + 1,
          batchSize: count,
          generatedFrom: "playtest-batch-browser"
        });
        const sessionRecord = { ...created, qrDataUrl: null };
        sessions.push(sessionRecord);
        renderSessionRow(created, index);

        const qrDataUrl = await createQrCode(created.joinUrl);
        sessionRecord.qrDataUrl = qrDataUrl;
        renderSheet(created, qrDataUrl, index);
      }

      el.resultCount.textContent = String(sessions.length);
      el.resultSummary.textContent = label
        ? `Batch “${label}” is live. Download the private host manifest before printing or leaving this page.`
        : "The batch is live. Download the private host manifest before printing or leaving this page.";
      el.resultPanel.hidden = false;
      el.printSheets.disabled = false;
      setStatus(`${sessions.length} coded sheet${sessions.length === 1 ? "" : "s"} ready.`, "success");
      el.resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      console.error(error);
      const partial = sessions.length
        ? ` ${sessions.length} session${sessions.length === 1 ? " was" : "s were"} created before the failure; download the manifest and close them if they will not be used.`
        : "";
      setStatus(`${error.message || "The batch could not be generated."}${partial}`, "error");
      if (sessions.length) {
        el.resultCount.textContent = String(sessions.length);
        el.resultSummary.textContent = "This is a partial batch. Its created sessions are already live. Download the host manifest before leaving this page.";
        el.resultPanel.hidden = false;
        el.printSheets.disabled = true;
      }
    } finally {
      setBusy(false);
    }
  }

  async function checkService() {
    const response = await fetch(`${API_ORIGIN}/health`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Session service health check failed (${response.status}).`);
    const health = await response.json();
    if (health.version !== "v0.7.0") throw new Error(`Session service reports ${health.version || "an unknown version"}.`);
    if (!health.database) throw new Error("Session service database is not configured.");
    if (!health.sessionCreationConfigured) throw new Error("Session creation secret is not configured.");
  }

  async function createSession(adminToken, metadata) {
    const response = await fetch(`${API_ORIGIN}/api/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${adminToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        rulesVersion: "v0.7.0",
        metadata
      })
    });
    let payload = null;
    try { payload = await response.json(); } catch { /* handled below */ }
    if (!response.ok) {
      throw new Error(payload?.error || `Session creation failed (${response.status}).`);
    }
    return payload;
  }

  async function loadSheetTemplate() {
    const response = await fetch("../sheet/", { cache: "no-store" });
    if (!response.ok) throw new Error("The printable playtest sheet template could not be loaded.");
    const documentSource = new DOMParser().parseFromString(await response.text(), "text/html");
    const template = documentSource.querySelector(".playtest-sheet");
    if (!template) throw new Error("The printable playtest sheet template is missing.");
    return template;
  }

  async function createQrCode(value) {
    if (!window.QRCode?.toDataURL) {
      throw new Error("The QR renderer did not load. Check the network connection and try again.");
    }
    return window.QRCode.toDataURL(value, {
      width: 260,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#111111", light: "#ffffff" }
    });
  }

  function renderSheet(created, qrDataUrl, index) {
    const page = document.createElement("section");
    page.className = "batch-sheet-page";
    page.dataset.batchIndex = String(index + 1);
    const sheet = sheetTemplate.cloneNode(true);

    const serial = sheet.querySelector("#sheet-serial");
    const qr = sheet.querySelector("#session-qr");
    const placeholder = sheet.querySelector("#qr-placeholder");
    const frame = sheet.querySelector("#qr-frame");
    if (!serial || !qr || !placeholder || !frame) {
      throw new Error("The printable sheet no longer exposes its QR placeholders.");
    }

    serial.textContent = created.sheetSerial;
    qr.src = qrDataUrl;
    qr.hidden = false;
    placeholder.hidden = true;
    frame.classList.add("has-code");

    sheet.querySelectorAll("[id]").forEach((node) => {
      node.id = `${node.id}-batch-${index + 1}`;
    });
    page.append(sheet);
    el.printBatch.append(page);
  }

  function renderSessionRow(created, index) {
    const row = document.createElement("article");
    row.className = "session-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(created.sheetSerial)}</strong>
        <small>Sheet ${index + 1} · created ${escapeHtml(formatDate(created.createdAt))}</small>
      </div>
      <a href="${escapeAttribute(created.hostUrl)}" target="_blank" rel="noopener noreferrer">Open host controls</a>
    `;
    el.sessionList.append(row);
  }

  function downloadManifest() {
    if (!sessions.length || !batchMetadata) return;
    const manifest = {
      ...batchMetadata,
      sensitive: true,
      warning: "Contains private host keys and host URLs. Keep with the facilitator; do not distribute with player sheets.",
      sessions: sessions.map(({ qrDataUrl, ...session }) => session)
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const label = slugify(batchMetadata.label || batchMetadata.batchId.slice(0, 8));
    anchor.href = url;
    anchor.download = `gauntlet-v063-playtest-batch-${label}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function clearBatch() {
    if (!sessions.length) return;
    const confirmed = window.confirm(
      "Clear the rendered batch from this browser? This does not close the live sessions. Make sure the host manifest has been downloaded first."
    );
    if (!confirmed) return;
    sessions = [];
    batchMetadata = null;
    el.printBatch.replaceChildren();
    el.sessionList.replaceChildren();
    el.resultPanel.hidden = true;
    el.printSheets.disabled = false;
    setStatus("Rendered batch cleared. Existing sessions remain live until closed.");
  }

  function setBusy(busy) {
    el.generateButton.disabled = busy;
    el.sheetCount.disabled = busy;
    el.batchLabel.disabled = busy;
    el.adminToken.disabled = busy;
  }

  function setStatus(message, kind = "") {
    el.generationStatus.textContent = message;
    el.generationStatus.className = `form-status${kind ? ` ${kind}` : ""}`;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf())
      ? String(value || "")
      : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function slugify(value) {
    return String(value || "batch")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "batch";
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
