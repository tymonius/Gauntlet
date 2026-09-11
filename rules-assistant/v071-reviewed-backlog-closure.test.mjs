import { describe, expect, test } from "vitest";
import {
  refinementResolutionLedger,
  validateRefinementResolutionLedger
} from "./refinement-resolution-ledger.js";

const reviewedBacklogIds = [
  "c301bfdb-ae51-44c2-8a4a-7f98743afa02",
  "2a4c793d-21d2-4133-a45d-0a0df4a5ef07",
  "1a7ac447-03b3-4824-8083-7c61f153e97d",
  "daae1140-89aa-463e-8546-7b19fa94fed1",
  "b8ee7052-69dd-41b1-82e9-49032f926d99",
  "4d3d5162-01a6-4f4b-a100-dff6cd4f0bed",
  "b922bfa5-6fce-4567-84b0-8c35fbb4b40e",
  "b2d55ffe-219a-496c-bc22-baac51533e88",
  "eedde1c1-b96f-47ac-a71e-bdf043d1fbdf",
  "0ec2f926-7212-4937-867d-eac92a0a35c6",
  "ca25c695-26be-43c8-ba49-ddae85534fba",
  "6a89266c-60cd-4275-b50e-4bfacb3de30f"
];

describe("v0.7.1 reviewed Rules Arbiter backlog closure", () => {
  test("keeps the refinement resolution ledger valid", () => {
    const result = validateRefinementResolutionLedger(refinementResolutionLedger);
    expect(result.ok).toBe(true);
    expect(result.failures ?? []).toEqual([]);
  });

  test("binds every interaction from the reviewed backlog before replay", () => {
    const resolvedInteractionIds = new Set(
      refinementResolutionLedger.entries
        .filter((entry) => entry.status === "resolved")
        .flatMap((entry) => entry.interactionIds ?? [])
    );

    expect(reviewedBacklogIds.filter((id) => !resolvedInteractionIds.has(id))).toEqual([]);
  });
});
