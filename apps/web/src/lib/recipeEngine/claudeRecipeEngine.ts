import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  buildAllowedIngredientPool,
  findCatalogItem,
  type AllowedIngredientPool,
  type FoodCatalogItem,
  type PatientIntake,
} from "@btf-recipe-builder/schema";
import type { CandidateIngredient, CandidateRecipe, NutrientValues } from "./types";

const MODEL = "claude-opus-5";

/** Per-1M-token pricing for MODEL, current as of writing — update if MODEL changes. */
const PRICE_PER_MILLION_TOKENS = { input: 5, output: 25 } as const;

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

const ESTIMATE_DISCLAIMER = "Estimated — not a substitute for a verified nutrient analysis.";

/**
 * Real recipe engine (architecture-plan.md §3, "Recipe engine" row) — replaces the earlier
 * mockRecipeEngine.ts fixture. Calls Claude with a structured, validated PatientIntake (never a
 * raw user string — CLAUDE.md's "structured input over free text" rule) and constrains it to
 * FOOD_CATALOG via buildAllowedIngredientPool: the ingredient schema's foodId field is a Zod enum
 * of only the allowed ids, so an out-of-pool ingredient fails to parse before it ever reaches this
 * file's code, and toCandidateRecipe re-checks anyway as defense in depth.
 *
 * IDDSI is never asked of the model and never appears in its output schema — iddsiValidated is
 * hardcoded false in toCandidateRecipe, the same non-negotiable enforced in code (not just UX
 * copy) that packages/calculation/iddsi.ts enforces for the physical flow test itself.
 */

let cachedClient: Anthropic | null = null;

/** Lazily constructs a singleton client. Reads ANTHROPIC_API_KEY from the environment via the
 * SDK's own credential resolution — never read directly in this file. */
function getAnthropicClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

const AiIngredientSchema = (allowedIds: [string, ...string[]]) =>
  z.object({
    foodId: z.enum(allowedIds),
    grams: z.number().positive(),
  });

const AiRecipeSchema = (allowedIds: [string, ...string[]]) =>
  z.object({
    label: z.string().min(1).max(60),
    ingredients: z.array(AiIngredientSchema(allowedIds)).min(1),
    aiEstimatedValues: z.object({
      caloriesKcal: z.number().nonnegative(),
      proteinGrams: z.number().nonnegative(),
      carbohydrateGrams: z.number().nonnegative(),
      fatGrams: z.number().nonnegative(),
      fiberGrams: z.number().nonnegative(),
    }),
    informationalNote: z.string().max(280).optional(),
  });

/** Pure. The Zod schema for one API call's response, scoped to that call's allowed pool. */
export function buildRecipeResponseSchema(allowedIds: string[]) {
  if (allowedIds.length === 0) {
    throw new Error(
      "No ingredients are available for these restrictions — every catalog food is excluded."
    );
  }
  const [first, ...rest] = allowedIds;
  return z.object({
    recipes: z.array(AiRecipeSchema([first, ...rest])).min(1).max(3),
  });
}

export type AiRecipe = z.infer<ReturnType<typeof AiRecipeSchema>>;

function formatItem(item: FoodCatalogItem): string {
  return `${item.id} (${item.name})`;
}

