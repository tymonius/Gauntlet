# Deckbuilder Leader print readiness regression

The shared component print renderer requests one Leader card at a time. The v0.6.4 Leader-copy overlay previously waited for all twelve hidden Leader specimens before marking copy ready, so a single Leader print frame could fail even when its requested Leader had already rendered.

Print-mode Leader copy now targets only the requested `kind=leader&id=<faction>-<leader>` specimen. The normal Card Design catalog continues to wait for and standardize the full twelve-Leader set.
