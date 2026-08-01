(() => {
  const EMAIL_STORAGE_KEY = "gauntlet-print-request-host-email-v1";
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const el = {};

  document.addEventListener("DOMContentLoaded", installPrintRequest);

  function installPrintRequest() {
    const printButton = document.getElementById("printDeckButton");
    const printSection = printButton?.closest("section");
    if (!printSection || document.getElementById("printRequestForm")) return;

    const panel = document.createElement("div");
    panel.className = "print-request-panel";
    panel.innerHTML = `
      <h4>Prepping for a Gauntlet game night?</h4>
      <p>Send your host this Deck and request printing. The email includes the exact exported JSON, ready to paste into this Deckbuilder's existing <strong>Import JSON</strong> box.</p>
      <form id="printRequestForm" class="print-request-form" novalidate>
        <div class="print-request-fields">
          <label>
            Your name
            <input id="printRequestPlayerName" type="text" maxlength="80" autocomplete="name" required placeholder="Name your host will recognize" />
          </label>
          <label>
            Host email address
            <input id="printRequestHostEmail" type="email" maxlength="254" autocomplete="email" required placeholder="host@example.com" />
          </label>
          <label class="full">
            Note for the host <small>optional</small>
            <textarea id="printRequestNote" rows="3" maxlength="500" placeholder="Pickup timing, print preferences, or anything else the host should know"></textarea>
          </label>
        </div>
        <div class="print-request-actions">
          <button id="openPrintRequestEmail" type="submit" disabled>Open email request</button>
          <button id="copyPrintRequest" type="button" class="secondary" disabled>Copy request</button>
        </div>
        <p class="print-request-help">Your Deck is not sent to Gauntlet. The tool prepares a draft in your email app; you review and send it yourself.</p>
        <p id="printRequestStatus" class="print-request-status" aria-live="polite"></p>
      </form>`;
    printSection.append(panel);

    for (const id of [
      "printRequestForm", "printRequestPlayerName", "printRequestHostEmail", "printRequestNote",
      "openPrintRequestEmail", "copyPrintRequest", "printRequestStatus"
    ]) el[id] = document.getElementById(id);

    restoreHostEmail();
    el.printRequestForm.addEventListener("submit", openEmailRequest);
    el.copyPrintRequest.addEventListener("click", copyRequest);
    el.printRequestPlayerName.addEventListener("input", syncControls);
    el.printRequestHostEmail.addEventListener("input", syncControls);

    const validity = document.getElementById("validityText");
    if (validity) new MutationObserver(syncControls).observe(validity, { childList: true, subtree: true, characterData: true });
    for (const id of ["factionSelect", "leaderSelect", "deckName", "cardCount", "territoryMetricCount"]) {
      const target = document.getElementById(id);
      target?.addEventListener("change", syncControls);
      target?.addEventListener("input", syncControls);
    }
    syncControls();
  }

  function syncControls() {
    if (!el.openPrintRequestEmail) return;
    const validDeck = deckIsValid();
    const playerReady = Boolean(el.printRequestPlayerName.value.trim());
    const emailReady = EMAIL_PATTERN.test(el.printRequestHostEmail.value.trim());
    el.openPrintRequestEmail.disabled = !(validDeck && playerReady && emailReady);
    el.copyPrintRequest.disabled = !validDeck;

    if (!validDeck) setStatus("Complete and validate the Deck before requesting printing.");
    else if (el.printRequestHostEmail.value && !emailReady) setStatus("Enter a valid host email address.", "error");
    else setStatus("");
  }

  function deckIsValid() {
    try { return Boolean(validateDeck().valid); }
    catch { return document.getElementById("validityText")?.textContent?.trim() === "Valid"; }
  }

  function buildRequest() {
    const deck = currentDeckData();
    const validation = validateDeck();
    const factionName = document.getElementById("factionSelect")?.selectedOptions?.[0]?.textContent?.replace(/\s+—.*$/, "").trim() || deck.factionId;
    const leaderName = document.getElementById("leaderSelect")?.selectedOptions?.[0]?.textContent?.trim() || deck.leaderId;
    const playerName = el.printRequestPlayerName.value.trim();
    const note = el.printRequestNote.value.trim();
    const territories = Array.isArray(deck.territories) ? deck.territories.map(item => item.name || item.id).filter(Boolean) : [];
    const json = JSON.stringify(deck, null, 2);
    const subject = `Gauntlet Deck printing request — ${playerName} — ${deck.name}`;
    const lines = [
      "Gauntlet Deck Printing Request",
      "",
      `Player: ${playerName}`,
      `Deck: ${deck.name}`,
      `Faction: ${factionName}`,
      `Leader: ${leaderName}`,
      `Playable cards: ${validation.cardCount}`,
      `Deck value: ${validation.pointTotal}/60`,
      `Territories: ${territories.length ? territories.join(" → ") : "None selected"}`,
      note ? `Note: ${note}` : "",
      "",
      "HOST INSTRUCTIONS",
      "1. Copy the JSON between the BEGIN and END markers.",
      "2. Open https://gauntlet.run/deckbuilder/",
      "3. Expand Advanced transfer and bulk printing.",
      "4. Paste the JSON into Import JSON and select Import JSON.",
      "5. Review the loaded Deck, then print the package.",
      "",
      "----- BEGIN GAUNTLET DECK JSON -----",
      json,
      "----- END GAUNTLET DECK JSON -----"
    ].filter(line => line !== "");
    return { deck, playerName, subject, body: lines.join("\n"), json };
  }

  function openEmailRequest(event) {
    event.preventDefault();
    syncControls();
    if (el.openPrintRequestEmail.disabled) return;

    const hostEmail = el.printRequestHostEmail.value.trim();
    const request = buildRequest();
    rememberHostEmail(hostEmail);
    const mailto = `mailto:${encodeURIComponent(hostEmail)}?subject=${encodeURIComponent(request.subject)}&body=${encodeURIComponent(request.body)}`;
    setStatus("Opening your email app. Review the draft before sending.", "success");
    window.location.href = mailto;
  }

  async function copyRequest() {
    if (!deckIsValid()) {
      setStatus("Complete and validate the Deck before copying a request.", "error");
      return;
    }
    const request = buildRequest();
    try {
      await navigator.clipboard.writeText(`${request.subject}\n\n${request.body}`);
      setStatus("Printing request copied. Paste it into an email or message to your host.", "success");
    } catch {
      window.prompt("Copy this printing request:", `${request.subject}\n\n${request.body}`);
    }
  }

  function restoreHostEmail() {
    try { el.printRequestHostEmail.value = localStorage.getItem(EMAIL_STORAGE_KEY) || ""; }
    catch { /* The form works without stored preferences. */ }
  }

  function rememberHostEmail(email) {
    try { localStorage.setItem(EMAIL_STORAGE_KEY, email); }
    catch { /* The current request still opens. */ }
  }

  function setStatus(message, kind = "") {
    el.printRequestStatus.textContent = message;
    el.printRequestStatus.className = `print-request-status${kind ? ` ${kind}` : ""}`;
  }
})();
