import { describe, expect, it } from "vitest";
import { buildAllowedIngredientPool } from "./allowedIngredients";
import { FOOD_CATALOG } from "./foodCatalog";
import type { FoodPreferences, MedicalRestrictions } from "./types";

const TOTAL_CATALOG_SIZE = FOOD_CATALOG.reduce((sum, c) => sum + c.items.length, 0);

function restrictions(
  absoluteExclusions: string[] = [],
  glutenFree = false,
  foodsToLimit: string[] = []
): MedicalRestrictions {
  return { absoluteExclusions, glutenFree, foodsToLimit };
}

function preferences(
  preferred: string[] = [],
  acceptable: string[] = [],
  excluded: string[] = []
): FoodPreferences {
  return { preferred, acceptable, excluded };
}

function ids(pool: ReturnType<typeof buildAllowedIngredientPool>) {
  return {
    preferred: pool.preferred.map((i) => i.id),
    acceptable: pool.acceptable.map((i) => i.id),
    neutral: pool.neutral.map((i) => i.id),
  };
}

describe("buildAllowedIngredientPool", () => {
  it("returns the entire catalog as neutral when nothing is restricted or rated", () => {
    const pool = buildAllowedIngredientPool(restrictions(), preferences());

    expect(pool.preferred).toEqual([]);
    expect(pool.acceptable).toEqual([]);
    expect(pool.neutral).toHaveLength(TOTAL_CATALOG_SIZE);
  });

  it("buckets a food into preferred when the family hearted it", () => {
    const pool = buildAllowedIngredientPool(restrictions(), preferences(["Banana"]));
    expect(ids(pool).preferred).toEqual(["banana"]);
    expect(pool.neutral.some((i) => i.id === "banana")).toBe(false);
  });

  it("buckets a food into acceptable when marked okay to use", () => {
    const pool = buildAllowedIngredientPool(restrictions(), preferences([], ["Carrots"]));
    expect(ids(pool).acceptable).toEqual(["carrots"]);
  });

  it("excludes an allergen-tagged food even when it's marked preferred", () => {
    const pool = buildAllowedIngredientPool(
      restrictions(["Peanuts"]),
      preferences(["Peanut butter"])
    );

    expect(pool.preferred.some((i) => i.id === "peanut-butter")).toBe(false);
    expect(pool.neutral.some((i) => i.id === "peanut-butter")).toBe(false);
    expect(pool.acceptable.some((i) => i.id === "peanut-butter")).toBe(false);
  });

  it("excludes every allergen-tagged food across all three buckets, gluten-free included", () => {
    const pool = buildAllowedIngredientPool(restrictions([], true), preferences(["Gluten-free oats"]));

    const allIds = [...pool.preferred, ...pool.acceptable, ...pool.neutral].map((i) => i.id);
    expect(allIds).not.toContain("whole-wheat-pasta");
    expect(allIds).not.toContain("old-fashioned-oats");
    expect(allIds).toContain("gluten-free-oats");
  });

  it("excludes a taste-excluded food from every bucket", () => {
    const pool = buildAllowedIngredientPool(restrictions(), preferences([], [], ["Broccoli"]));
    const allIds = [...pool.preferred, ...pool.acceptable, ...pool.neutral].map((i) => i.id);
    expect(allIds).not.toContain("broccoli");
  });

  it("excludes a food that is both preferred and taste-excluded (exclusion wins)", () => {
    const pool = buildAllowedIngredientPool(restrictions(), preferences(["Broccoli"], [], ["Broccoli"]));
    const allIds = [...pool.preferred, ...pool.acceptable, ...pool.neutral].map((i) => i.id);
    expect(allIds).not.toContain("broccoli");
  });

  it("matches names case- and whitespace-insensitively", () => {
    const pool = buildAllowedIngredientPool(restrictions(), preferences(["  BANANA "]));
    expect(ids(pool).preferred).toEqual(["banana"]);
  });

  it("ignores a preferred name that isn't in the catalog (custom/free-text food)", () => {
    const pool = buildAllowedIngredientPool(restrictions(), preferences(["Dragonfruit"]));
    const allIds = [...pool.preferred, ...pool.acceptable, ...pool.neutral].map((i) => i.id);
    expect(allIds).not.toContain("dragonfruit");
    expect(allIds).toHaveLength(TOTAL_CATALOG_SIZE);
  });

  it("never lets one food land in more than one bucket", () => {
    const pool = buildAllowedIngredientPool(
      restrictions(),
      preferences(["Banana", "Carrots"], ["Carrots"])
    );
    // "Carrots" is in both preferred and acceptable input — preferred wins,
    // and it must not also appear in acceptable or neutral.
    expect(ids(pool).preferred.sort()).toEqual(["banana", "carrots"]);
    expect(pool.acceptable.some((i) => i.id === "carrots")).toBe(false);
    expect(pool.neutral.some((i) => i.id === "carrots")).toBe(false);
  });

  it("does not mutate its inputs", () => {
    const medical = restrictions(["Milk"]);
    const prefs = preferences(["Banana"], ["Carrots"], ["Broccoli"]);
    const medicalSnapshot = JSON.stringify(medical);
    const prefsSnapshot = JSON.stringify(prefs);

    buildAllowedIngredientPool(medical, prefs);

    expect(JSON.stringify(medical)).toBe(medicalSnapshot);
    expect(JSON.stringify(prefs)).toBe(prefsSnapshot);
  });
});
