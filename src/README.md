# Gauntlet Digital Prototype Source

This directory contains the earliest digital rules-engine scaffolding.

The initial priority is pure, testable game-state code before UI:

1. Types for authoritative and hidden-information state.
2. Setup validation.
3. Game initialization.
4. Public/private view generation.
5. Turn and battle reducers.
6. UI and multiplayer later.

## Current modules

- `types/` defines the authoritative state and public/private views.
- `state/` contains setup validation, initialization, examples, and view builders.

## Repository note

This source folder is intentionally framework-neutral for now. A React/Next frontend can consume these modules later without forcing the rules engine to depend on UI code.
