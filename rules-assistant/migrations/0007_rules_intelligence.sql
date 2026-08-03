PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rules_interaction_diagnostics (
  interaction_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  question_plan_json TEXT NOT NULL DEFAULT 'null',
  retrieval_queries_json TEXT NOT NULL DEFAULT '[]',
  candidate_sources_json TEXT NOT NULL DEFAULT '[]',
  reasoning_effort TEXT NOT NULL DEFAULT 'low'
    CHECK (reasoning_effort IN ('low', 'medium', 'high')),
  verifier_json TEXT NOT NULL DEFAULT 'null',
  retry_count INTEGER NOT NULL DEFAULT 0
    CHECK (retry_count BETWEEN 0 AND 3),
  game_state_json TEXT NOT NULL DEFAULT 'null',
  corpus_hash TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (interaction_id) REFERENCES rules_interactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rules_diagnostics_created
  ON rules_interaction_diagnostics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rules_diagnostics_effort
  ON rules_interaction_diagnostics(reasoning_effort, created_at DESC);

CREATE TABLE IF NOT EXISTS rules_interaction_audits (
  interaction_id TEXT PRIMARY KEY,
  reviewed_at TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  historical_accuracy TEXT NOT NULL
    CHECK (historical_accuracy IN ('correct', 'incorrect', 'indeterminate', 'not_applicable')),
  current_validity TEXT NOT NULL
    CHECK (current_validity IN ('current', 'stale', 'superseded', 'indeterminate', 'not_applicable')),
  retrieval_assessment TEXT NOT NULL
    CHECK (retrieval_assessment IN ('sufficient', 'weak', 'failure', 'not_applicable')),
  classification_assessment TEXT NOT NULL
    CHECK (classification_assessment IN (
      'correct', 'should_be_explicit', 'should_be_inferred',
      'should_be_provisional', 'should_be_out_of_scope', 'indeterminate'
    )),
  designer_review_required INTEGER NOT NULL DEFAULT 0
    CHECK (designer_review_required IN (0, 1)),
  regression_candidate INTEGER NOT NULL DEFAULT 0
    CHECK (regression_candidate IN (0, 1)),
  recommended_action TEXT NOT NULL DEFAULT 'none'
    CHECK (recommended_action IN (
      'none', 'regression_test', 'retrieval_fix', 'prompt_fix', 'source_data_fix',
      'rule_clarification', 'versioned_precedent_candidate', 'rule_change_candidate', 'other'
    )),
  governing_source_ids_json TEXT NOT NULL DEFAULT '[]',
  corrected_answer TEXT NOT NULL DEFAULT '',
  source_gap TEXT NOT NULL DEFAULT '',
  rationale TEXT NOT NULL DEFAULT '',
  reviewed_against_version TEXT NOT NULL,
  reviewed_against_corpus_hash TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (interaction_id) REFERENCES rules_interactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rules_audits_reviewed
  ON rules_interaction_audits(reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rules_audits_designer
  ON rules_interaction_audits(designer_review_required, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rules_audits_regression
  ON rules_interaction_audits(regression_candidate, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rules_audits_current_validity
  ON rules_interaction_audits(current_validity, reviewed_at DESC);

CREATE TABLE IF NOT EXISTS rules_interaction_audit_history (
  id TEXT PRIMARY KEY,
  interaction_id TEXT NOT NULL,
  reviewed_at TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  historical_accuracy TEXT NOT NULL,
  current_validity TEXT NOT NULL,
  retrieval_assessment TEXT NOT NULL,
  classification_assessment TEXT NOT NULL,
  designer_review_required INTEGER NOT NULL DEFAULT 0,
  regression_candidate INTEGER NOT NULL DEFAULT 0,
  recommended_action TEXT NOT NULL DEFAULT 'none',
  governing_source_ids_json TEXT NOT NULL DEFAULT '[]',
  corrected_answer TEXT NOT NULL DEFAULT '',
  source_gap TEXT NOT NULL DEFAULT '',
  rationale TEXT NOT NULL DEFAULT '',
  reviewed_against_version TEXT NOT NULL,
  reviewed_against_corpus_hash TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (interaction_id) REFERENCES rules_interactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rules_audit_history_interaction
  ON rules_interaction_audit_history(interaction_id, reviewed_at DESC);
