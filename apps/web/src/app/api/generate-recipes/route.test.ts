// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PatientIntake } from "@btf-recipe-builder/schema";
import { evaluateMicronutrientIntake, MICRONUTRIENT_IDS } from "@btf-recipe-builder/calculation";
import type { CandidateRecipe } from "@/lib/recipeEngine/types";

const aiEstimatedMicronutrients = Object.fromEntries(
  MICRONUTRIENT_IDS.map((id) => [id, 0])
) as CandidateRecipe["aiEstimatedMicronutrients"];

// The route's own job is validation + orchestration — the AI call itself is
// covered by claudeRecipeEngine.test.ts. Mocking it here means these tests
// never hit the network and never depend on a real API key being set.
vi.mock("@/lib/recipeEngine/claudeRecipeEngine", () => ({
  generateCandidateRecipes: vi.fn(),
}));

import { generateCandidateRecipes } from "@/lib/recipeEngine/claudeRecipeEngine";
import { POST } from "./route";

const mockedGenerateCandidateRecipes = vi.mocked(generateCandidateRecipes);

function fixtureCandidate(id: string): CandidateRecipe {
  return {
    id,
    label: "Test Recipe",
    source: "ai_generated",
    ingredients: [{ name: "Banana", grams: 100 }],
    aiEstimatedValues: {
      caloriesKcal: 400,
      proteinGrams: 10,
      carbohydrateGrams: 50,
      fatGrams: 10,
      fiberGrams: 5,
      fluidMl: 1500,
      densityKcalPerMl: 0.267,
    },
    aiEstimatedMicronutrients,
    microNutrientAnalysis: evaluateMicronutrientIntake({
      estimates: aiEstimatedMicronutrients,
      ageYears: 45,
      sexForDri: "female",
      goalPercentDri: 100,
      doNotExceedUl: true,
    }),
    estimateDisclaimer: "Estimated — not a substitute for a verified nutrient analysis.",
    iddsiValidated: false,
  };
}

function validIntake(): PatientIntake {
  return {
    patient: { ageYears: 45, sexForDri: "female", weightKg: 68 },
    prescription: {
      caloriesKcal: 1800,
      finalVolumeMl: 1500,
      targetDensityKcalPerMl: 1.2,
      feedsPerDay: 4,
      iddsiTarget: 2,
      macroTargets: {
        carbohydratePercent: [40, 50],
        fatPercent: [25, 35],
        proteinPercent: [15, 25],
      },
      micronutrientMinimumPercentDri: 100,
      doNotExceedUl: true,
    },
    medicalRestrictions: {
      absoluteExclusions: ["peanut"],
      glutenFree: true,
      foodsToLimit: ["sodium"],
    },
    foodPreferences: {
      preferred: ["chicken"],
      acceptable: ["rice"],
      excluded: ["fish"],
    },
    practicalConstraints: {
      maximumIngredients: 6,
      blenderType: "high-powered",
    },
    feeding: {
      route: "G-tube",
      tubeSizeFr: 14,
      delivery: "bolus",
      historyOfClogging: false,
    },
  };
}

function requestFor(body: unknown): Request {
  return new Request("http://localhost/api/generate-recipes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/generate-recipes", () => {
  beforeEach(() => {
    mockedGenerateCandidateRecipes.mockReset();
  });

  it("returns 200 with an array of candidate recipes for a valid intake", async () => {
    mockedGenerateCandidateRecipes.mockResolvedValue([
      fixtureCandidate("candidate-1"),
      fixtureCandidate("candidate-2"),
      fixtureCandidate("candidate-3"),
    ]);

    const response = await POST(requestFor(validIntake()));
    expect(response.status).toBe(200);
    const candidates = await response.json();
    expect(Array.isArray(candidates)).toBe(true);
    expect(candidates.length).toBe(3);
    expect(mockedGenerateCandidateRecipes).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when the recipe engine throws", async () => {
    mockedGenerateCandidateRecipes.mockRejectedValue(new Error("AI service unavailable"));

    const response = await POST(requestFor(validIntake()));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(requestFor("not json"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 with issues for a structurally invalid intake", async () => {
    const intake = validIntake();
    (intake.prescription as { caloriesKcal: number }).caloriesKcal = -100;
    const response = await POST(requestFor(intake));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.some((i: { path: string }) => i.path === "prescription.caloriesKcal")).toBe(
      true
    );
  });

  it("returns 422 with contradictions when an exclusion is also preferred", async () => {
    const intake = validIntake();
    intake.medicalRestrictions.absoluteExclusions = ["chicken"];
    intake.foodPreferences.preferred = ["chicken"];
    const response = await POST(requestFor(intake));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.contradictions.length).toBeGreaterThan(0);
  });

  it("returns 422 with a warning when prescription numbers are inconsistent", async () => {
    const intake = validIntake();
    intake.prescription.caloriesKcal = 100;
    intake.prescription.finalVolumeMl = 1500;
    intake.prescription.targetDensityKcalPerMl = 1.2;
    const response = await POST(requestFor(intake));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.warning).toBeTruthy();
  });
});
