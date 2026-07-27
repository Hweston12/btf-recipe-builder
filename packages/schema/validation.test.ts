import { describe, it, expect } from "vitest";
import { validateFoodRestrictions } from "./index";
import type { MedicalRestrictions, FoodPreferences } from "./index";

function restrictions(absoluteExclusions: string[], foodsToLimit: string[] = []): MedicalRestrictions {
  return { absoluteExclusions, glutenFree: false, foodsToLimit };
}

function preferences(
  preferred: string[] = [],
  acceptable: string[] = [],
  useSparingly: string[] = [],
  excluded: string[] = []
): FoodPreferences {
  return { preferred, acceptable, useSparingly, excluded };
}

describe("validateFoodRestrictions", () => {
  it("returns no contradictions for a clean intake", () => {
    const r = restrictions(["peanut"]);
    const p = preferences(["chicken", "oats"], ["rice", "beans"]);
    expect(validateFoodRestrictions(r, p)).toEqual([]);
  });

  it("flags a single contradiction when an exclusion is also preferred", () => {
    const r = restrictions(["peanut"]);
    const p = preferences(["peanut", "oats"]);
    const result = validateFoodRestrictions(r, p);
    expect(result).toHaveLength(1);
    expect(result[0].ingredient).toBe("peanut");
    expect(result[0].reason).toMatch(/preferred/);
  });

  it("flags a contradiction when an exclusion is also acceptable", () => {
    const r = restrictions(["fish"]);
    const p = preferences([], ["fish", "rice"]);
    const result = validateFoodRestrictions(r, p);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toMatch(/acceptable/);
  });

  it("flags multiple contradictions across multiple exclusions", () => {
    const r = restrictions(["peanut", "fish", "dairy"]);
    const p = preferences(["peanut", "chicken"], ["fish", "rice"]);
    const result = validateFoodRestrictions(r, p);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.ingredient).sort()).toEqual(["fish", "peanut"]);
  });

  it("flags an ingredient in both preferred and acceptable as two separate contradictions", () => {
    const r = restrictions(["peanut"]);
    const p = preferences(["peanut"], ["peanut"]);
    const result = validateFoodRestrictions(r, p);
    expect(result).toHaveLength(2);
  });

  it("matches ingredients regardless of case", () => {
    const r = restrictions(["Peanut"]);
    const p = preferences(["peanut"]);
    expect(validateFoodRestrictions(r, p)).toHaveLength(1);
  });

  it("matches ingredients regardless of surrounding whitespace", () => {
    const r = restrictions([" peanut "]);
    const p = preferences(["peanut"]);
    expect(validateFoodRestrictions(r, p)).toHaveLength(1);
  });

  it("does not flag foodsToLimit overlapping with preferred — that's allowed, not a contradiction", () => {
    const r = restrictions([], ["high sodium broth"]);
    const p = preferences(["high sodium broth"]);
    expect(validateFoodRestrictions(r, p)).toEqual([]);
  });

  it("is pure and does not mutate its inputs", () => {
    const r = restrictions(["peanut"]);
    const p = preferences(["peanut"]);
    const rSnapshot = JSON.parse(JSON.stringify(r));
    const pSnapshot = JSON.parse(JSON.stringify(p));
    validateFoodRestrictions(r, p);
    expect(r).toEqual(rSnapshot);
    expect(p).toEqual(pSnapshot);
  });
});
