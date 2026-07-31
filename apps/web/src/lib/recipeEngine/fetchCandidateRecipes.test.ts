import { describe, it, expect, afterEach, vi } from "vitest";
import type { PatientIntake } from "@btf-recipe-builder/schema";
import type { CandidateRecipe } from "./types";
import { fetchCandidateRecipes } from "./fetchCandidateRecipes";

const intake = {} as PatientIntake;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCandidateRecipes", () => {
  it("resolves with the parsed candidate list on success", async () => {
    const candidates: CandidateRecipe[] = [
      {
        id: "candidate-1",
        label: "Option 1",
        source: "ai_generated",
        ingredients: [{ name: "oats", grams: 100 }],
        aiEstimatedValues: {
          caloriesKcal: 500,
          proteinGrams: 20,
          carbohydrateGrams: 60,
          fatGrams: 15,
          fiberGrams: 8,
          fluidMl: 1500,
          densityKcalPerMl: 0.33,
        },
        estimateDisclaimer: "Estimated.",
        iddsiValidated: false,
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(candidates), { status: 200 }))
    );

    const result = await fetchCandidateRecipes(intake);
    expect(result).toEqual(candidates);
  });

  it("throws with the server's error message on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Intake failed validation." }), { status: 400 })
      )
    );

    await expect(fetchCandidateRecipes(intake)).rejects.toThrow("Intake failed validation.");
  });

  it("propagates a network-level rejection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(fetchCandidateRecipes(intake)).rejects.toThrow("network down");
  });
});
