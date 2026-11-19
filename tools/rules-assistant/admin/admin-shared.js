// Shared by current admin endpoints and the historical Worker compatibility route.
// Keep these security/export semantics stable across both entrypoints.

export async function isAdminAuthorized(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ") || !env.ADMIN_TOKEN) return false;
  return safeEqual(authorization.slice(7), String(env.ADMIN_TOKEN));
}

async function safeEqual(left, right) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right))
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export function interactionsToCsv(rows) {
  const columns = [
    "id", "session_id", "sequence_index", "created_at", "question", "answer",
    "game_version", "ruling_status", "confidence", "answer_mode", "model",
    "source_count", "feedback_rating", "feedback_comment", "feedback_at",
    "review_status", "issue_types_json", "reviewer_notes", "resolution", "updated_at"
  ];
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))
  ].join("\r\n");
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
