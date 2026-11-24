const FALLBACK_MODEL = "gpt-5.6-terra";
const DEFAULT_SOURCE_LIMIT = 8;
const DEFAULT_SOURCE_EXCERPT_LENGTH = 1000;

const ADJUDICATION_GUIDE = `
ADJUDICATION PRINCIPLES
- First apply the current canonical rules and component text. Specific text overrides general text.
- An exception, permission, timing window, additional play, movement, or victory condition exists only when a rule grants it.
- Do not reopen a completed timing window or reapply an effect unless a rule expressly does so.
- Resolve one instruction as fully as possible before moving to the next instruction.
- Preserve established ownership, control, card-zone, and timing defaults unless an effect changes them.
- Prefer the ruling that uses the least new machinery, keeps the game moving, preserves meaningful player choices, and avoids loops or exploitable repetition.
- Use closely analogous explicit interactions before relying on a broad thematic guess.
- A provisional ruling is binding for the rest of the current play session. A later canonical clarification supersedes it.
`;

const SYSTEM_PROMPT = `You are the Gauntlet Rules Arbiter for the canonical v0.6.1 pre-release playtest edition.

Use only the canonical source passages, structured question plan, explicit rule packet, supplied game state, recent conversation, prior session rulings, and adjudication principles provided with the question. Do not use outside knowledge, old Gauntlet versions, or unstated lore and design facts.

Every gameplay-rules question must receive a usable table ruling. Classify the answer as exactly one of:
- explicit: the supplied canonical text directly states the answer;
- inferred: the answer is compelled by applying one or more supplied canonical rules, with no discretionary gap;
- provisional: the rules leave a genuine gap or ambiguity, so make the ruling most consistent with the adjudication principles and likely designer intent;
- out_of_scope: the question is not a gameplay-rules question.

Never return "unresolved." Absence of an explicit rule is the point at which adjudication begins, not where the answer ends. If player context is incomplete, state the narrow assumption that makes the ruling usable instead of inventing hidden facts. When materially different answers depend on two plausible states, give the ruling for each state in one concise answer.

Apply these requirements:
1. A specific card, Leader, faction, Territory, or supplemental-component rule overrides a general rule.
2. Resolve instructions in the order written unless a supplied rule says otherwise.
3. Identify attacker, defender, controller, owner, occupier, or active player whenever those roles determine the result.
4. Reveal and resolution are different timings. Do not treat a revealed effect as resolved unless a supplied rule says so.
5. Treat a prior provisional ruling from the same play session as binding unless a supplied canonical source directly contradicts it.
6. For a provisional ruling, state the ruling first, briefly explain the closest rules analogy or design principle, and say that it applies for the rest of the current game and is logged for designer review.
7. For an out-of-scope question, say that the Rules Arbiter handles gameplay rulings and do not invent an answer.
8. Cite only the exact bracketed source IDs shown in CANONICAL SOURCES. An explicit or inferred answer must cite at least one supporting source. A provisional ruling may cite the closest relevant sources, but must not present them as explicitly deciding the gap.
9. Check that every named card, ability, timing window, and zone in the question is represented in the supplied sources before finalizing an interaction ruling.
10. Keep the answer direct and useful at the table.
11. When the question plan identifies an active subject, resolve pronouns and short follow-ups against that subject unless the current question explicitly names a different subject.
12. Treat subsection titles as scope limitations. A rule in a mirror-match subsection, Leader subsection, or faction-specific subsection is not universal unless the text says so.
13. Preserve every condition, restriction, destination, and timing qualifier in the exact component text. Do not summarize away a condition that changes legality or outcome.
14. Obey the rule packet's required claims, scope notes, and forbidden claims. If the supplied sources contradict a packet note, follow the canonical source and avoid the unsupported claim.
15. Every material factual claim in the answer must be supported by one of the cited source IDs. Do not cite a source merely because it is related.
16. Classification discipline: use explicit when supplied canonical text directly answers the question, even if the answer draws from more than one supplied passage. Use inferred only when the conclusion is compelled by combining supplied rules. Use provisional only for a genuine discretionary gap—not because retrieval, citation formatting, or confidence is imperfect.

${ADJUDICATION_GUIDE}

Return the required JSON object and no additional text.`;

const PLANNER_PROMPT = `Analyze a Gauntlet v0.6.1 gameplay question for retrieval. Do not answer the rules question. Extract named cards, Leaders, factions, abilities, Territories, resources, roles, zones, and timing concepts. Produce concise search queries that would find both the specific component text and the governing shared procedure. Mark complexity high for multi-effect interactions, precedence disputes, alternate victory, copied/repeated effects, or timing across multiple windows. Return only the required JSON.`;

