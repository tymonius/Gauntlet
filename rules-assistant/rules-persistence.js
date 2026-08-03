const RULES_VERSION = "v0.6.1";

export async function persistSmartInteraction(env, record) {
  if (!env.DB) return null;
  try {
    const previous = await env.DB.prepare(`
      SELECT id, sequence_index FROM rules_interactions
      WHERE session_id = ? ORDER BY sequence_index DESC, created_at DESC LIMIT 1
    `).bind(record.sessionId).first();
    const id = crypto.randomUUID();
    const sequenceIndex = Number(previous?.sequence_index || 0) + 1;
    const createdAt = new Date().toISOString();
    const sourceRows = Array.isArray(record.sources) ? record.sources.slice(0, 8) : [];
    const statements = [
      env.DB.prepare(`
        INSERT INTO rules_interactions (
          id, session_id, previous_interaction_id, sequence_index, created_at, updated_at,
          question, answer, game_version, ruling_status, confidence, answer_mode, model,
          source_count, playtest_session_id, sheet_serial, review_status,
          issue_types_json, reviewer_notes, resolution
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unreviewed', '[]', '', '')
      `).bind(
        id, record.sessionId, previous?.id || null, sequenceIndex, createdAt, createdAt,
        record.question, record.answer, record.gameVersion || RULES_VERSION,
        record.rulingStatus || "provisional", record.confidence || "low",
        record.mode || "ai_verified", record.model || null, sourceRows.length,
        record.playtestSessionId || null, record.sheetSerial || null
      )
    ];

    sourceRows.forEach((source, index) => {
      statements.push(env.DB.prepare(`
        INSERT INTO rules_interaction_sources (
          interaction_id, ordinal, source_id, title, source_path, source_url, excerpt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, index + 1, String(source.id || "").slice(0, 80),
        String(source.title || "Canonical source").slice(0, 300),
        String(source.sourcePath || "").slice(0, 500),
        String(source.sourceUrl || "").slice(0, 1000),
        String(source.excerpt || "").slice(0, 5000)
      ));
    });

    await env.DB.batch(statements);
    await persistDiagnostics(env.DB, id, createdAt, record.diagnostics || {});
    await linkFormalPlaytest(env.DB, id, record, sourceRows, createdAt);
    return id;
  } catch (error) {
    console.error("Could not persist smart Rules Arbiter interaction", error);
    return null;
  }
}

async function persistDiagnostics(db, interactionId, createdAt, diagnostics) {
  try {
    await db.prepare(`
      INSERT INTO rules_interaction_diagnostics (
        interaction_id, created_at, question_plan_json, retrieval_queries_json,
        candidate_sources_json, reasoning_effort, verifier_json, retry_count,
        game_state_json, corpus_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      interactionId,
      createdAt,
      JSON.stringify(diagnostics.questionPlan || null),
      JSON.stringify(diagnostics.retrievalQueries || []),
      JSON.stringify(diagnostics.candidateSources || []),
      String(diagnostics.reasoningEffort || "low"),
      JSON.stringify(diagnostics.verification || null),
      Number(diagnostics.retryCount || 0),
      JSON.stringify(diagnostics.gameState || null),
      String(diagnostics.corpusHash || "")
    ).run();
  } catch (error) {
    console.error("Could not persist Rules Arbiter diagnostics", error);
  }
}

async function linkFormalPlaytest(db, interactionId, record, sources, timestamp) {
  if (!record.playtestSessionId || !record.sheetSerial) return;
  try {
    const session = await db.prepare(`
      SELECT id, sheet_serial FROM playtest_sessions WHERE id = ? AND sheet_serial = ?
    `).bind(record.playtestSessionId, record.sheetSerial).first();
    if (!session) return;
    const result = await db.prepare(`
      INSERT OR IGNORE INTO playtest_arbiter_links (
        id, session_id, interaction_id, classification, question_excerpt,
        answer_excerpt, source_json, linked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), session.id, interactionId, record.rulingStatus || null,
      String(record.question || "").slice(0, 300) || null,
      String(record.answer || "").slice(0, 500) || null,
      JSON.stringify(sources.map(({ id, title, sourcePath, sourceUrl }) => ({ id, title, sourcePath, sourceUrl }))),
      timestamp
    ).run();
    if (Number(result?.meta?.changes || 0) > 0) {
      await db.prepare(`
        INSERT INTO playtest_session_events (id, session_id, event_type, event_json, created_at)
        VALUES (?, ?, 'arbiter_linked', ?, ?)
      `).bind(
        crypto.randomUUID(), session.id,
        JSON.stringify({ interactionId, classification: record.rulingStatus || null }), timestamp
      ).run();
    }
  } catch (error) {
    console.error("Could not link smart Rules Arbiter interaction to formal playtest", error);
  }
}
