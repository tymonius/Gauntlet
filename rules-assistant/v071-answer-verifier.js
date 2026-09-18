const FALLBACK_MODEL = "gpt-5.6-terra";

const VERIFIER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    valid: { type: "boolean" },
    issues: { type: "array", items: { type: "string" }, maxItems: 8 },
    replacement_answer: { type: "string", maxLength: 2400 },
    replacement_status: {
      type: "string",
      enum: ["none", "explicit", "inferred", "provisional", "out_of_scope"]
    },
    source_ids: {
      type: "array",
      items: { type: "string" },
      maxItems: 6
    }
  },
  required: ["valid", "issues", "replacement_answer", "replacement_status", "source_ids"]
};

function sourceAuthorityText(sources = []) {
  return sources.map((source) => [
    source?.title,
    source?.heading,
    source?.excerpt,
    source?.body,
    source?.text
  ].map((value) => String(value || "").toLowerCase()).join(" ")).join("\n");
}

function isDeclarativeConfirmation(question) {
  const current = String(question || "").trim().toLowerCase();
  const words = current.split(/\s+/).filter(Boolean);
  return /\?\s*$/.test(current)
    && words.length <= 20
    && !/^\s*(?:who|what|where|when|why|how|is|are|am|was|were|do|does|did|can|could|will|would|should|may|must|has|have|had)\b/.test(current)
    && !/\b(?:who|what|where|when|why|how)\b/.test(current);
}

export function highRiskVerificationReasons(question, sources = []) {
  const current = String(question || "").trim().toLowerCase();
  const authority = sourceAuthorityText(sources);
  const reasons = [];

  if (
    /^\s*(?:is|are|am|was|were|do|does|did|can|could|will|would|should|may|must|has|have|had)\b/.test(current)
    || isDeclarativeConfirmation(question)
  ) {
    reasons.push("yes-no-polarity");
  }

  if (
    /\byou may\b[\s\S]{0,280}\bif you do\b/.test(authority)
    || /\bmay discard\b/.test(authority)
    || /\bmay put\b[\s\S]{0,120}\bgraveyard\b/.test(authority)
  ) {
    reasons.push("optional-activation");
  }

  if (
    /\bopponent\b/.test(authority)
    && /\byou\b/.test(authority)
    && /\b(?:gain|gains|give|gives|conviction|capital|intel|influence|cards?|command|retreat)\b/.test(authority)
  ) {
    reasons.push("actor-attribution");
  }

  if (/\bwhen\b[^.]{0,180}\bwould\b[^.]{0,180}\binstead\b/.test(authority)) {
    reasons.push("replacement-semantics");
  }

  return [...new Set(reasons)];
}

export function shouldVerifyHighRiskAnswer(question, sources = []) {
  return highRiskVerificationReasons(question, sources).length > 0;
}

function formatSources(sources = []) {
  return sources.map((source, index) => [
    `[${source.id || `S${index + 1}`}] ${source.title || source.heading || "Canonical source"}`,
    source.canonicalId ? `Canonical ID: ${source.canonicalId}` : "",
    source.sourcePath ? `Path: ${source.sourcePath}` : "",
    source.excerpt || source.body || source.text || ""
  ].filter(Boolean).join("\n")).join("\n\n---\n\n");
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return null;
}

async function makeSafetyIdentifier(request, env) {
  const salt = env.SAFETY_ID_SALT || "gauntlet-v071-rules-arbiter-verifier";
  const address = request.headers.get("CF-Connecting-IP") || "anonymous";
  const input = new TextEncoder().encode(`${salt}:${address}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return `gauntlet_verify_${Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")}`;
}

export async function verifyHighRiskDraft({
  env,
  request,
  question,
  sources = [],
  draft,
  reasons = highRiskVerificationReasons(question, sources)
}) {
  const validIds = sources.map((source, index) => source.id || `S${index + 1}`);
  const systemPrompt = `You independently verify a Gauntlet v0.7.1 Rules Arbiter draft against only the supplied canonical sources.

This is a narrow fidelity check, not a second opportunity to expand the answer. Keep the answer question-scoped: do not invalidate a concise correct answer merely because it omits rules, costs, frequency limits, consequences, or context the question did not ask for.

Check especially the listed high-risk properties:
- yes/no polarity: the first Yes/No must match the literal proposition asked and the explanation;
- actor attribution: benefits, penalties, resources, movement, and choices must stay assigned to the player the source assigns them to;
- optionality: preserve may versus must when that distinction is material to the requested ruling;
- replacement semantics: "instead" replaces the stated event rather than adding to it.

If the draft is fully faithful on the question asked, return valid=true and no replacement.
If it is materially wrong, return valid=false and a complete corrected replacement answer. Use only these source IDs: ${validIds.join(", ")}.
Do not manufacture a failure from an unasked detail. Return only the required JSON object.`;

  const userText = [
    `HIGH-RISK CHECKS\n${reasons.join(", ") || "none"}`,
    `QUESTION\n${question}`,
    `DRAFT\n${JSON.stringify(draft)}`,
    `CANONICAL SOURCES\n${formatSources(sources) || "None."}`
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || FALLBACK_MODEL,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 550,
      safety_identifier: await makeSafetyIdentifier(request, env),
      input: [
        { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
        { role: "user", content: [{ type: "input_text", text: userText }] }
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "gauntlet_v071_high_risk_verification",
          strict: true,
          schema: VERIFIER_SCHEMA
        }
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Rules verifier request failed (${response.status}): ${body.slice(0, 300)}`);
  }
  const payload = await response.json();
  const outputText = extractOutputText(payload);
  if (!outputText) throw new Error("Rules verifier returned no output text.");
  return JSON.parse(outputText);
}

export function applyHighRiskVerification(draft, verification, sources = []) {
  if (!verification || verification.valid !== false) {
    return { draft, applied: false, reason: "valid-or-not-run" };
  }

  if (
    verification.replacement_status === "none"
    || !String(verification.replacement_answer || "").trim()
  ) {
    return { draft, applied: false, reason: "missing-replacement" };
  }

  const validIds = new Set(sources.map((source, index) => source.id || `S${index + 1}`));
  const sourceIds = Array.isArray(verification.source_ids)
    ? verification.source_ids.filter((id) => validIds.has(id))
    : [];

  if (
    ["explicit", "inferred"].includes(verification.replacement_status)
    && sourceIds.length === 0
  ) {
    return { draft, applied: false, reason: "unsupported-replacement" };
  }

  return {
    draft: {
      answer: String(verification.replacement_answer).trim(),
      ruling_status: verification.replacement_status,
      source_ids: sourceIds
    },
    applied: true,
    reason: "replacement-applied"
  };
}
