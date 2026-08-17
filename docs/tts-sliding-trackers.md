# TTS sliding tracker assembly

Gauntlet's sliding trackers use the production supplemental-card render as the registration authority.

The TTS exporter does not duplicate the printed tracker scale or maintain faction-specific snap coordinates. For each ready tracker it screenshots the matching `.sliding-tracker-card` on the production `/card-design/` surface and measures the rendered `.tracker-registration-line` elements. The distance from the physical card bottom to each line becomes the local slide offset for that value; value 0 is always the fully covered position at offset 0.

The current production components are:

| TTS component | Production component | Cover |
| --- | --- | --- |
| Military Command Tracker | `command-tracker` | selected Military Leader |
| Diplomat Influence Tracker | `influence-tracker` | selected Diplomat Leader |
| Intelligence Intel Tracker | `intel-tracker` | Operations Reference Card |
| Intelligence Operation Progress Tracker | `operation-progress-tracker` | Mission Reference Card |
| Inquisition Conviction Tracker | `conviction-tracker` | selected Inquisition Leader |

Rules maxima and physical tracker capacity remain deliberately separate. For example, Command currently has a rules maximum of 2 while the production tracker has physical headroom through 4; Intel and Operation Progress are rules-uncapped but have finite practical printed scales. TTS follows the rendered physical component rather than converting a rules maximum into tracker geometry.

In the save, each tracker is a non-stackable `Custom_Tile` using its production raster as `ImageURL` and the starter's resolved standard card back as `ImageSecondaryURL`. Its measured registrations are written as object-attached snap points. Each snap set has a unique tag, and only the declared physical cover card receives that tag. This keeps the interaction physical and manual: dragging the cover card to a registration snaps it into place, while no Lua rule changes the resource automatically.

The two Intelligence trackers retain the shared `intelligence-progress` assembly identifier, distinct layers, distinct snap tags, and distinct reference-card covers. The generic representation therefore supports the intended stacked physical arrangement without Intelligence-specific gameplay scripting.
