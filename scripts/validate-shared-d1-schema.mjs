import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CONTRACT_PATH = "config/shared-d1-schema.json";
const SQL_NAME = /^(\d{4})_[a-z][a-z0-9_]*\.sql$/;

function relativeTo(root, absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function readD1Binding(source) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex(line => line.trim() === "[[d1_databases]]");
  if (start === -1) return null;
  const fields = {};
  for (const line of lines.slice(start + 1)) {
    if (line.trim().startsWith("[")) break;
    const match = line.match(/^\s*([a-z_]+)\s*=\s*"([^"]+)"(?:\s+#.*)?$/);
    if (match) fields[match[1]] = match[2];
  }
  return fields;
}

function gitBlobSha(bytes) {
  return crypto.createHash("sha1")
    .update("blob " + bytes.length + "\0")
    .update(bytes)
    .digest("hex");
}

export function validateSharedD1Schema(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const errors = [];
  const contract = options.contract || JSON.parse(fs.readFileSync(path.join(root, CONTRACT_PATH), "utf8"));
  const fail = message => errors.push(message);

  if (contract.schema_version !== 1) fail("Unsupported shared D1 schema contract version.");
  if (!contract.canonical_migrations_path || path.isAbsolute(contract.canonical_migrations_path)) {
    fail("Missing or absolute canonical migrations path.");
    return errors;
  }
  const migrationsPath = path.resolve(root, contract.canonical_migrations_path);
  if (!migrationsPath.startsWith(root + path.sep) || !fs.existsSync(migrationsPath)) {
    fail("Canonical migrations directory is missing or outside the repository.");
    return errors;
  }
  if (!Array.isArray(contract.migrations) || contract.migrations.length === 0) {
    fail("Shared D1 contract must enumerate the migration history.");
    return errors;
  }
  const actualFiles = fs.readdirSync(migrationsPath)
    .filter(filename => filename.endsWith(".sql"))
    .sort();
  const declaredFiles = contract.migrations.map(item => item.filename);
  const ids = [];
  for (const item of contract.migrations) {
    const match = SQL_NAME.exec(item.filename || "");
    if (!match) {
      fail("Invalid migration filename: " + String(item.filename));
      continue;
    }
    ids.push(Number(match[1]));
    if (!/^[0-9a-f]{40}$/.test(item.git_blob_sha || "")) {
      fail("Migration blob identity is invalid: " + item.filename);
      continue;
    }
    const fullPath = path.join(migrationsPath, item.filename);
    if (!fs.existsSync(fullPath)) {
      fail("Missing recorded migration: " + item.filename);
      continue;
    }
    const actualSha = gitBlobSha(fs.readFileSync(fullPath));
    if (actualSha !== item.git_blob_sha) {
      fail("Migration bytes changed: " + item.filename + "; historical migrations must not be rewritten.");
    }
  }
  if (actualFiles.join("\n") !== [...declaredFiles].sort().join("\n")) {
    fail("Migration manifest and canonical SQL directory differ; append and pin new migrations explicitly.");
  }
  if (new Set(ids).size !== ids.length || ids.some((id, i) => id !== i + 1)) {
    fail("Migration IDs must be unique, consecutive, and in numeric order.");
  }

  const databaseBindings = [];
  const requiredConsumers = ["rules-assistant/wrangler.toml", "workers/playtest-sessions/wrangler.toml"];
  if (!Array.isArray(contract.consumer_configs) ||
      contract.consumer_configs.length !== requiredConsumers.length ||
      JSON.stringify([...contract.consumer_configs].sort()) !== JSON.stringify([...requiredConsumers].sort())) {
    fail("Expected both Rules Arbiter and Playtest Session D1 consumer configs.");
  } else {
    for (const config of contract.consumer_configs) {
      const full = path.resolve(root, config);
      if (!full.startsWith(root + path.sep) || !fs.existsSync(full)) {
        fail("Missing D1 consumer config: " + config);
        continue;
      }
      const binding = readD1Binding(fs.readFileSync(full, "utf8"));
      if (!binding || !binding.database_name || !binding.database_id || !binding.binding || !binding.migrations_dir) {
        fail("Incomplete D1 binding in " + config);
        continue;
      }
      const resolved = relativeTo(root, path.resolve(path.dirname(full), binding.migrations_dir));
      if (resolved !== contract.canonical_migrations_path) {
        fail(config + " points at " + resolved + ", not the canonical shared migration source.");
      }
      databaseBindings.push({ config, ...binding });
    }
  }
  if (databaseBindings.length === 2) {
    const [first, second] = databaseBindings;
    for (const field of ["database_name", "database_id", "binding"]) {
      if (first[field] !== second[field]) {
        fail("D1 " + field + " differs between " + first.config + " and " + second.config);
      }
    }
    if (first.binding !== "DB") fail("Shared D1 must remain bound as DB to both Workers.");
  }

  const executor = contract.migration_executor;
  if (!executor || !executor.workflow || !executor.wrangler_config) {
    fail("Shared D1 migration executor is not designated.");
  } else {
    const workflow = path.join(root, executor.workflow);
    if (!contract.consumer_configs?.includes(executor.wrangler_config)) {
      fail("Migration executor must use a declared consumer Wrangler configuration.");
    }
    if (!fs.existsSync(workflow)) {
      fail("Designated migration workflow is missing: " + executor.workflow);
    } else {
      const source = fs.readFileSync(workflow, "utf8");
      const applyStep = source.indexOf("name: " + executor.step);
      const deployStep = source.indexOf("name: " + executor.sequence_before);
      if (applyStep === -1 || deployStep === -1 || applyStep >= deployStep) {
        fail("Migration application must precede the Playtest service deployment.");
      } else {
        const section = source.slice(applyStep, deployStep);
        if (!section.includes("wrangler d1 migrations apply gauntlet-rules-assistant") ||
            !section.includes("--remote") ||
            !section.includes("--config " + executor.wrangler_config)) {
          fail("Designated migration executor does not apply the shared D1 database using the canonical Wrangler config.");
        }
      }
      if (source.split('"rules-assistant/migrations/**"').length - 1 < 2) {
        fail("Playtest PR and push validation must both watch the shared migration directory.");
      }
      for (const needed of [CONTRACT_PATH, "scripts/validate-shared-d1-schema.mjs"]) {
        if (!source.includes('"' + needed + '"')) {
          fail("Playtest PR validation does not watch " + needed);
        }
      }
      if (!source.includes("npm run db:schema:check")) {
        fail("Playtest deployment validation must check the shared D1 schema contract.");
      }
    }
  }
  const workflowsPath = path.join(root, ".github/workflows");
  for (const file of fs.readdirSync(workflowsPath).filter(name => /\.ya?ml$/.test(name))) {
    const source = fs.readFileSync(path.join(workflowsPath, file), "utf8");
    if (source.includes("wrangler d1 migrations apply") && file !== path.basename(executor?.workflow || "")) {
      fail("Unexpected second automated shared D1 migration executor: " + file);
    }
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = validateSharedD1Schema();
  if (errors.length) {
    console.error("Shared D1 schema contract failed:\n- " + errors.join("\n- "));
    process.exitCode = 1;
  } else {
    console.log("Shared D1 schema contract passed: one migration source, two consumers, one executor, append-only migration history.");
  }
}
