import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import RecipeCard from "./RecipeCard";
import type { PatientIntake } from "@btf-recipe-builder/schema";
import type { CandidateRecipe } from "@/lib/recipeEngine/types";

const intake: PatientIntake = {
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
  medicalRestrictions: { absoluteExclusions: [], glutenFree: false, foodsToLimit: [] },
  foodPreferences: { preferred: [], acceptable: [], useSparingly: [], excluded: [] },
  practicalConstraints: {
    maximumIngredients: 8,
    budgetLevel: "moderate",
    blenderType: "standard",
    preparationFrequency: "daily",
    cuisinePreferences: [],
  },
  feeding: { route: "gastrostomy", tubeSizeFr: 18, delivery: "bolus", historyOfClogging: false },
};

const candidate: CandidateRecipe = {
  id: "candidate-1",
  label: "Option 1",
  source: "ai_generated",
  ingredients: [
    { name: "oats", grams: 150 },
    { name: "banana", grams: 100 },
  ],
  aiEstimatedValues: {
    caloriesKcal: 1800,
    proteinGrams: 60,
    carbohydrateGrams: 220,
    fatGrams: 60,
    fiberGrams: 20,
    fluidMl: 1200,
    densityKcalPerMl: 1.5,
  },
  estimateDisclaimer: "Estimated — not a substitute for a verified nutrient analysis.",
  iddsiValidated: false,
};

describe("RecipeCard", () => {
  it("shows every nutrient value marked as estimated, alongside the disclaimer", () => {
    render(
      <RecipeCard
        intake={intake}
        candidate={candidate}
        verifiedDensity={{
          verifiedDensityKcalPerMl: 1.5,
          percentDeviationFromTarget: 0,
          withinTolerance: true,
          note: "Verified density (1.50 kcal/mL) is within 10% of the target (1.5 kcal/mL).",
        }}
        iddsi={{
          levelName: "Thin",
          confirmedBySyringeTest: true,
          matchesTarget: true,
          note: "Measured level (0) matches the target level (0).",
        }}
      />
    );

    expect(screen.getByText(candidate.estimateDisclaimer)).toBeInTheDocument();
    expect(screen.getAllByText("(estimated)").length).toBe(7);

    expect(screen.getByText("oats")).toBeInTheDocument();
    expect(screen.getByText("150 g")).toBeInTheDocument();

    expect(screen.getByText(/physician or dietitian/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirmed level: Thin/)).toBeInTheDocument();
  });

  it("flags an unconfirmed IDDSI level distinctly from a confirmed one", () => {
    render(
      <RecipeCard
        intake={intake}
        candidate={candidate}
        verifiedDensity={{
          verifiedDensityKcalPerMl: 1.5,
          percentDeviationFromTarget: 0,
          withinTolerance: true,
          note: "within tolerance",
        }}
        iddsi={{
          levelName: "Extremely thick",
          confirmedBySyringeTest: false,
          matchesTarget: false,
          note: "Measured level (4) does not match the target level (0).",
        }}
      />
    );

    expect(screen.getByText(/fork-drip test was recommended/i)).toBeInTheDocument();
  });
});
