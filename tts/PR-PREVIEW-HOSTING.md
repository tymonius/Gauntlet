# TTS PR preview hosting

This branch uses the TTS card-asset workflow's pull-request preview publisher. Successful PR builds publish staged network assets to an ephemeral GitHub prerelease and emit a Review Scaffold rewritten to those preview URLs. This keeps manual TTS QA independent of the production v0.7.0 asset host.
