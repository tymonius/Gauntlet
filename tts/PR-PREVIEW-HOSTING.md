# TTS PR preview hosting

This branch uses the TTS card-asset workflow's pull-request preview publisher. Successful PR builds publish staged network assets to an ephemeral GitHub prerelease and emit a Review Scaffold rewritten to those preview URLs. This keeps manual TTS QA independent of the production v0.7.0 asset host.

Each successful PR head uses a commit-scoped preview tag (`tts-<version>-qa-pr-<number>-<short-sha>`). The resulting asset URLs are immutable for that build. Tabletop Simulator caches custom images by URL, so reusing one mutable PR-preview URL can make a newly generated save display stale artwork even after the release asset itself has been replaced.