/** Pure. Builds the system/user prompt from a structured intake and the precomputed pool. */
export function buildPrompt(
  intake: PatientIntake,
  pool: AllowedIngredientPool
): { system: string; user: string } {
  const system = [
    "You generate blenderized tube feeding (BTF) recipes for a structured recipe-builder app.",
    "You respond with structured data only, via the provided response schema — never prose outside it.",
    "You must never select an ingredient outside the allowed ingredient list given to you; the schema enforces this, but do not attempt to work around it.",
    "You must never state, imply, or predict an IDDSI level or texture description for the recipe. Texture is determined later by a physical syringe flow test the family performs themselves, never from ingredients.",
    "Nutrient values you provide are estimates, not verified lab or database values — the app labels them as such automatically; you don't need to caveat this yourself in the note.",
    "Generate exactly 3 recipes that are meaningfully different from each other (vary the primary protein, grain/starch, and flavor profile where the allowed ingredients permit) — not near-duplicates or trivial ingredient swaps.",
    "Prioritize 'preferred' ingredients. Use 'acceptable' or 'neutral' ingredients as needed to round out nutrition — the family expressed no objection to them, just no strong preference.",
    "Treat foods listed under 'limit' as allowed but only in a modest quantity (relatively low grams) if used — they are not forbidden.",
    "Keep each recipe's ingredient count at or under the given maximum.",
  ].join(" ");

  const patient = intake.patient;
  const prescription = intake.prescription;
  const constraints = intake.practicalConstraints;
  const restrictions = intake.medicalRestrictions;

  const poolLines = (label: string, items: FoodCatalogItem[]) =>
    items.length > 0 ? `${label}:\n${items.map((i) => `- ${formatItem(i)}`).join("\n")}` : null;

  const userSections = [
    `Patient: ${patient.ageYears} years old, ${patient.sexForDri}, ${patient.weightKg} kg.`,
    `Prescription target: ${prescription.caloriesKcal} kcal total, delivered in ${prescription.finalVolumeMl} mL final volume (target density ${prescription.targetDensityKcalPerMl} kcal/mL), ${prescription.feedsPerDay} feeds/day.`,
    `Macro targets (percent of total calories): carbohydrate ${prescription.macroTargets.carbohydratePercent[0]}-${prescription.macroTargets.carbohydratePercent[1]}%, fat ${prescription.macroTargets.fatPercent[0]}-${prescription.macroTargets.fatPercent[1]}%, protein ${prescription.macroTargets.proteinPercent[0]}-${prescription.macroTargets.proteinPercent[1]}%.`,
    `Micronutrient minimum: ${prescription.micronutrientMinimumPercentDri}% of DRI.`,
    `Practical constraints: maximum ${constraints.maximumIngredients} ingredients per recipe, ${constraints.blenderType} blender available.`,
    restrictions.foodsToLimit.length > 0
      ? `Foods to use only in limited quantity if used: ${restrictions.foodsToLimit.join(", ")}.`
      : null,
    "Allowed ingredients — you may ONLY select foodId values from this list:",
    poolLines("Preferred (prioritize these)", pool.preferred),
    poolLines("Acceptable (fine to use)", pool.acceptable),
    poolLines("Neutral (no stated preference, still allowed)", pool.neutral),
  ].filter((line): line is string => line !== null);

  return { system, user: userSections.join("\n\n") };
}

/**
 * Pure. Maps one AI-returned recipe into a CandidateRecipe, filling in every field the AI must
 * never control and dropping any ingredient id that doesn't resolve in the catalog — defense in
 * depth alongside the schema's enum constraint.
 */
