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
