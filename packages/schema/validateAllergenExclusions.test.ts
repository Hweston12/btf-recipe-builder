import { describe, expect, it } from "vitest";
import { validateAllergenExclusions } from "./validateAllergenExclusions";
import type { FoodPreferences, MedicalRestrictions } from "./types";

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

describe("validateAllergenExclusions", () => {
  it("returns nothing when no allergens are declared", () => {
    expect(
      validateAllergenExclusions(restrictions(), preferences(["Greek yogurt", "Peanut butter"]))
    ).toEqual([]);
  });

  it("flags a preferred food that contains a declared allergen under another name", () => {
    const result = validateAllergenExclusions(
      restrictions(["Peanuts"]),
      preferences(["Peanut butter"])
    );

    expect(result).toHaveLength(1);
    expect(result[0].ingredient).toBe("Peanut butter");
    expect(result[0].reason).toMatch(/peanuts/);
    expect(result[0].reason).toMatch(/preferred/);
  });

  it("flags an acceptable food too, naming that list", () => {
    const result = validateAllergenExclusions(
      restrictions(["Milk"]),
      preferences([], ["Greek yogurt"])
    );

    expect(result).toHaveLength(1);
    expect(result[0].reason).toMatch(/acceptable/);
  });

  it("flags lactose-free milk under a milk allergy", () => {
    const result = validateAllergenExclusions(
      restrictions(["Milk"]),
      preferences(["Lactose-free whole milk"])
    );

    expect(result).toHaveLength(1);
  });

  it("flags a gluten-containing grain when glutenFree is set", () => {
    const result = validateAllergenExclusions(
      restrictions([], true),
      preferences(["Whole-wheat pasta"])
    );

    expect(result).toHaveLength(1);
    expect(result[0].reason).toMatch(/gluten/);
  });

  it("does not flag an explicitly gluten-free food when glutenFree is set", () => {
    expect(
      validateAllergenExclusions(
        restrictions([], true),
        preferences(["Gluten-free oats", "Quinoa", "Brown rice"])
      )
    ).toEqual([]);
  });

  it("ignores free-text foods that aren't in the catalog", () => {
    expect(
      validateAllergenExclusions(restrictions(["Milk"]), preferences(["Grandma's custard"]))
    ).toEqual([]);
  });

  it("ignores taste-excluded foods — only preferred and acceptable can contradict", () => {
    expect(
      validateAllergenExclusions(restrictions(["Peanuts"]), preferences([], [], ["Peanut butter"]))
    ).toEqual([]);
  });

  it("ignores foodsToLimit, which caps quantity rather than contradicting", () => {
    expect(
      validateAllergenExclusions(
        restrictions([], false, ["Cheddar or other cheese"]),
        preferences(["Cheddar or other cheese"])
      )
    ).toEqual([]);
  });

  it("names every conflicting allergen when a food carries more than one", () => {
    const result = validateAllergenExclusions(
      restrictions(["Wheat"], true),
      preferences(["Regular pasta"])
    );

    expect(result).toHaveLength(1);
    expect(result[0].reason).toMatch(/wheat and gluten/);
  });

  it("reports every conflicting food, not just the first", () => {
    const result = validateAllergenExclusions(
      restrictions(["Milk", "Fish"]),
      preferences(["Greek yogurt", "Salmon"], ["Cottage cheese"])
    );

    expect(result).toHaveLength(3);
  });

  it("matches names case- and whitespace-insensitively", () => {
    const result = validateAllergenExclusions(
      restrictions(["  peanuts "]),
      preferences([" PEANUT BUTTER "])
    );

    expect(result).toHaveLength(1);
  });

  it("does not mutate its inputs", () => {
    const medical = restrictions(["Milk"]);
    const prefs = preferences(["Greek yogurt"]);
    const medicalSnapshot = JSON.stringify(medical);
    const prefsSnapshot = JSON.stringify(prefs);

    validateAllergenExclusions(medical, prefs);

    expect(JSON.stringify(medical)).toBe(medicalSnapshot);
    expect(JSON.stringify(prefs)).toBe(prefsSnapshot);
  });
});
