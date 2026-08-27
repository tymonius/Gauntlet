# Gauntlet artwork authoring Worker

This Cloudflare Worker makes the public `/card-design/` compositor capable of saving artwork-composition batches without exposing repository credentials to the browser.

## How it works

1. The public compositor intercepts its normal `POST /api/art-direction` save request.
2. If no authoring session exists, it opens GitHub sign-in in a popup.
3. GitHub returns to this Worker through the GitHub App OAuth callback.
4. The Worker verifies the signed-in GitHub login is `tymonius` and returns an encrypted, short-lived authoring session to the browser. The GitHub user token itself is never exposed to page JavaScript.
5. Each **Save position** updates `game-data/current-game.json` (`artDirection`) on `artwork/compositor-authoring` and creates or reuses one pull request against `main`.
6. Additional saved cards and Territories keep accumulating in that same open PR.
7. When the batch is ready, **Publish batch** in the compositor calls the Worker's authenticated publication endpoint. The Worker merges the active composition PR into `main`, then resets `artwork/compositor-authoring` to the merge commit so the next batch starts cleanly.
8. `game-data/current-game.mjs` loads the canonical `artDirection` map directly from the complete authority into `currentGame.artDirection`; current production card/Territory renderers consume the resolved map, so the published batch propagates to Card Design, Card Reference, Deckbuilder preview, and production printing through the shared render pipeline.

The browser session is kept in `sessionStorage`; closing the browser session requires GitHub sign-in again.

## GitHub App setup

Create a GitHub App owned by `tymonius` and install it on the `Gauntlet` repository only.

Use:

- Homepage URL: `https://gauntlet.run/card-design/`
- Callback URL: `https://gauntlet-artwork-authoring.tymon-scott.workers.dev/auth/callback`
- Webhooks: disabled/not required
- Repository permissions:
  - Contents: Read and write
  - Pull requests: Read and write
  - Metadata: Read-only (implicit)

The Worker uses the GitHub App's web application OAuth flow and acts only on behalf of the explicitly authorized `tymonius` account. GitHub Apps are intentionally used here so repository access can be limited to this repo and these permissions.

The publication endpoint uses GitHub's pull-request merge and Git-reference update APIs. Both are covered by the existing Contents: Read and write permission; no additional App permission or secret is required.

## Required GitHub Actions secrets

The deployment workflow copies these production secrets into Cloudflare Worker secrets:

- `ARTWORK_GITHUB_CLIENT_ID` — GitHub App client ID
- `ARTWORK_GITHUB_CLIENT_SECRET` — GitHub App client secret
- `ARTWORK_SESSION_SECRET` — random high-entropy secret used to sign OAuth state and encrypt short-lived browser sessions
- existing `CLOUDFLARE_API_TOKEN`
- existing `CLOUDFLARE_ACCOUNT_ID`

A session secret can be generated locally with, for example:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Do not commit any of these values.

## Local validation

```sh
cd workers/artwork-authoring
npm test
node --check src/index.js
node --check src/index-publish.js
node --check ../../card-design/artwork-authoring-client.js
```

## Publication boundary

**Save position** adds or updates a composition in the current authoring PR. **Publish batch** merges that PR into `main` from the compositor page. Only that publication action makes the batch canonical for Card Reference, Deckbuilder, printing, and the other shared renderers. The merge of `game-data/current-game.json` (`artDirection`) also triggers the current live-publication workflow, so the canonical web surfaces rebuild from the same source. For local fallback authoring, `node scripts/card-design-server.mjs` still writes the working-tree current-game authority directly.
