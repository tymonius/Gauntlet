# Live Conversation Tail Policy

A delayed ChatGPT data export is an immutable historical baseline, not a current-state guarantee. The conversation audit therefore uses two evidence layers:

1. **Raw export baseline** — the complete exported corpus through its verified maximum message timestamp.
2. **Append-only live tail** — exact Gauntlet user turns captured after live-tail activation and later reconciled against the next raw export.

## Activation

Live-tail capture began on **2026-07-30** during the conversation-audit correction discussion. The initial file captures the exact user turns visible in that conversation, including the Asset Bank correction and the requirement that the audit be complete and current.

## Capture requirements

For every Gauntlet-related user turn after activation:

- preserve the exact user text without normalization;
- assign a stable `GNT-LIVE-*` identifier and observed order;
- record a SHA-256 hash of the UTF-8 text;
- preserve the immediately preceding assistant proposal when a short approval, rejection, or correction cannot be interpreted alone;
- mark the row `unmatched` until reconciled with a raw export conversation and message identifier;
- never silently edit an existing row; append a correction row instead.

Until the next export arrives, Gauntlet design decisions should remain in the same project conversation wherever practical. A turn created in another conversation must also be appended to the live tail before it may be relied on as audit evidence.

## Reconciliation

When a new export arrives:

1. determine the export's maximum message timestamp;
2. match live-tail rows to raw turns using exact text, hash, order, timestamps, and conversation context;
3. replace temporary conversation references with exported conversation and message IDs;
4. deduplicate overlap rather than counting the same turn twice;
5. identify any time gap between the raw baseline and live-tail activation;
6. block certification if any Gauntlet conversation or live-tail row remains unmatched or any gap remains unexplained.

The export may be several days old when delivered. That does not create staleness if the raw corpus overlaps the live tail and every later turn has been captured. Certification is based on **continuous evidence coverage**, not the download date.

## Authority

A live-tail row is exact first-party conversation evidence, but it remains a provisional audit input until reviewed in context and linked to a normalized `GNT-CONV-*` thread. It cannot create a formal `GNT-DEC-*` record merely by existing in the file.
