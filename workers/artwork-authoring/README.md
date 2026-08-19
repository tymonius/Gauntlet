# Gauntlet artwork authoring Worker

This Cloudflare Worker makes the public `/card-design/` compositor capable of saving canonical artwork compositions without exposing repository credentials to the browser.

## How it works

1. The public compositor intercepts its normal `POST /api/art-direction` save request.
2. If no authoring session exists, it opens GitHub sign-in in a popup.
3. GitHub returns to this Worker through the GitHub App OAuth callback.
4. The Worker verifies the signed-in GitHub login is `tymonius` and returns an encrypted, short-lived authoring session to the browser. The GitHub user token itself is never exposed to page JavaScript.
5. Saves update `tts/artwork-direction-overrides.js` on `artwork/compositor-authoring` and create or reuse one pull request against `main`.
6. Merging that PR publishes the composition to every surface that uses the shared artwork crop pipeline.

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
node --check ../../card-design/artwork-authoring-client.js
```

## Publication boundary

`Save position` on the public page saves to the authoring PR, not directly to `main`. The composition becomes canonical/public when that PR is merged. The local `npm run artwork:compositor` workflow still writes the working-tree override file directly for local development.