export function toCandidateRecipe(
  aiRecipe: AiRecipe,
  index: number,
  intake: PatientIntake
): CandidateRecipe | null {
  const ingredients: CandidateIngredient[] = aiRecipe.ingredients
    .filter((ingredient) => findCatalogItem(ingredient.foodId) !== undefined)
    .map((ingredient) => ({
      name: findCatalogItem(ingredient.foodId)!.name,
      grams: Math.max(5, Math.round(ingredient.grams / 5) * 5),
    }));

  if (ingredients.length === 0) return null;

  const fluidMl = intake.prescription.finalVolumeMl;
  const caloriesKcal = Math.round(aiRecipe.aiEstimatedValues.caloriesKcal);
  const aiEstimatedValues: NutrientValues = {
    caloriesKcal,
    proteinGrams: round1(aiRecipe.aiEstimatedValues.proteinGrams),
    carbohydrateGrams: round1(aiRecipe.aiEstimatedValues.carbohydrateGrams),
    fatGrams: round1(aiRecipe.aiEstimatedValues.fatGrams),
    fiberGrams: round1(aiRecipe.aiEstimatedValues.fiberGrams),
    fluidMl,
    densityKcalPerMl: fluidMl > 0 ? Math.round((caloriesKcal / fluidMl) * 1000) / 1000 : 0,
  };

  return {
    id: `candidate-${index + 1}`,
    label: aiRecipe.label,
    source: "ai_generated",
    ingredients,
    aiEstimatedValues,
    estimateDisclaimer: ESTIMATE_DISCLAIMER,
    iddsiValidated: false,
    informationalNote: aiRecipe.informationalNote,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** response.usage's shape, narrowed to the fields logUsage/estimateCostUsd read. */
export interface ResponseUsage {
  input_tokens: number;
  output_tokens: number;
  output_tokens_details?: { thinking_tokens: number } | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

/**
 * Pure. output_tokens is already the inclusive, billed total (thinking tokens
 * included) — output_tokens_details.thinking_tokens is a breakdown of it, not
 * an addition to it. Cache writes bill at 1.25x input price, cache reads at
 * 0.1x; both are 0 today since no cache_control is set anywhere in this file.
 */
export function estimateCostUsd(usage: ResponseUsage): number {
  const inputRate = PRICE_PER_MILLION_TOKENS.input / 1_000_000;
  const outputRate = PRICE_PER_MILLION_TOKENS.output / 1_000_000;
  return (
    usage.input_tokens * inputRate +
    usage.output_tokens * outputRate +
    (usage.cache_creation_input_tokens ?? 0) * inputRate * 1.25 +
    (usage.cache_read_input_tokens ?? 0) * inputRate * 0.1
  );
}

/**
 * Logs every call's real token spend, so future cost questions have numbers
 * instead of estimates. Not gated behind a debug flag — this is the only
 * place usage is ever recorded, and it's cheap (one console line).
 */
function logUsage(usage: ResponseUsage, effort: Effort): void {
  const thinking = usage.output_tokens_details?.thinking_tokens;
  console.log(
    `[claudeRecipeEngine] usage model=${MODEL} effort=${effort} ` +
      `input_tokens=${usage.input_tokens} output_tokens=${usage.output_tokens} ` +
      `thinking_tokens=${thinking ?? "n/a"} ` +
      `cache_write=${usage.cache_creation_input_tokens ?? 0} cache_read=${usage.cache_read_input_tokens ?? 0} ` +
      `estimated_cost_usd=${estimateCostUsd(usage).toFixed(4)}`
  );
}

/** The subset of the Anthropic client this engine needs — narrow enough to fake in tests
 * without mocking the SDK module. */
export interface RecipeGenerationClient {
  messages: {
    parse: (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<{
      parsed_output: unknown;
      usage?: ResponseUsage;
    }>;
  };
}

export async function generateCandidateRecipes(
  intake: PatientIntake,
  client: RecipeGenerationClient = getAnthropicClient(),
  // "medium" chosen over "high" after comparing real calls at low/medium/high on this task:
  // roughly half the cost and half the wait of "high", while still noticeably more thorough
  // (thinking tokens, caregiving-note detail) than "low".
  effort: Effort = "medium"
): Promise<CandidateRecipe[]> {
  const pool = buildAllowedIngredientPool(intake.medicalRestrictions, intake.foodPreferences);
  const allowedIds = [...pool.preferred, ...pool.acceptable, ...pool.neutral].map((i) => i.id);

  if (allowedIds.length === 0) {
    throw new Error(
      "No ingredients are available for these restrictions — every catalog food is excluded."
    );
  }

  const schema = buildRecipeResponseSchema(allowedIds);
  const { system, user } = buildPrompt(intake, pool);

  let parsedOutput: unknown;
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort, format: zodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: user }],
    });
    parsedOutput = response.parsed_output;
    if (response.usage) logUsage(response.usage, effort);
  } catch (error) {
    logEngineError(error);
    throw new Error("Recipe generation failed while calling the AI service.");
  }

  if (parsedOutput === null || parsedOutput === undefined) {
    throw new Error("The AI service returned a response that could not be parsed.");
  }

  const { recipes } = schema.parse(parsedOutput);

  const candidates = recipes
    .map((recipe, index) => toCandidateRecipe(recipe, index, intake))
    .filter((candidate): candidate is CandidateRecipe => candidate !== null);

  if (candidates.length === 0) {
    throw new Error("The AI service did not return any usable recipes.");
  }

  return candidates;
}

function logEngineError(error: unknown): void {
  if (error instanceof Anthropic.AuthenticationError) {
    console.error("[claudeRecipeEngine] Authentication failed — check ANTHROPIC_API_KEY.", error);
  } else if (error instanceof Anthropic.RateLimitError) {
    console.error("[claudeRecipeEngine] Rate limited by the Anthropic API.", error);
  } else if (error instanceof Anthropic.APIConnectionError) {
    console.error("[claudeRecipeEngine] Could not connect to the Anthropic API.", error);
  } else if (error instanceof Anthropic.APIError) {
    console.error(`[claudeRecipeEngine] Anthropic API error (${error.status}).`, error);
  } else {
    console.error("[claudeRecipeEngine] Unexpected error calling the recipe engine.", error);
  }
}
