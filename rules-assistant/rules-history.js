export async function loadStoredHistoryV2(env, { sessionId, playtestSessionId } = {}) {
  if (!env?.DB) return [];

  try {
    const usePlaytest = Boolean(playtestSessionId);
    const statement = usePlaytest
      ? env.DB.prepare(`
          SELECT question, answer, COALESCE(ruling_status_v2, ruling_status) AS ruling_status
          FROM rules_interactions
          WHERE playtest_session_id = ?
          ORDER BY created_at DESC
          LIMIT 8
        `).bind(playtestSessionId)
      : env.DB.prepare(`
          SELECT question, answer, COALESCE(ruling_status_v2, ruling_status) AS ruling_status
          FROM rules_interactions
          WHERE session_id = ?
          ORDER BY sequence_index DESC, created_at DESC
          LIMIT 8
        `).bind(sessionId);

    const rows = await statement.all();
    const results = Array.isArray(rows?.results) ? rows.results : [];
    return results.reverse().flatMap((row) => [
      { role: "user", content: String(row.question || "").trim() },
      {
        role: "assistant",
        content: String(row.answer || "").trim(),
        rulingStatus: String(row.ruling_status || "").trim() || null
      }
    ]).filter((item) => item.content);
  } catch (error) {
    console.error("Could not load current Rules Arbiter session history", error);
    return [];
  }
}
