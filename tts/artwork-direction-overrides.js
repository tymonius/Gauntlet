// Optional per-card art direction for cases where automatic focal cropping is not
// the desired composition. Values may use 0..1 fractions or 0..100 percentages.
//
// Supported properties:
//   focus: [x, y]       shorthand focal point
//   focusX / focusY     focal point by axis
//   zoom                 1.0..1.8; scales around the chosen focal point
//   fit                  "cover" (default) or "contain"
//   smart                false disables automatic focal analysis
//
// Example:
//   'military-example': { focus: [0.68, 0.42], zoom: 1.06 },
//   'territory-example': { focusY: 36 },
window.GAUNTLET_ART_DIRECTION = Object.freeze({});
