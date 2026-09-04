import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { handleLiveReviewExport } from "./review-export.js";

test("admin review export excludes v0.7.1 QA sessions from interactions, sources, and reviews", async () => {
  const statements = [];
  const env = {
    ADMIN_TOKEN: "test-admin-token",
    DB: {
      prepare(sql) {
        statements.push(sql);
        return {
          async all() {
            return { results: [] };
          }
        };
      }
    }
  };
  const request = new Request("https://example.test/api/admin/export?format=json", {
    headers: {
      Authorization: "Bearer test-admin-token",
      Origin: "https://gauntlet.run"
    }
  });

  const response = await handleLiveReviewExport(request, env);
  assert.equal(response.status, 200);
  assert.equal(statements.length, 3);
  assert.match(statements[0], /WHERE\s+session_id NOT LIKE 'qa_v071_%'/);
  assert.match(statements[1], /WHERE\s+interaction\.session_id NOT LIKE 'qa_v071_%'/);
  assert.match(statements[2], /WHERE\s+interaction\.session_id NOT LIKE 'qa_v071_%'/);

  const payload = await response.json();
  assert.deepEqual(payload.interactions, []);
  assert.deepEqual(payload.sources, []);
  assert.deepEqual(payload.reviews, []);
});

test("worker entry routes the legacy admin export URL through the live-scoped exporter", async () => {
  const source = await readFile(new URL("./worker-entry.js", import.meta.url), "utf8");
  assert.match(source, /import \{ handleLiveReviewExport \} from "\.\/review-export\.js"/);
  assert.match(source, /request\.method === "GET" && url\.pathname === "\/api\/admin\/export"/);
  assert.match(source, /return handleLiveReviewExport\(request, env\)/);
});
