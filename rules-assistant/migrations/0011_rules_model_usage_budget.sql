PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rules_model_usage_budget (
  scope TEXT NOT NULL,
  bucket TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scope, bucket)
);

CREATE INDEX IF NOT EXISTS idx_rules_model_usage_budget_updated_at
  ON rules_model_usage_budget(updated_at);
