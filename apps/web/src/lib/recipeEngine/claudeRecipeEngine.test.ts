import { describe, expect, it, vi } from "vitest";
import type { PatientIntake } from "@btf-recipe-builder/schema";
import {
  buildPrompt,
  buildRecipeResponseSchema,
  estimateCostUsd,
  generateCandidateRecipes,
  toCandidateRecipe,
  type AiRecipe,
  type RecipeGenerationClient,
} from "./claudeRecipeEngine";
import { buildAllowedIngredientPool, FOOD_CATALOG } from "@btf-recipe-builder/schema";

function baseIntake(overrides: Partial<PatientIntake> = {}): PatientIntake {
  return {
    patient: { ageYears: 10, sexForDri: "female", weightKg: 30 },
    prescription: {
      caloriesKcal: 1200,
      finalVolumeMl: 1000,
      targetDensityKcalPerMl: 1.2,
      feedsPerDay: 4,
      iddsiTarget: 0,
      macroTargets: {
        carbohydratePercent: [40, 50],
        fatPercent: [25, 35],
        proteinPercent: [15, 25],
      },
      micronutrientMinimumPercentDri: 100,
      doNotExceedUl: true,
    },
    medicalRestrictions: { absoluteExclusions: [], glutenFree: false, foodsToLimit: [] },
    foodPreferences: { preferred: ["Banana"], acceptable: ["Carrots"], excluded: [] },
    practicalConstraints: { maximumIngredients: 5, blenderType: "standard" },
    feeding: { route: "G-tube", tubeSizeFr: 14, delivery: "bolus", historyOfClogging: false },
    ...overrides,
  };
}

function aiRecipe(overrides: Partial<AiRecipe> = {}): AiRecipe {
  return {
    label: "Banana Blend",
    ingredients: [{ foodId: "banana", grams: 100 }],
    aiEstimatedValues: {
      caloriesKcal: 400,
      proteinGrams: 10,
      carbohydrateGrams: 50,
      fatGrams: 10,
      fiberGrams: 5,
    },
    ...overrides,
  };
}

function fakeClient(parsed_output: unknown): RecipeGenerationClient {
  return { messages: { parse: vi.fn().mockResolvedValue({ parsed_output }) } };
}

describe("buildRecipeResponseSchema", () => {
  it("throws when the allowed id list is empty", () => {
    expect(() => buildRecipeResponseSchema([])).toThrow(/every catalog food is excluded/);
  });

  it("rejects a foodId outside the allowed list", () => {
    const schema = buildRecipeResponseSchema(["banana"]);
    const result = schema.safeParse({ recipes: [aiRecipe({ ingredients: [{ foodId: "chicken", grams: 100 }] })] });
    expect(result.success).toBe(false);
  });

  it("accepts a foodId inside the allowed list", () => {
    const schema = buildRecipeResponseSchema(["banana"]);
    const result = schema.safeParse({ recipes: [aiRecipe()] });
    expect(result.success).toBe(true);
  });
});

describe("buildPrompt", () => {
  it("never mentions a custom/free-text preferred food", () => {
    const intake = baseIntake({
      foodPreferences: { preferred: ["Banana", "Dragonfruit"], acceptable: [], excluded: [] },
    });
    const pool = buildAllowedIngredientPool(intake.medicalRestrictions, intake.foodPreferences);
    const { user } = buildPrompt(intake, pool);

    expect(user).toContain("banana");
    expect(user.toLowerCase()).not.toContain("dragonfruit");
  });

  it("includes the prescription and practical constraints", () => {
    const intake = baseIntake();
    const pool = buildAllowedIngredientPool(intake.medicalRestrictions, intake.foodPreferences);
    const { user } = buildPrompt(intake, pool);

    expect(user).toContain("1200 kcal");
    expect(user).toContain("1000 mL");
    expect(user).toContain("maximum 5 ingredients");
    expect(user).toContain("standard blender");
  });

  it("lists foodsToLimit as a soft cap, not an exclusion", () => {
    const intake = baseIntake({
      medicalRestrictions: {
        absoluteExclusions: [],
        glutenFree: false,
        foodsToLimit: ["Sodium-heavy broth"],
      },
    });
    const pool = buildAllowedIngredientPool(intake.medicalRestrictions, intake.foodPreferences);
    const { user } = buildPrompt(intake, pool);

    expect(user).toContain("limited quantity");
    expect(user).toContain("Sodium-heavy broth");
  });

  it("instructs the model never to mention IDDSI/texture", () => {
    const intake = baseIntake();
    const pool = buildAllowedIngredientPool(intake.medicalRestrictions, intake.foodPreferences);
    const { system } = buildPrompt(intake, pool);

    expect(system.toLowerCase()).toContain("iddsi");
  });
});