const VERIFIER_PROMPT = `You are independently verifying a draft Gauntlet v0.6.1 Rules Arbiter answer. Use only the supplied question plan, explicit rule packet, game state, session context, canonical sources, and draft. Check source coverage, packet requirements, subsection scope, specific-over-general precedence, role identity, card zones, timing, reveal versus resolution, consistency with prior provisional rulings, classification, and citations. If the source set is missing a necessary rule, identify focused retrieval queries. If the source set is sufficient but the answer is wrong, provide a replacement. Return only the required JSON.`;

const ANSWER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string", minLength: 1, maxLength: 2600 },
    ruling_status: { type: "string", enum: ["explicit", "inferred", "provisional", "out_of_scope"] },
    source_ids: { type: "array", items: { type: "string" }, maxItems: 8 }
  },
  required: ["answer", "ruling_status", "source_ids"]
};

const PLANNER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    entities: { type: "array", items: { type: "string" }, maxItems: 10 },
    mechanics: { type: "array", items: { type: "string" }, maxItems: 16 },
    roles: { type: "array", items: { type: "string" }, maxItems: 10 },
    zones: { type: "array", items: { type: "string" }, maxItems: 10 },
    timing: { type: "array", items: { type: "string" }, maxItems: 10 },
    assumptions: { type: "array", items: { type: "string" }, maxItems: 8 },
    question_type: { type: "string", enum: ["lookup", "procedure", "interaction", "ruling", "out_of_scope"] },
    complexity: { type: "string", enum: ["low", "medium", "high"] },
    retrieval_queries: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 12 }
  },
  required: ["entities", "mechanics", "roles", "zones", "timing", "assumptions", "question_type", "complexity", "retrieval_queries"]
};

const VERIFIER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    valid: { type: "boolean" },
    issues: { type: "array", items: { type: "string" }, maxItems: 10 },
    missing_queries: { type: "array", items: { type: "string" }, maxItems: 6 },
    replacement_answer: { type: "string", maxLength: 2600 },
    replacement_status: { type: "string", enum: ["none", "explicit", "inferred", "provisional", "out_of_scope"] },
    source_ids: { type: "array", items: { type: "string" }, maxItems: 8 }
  },
  required: ["valid", "issues", "missing_queries", "replacement_answer", "replacement_status", "source_ids"]
};

export async function planQuestion({ env, request, question, history, gameState }) {
  const input = [
    `QUESTION\n${question}`,
    `RECENT CONTEXT\n${historyText(history)}`,
    `STRUCTURED GAME STATE\n${gameState ? JSON.stringify(gameState) : "None supplied."}`
  ].join("\n\n");
  return callStructuredModel({
    env,
    request,
    systemPrompt: PLANNER_PROMPT,
    userText: input,
    schema: PLANNER_SCHEMA,
    schemaName: "gauntlet_rules_retrieval_plan",
    reasoningEffort: "low",
    maxOutputTokens: 420
  });
}

export async function answerQuestion({ env, request, question, history, gameState, plan, sources, reasoningEffort, verifierIssues = [] }) {
  const sourceText = formatSources(sources, env, true) ||
    "No sufficiently relevant canonical passage was retrieved. Adjudicate provisionally unless the question is out of scope.";
  const userText = [
    `QUESTION\n${question}`,
    `ACTIVE SUBJECT\n${plan?.activeSubject || "None identified."}`,
    `ACTIVE TOPIC\n${plan?.activeTopic || "None identified."}`,
    `EXPLICIT RULE PACKET\n${JSON.stringify(plan?.rulePacket || null)}`,
    `STRUCTURED QUESTION PLAN\n${JSON.stringify(plan)}`,
    `STRUCTURED GAME STATE\n${gameState ? JSON.stringify(gameState) : "None supplied."}`,
    `RECENT CONVERSATION AND SESSION RULINGS\n${historyText(history)}`,
    verifierIssues.length ? `PRIOR VERIFIER CONCERNS TO CORRECT\n${verifierIssues.join("\n")}` : "",
    `CANONICAL SOURCES\n${sourceText}`
  ].filter(Boolean).join("\n\n");
  return callStructuredModel({
    env,
    request,
    systemPrompt: SYSTEM_PROMPT,
    userText,
    schema: ANSWER_SCHEMA,
    schemaName: "gauntlet_rules_answer",
    reasoningEffort,
    maxOutputTokens: 700
  });
}

