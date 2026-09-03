import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const faceRuntime = readFileSync("card-design/face-render.mjs", "utf8");

describe("production component print readiness", () => {
  it("prepares every asynchronously constructed FaceSpec exactly once before declaring it ready", () => {
    const renderIndex = faceRuntime.indexOf("const result = await template.render(spec);");
    const mountIndex = faceRuntime.indexOf("target.replaceChildren(result.element);");
    const prepareIndex = faceRuntime.indexOf("await prepareFace(spec, result);");
    const readyIndex = faceRuntime.indexOf("document.body.dataset.renderReady = 'true';");

    expect(renderIndex).toBeGreaterThan(-1);
    expect(mountIndex).toBeGreaterThan(renderIndex);
    expect(prepareIndex).toBeGreaterThan(mountIndex);
    expect(readyIndex).toBeGreaterThan(prepareIndex);
    expect(faceRuntime).toContain("await waitForImages(element)");
    expect(faceRuntime).toContain("if (element.classList.contains('fit-warning'))");
  });

  it("does not replay page lifecycle events or rediscover a selected component", () => {
    expect(faceRuntime).not.toContain("dispatchEvent(new Event");
    expect(faceRuntime).not.toContain("selectedCard()");
    expect(faceRuntime).not.toContain("MutationObserver");
  });
});
