# Gauntlet v0.6.1 Physical Verification Checklist

**Release gate:** Required before publication  
**Status:** Not yet completed

This is the final human verification for the coded formal-playtest workflow. Automated tests already cover the same session lifecycle in memory; this check confirms that the real printed sheet, phone camera, public site, deployed Workers, D1 database, and private host controls work together.

## Preconditions

Confirm all of the following before printing:

- the production Rules Arbiter health endpoint reports `ok: true` and `version: v0.6.1`;
- the production playtest-session health endpoint reports `ok: true`, `version: v0.6.1`, an available database binding, and configured session creation;
- `https://gauntlet.run/playtest/batch/` loads without browser errors;
- the facilitator creation key is available privately;
- the v0.6.1 printable playtest sheet renders at one Letter page; and
- the phone used for testing can reach `gauntlet.run` without a development proxy or local-network dependency.

## Generate and print

1. Open `https://gauntlet.run/playtest/batch/`.
2. Generate a batch containing **one** sheet and give it a clearly disposable label such as `v061-physical-gate`.
3. Download the private host manifest immediately.
4. Confirm the printed-sheet preview contains:
   - one unique QR code;
   - one readable `G061-...` sheet serial;
   - no host key or private host URL; and
   - the complete questionnaire on one side of Letter paper.
5. Print at **Actual Size / 100%**, with headers and footers disabled.
6. Confirm the QR code is not clipped, blurred, or placed across a fold or cut line.

## Public join lifecycle

1. Scan the printed QR code using a phone camera.
2. Confirm it opens the production `gauntlet.run/playtest/session/` page over HTTPS.
3. Join as a player using a temporary name.
4. Confirm the page displays the same sheet serial as the paper sheet.
5. Join the same session from a second browser or private window.
6. Confirm both participants are counted in the same session rather than creating separate sessions.
7. Record a game-start event and one short factual note.
8. Refresh the page and confirm the session and recorded state remain available.

## Rules Arbiter linkage

1. From the linked session, ask a simple v0.6.1 rules question with an explicit answer, for example:

   > Where does a Gambit normally go during the Aftermath of the battle?

2. Confirm the answer:
   - identifies v0.6.1;
   - answers **Graveyard**;
   - cites the governing rulebook section;
   - labels the ruling **Explicit**; and
   - does not invent an unsupported precedence rule.
3. Confirm the session's Arbiter-question count increases.
4. Retain the interaction identifier or screenshot for the verification record.

## Close and retire

1. Open the private host URL from the downloaded manifest.
2. Confirm the host view exposes the close-and-retire control.
3. Close the session.
4. Re-scan the printed QR code.
5. Confirm the closed session cannot accept a new participant or new playtest event.
6. Attempt to record another note from a browser that had already joined.
7. Confirm the event is rejected while the closed session record remains readable.
8. Confirm the host key never appeared on the printed sheet or public participant page.

## Physical inspection

Confirm:

- the QR scans under ordinary indoor lighting without manual zoom;
- the serial is readable without magnification;
- all questionnaire fields remain writable at 100% scale;
- no text is clipped at printer margins;
- the sheet can be reconciled to its digital session using the serial alone; and
- the private manifest can be stored separately from player-facing sheets.

## Verification record

Complete this block after the test:

```text
Date:
Tester:
Device / browser:
Printer / print settings:
Sheet serial:
Batch label:
Rules Arbiter interaction ID:
QR scan passed: yes / no
Second participant joined same session: yes / no
Event persistence passed: yes / no
Arbiter linkage passed: yes / no
Session closure passed: yes / no
Retired-code rejection passed: yes / no
Physical legibility passed: yes / no
Defects found:
Corrective commit or issue:
Final result: PASS / FAIL
```

After a clean pass, update `Gauntlet_v0.6.1_Manifest.json`:

- set `validation.physical_qr_session_test_passed` to `true`;
- remove the physical test from `remaining_release_work`; and
- preserve this completed record with the release evidence.

Do not set the release to ready for publication until production deployment and health verification have also passed.
