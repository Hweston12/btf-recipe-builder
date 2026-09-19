import type { MicronutrientAnalysisResult, MicronutrientEstimates } from "@btf-recipe-builder/calculation";

export interface CandidateIngredient {
  name: string;
  grams: number;
}

/** Nutrient values for one candidate recipe. AI-estimated only for now — see aiEstimatedValues below. */
export interface NutrientValues {
  caloriesKcal: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams: number;
  fluidMl: number;
  densityKcalPerMl: number;
}

export interface CandidateRecipe {
  id: string;
  label: string;
  /** Provenance marker, kept even with no clinician-edit tier yet (architecture-plan.md §5). */
  source: "ai_generated";
  ingredients: CandidateIngredient[];
  /**
   * AI-estimated only — no verified/lab tier exists yet. Field name is
   * deliberately `aiEstimatedValues`, not `nutrientValues`, so a future
   * `verifiedValues?: NutrientValues` can be added without renaming this
   * one or touching any code that reads it (architecture-plan.md §6).
   */
  aiEstimatedValues: NutrientValues;
  /**
   * AI-estimated content of all 28 DRI-tracked vitamins/minerals — same
   * estimated-only caveat and future-`verifiedMicronutrients` naming
   * precedent as aiEstimatedValues above.
   */
  aiEstimatedMicronutrients: MicronutrientEstimates;
  /**
   * The deterministic %DRI/UL comparison of aiEstimatedMicronutrients against
   * the patient's age/sex targets. Computed server-side in the API route
   * (evaluateMicronutrientIntake), not by the AI — flag-only, never used to
   * filter candidates: every generated recipe ships with its analysis
   * attached, and the user/clinician decides what to do with it.
   */
  microNutrientAnalysis: MicronutrientAnalysisResult;
  /** Plain-language disclaimer to render next to every number in aiEstimatedValues. */
  estimateDisclaimer: string;
  /**
   * Always false for a freshly generated candidate — IDDSI level is never
   * inferred from ingredients (CLAUDE.md non-negotiable). This only reflects
   * the user's own physically-performed syringe test result, recorded in the
   * Step 5 confirmation checklist, never here.
   */
  iddsiValidated: false;
  /** Advisory-only note, e.g. "oats and banana are usually well tolerated with reflux". */
  informationalNote?: string;
}
