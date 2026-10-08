# Gauntlet Rules Assistant

The unversioned public Rules Arbiter serves the canonical Gauntlet v0.7.2 release. Explicitly versioned older routes remain available for historical and compatibility purposes.

The public widget is framework-free and can be loaded on any Gauntlet browser page. It first tries the configured AI endpoint. The unversioned Worker routes current requests to the v0.7.2 implementation, and browser-side direct source lookup uses the frozen v0.7.2 release corpus when the service is unavailable. The dedicated browser shell source lives under `apps/rules-arbiter/`; widget presentation source lives under `apps/rules-assistant-widget/`. Publication materializes those sources at the stable `/rules-arbiter/` and `/rules-assistant/` URLs.

When a Cloudflare D1 database is attached, the Worker also records live website questions and answers, accepts optional player feedback, and exposes a token-protected review dashboard. The database starts empty. It does **not** import development chats, historical conversations, or curated regression questions.

## Files

- `../apps/rules-assistant-widget/widget.js` — floating accessible chat panel, anonymous session grouping, feedback controls, and API/fallback orchestration.
- `../apps/rules-assistant-widget/widget.css` — isolated responsive widget styling.
- `../apps/rules-assistant-widget/feedback.css`, answer-presentation assets, and mobile overrides — browser presentation support materialized with the widget.
- `local-search.js` — generic document builder, retrieval, and lexical-fallback support shared by current and versioned corpora.
- `v072-release-corpus.js` — current v0.7.2 frozen-release corpus loader and release/deployment validation.
- `worker-entry.js` — routes the unversioned public Rules Arbiter to the current v0.7.2 Worker while preserving explicitly versioned older routes.
- `worker-v072.js` — current v0.7.2 Rules Arbiter Worker.
- `../legacy/rules-assistant/v070/` — historical v0.7.0 Worker/corpus source; the current `worker-entry.js` still serves its stable versioned compatibility route.
- `../legacy/rules-assistant/v071/` — historical v071 Worker and frozen release corpus loader; `worker-entry.js` preserves the versioned route, while review/refinement tooling and regression tests read the archived implementation explicitly.
- `../legacy/rules-assistant/v063/` — historical v063 Worker and certified public-corpus loader; `worker-entry.js` preserves the versioned compatibility route. <!-- DOC-HISTORICAL -->
- `worker-v061.js`, v0.6.2-specific implementations, and residual v063 helper/candidate files — remaining versioned material still awaiting mechanically verified classification. <!-- DOC-HISTORICAL -->
- `../tools/rules-assistant/admin/` — private review-dashboard composition, review intelligence, incremental export/checkpoint handlers, and related admin tooling served by the Worker.
- `../tools/rules-assistant/refinement/` — deterministic triage, scaffold, snapshot, current-validity, and resolution-ledger tooling used by admin refinement workflows and repository scripts.
- `../tools/rules-assistant/qa/evals/` — maintained Rules Arbiter benchmark, regression-replay, player-language, clarification, and correction fixtures consumed by QA scripts/workflows/tests.
- `../artifacts/rules-qa/audits/` — retained historical/manual QA audit reports; evidence, not executable fixture authority.
- `migrations/` — D1 schema migrations.
- `wrangler.toml` — Worker deployment configuration.
- focused Vitest regression suites — current and version-specific behavior checks.

## Source policy

For the unversioned public v0.7.2 Rules Arbiter, the governing live corpus is the frozen v0.7.2 release package selected by `config/release-lifecycle.json`, including:

1. `releases/v0.7.2/Gauntlet_v0.7.2_Complete_Rules.md`
2. `releases/v0.7.2/Gauntlet_v0.7.2_Canonical_Data.json`
3. `releases/v0.7.2/Gauntlet_v0.7.2_Manifest.json` and matching source-provenance binding

The model is instructed to use only retrieved passages, apply specific-over-general precedence, distinguish explicit rules from interpretations, and state when the rules do not resolve a question.

Explicit v0.6.1 and v0.6.2 routes intentionally continue to use their matching historical sources. The generic `local-search.js` retains older compatibility defaults; maintained callers must use an explicitly versioned corpus loader rather than relying on those defaults.

## Interaction data

Only live questions submitted through the website AI endpoint are stored. Each successful record includes:

- the player's exact question and the answer returned;
- the rules version, ruling status, confidence, answer mode, and model;
- the exact source citations and excerpts returned with the answer;
- an anonymous browser-tab session ID for grouping follow-up questions;
- optional `Yes`, `Unclear`, or `Incorrect` player feedback;
- review status, issue classifications, notes, resolution, and review history.

