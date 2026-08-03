ALTER TABLE rules_interactions
ADD COLUMN answer_mode_v2 TEXT
CHECK (answer_mode_v2 IN (
  'ai',
  'ai_verified',
  'local_fallback',
  'retrieval_only',
  'source_lookup'
));

UPDATE rules_interactions
SET answer_mode_v2 = answer_mode
WHERE answer_mode_v2 IS NULL;

CREATE INDEX IF NOT EXISTS idx_rules_interactions_answer_mode_v2
ON rules_interactions(answer_mode_v2, created_at DESC);
