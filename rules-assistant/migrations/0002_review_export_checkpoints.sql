CREATE TABLE IF NOT EXISTS rules_review_export_checkpoints (
  scope_key TEXT PRIMARY KEY,
  scope_json TEXT NOT NULL,
  checkpoint_at TEXT NOT NULL,
  checkpoint_interaction_id TEXT,
  updated_at TEXT NOT NULL
);
