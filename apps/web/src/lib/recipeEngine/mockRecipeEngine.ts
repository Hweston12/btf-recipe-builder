import type { PatientIntake } from "@btf-recipe-builder/schema";
import type { CandidateRecipe, NutrientValues } from "./types";

const ESTIMATE_DISCLAIMER =
  "Estimated — not a substitute for a verified nutrient analysis.";

interface IngredientFixture {
  name: string;
  baseGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
}

const INGREDIENT_POOL: IngredientFixture[] = [
  { name: "oats", baseGrams: 150, caloriesPer100g: 375, proteinPer100g: 13, carbPer100g: 66, fatPer100g: 7, fiberPer100g: 10 },
  { name: "banana", baseGrams: 100, caloriesPer100g: 89, proteinPer100g: 1.1, carbPer100g: 23, fatPer100g: 0.3, fiberPer100g: 2.6 },
  { name: "chicken breast", baseGrams: 150, caloriesPer100g: 165, proteinPer100g: 31, carbPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0 },
  { name: "whole milk", baseGrams: 200, caloriesPer100g: 61, proteinPer100g: 3.2, carbPer100g: 4.8, fatPer100g: 3.3, fiberPer100g: 0 },
  { name: "olive oil", baseGrams: 15, caloriesPer100g: 884, proteinPer100g: 0, carbPer100g: 0, fatPer100g: 100, fiberPer100g: 0 },
  { name: "spinach", baseGrams: 60, caloriesPer100g: 23, proteinPer100g: 2.9, carbPer100g: 3.6, fatPer100g: 0.4, fiberPer100g: 2.2 },
  { name: "sweet potato", baseGrams: 150, caloriesPer100g: 90, proteinPer100g: 2, carbPer100g: 21, fatPer100g: 0.1, fiberPer100g: 3.3 },
  { name: "peanut butter", baseGrams: 30, caloriesPer100g: 588, proteinPer100g: 25, carbPer100g: 20, fatPer100g: 50, fiberPer100g: 6 },
  { name: "plain yogurt", baseGrams: 150, caloriesPer100g: 61, proteinPer100g: 3.5, carbPer100g: 4.7, fatPer100g: 3.3, fiberPer100g: 0 },
  { name: "avocado", baseGrams: 100, caloriesPer100g: 160, proteinPer100g: 2, carbPer100g: 8.5, fatPer100g: 14.7, fiberPer100g: 6.7 },
];

const CANDIDATE_SELECTIONS: string[][] = [
  ["oats", "banana", "chicken breast", "whole milk", "olive oil"],
  ["sweet potato", "chicken breast", "plain yogurt", "spinach", "olive oil"],
  ["oats", "peanut butter", "banana", "whole milk", "avocado"],
];

function isExcluded(name: string, intake: PatientIntake): boolean {
  const lower = name.toLowerCase();
  const excludedNames = [
    ...intake.medicalRestrictions.absoluteExclusions,
    ...intake.foodPreferences.excluded,
  ].map((n) => n.toLowerCase());
  return excludedNames.some((excluded) => lower.includes(excluded) || excluded.includes(lower));
}

function buildCandidate(
  id: string,
  label: string,
  ingredientNames: string[],
  intake: PatientIntake
): CandidateRecipe {
  const maxIngredients = intake.practicalConstraints.maximumIngredients || ingredientNames.length;
  const selected = ingredientNames
    .filter((name) => !isExcluded(name, intake))
    .slice(0, maxIngredients)
    .map((name) => INGREDIENT_POOL.find((i) => i.name === name))
    .filter((fixture): fixture is IngredientFixture => fixture !== undefined);

  const rawTotalCalories = selected.reduce(
    (sum, i) => sum + (i.caloriesPer100g * i.baseGrams) / 100,
    0
  );
  const scaleFactor =
    rawTotalCalories > 0 ? intake.prescription.caloriesKcal / rawTotalCalories : 1;

  const ingredients = selected.map((i) => ({
    name: i.name,
    grams: Math.round((i.baseGrams * scaleFactor) / 5) * 5,
  }));

  const totals = selected.reduce(
    (sum, i) => {
      const grams = i.baseGrams * scaleFactor;
      return {
        caloriesKcal: sum.caloriesKcal + (i.caloriesPer100g * grams) / 100,
        proteinGrams: sum.proteinGrams + (i.proteinPer100g * grams) / 100,
        carbohydrateGrams: sum.carbohydrateGrams + (i.carbPer100g * grams) / 100,
        fatGrams: sum.fatGrams + (i.fatPer100g * grams) / 100,
        fiberGrams: sum.fiberGrams + (i.fiberPer100g * grams) / 100,
      };
    },
    { caloriesKcal: 0, proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0, fiberGrams: 0 }
  );

  const fluidMl = intake.prescription.finalVolumeMl;
  const aiEstimatedValues: NutrientValues = {
    caloriesKcal: Math.round(totals.caloriesKcal),
    proteinGrams: Math.round(totals.proteinGrams * 10) / 10,
    carbohydrateGrams: Math.round(totals.carbohydrateGrams * 10) / 10,
    fatGrams: Math.round(totals.fatGrams * 10) / 10,
    fiberGrams: Math.round(totals.fiberGrams * 10) / 10,
    fluidMl,
    densityKcalPerMl: Math.round((totals.caloriesKcal / fluidMl) * 1000) / 1000,
  };

  return {
    id,
    label,
    source: "ai_generated",
    ingredients,
    aiEstimatedValues,
    estimateDisclaimer: ESTIMATE_DISCLAIMER,
    iddsiValidated: false,
    informationalNote: intake.foodPreferences.preferred.length > 0
      ? `Built around your preferred foods where possible: ${intake.foodPreferences.preferred.slice(0, 3).join(", ")}.`
      : undefined,
  };
}

/**
 * Stands in for the real recipe engine (architecture-plan.md §3, "Recipe
 * engine" row) — a future server-side Claude call behind an API route. This
 * mock is deliberately async and returns a Promise, even though it resolves
 * immediately with fixture-derived data, so the call site (Step5GenerateReview)
 * already handles the loading/error shape the real fetch() will need. When the
 * real recipe engine lands, only this file's implementation should need to
 * change — the signature and the CandidateRecipe shape should not.
 */
export async function generateCandidateRecipes(
  intake: PatientIntake
): Promise<CandidateRecipe[]> {
  return CANDIDATE_SELECTIONS.map((names, index) =>
    buildCandidate(`candidate-${index + 1}`, `Option ${index + 1}`, names, intake)
  ).filter((candidate) => candidate.ingredients.length > 0);
}
