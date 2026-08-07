import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cardDesignScript = readFileSync("card-design/card-design.js", "utf8");
const sectionStyles = readFileSync("card-design/leader-card-section.css", "utf8");

describe("main card-design Leader specimens", () => {
  it("adds the approved General and Commandant mockups before Territories", () => {
    expect(cardDesignScript).toContain("leader-specimen-section");
    expect(cardDesignScript).toContain("territorySection.before(section)");
    expect(cardDesignScript).toContain("Leader card mockups");
    expect(cardDesignScript).toContain("../images/general.png");
    expect(cardDesignScript).toContain("../images/commandant.png");
  });

  it("uses component-type metadata and the shared Leader treatment", () => {
    expect(cardDesignScript.match(/<span>Leader<\/span>/g)).toHaveLength(2);
    expect(cardDesignScript.match(/faction-component-card leader-card/g)).toHaveLength(2);
    expect(cardDesignScript).toContain("ensureStylesheet('leader-card.css')");
    expect(sectionStyles).toContain("grid-template-columns: repeat(2, 2.5in)");
  });
});