describe("toCandidateRecipe", () => {
  it("maps ingredients, hardcodes provenance fields, and computes density from calories", () => {
    const intake = baseIntake();
    const candidate = toCandidateRecipe(aiRecipe(), 0, intake);

    expect(candidate).not.toBeNull();
    expect(candidate!.id).toBe("candidate-1");
    expect(candidate!.source).toBe("ai_generated");
    expect(candidate!.iddsiValidated).toBe(false);
    expect(candidate!.estimateDisclaimer).toMatch(/estimated/i);
    expect(candidate!.ingredients).toEqual([{ name: "Banana", grams: 100 }]);
    expect(candidate!.aiEstimatedValues.fluidMl).toBe(1000);
    expect(candidate!.aiEstimatedValues.densityKcalPerMl).toBe(0.4); // 400 / 1000
  });

  it("drops an ingredient id that doesn't resolve in the catalog (defense in depth)", () => {
    const intake = baseIntake();
    const candidate = toCandidateRecipe(
      aiRecipe({
        ingredients: [
          { foodId: "banana", grams: 100 },
          { foodId: "not-a-real-id", grams: 50 },
        ],
      }),
      0,
      intake
    );

    expect(candidate!.ingredients).toEqual([{ name: "Banana", grams: 100 }]);
  });

  it("returns null when every ingredient is unresolvable", () => {
    const intake = baseIntake();
    const candidate = toCandidateRecipe(
      aiRecipe({ ingredients: [{ foodId: "not-a-real-id", grams: 50 }] }),
      0,
      intake
    );
    expect(candidate).toBeNull();
  });

  it("rounds grams to the nearest 5", () => {
    const intake = baseIntake();
    const candidate = toCandidateRecipe(
      aiRecipe({ ingredients: [{ foodId: "banana", grams: 103 }] }),
      0,
      intake
    );
    expect(candidate!.ingredients[0].grams).toBe(105);
  });

  it("never lets the AI set iddsiValidated even implicitly — the field isn't in its schema", () => {
    // toCandidateRecipe's input type (AiRecipe) has no iddsiValidated field at
    // all, so this is a compile-time guarantee; this test documents the intent.
    const intake = baseIntake();
    const candidate = toCandidateRecipe(aiRecipe(), 0, intake);
    expect(candidate!.iddsiValidated).toBe(false);
  });
});

