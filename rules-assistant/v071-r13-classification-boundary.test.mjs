import { describe, expect, test } from "vitest";
import {
  hasNamedCardBattleCollateralTimingConflict,
  normalizeR13RulingStatus,
  shouldForceUndefinedTransformationGap,
  shouldPromoteDirectPhaseLegality,
  shouldPromoteExpandedDirectOverview,
  shouldPromoteNamedDirectAuthority
} from "./r13-classification.js";

function source(title, excerpt = "") {
  return { id: "S1", title, excerpt };
}

describe("v0.7.1 r13 classification boundary", () => {
  test("promotes a directly titled turn-order overview", () => {
    const sources = [source(
      "4. Your Turn › How it works",
      "Complete every turn in this order: Capture → Draw → Opening → Movement → Denouement → Cleanup."
    )];
    expect(shouldPromoteExpandedDirectOverview("What happens on my turn, in order?", sources)).toBe(true);
    expect(normalizeR13RulingStatus("inferred", "What happens on my turn, in order?", sources)).toBe("explicit");
  });

  test("promotes an if-framed overview when one direct source title covers the subject", () => {
    const sources = [source(
      "13. Military › Military-specific rules › Conflicting victory benefits",
      "Apply only combinations of effects that can legally be applied together."
    )];
    expect(shouldPromoteExpandedDirectOverview(
      "What happens if Military has conflicting victory benefits?",
      sources
    )).toBe(true);
    expect(normalizeR13RulingStatus(
      "inferred",
      "What happens if Military has conflicting victory benefits?",
      sources
    )).toBe("explicit");
  });

  test("promotes direct phase legality when the named action has an express timing source", () => {
    const sources = [
      source(
        "15. Financiers › Capital, Treasury, and Deeds › Complete rules › Financial Capacity",
        "You may take one Action during both Opening and Denouement that turn."
      ),
      source(
        "15. Financiers › Capital, Treasury, and Deeds › Complete rules › Buying and buying out Deeds",
        "During Denouement, take an Action to buy or buy out one Deed by paying its full cost."
      )
    ];
    const question = "If Financial Capacity gives me two Actions, can I buy a Deed during Opening?";
    expect(shouldPromoteDirectPhaseLegality(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("promotes a named direct authority instead of treating surrounding context as inference", () => {
    const sources = [
      source(
        "7. Battles › Terms and Onset › Complete rules › Terms › Accepted Terms",
        "When Terms are accepted during Onset, apply effects that occur after acceptance."
      ),
      source(
        "Faction: Cordiality",
        "After the opponent accepts your Terms, draw one card. Classification: Leader Ability"
      )
    ];
    const question = "The opponent accepts the Ambassador's Terms. What card-flow benefit does Cordiality give, assuming it has not been used this turn?";
    expect(shouldPromoteNamedDirectAuthority(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("does not promote a cross-authority interaction just because both subjects are retrieved", () => {
    const sources = [
      source("7. Battles › Withdrawal and Retreat › Complete rules › Withdrawal"),
      source("Witch Hunter — Relentless Pursuit")
    ];
    const question = "What happens if I withdraw with Relentless Pursuit?";
    expect(shouldPromoteExpandedDirectOverview(question, sources)).toBe(false);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("inferred");
  });

  test("does not promote a phase-legality question without a direct timing source for the action", () => {
    const sources = [source("15. Financiers › Financial Capacity", "You may take an Action during Opening and Denouement.")];
    const question = "Can I buy a Deed during Opening?";
    expect(shouldPromoteDirectPhaseLegality(question, sources)).toBe(false);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("inferred");
  });

  test("demotes a genuine printed-card versus Rulebook battle-collateral timing conflict", () => {
    const sources = [
      source(
        "Card: Leveraged Buyout",
        "Action collateral goes to your Graveyard after the purchase; battle collateral goes there when battle cards are cleared."
      ),
      source(
        "15. Financiers › Financier-specific rules › Collateral",
        "Leveraged Buyout collateral used from battle goes to the Graveyard after the purchase."
      ),
      source(
        "Golden Rules",
        "When two rules or effects genuinely conflict, follow the more specific one."
      )
    ];
    expect(hasNamedCardBattleCollateralTimingConflict(sources)).toBe(true);
    expect(normalizeR13RulingStatus("explicit", "How does Leveraged Buyout work?", sources)).toBe("inferred");
    expect(normalizeR13RulingStatus("inferred", "How does Leveraged Buyout work?", sources)).toBe("inferred");
  });

  test("does not manufacture a conflict from compatible named-card coverage", () => {
    const sources = [
      source("Card: Example", "Battle collateral goes to the Graveyard when battle cards are cleared."),
      source("Example timing", "Example battle collateral goes to the Graveyard when battle cards are cleared."),
      source("Golden Rules", "When two rules genuinely conflict, follow the more specific one.")
    ];
    expect(hasNamedCardBattleCollateralTimingConflict(sources)).toBe(false);
    expect(normalizeR13RulingStatus("explicit", "How does Example work?", sources)).toBe("explicit");
  });

  test("forces a referenced but undefined transformed state to provisional", () => {
    const sources = [
      source(
        "Card: Bombardment",
        "Overlay: This Territory's printed effect is inactive. When you attack here: Win — turn this Overlay into Ruins."
      ),
      source(
        "12. Overlays and Other Shared Card Rules › Complete rules",
        "An Overlay is a persistent card attached to a Territory. The top exposed Overlay is active."
      )
    ];
    const question = "Bombardment can tell me to turn its Overlay into Ruins. What rules does published v0.7.1 give for what a Ruins Overlay actually does after that transformation?";
    expect(shouldForceUndefinedTransformationGap(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("provisional");
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("provisional");
  });

  test("does not force provisional when the transformed state is directly defined", () => {
    const sources = [
      source("Card: Example", "Turn this card into a Fortress."),
      source("Fortress", "Fortress is an Overlay. Fortress has +1 defense while exposed.")
    ];
    const question = "This card turns into a Fortress. What does the Fortress do after that transformation?";
    expect(shouldForceUndefinedTransformationGap(question, sources)).toBe(false);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("explicit");
  });
});