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
window.GAUNTLET_ART_DIRECTION = Object.freeze({
  "diplomats-ambassador": {"focusY":0.071},
  "diplomats-diplomatic-latitude": {"focusY":0.2},
  "diplomats-senator": {"focusY":0.037},
  "financiers-executive": {"focusY":0.095},
  "financiers-war-bonds": {"focus":[0.368,0.572],"zoom":1.06},
  "inquisition-grand-inquisitor": {"focusY":0.075},
  "intelligence-sleeper-network": {"focusY":0.763},
  "intelligence-spymaster": {"focusY":0.126},
  "military-commandant": {"focusY":0.099},
  "mystics-alchemist": {"focusY":0.095},
  "mystics-necromancy": {"focusY":0.398},
  "rite-blood": {"focusY":0.32},
  "rite-crossing-completed": {"focusY":0.413},
  "rite-echoes": {"focusY":0.366},
  "territory-arena-grand-melee": {"focusY":0.747},
  "territory-arena-single-combat": {"focusY":0.26},
  "territory-arena-spoils-of-war": {"focusY":0.442},
  "territory-disrupted-supply-lines": {"focusY":0.271},
  "territory-exposed-flank": {"focusY":0.524},
  "territory-field-hospital": {"focusY":0.406},
  "territory-high-ground": {"focusY":0.068},
  "territory-king-s-road": {"focusY":0.534},
  "territory-monastery": {"focusY":0.603},
  "territory-poisonous-gas": {"focusY":0.575},
  "territory-quicksand": {"focusY":0.702},
  "territory-refuge": {"focusY":0.463},
  "territory-ruined-storehouse": {"focusY":0.454},
  "territory-smuggler-s-pass": {"focusY":0.648},
  "territory-supply-depot": {"focusY":0.523},
  "territory-toll-bridge": {"focusY":0.463},
  "territory-watchtower": {"focusY":0.229},
});