The system does not store names, email addresses, raw IP addresses, or user-agent strings. The existing privacy-preserving OpenAI safety identifier is not written to D1.

The curated Rules Assistant tests remain separate from live interaction analytics.

## Static-site integration

Include the stylesheet and module on a page:

```html
<link rel="stylesheet" href="/rules-assistant/widget.css">
<script type="module" src="/rules-assistant/widget.js"></script>
```

The widget defaults to `/api/rules`. To use a separately hosted endpoint, set this before loading the module:

```html
<script>
  window.GAUNTLET_RULES_ASSISTANT_ENDPOINT =
    "https://gauntlet-rules-assistant.example.workers.dev/api/rules";
</script>
```

The corresponding feedback endpoint is inferred automatically by replacing `/api/rules` with `/api/feedback`. It can be overridden explicitly:

```html
<script>
  window.GAUNTLET_RULES_FEEDBACK_ENDPOINT =
    "https://gauntlet-rules-assistant.example.workers.dev/api/feedback";
</script>
```

When the AI endpoint is not reachable, the widget can enter direct source-lookup mode against the current v0.7.2 release corpus. Local source-lookup answers are source-only rather than interpreted rulings, and they are not centrally logged because no server request succeeds.

## Deploying the backend

Install Wrangler and authenticate with Cloudflare:

```bash
npm install --global wrangler
wrangler login
```

From this directory, set required secrets:

```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put SAFETY_ID_SALT
wrangler secret put ADMIN_TOKEN
```

`ADMIN_TOKEN` protects every review and export API. Use a long random value and do not put it in repository files. The dashboard stores it only in the current browser tab's `sessionStorage`.

### Create and attach D1

Create the database:

```bash
wrangler d1 create gauntlet-rules-assistant
```

Cloudflare will return a database ID. Add the following block to `wrangler.toml` using that real ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "gauntlet-rules-assistant"
database_id = "YOUR_REAL_D1_DATABASE_ID"
migrations_dir = "migrations"
```

Apply the schema:

```bash
wrangler d1 migrations apply gauntlet-rules-assistant --remote
```

The migration creates empty tables. There is intentionally no seed or import step for old Gauntlet chats.

Deploy:

```bash
wrangler deploy
```

Then set `window.GAUNTLET_RULES_ASSISTANT_ENDPOINT` to the deployed Worker URL and confirm that `ALLOWED_ORIGINS` includes the public site origin.

The OpenAI key, admin token, and D1 identifiers belong only in the Worker/Cloudflare configuration. They must never be added to GitHub Pages browser JavaScript, public repository files, or GitHub Actions logs.

## Review dashboard

Open the deployed Worker URL at:

```text
https://YOUR-WORKER.workers.dev/admin
```

Enter `ADMIN_TOKEN` to view:

- totals for all, unreviewed, negative-feedback, unresolved, and low-confidence answers;
- filters for question text, review status, feedback, ruling type, and confidence;
- full question/answer records, exact sources, and session follow-ups;
- classifications for incorrect answers, missing or ambiguous rules, terminology, uncovered interactions, unclear explanations, retrieval failures, and duplicates;
- review notes and resolutions;
- JSON and CSV exports.

The dashboard shell is publicly retrievable, but no interaction data or mutation endpoint is accessible without the admin bearer token. For a larger reviewer group, Cloudflare Access can later be placed in front of `/admin` and `/api/admin/*` as an additional identity layer.

## Local validation

From the repository root:

```bash
npx vitest run rules-assistant/*.test.mjs apps/rules-assistant-widget/*.test.mjs
node scripts/stage-pages-publication.mjs /tmp/gauntlet-pages
python3 -m http.server 8000 --directory /tmp/gauntlet-pages
```

Open `http://localhost:8000/`. The staged preview preserves the production source-to-URL mappings. With no backend configured, direct source lookup should use the release-selected rules sources. Run `wrangler dev` in a second terminal to exercise the Worker behavior locally.

For local D1 testing after the binding is configured:

```bash
wrangler d1 migrations apply gauntlet-rules-assistant --local
wrangler dev
```

## Operational controls

For production, configure an OpenAI project budget and rate limits. The Worker also:

- allows public requests only from configured origins;
- limits question, recent-history, feedback, and review-field sizes;
- disables OpenAI response storage;
- sends a privacy-preserving safety identifier;
- returns only source IDs that were supplied to the model;
- continues answering when D1 logging is unavailable;
- requires a secret bearer token for all review and export APIs; and
- preserves explicitly versioned historical routes alongside the current unversioned v0.7.2 route.