export async function verifyDraft({ env, request, question, history, gameState, plan, sources, draft }) {
  const sourceText = formatSources(sources, env, false);
  const userText = [
    `QUESTION\n${question}`,
    `ACTIVE SUBJECT\n${plan?.activeSubject || "None identified."}`,
    `RULE PACKET\n${JSON.stringify(plan?.rulePacket || null)}`,
    `QUESTION PLAN\n${JSON.stringify(plan)}`,
    `GAME STATE\n${gameState ? JSON.stringify(gameState) : "None supplied."}`,
    `SESSION CONTEXT\n${historyText(history)}`,
    `DRAFT\n${JSON.stringify(draft)}`,
    `CANONICAL SOURCES\n${sourceText || "None."}`
  ].join("\n\n");
  return callStructuredModel({
    env,
    request,
    systemPrompt: VERIFIER_PROMPT,
    userText,
    schema: VERIFIER_SCHEMA,
    schemaName: "gauntlet_rules_verification",
    reasoningEffort: "low",
    maxOutputTokens: 550
  });
}

function formatSources(sources, env, includeRetrievalReason) {
  const limit = boundedInteger(env?.RULES_SOURCE_LIMIT, DEFAULT_SOURCE_LIMIT, 4, 12);
  const excerptLength = boundedInteger(
    env?.RULES_SOURCE_EXCERPT_LENGTH,
    DEFAULT_SOURCE_EXCERPT_LENGTH,
    500,
    1600
  );
  return (sources || []).slice(0, limit).map((source) => {
    const text = String(source.excerpt || source.body || "").trim();
    const excerpt = text.length > excerptLength
      ? `${text.slice(0, excerptLength - 1).trimEnd()}…`
      : text;
    return [
      `[${source.id}] ${source.title}`,
      source.canonicalId ? `Canonical ID: ${source.canonicalId}` : "",
      includeRetrievalReason && source.retrievalReason ? `Retrieved by: ${source.retrievalReason}` : "",
      excerpt
    ].filter(Boolean).join("\n");
  }).join("\n\n---\n\n");
}

async function callStructuredModel({ env, request, systemPrompt, userText, schema, schemaName, reasoningEffort, maxOutputTokens }) {
  const traceId = request.headers.get("CF-Ray") || crypto.randomUUID();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || FALLBACK_MODEL,
      store: false,
      reasoning: { effort: reasoningEffort },
      max_output_tokens: maxOutputTokens,
      safety_identifier: await makeSafetyIdentifier(request, env),
      prompt_cache_key: `gauntlet_rules_v061_${schemaName}`,
      input: [
        { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
        { role: "user", content: [{ type: "input_text", text: userText }] }
      ],
      text: {
        verbosity: "low",
        format: { type: "json_schema", name: schemaName, strict: true, schema }
      }
    })
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorBody.slice(0, 500)}`);
  }
  const payload = await response.json();
  const usage = normalizeUsage(payload.usage);
  console.log("Rules model usage", JSON.stringify({ traceId, stage: schemaName, reasoningEffort, ...usage }));
  const outputText = extractOutputText(payload);
  if (!outputText) throw new Error("OpenAI returned no output text.");
  try {
    const parsed = JSON.parse(outputText);
    Object.defineProperty(parsed, "__usage", { value: usage, enumerable: false });
    return parsed;
  } catch {
    throw new Error("OpenAI returned invalid structured output.");
  }
}

function normalizeUsage(usage) {
  return {
    inputTokens: Number(usage?.input_tokens || 0),
    cachedInputTokens: Number(usage?.input_tokens_details?.cached_tokens || 0),
    outputTokens: Number(usage?.output_tokens || 0),
    reasoningTokens: Number(usage?.output_tokens_details?.reasoning_tokens || 0),
    totalTokens: Number(usage?.total_tokens || 0)
  };
}

function historyText(history) {
  if (!history?.length) return "No prior conversation or session ruling.";
  return history.slice(-6).map((item) => {
    const label = item.rulingStatus ? ` [${item.rulingStatus}]` : "";
    const subject = item.subject ? ` {subject: ${item.subject}${item.topic ? `; topic: ${item.topic}` : ""}}` : "";
    return `${item.role.toUpperCase()}${label}${subject}: ${String(item.content || "").slice(0, 700)}`;
  }).join("\n");
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, parsed));
}

async function makeSafetyIdentifier(request, env) {
  const salt = env.SAFETY_ID_SALT || "gauntlet-rules-assistant";
  const address = request.headers.get("CF-Connecting-IP") || "anonymous";
  const input = new TextEncoder().encode(`${salt}:${address}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return `gauntlet_${Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")}`;
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
