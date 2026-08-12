# Gauntlet Release Integrity Standard

**Status:** Active release-engineering standard  
**Established:** August 12, 2026

This document defines what it means for a Gauntlet release to become **current**. A release is not complete merely because its immutable package is internally valid. The repository, public site, browser tools, digital rules, Rules Arbiter, and formal playtest infrastructure must all agree on the same current release.

## Single current-release authority

`config/current-release.json` is the machine-readable authority for the current published release. It records the version, release name, publication date, previous version, canonical artifact paths, playtest serial prefix, and public current routes.

A publication may not be called complete until `scripts/validate-current-release-integrity.mjs` passes against that record.

Version-specific immutable packages under `releases/` remain historical authorities for their own versions. They are not rewritten when a later release becomes current.

## Current-facing surface inventory

The current-release integrity gate owns, at minimum:

- repository `README.md`;
- `docs/README.md` and unversioned active status/roadmap documents;
- public homepage and six faction pages;
- Start, Rulebook, Deckbuilder, and Card Reference;
- current versioned browser routes and their handoff behavior;
- canonical browser data and starter Decks;
- Rules Arbiter current widget/Worker routing;
- `src/content/current.ts`;
- formal playtest sheet, batch generator, host event creation, session UI, and session service;
- current print/download route;
- release/package validation scripts and CI.

Adding a new current-facing surface requires adding it to this inventory and to the automated validator in the same change.

## Production UI ownership

Development/candidate pages are validation surfaces, not automatically production interfaces.

For the current release, the established polished root applications own the production UX:

- `/start/`
- `/rulebook/`
- `/deckbuilder/`
- `/card-reference/`

The current versioned routes hand off to those production applications. A release promotion must not replace them with a mechanically complete but visually or functionally inferior candidate implementation.

Any intentional production UI replacement requires explicit review of desktop/mobile behavior and parity with the capabilities of the outgoing production UI.

## Semantic integrity

Current identity alone is insufficient. Current-facing explanatory text must also reflect the current rules.

The integrity gate should include high-value semantic invariants that are easy to regress during cutover. For v0.6.3 these include, among others:

- opening draw four, discard one, keep three;
- Territory arrangement after the opening Hand/discard is known;
- Advance / Hold / Fall Back movement terminology;
- Defensive Edge and Tiebreak Roll tie procedure;
- independent final-Territory capture and Last Stand normal victory routes;
- contiguous Front Line Capture.

Future releases should update these checks to the rules whose stale presentation would materially misteach the game.

## Formal playtest integrity

Formal playtest data must never silently carry an obsolete rules version.

New playtest sessions must be created under the current version and current serial prefix. Historical session records remain readable and retain their original version identity. The production playtest service therefore separates historical compatibility from current creation.

The current playtest sheet, batch generator, event creator, session UI, Worker health response, and stored session metadata must agree with `config/current-release.json`.

A current-release cutover is incomplete if the formal playtest pipeline is still creating records for the previous release.

## Historical carve-outs

Old version strings are expected in:

- immutable `releases/<old-version>/` packages;
- explicitly versioned historical validators and migrations;
- completed release ledgers and pre-publication closeout records;
- compatibility code required to read historical sessions or artifacts.

Historical material must be clearly identified as historical or superseded when it lives outside an immutable version directory. It must not present itself as the current authority.

## Required release sequence

1. Finish and validate the immutable candidate package.
2. Set the new release in `config/current-release.json` as part of the promotion change.
3. Promote current production data/routing without replacing polished UI implementations unless that replacement was explicitly reviewed.
4. Update every current-facing repository/document/playtest declaration.
5. Run version-specific release validation.
6. Run `npm run test:release-integrity`.
7. Run desktop/mobile production UI journeys.
8. Run the full repository test suite.
9. Review the diff specifically for unintended changes to historical packages.
10. Only then mark the release PR merge-ready.
11. After merge, verify the live public routes and service health before announcing the release.

## CI contract

`.github/workflows/current-release-integrity.yml` runs independently of version-specific release workflows. Its purpose is deliberately redundant: a version-specific validator can prove that one release package is correct while this gate proves that the repository and product agree about which release is current.

A green release-specific matrix is not sufficient without a green Current Release Integrity check.
