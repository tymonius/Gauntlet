export async function loadStoredHistoryV2(env, { sessionId } = {}) {
  if (!env?.DB || !sessionId) return [];

  try {
    const statement = env.DB.prepare(`
      SELECT
        i.question,
        i.answer,
        COALESCE(i.ruling_status_v2, i.ruling_status) AS ruling_status,
        d.question_plan_json
      FROM rules_interactions i
      LEFT JOIN rules_interaction_diagnostics d ON d.interaction_id = i.id
      WHERE i.session_id = ?
      ORDER BY i.sequence_index DESC, i.created_at DESC
      LIMIT 8
    `).bind(sessionId);

    const rows = await statement.all();
    const results = Array.isArray(rows?.results) ? rows.results : [];
    return results.reverse().flatMap((row) => {
      const context = parseQuestionPlan(row.question_plan_json);
      return [
        { role: "user", content: String(row.question || "").trim() },
        {
          role: "assistant",
          content: String(row.answer || "").trim(),
          rulingStatus: String(row.ruling_status || "").trim() || null,
          subject: context.subject,
          topic: context.topic
        }
      ];
    }).filter((item) => item.content);
  } catch (error) {
    console.error("Could not load current Rules Arbiter session history", error);
    return [];
  }
}

function parseQuestionPlan(value) {
  try {
    const plan = JSON.parse(String(value || "null"));
    if (!plan || typeof plan !== "object") return { subject: null, topic: null };
    return {
      subject: String(plan.activeSubject || "").trim() || null,
      topic: String(plan.activeTopic || "").trim() || null
    };
  } catch {
    return { subject: null, topic: null };
  }
}
