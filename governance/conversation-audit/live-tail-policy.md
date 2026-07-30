# Live Conversation Tail Policy

A delayed ChatGPT data export is an immutable historical baseline, not a current-state guarantee. The conversation audit therefore uses two evidence layers:

1. **Raw export baseline** — the complete exported corpus through its verified maximum message timestamp.
2. **Append-only live tail** — exact Gauntlet-project user turns captured after live-tail activation and later reconciled against the next raw export.

## Activation

Live-tail capture began on **2026-07-30** during the conversation-audit correction discussion. The initial file captures the exact user turns visible in that conversation, including the Asset Bank correction and the requirement that the audit be complete and current.

## Project scope and concurrent conversations

The audit boundary is the entire **Gauntlet ChatGPT project**, not one conversation. Multiple concurrent project conversations are expected and do not constitute a coverage failure.

Each conversation represented in the live tail must have:

- its own stable temporary `conversation_ref` until raw export identifiers are available;
- its own independent `observed_order` sequence beginning at one;
- enough title, topic, or context information to match it to the exported conversation later.

Keeping every Gauntlet conversation inside the project materially improves discovery and reconciliation, but project membership alone is not proof that every turn was captured live. Certification still requires a raw-export inventory of every conversation assigned to the project, plus content-based discovery for any Gauntlet conversation that was accidentally created outside it.

## Capture requirements

For every Gauntlet-related user turn after activation:

- preserve the exact user text without normalization;
- assign a stable `GNT-LIVE-*` identifier and observed order within its conversation;
- record a SHA-256 hash of the UTF-8 text;
- preserve the immediately preceding assistant proposal when a short approval, rejection, or correction cannot be interpreted alone;
- mark the row `unmatched` until reconciled with a raw export conversation and message identifier;
- never silently edit an existing row; append a correction row instead.

Live capture may occur independently in each active Gauntlet-project conversation. A conversation need not be moved or consolidated merely for the audit. A turn may not be relied on as certified evidence until it appears in the raw export or has been independently preserved and reviewed with its necessary context.

## Reconciliation

When a new export arrives:

1. determine the export's maximum message timestamp;
2. enumerate every conversation assigned to the Gauntlet project;
3. also search all exported conversations by title and content for Gauntlet material outside the project;
4. match live-tail rows to raw turns using exact text, hash, order, timestamps, and conversation context;
5. replace temporary conversation references with exported conversation and message IDs;
6. deduplicate overlap rather than counting the same turn twice;
7. identify any time or conversation gap between the raw baseline and live-tail coverage;
8. block certification if any Gauntlet conversation or live-tail row remains unmatched or any gap remains unexplained.

The export may be several days old when delivered. That does not create staleness if the raw corpus overlaps the live tail and every later Gauntlet-project conversation is accounted for. Certification is based on **continuous evidence coverage across the whole project**, not the download date or use of a single chat.

## Authority

A live-tail row is exact first-party conversation evidence, but it remains a provisional audit input until reviewed in context and linked to a normalized `GNT-CONV-*` thread. It cannot create a formal `GNT-DEC-*` record merely by existing in the file.