describe("generateCandidateRecipes", () => {
  it("maps a happy-path AI response into 3 candidates without calling the network module", async () => {
    const intake = baseIntake();
    const client = fakeClient({
      recipes: [
        aiRecipe({ label: "Recipe A" }),
        aiRecipe({ label: "Recipe B" }),
        aiRecipe({ label: "Recipe C" }),
      ],
    });

    const candidates = await generateCandidateRecipes(intake, client);

    expect(candidates).toHaveLength(3);
    expect(candidates.map((c) => c.label)).toEqual(["Recipe A", "Recipe B", "Recipe C"]);
    expect(candidates.every((c) => c.iddsiValidated === false)).toBe(true);
  });

  it("throws before calling the client when the allowed pool is empty", async () => {
    const everyFoodName = FOOD_CATALOG.flatMap((category) =>
      category.items.map((item) => item.name)
    );
    const intake = baseIntake({
      foodPreferences: { preferred: [], acceptable: [], excluded: everyFoodName },
    });
    const client = fakeClient({ recipes: [aiRecipe()] });

    await expect(generateCandidateRecipes(intake, client)).rejects.toThrow(
      /every catalog food is excluded/
    );
    expect(client.messages.parse).not.toHaveBeenCalled();
  });

  it("throws when parsed_output is null", async () => {
    const intake = baseIntake();
    const client = fakeClient(null);
    await expect(generateCandidateRecipes(intake, client)).rejects.toThrow(/could not be parsed/);
  });

  it("throws when zero candidates survive filtering", async () => {
    const intake = baseIntake();
    const client = fakeClient({
      recipes: [aiRecipe({ ingredients: [{ foodId: "not-a-real-id", grams: 50 }] })],
    });
    // The Zod enum would normally reject this before it gets here — this
    // simulates the case where mapping still yields nothing usable.
    await expect(generateCandidateRecipes(intake, client)).rejects.toThrow();
  });

  it("passes the model, max_tokens, and structured-output config on every call", async () => {
    const intake = baseIntake();
    const parseSpy = vi.fn().mockResolvedValue({ parsed_output: { recipes: [aiRecipe()] } });
    const client: RecipeGenerationClient = { messages: { parse: parseSpy } };

    await generateCandidateRecipes(intake, client);

    expect(parseSpy).toHaveBeenCalledTimes(1);
    const params = parseSpy.mock.calls[0][0];
    expect(params.model).toBe("claude-opus-5");
    expect(params.output_config.effort).toBe("medium");
    expect(params.output_config.format).toBeDefined();
  });

  it("defaults to medium effort but sends a caller-supplied effort instead", async () => {
    const intake = baseIntake();
    const parseSpy = vi.fn().mockResolvedValue({ parsed_output: { recipes: [aiRecipe()] } });
    const client: RecipeGenerationClient = { messages: { parse: parseSpy } };

    await generateCandidateRecipes(intake, client, "low");

    expect(parseSpy.mock.calls[0][0].output_config.effort).toBe("low");
  });

  it("logs usage with a cost estimate when the response includes it", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const intake = baseIntake();
    const client: RecipeGenerationClient = {
      messages: {
        parse: vi.fn().mockResolvedValue({
          parsed_output: { recipes: [aiRecipe()] },
          usage: {
            input_tokens: 1000,
            output_tokens: 2000,
            output_tokens_details: { thinking_tokens: 1500 },
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
        }),
      },
    };

    await generateCandidateRecipes(intake, client, "medium");

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("effort=medium"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("input_tokens=1000"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("output_tokens=2000"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("thinking_tokens=1500"));
    // 1000 * (5/1e6) + 2000 * (25/1e6) = 0.005 + 0.05 = 0.055
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("estimated_cost_usd=0.0550"));

    logSpy.mockRestore();
  });

  it("does not log usage when the response omits it", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const intake = baseIntake();
    const client = fakeClient({ recipes: [aiRecipe()] });

    await generateCandidateRecipes(intake, client);

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

describe("estimateCostUsd", () => {
  it("prices input and output tokens at the documented per-token rate", () => {
    const cost = estimateCostUsd({ input_tokens: 1_000_000, output_tokens: 0 });
    expect(cost).toBeCloseTo(5, 5);

    const outputCost = estimateCostUsd({ input_tokens: 0, output_tokens: 1_000_000 });
    expect(outputCost).toBeCloseTo(25, 5);
  });

  it("prices a cache write at 1.25x and a cache read at 0.1x the input rate", () => {
    const writeCost = estimateCostUsd({
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 1_000_000,
    });
    expect(writeCost).toBeCloseTo(5 * 1.25, 5);

    const readCost = estimateCostUsd({
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 1_000_000,
    });
    expect(readCost).toBeCloseTo(5 * 0.1, 5);
  });

  it("treats missing cache fields as zero", () => {
    expect(estimateCostUsd({ input_tokens: 100, output_tokens: 100 })).toBeGreaterThan(0);
  });
});
