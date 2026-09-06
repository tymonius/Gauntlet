import { describe, expect, it } from "vitest";
import {
  CURRENT_RULES_VERSION,
  EVENT_SERIAL_PREFIX,
  GAME_SERIAL_PREFIX,
  SERIAL_PATTERN,
  serialVersionToken,
  sessionSerialPrefixes,
} from "./release-identity.js";

describe("playtest release identity", () => {
  it("derives new session identifiers from the tested rules version", () => {
    expect(CURRENT_RULES_VERSION).toBe("v0.7.1");
    expect(serialVersionToken(CURRENT_RULES_VERSION)).toBe("071");
    expect(GAME_SERIAL_PREFIX).toBe("G071");
    expect(EVENT_SERIAL_PREFIX).toBe("EV071");
    expect(sessionSerialPrefixes("v0.7.2")).toEqual({ game: "G072", event: "EV072" });
  });

  it("recognizes previously issued versioned game and event identifiers", () => {
    expect(SERIAL_PATTERN.test("G071-ABCD2345")).toBe(true);
    expect(SERIAL_PATTERN.test("EV070-ZYXW9876")).toBe(true);
    expect(SERIAL_PATTERN.test("G072-ABC12345")).toBe(true);
    expect(SERIAL_PATTERN.test("G-ABC12345")).toBe(false);
  });
});
