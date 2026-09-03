# Card Authority CI

Status: canonical post-Stage-6 contract.

Gauntlet's physical-card CI validates the architecture that exists now, not the migration stages that produced it.

## Contract

The card authority system has four permanent responsibilities:

1. `game-data/current-game.json` is the sole live gameplay and visual authority for current physical faces.
2. `card-design/face-authority.mjs` derives the complete canonical physical-face catalog from that authority.
3. `card-design/face-spec.mjs` resolves every canonical face into one immutable, production-ready FaceSpec.
4. Every live consumer requests physical faces through `card-design/face-render.html?id=<canonical-face-id>`.

The CI does not certify implementation details such as helper names, renderer-family source files, historical version labels, or migration-stage structure.

## Workflow

`.github/workflows/card-authority.yml` owns the card authority contract.

### Authority model

Runs on every pull request and every push to `main`.

It validates:

- the shared current-game schema and rule-fact contract;
- unique and resolvable card-like component identity;
- valid component family/back-policy relationships;
- an independently derived expected canonical face-ID set;
- exact catalog and FaceSpec coverage for that set;
- template registry and FaceSpec-template contract coverage;
- reciprocal intrinsic front/reverse pairing;
- current-game provenance on every FaceSpec;
- production readiness for every canonical face;
- final explicit artwork composition for every cropped face;
- canonical identity-only routing by every declared live consumer.

### Render every canonical face

Runs whenever a pull request changes a card-authority or rendering input, and on every push to `main`.

It opens every canonical face through the public renderer in Chromium and verifies:

- exactly one physical face is mounted;
- the renderer reports the requested face ID, template, and orientation;
- gameplay and visual provenance remain current-game authority;
- CSS dimensions match the FaceSpec physical surface;
- production readiness is true;
- no fit warning or production placeholder appears;
- visible images finish loading;
- canonical crop/full-face artwork resolves;
- production fonts finish loading.

The report is uploaded as `card-authority-render-report`. Failure screenshots are diagnostic only; the structured report is the authority.

## Boundaries

Reference-card wording audits, release materialization, TTS packaging, print duplex behavior, mobile layout stability, and historical provenance are separate contracts. They may consume canonical faces, but they do not define physical-face authority.

Legacy renderer URLs are compatibility edges only. They are not part of the authority model and must never regain rendering behavior.

## Local commands

```sh
npm run card-authority:check
npm run card-authority:render
```

The first command is semantic and does not require a browser. The second requires Playwright Chromium.
