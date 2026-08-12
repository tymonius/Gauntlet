(() => {
  const CURRENT_VERSION = "v0.6.3";
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
    el.batchForm?.addEventListener("submit", generateBatch);
    el.downloadManifest?.addEventListener("click", downloadManifest);
    el.printSheets?.addEventListener("click", () => window.print());
    el.clearBatch?.addEventListener("click", clearBatch);
  }

  async function generateBatch(event) {
    event.preventDefault();
    const count = Math.max(1, Math.min(Number(el.sheetCount.value) || 0, 50));
    const label = el.batchLabel.value.trim();
    const adminToken = el.adminToken.value.trim();
    if (!count || !adminToken) return;
    if (!window.confirm(`Create ${count} live ${CURRENT_VERSION} formal playtest session${count === 1 ? "" : "s"}?`)) return;

    setBusy(true);
    setStatus("Checking the session service…");
    try {
      await checkService();
      sheetTemplate ||= await loadSheetTemplate();
      sessions = [];
      el.printBatch.replaceChildren();
      el.sessionList.replaceChildren();
      el.resultPanel.hidden = true;

      const batchId = typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `batch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      batchMetadata = {
        batchId,
        label,
        generatedAt: new Date().toISOString(),
        rulesVersion: CURRENT_VERSION,
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
        if (created.rulesVersion !== CURRENT_VERSION || !String(created.sheetSerial || "").startsWith("G063-")) {
          throw new Error(`Session service returned inconsistent release identity (${created.rulesVersion || "unknown"}, ${created.sheetSerial || "no serial"}).`);
        }
        const sessionRecord = { ...created, qrDataUrl: null };
        sessions.push(sessionRecord);
        renderSessionRow(created, index);
        const qrDataUrl = await createQrCode(created.joinUrl);
        sessionRecord.qrDataUrl = qrDataUrl;
        renderSheet(created, qrDataUrl, index);
      }

      el.resultCount.textContent = String(sessions.length);
      el.resultSummary.textContent = label
        ? `Batch “${label}” is live under ${CURRENT_VERSION}. Download the private host manifest before printing or leaving this page.`
        : `The ${CURRENT_VERSION} batch is live. Download the private host manifest before printing or leaving this page.`;
      el.resultPanel.hidden = false;
      el.printSheets.disabled = false;
      setStatus(`${sessions.length} coded sheet${sessions.length === 1 ? "" : "s"} ready.`, "success");
    } catch (error) {
      console.error(error);
      setStatus(error.message || "The batch could not be generated.", "error");
      if (sessions.length) {
        el.resultCount.textContent = String(sessions.length);
        el.resultSummary.textContent = "This is a partial batch. Created sessions are already live; download the manifest and close unused sessions.";
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
    if (health.version !== CURRENT_VERSION) throw new Error(`Session service reports ${health.version || "an unknown version"}; expected ${CURRENT_VERSION}.`);
    if (!health.database) throw new Error("Session service database is not configured.");
    if (!health.sessionCreationConfigured) throw new Error("Session creation secret is not configured.");
  }

  async function createSession(adminToken, metadata) {
    const response = await fetch(`${API_ORIGIN}/api/sessions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ rulesVersion: CURRENT_VERSION, metadata })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || `Session creation failed (${response.status}).`);
    return payload;
  }

  async function loadSheetTemplate() {
    const response = await fetch("../index.html", { cache: "no-store" });
    if (!response.ok) throw new Error("The printable playtest sheet template could not be loaded.");
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const template = doc.querySelector(".playtest-sheet");
    if (!template) throw new Error("The printable sheet template is missing.");
    return template;
  }

  async function createQrCode(value) {
    if (!window.QRCode?.toDataURL) throw new Error("The QR renderer did not load.");
    return window.QRCode.toDataURL(value, { width: 260, margin: 1, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } });
  }

  function renderSheet(created, qrDataUrl, index) {
    const page = document.createElement("section");
    page.className = "batch-sheet-page";
    const sheet = sheetTemplate.cloneNode(true);
    const serial = sheet.querySelector("#sheet-serial");
    const qr = sheet.querySelector("#session-qr");
    const placeholder = sheet.querySelector("#qr-placeholder");
    const frame = sheet.querySelector("#qr-frame");
    if (!serial || !qr || !placeholder || !frame) throw new Error("The printable sheet no longer exposes its QR placeholders.");
    serial.textContent = created.sheetSerial;
    qr.src = qrDataUrl;
    qr.hidden = false;
    placeholder.hidden = true;
    frame.classList.add("has-code");
    sheet.querySelectorAll("[id]").forEach((node) => { node.id = `${node.id}-batch-${index + 1}`; });
    page.append(sheet);
    el.printBatch.append(page);
  }

  function renderSessionRow(created, index) {
    const row = document.createElement("article");
    row.className = "session-row";
    const safeSerial = escapeHtml(created.sheetSerial);
    const safeUrl = escapeHtml(created.hostUrl);
    row.innerHTML = `<div><strong>${safeSerial}</strong><small>Sheet ${index + 1} · ${CURRENT_VERSION}</small></div><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">Open host controls</a>`;
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
    anchor.href = url;
    anchor.download = `gauntlet-v063-playtest-batch-${slugify(batchMetadata.label || batchMetadata.batchId.slice(0, 8))}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function clearBatch() {
    if (!sessions.length || !window.confirm("Clear this rendered batch? This does not close its live sessions.")) return;
    sessions = [];
    batchMetadata = null;
    el.printBatch.replaceChildren();
    el.sessionList.replaceChildren();
    el.resultPanel.hidden = true;
  }

  function setBusy(busy) {
    el.generateButton.disabled = busy;
    el.sheetCount.disabled = busy;
    el.batchLabel.disabled = busy;
    el.adminToken.disabled = busy;
  }
  function setStatus(message, kind = "") { el.generationStatus.textContent = message; el.generationStatus.className = `form-status${kind ? ` ${kind}` : ""}`; }
  function slugify(value) { return String(value || "batch").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "batch"; }
  function escapeHtml(value) { return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
})();
