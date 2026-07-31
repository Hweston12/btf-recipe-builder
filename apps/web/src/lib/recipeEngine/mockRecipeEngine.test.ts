import { describe, expect, it } from "vitest";
import { generateCandidateRecipes } from "./mockRecipeEngine";
import type { PatientIntake } from "@btf-recipe-builder/schema";

const baseIntake: PatientIntake = {
  patient: { ageYears: 45, sexForDri: "female", weightKg: 60 },
  prescription: {
    caloriesKcal: 1800,
    finalVolumeMl: 1200,
    targetDensityKcalPerMl: 1.5,
    feedsPerDay: 5,
    iddsiTarget: 0,
    macroTargets: {
      carbohydratePercent: [45, 55],
      fatPercent: [25, 35],
      proteinPercent: [15, 25],
    },
    micronutrientMinimumPercentDri: 100,
    doNotExceedUl: true,
  },
  medicalRestrictions: {
    absoluteExclusions: ["peanuts"],
    glutenFree: false,
    foodsToLimit: [],
  },
  foodPreferences: {
    preferred: ["oats", "banana"],
    acceptable: [],
    useSparingly: [],
    excluded: [],
  },
  practicalConstraints: {
    maximumIngredients: 8,
    budgetLevel: "moderate",
    blenderType: "standard",
    preparationFrequency: "daily",
    cuisinePreferences: [],
  },
  feeding: {
    route: "gastrostomy",
    tubeSizeFr: 18,
    delivery: "bolus",
    historyOfClogging: false,
  },
};

describe("generateCandidateRecipes", () => {
  it("returns 2-3 AI-generated, unvalidated candidates with a plain-language disclaimer", async () => {
    const candidates = await generateCandidateRecipes(baseIntake);

    expect(candidates.length).toBeGreaterThanOrEqual(2);
    expect(candidates.length).toBeLessThanOrEqual(3);

    for (const candidate of candidates) {
      expect(candidate.source).toBe("ai_generated");
      expect(candidate.iddsiValidated).toBe(false);
      expect(candidate.estimateDisclaimer.length).toBeGreaterThan(0);
      expect(candidate.ingredients.length).toBeGreaterThan(0);
    }
  });

  it("never includes an absolutely excluded ingredient", async () => {
    const intake: PatientIntake = {
      ...baseIntake,
      medicalRestrictions: {
        ...baseIntake.medicalRestrictions,
        absoluteExclusions: ["peanut butter", "chicken breast"],
      },
    };

    const candidates = await generateCandidateRecipes(intake);

    for (const candidate of candidates) {
      const names = candidate.ingredients.map((i) => i.name.toLowerCase());
      expect(names).not.toContain("peanut butter");
      expect(names).not.toContain("chicken breast");
    }
  });

  it("caps ingredient count at practicalConstraints.maximumIngredients", async () => {
    const intake: PatientIntake = {
      ...baseIntake,
      practicalConstraints: { ...baseIntake.practicalConstraints, maximumIngredients: 2 },
    };

    const candidates = await generateCandidateRecipes(intake);

    for (const candidate of candidates) {
      expect(candidate.ingredients.length).toBeLessThanOrEqual(2);
    }
  });
});
