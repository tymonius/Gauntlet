import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const informationalApps = [
  ["about", "/about/"],
  ["accessibility", "/accessibility/"],
  ["changelog", "/changelog/"],
  ["contact", "/contact/"],
  ["faq", "/faq/"],
  ["press", "/press/"],
  ["privacy", "/privacy/"],
] as const;

const read = (path: string) => readFileSync(path, "utf8");

describe("informational app source/deployment boundary", () => {
  it("keeps maintained informational-page source under apps", () => {
    const architecture = JSON.parse(read("config/repository-architecture.json"));
    expect(architecture.root_directories.apps).toMatchObject({
      role: "active_application",
      transitional: false,
    });

    for (const [name] of informationalApps) {
      expect(existsSync(`apps/${name}/index.html`), `${name} source should live under apps`).toBe(true);
      expect(existsSync(name), `${name} should not remain a root source alias`).toBe(false);
      expect(architecture.root_directories[name]).toBeUndefined();
    }
    expect(existsSync("apps/contact/thanks/index.html")).toBe(true);
  });

  it("materializes every source at its stable public route", () => {
    const contract = JSON.parse(read("config/publication-boundary.json"));
    const mappings = new Map(contract.materializedRoutes.map((entry: any) => [entry.source, entry.publicPath]));

    for (const [name, publicPath] of informationalApps) {
      expect(mappings.get(`apps/${name}`)).toBe(publicPath);
      expect(contract.pages.publishedDirectories).not.toContain(name);
      expect(contract.managedRoutes).toContain(publicPath);
    }
    expect(contract.managedRoutes).toContain("/contact/thanks/");
  });

  it("keeps current-publication validation on the shared route contract", () => {
    const validator = read("scripts/validate-current-public-contract.mjs");
    expect(validator).toContain("from './publication-boundary.mjs'");
    expect(validator).toContain("sourcePathForPublicPath(publicationBoundary");
    expect(validator).not.toContain("deployedAppRoots");
  });
});
