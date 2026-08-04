import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

const mobileCss = await readFile(new URL("./widget-mobile.css", import.meta.url), "utf8");
const presentationCss = await readFile(new URL("./answer-presentation.css", import.meta.url), "utf8");

describe("Rules Arbiter mobile layout", () => {
  test("loads the mobile overrides with a cache-busted import", () => {
    expect(presentationCss).toContain('@import url("./widget-mobile.css?v=20260804-1")');
  });

  test("uses the dynamic viewport and safe areas on narrow screens", () => {
    expect(mobileCss).toContain("height: min(78dvh, 720px)");
    expect(mobileCss).toContain("env(safe-area-inset-top)");
    expect(mobileCss).toContain("env(safe-area-inset-bottom)");
    expect(mobileCss).toContain("grid-template-rows: auto auto minmax(0, 1fr) auto auto");
  });

  test("keeps touch scrolling inside the conversation", () => {
    expect(mobileCss).toContain("overscroll-behavior-y: contain");
    expect(mobileCss).toContain("-webkit-overflow-scrolling: touch");
    expect(mobileCss).toContain("touch-action: pan-y");
    expect(mobileCss).toContain(".ga-rules-assistant.is-open::before");
  });

  test("prevents iOS from zooming the viewport when the question field is focused", () => {
    expect(mobileCss).toMatch(/\.ga-rules-panel textarea\s*\{[^}]*font-size:\s*16px/s);
  });
});
