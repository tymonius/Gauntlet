// Compatibility entry point. Card inspection is owned by Card Design so every
// consumer (Card Reference, Deckbuilder, and Card Design) runs the same runtime.
import('../card-design/card-inspector.js?v=20260905-1').catch(error => {
  console.error('Shared card inspector failed to load.', error);
});
