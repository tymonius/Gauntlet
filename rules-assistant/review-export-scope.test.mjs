import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
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
  expect(response.status).toBe(200);
  expect(statements).toHaveLength(3);
  expect(statements[0]).toMatch(/WHERE\s+session_id NOT LIKE 'qa_v071_%'/);
  expect(statements[1]).toMatch(/WHERE\s+interaction\.session_id NOT LIKE 'qa_v071_%'/);
  expect(statements[2]).toMatch(/WHERE\s+interaction\.session_id NOT LIKE 'qa_v071_%'/);

  const payload = await response.json();
  expect(payload.interactions).toEqual([]);
  expect(payload.sources).toEqual([]);
  expect(payload.reviews).toEqual([]);
});

test("worker entry routes the legacy admin export URL through the live-scoped exporter", async () => {
  const source = await readFile(new URL("./worker-entry.js", import.meta.url), "utf8");
  expect(source).toMatch(/import \{ handleLiveReviewExport \} from "\.\/review-export\.js"/);
  expect(source).toMatch(/request\.method === "GET" && url\.pathname === "\/api\/admin\/export"/);
  expect(source).toMatch(/return handleLiveReviewExport\(request, env\)/);
});
