# Gauntlet Rules Assistant

A rules-only assistant for the canonical Gauntlet v0.6.0 playtest edition.

The public widget is framework-free and can be loaded on any Gauntlet browser page. It first tries the configured AI endpoint. If the endpoint is unavailable, it falls back to direct lexical retrieval from the canonical JSON and rulebook so players still receive relevant source passages without exposing an API key.

## Files

- `widget.js` — floating accessible chat panel and API/fallback orchestration.
- `widget.css` — isolated responsive widget styling.
- `local-search.js` — shared canonical-source loader, document builder, and lexical retrieval.
- `worker.js` — Cloudflare Worker backend using the OpenAI Responses API.
- `wrangler.toml` — Worker deployment configuration.
- `local-search.test.mjs` — focused retrieval regression tests.

## Source policy

The assistant reads the live canonical sources from `gauntlet.run`:

1. `releases/v0.6.0/Gauntlet_v0.6.0_Rulebook.md`
2. `releases/v0.6.0/Gauntlet_v0.6.0_Canonical_Data.json`
3. the governing source paths attached to canonical cards, Territories, factions, and components

The model is instructed to use only retrieved passages, apply specific-over-general precedence, distinguish explicit rules from interpretations, and state when the rules do not resolve a question.

Because the corpus is fetched at request time and cached by the runtime, approved source changes become available without rebuilding a vector store.

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

When the endpoint is not reachable, the widget automatically enters direct source-lookup mode.

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
```

Deploy:

```bash
wrangler deploy
```

Then set `window.GAUNTLET_RULES_ASSISTANT_ENDPOINT` to the deployed Worker URL and confirm that `ALLOWED_ORIGINS` includes the public site origin.

The OpenAI key belongs only in the Worker secret store. It must never be added to GitHub Pages, browser JavaScript, repository files, or GitHub Actions logs.

## Local validation

From the repository root:

```bash
node --test rules-assistant/local-search.test.mjs
python3 -m http.server 8000
```

Open `http://localhost:8000/`. With no backend configured, the widget should return canonical source excerpts. Run `wrangler dev` in a second terminal to exercise AI answers locally.

## Operational controls

For production, configure an OpenAI project budget and rate limits. The Worker also:

- allows requests only from configured origins;
- limits question and recent-history size;
- disables OpenAI response storage;
- sends a privacy-preserving safety identifier;
- returns only source IDs that were supplied to the model; and
- falls back to static source lookup when the AI service is unavailable.
