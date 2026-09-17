import { reconcilePrescription } from "@btf-recipe-builder/calculation";
import {
  validateAllergenExclusions,
  validateFoodRestrictions,
  validatePatientIntake,
} from "@btf-recipe-builder/schema";
import { generateCandidateRecipes } from "@/lib/recipeEngine/claudeRecipeEngine";

// A real generateCandidateRecipes call has measured 10-80s depending on effort (see
// claudeRecipeEngine.ts's default-effort comment) — production runs at "medium" (~43s
// measured). 120s gives headroom over that single sample for normal run-to-run variance
// in thinking-token count plus the Anthropic SDK's automatic retries on a transient
// failure (429/5xx/connection error, up to 2 by default), without approaching Vercel
// Hobby's actual 300s ceiling — this just fails fast on a tighter bound than the
// platform default rather than waiting the full 5 minutes if a call ever truly hangs.
// Bump this if effort is ever raised toward "xhigh"/"max".
export const maxDuration = 120;

/**
 * Server-side entry point for recipe generation (architecture-plan.md §3,
 * "API layer" row). Re-validates the wizard's intake here rather than
 * trusting the client's own checks — the client already runs equivalent
 * validation, but nothing server-side re-ran it before this route existed.
 * Orchestrates the Claude-backed recipe engine (claudeRecipeEngine.ts) —
 * the API key it needs is read only from a server-side env var, never
 * exposed to this route's caller.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const validation = validatePatientIntake(body);
  if (!validation.valid) {
    return Response.json(
      { error: "Intake failed validation.", issues: validation.errors },
      { status: 400 }
    );
  }
  const intake = validation.intake;

  // Two complementary checks: one matches an exclusion and a preference by
  // name, the other resolves preferences against the food catalog to catch a
  // declared allergy and a food that contains it under a different name.
  const contradictions = [
    ...validateFoodRestrictions(intake.medicalRestrictions, intake.foodPreferences),
    ...validateAllergenExclusions(intake.medicalRestrictions, intake.foodPreferences),
  ];
  if (contradictions.length > 0) {
    return Response.json(
      { error: "Food restrictions and preferences contradict each other.", contradictions },
      { status: 422 }
    );
  }

  const reconciled = reconcilePrescription({
    caloriesKcal: intake.prescription.caloriesKcal,
    finalVolumeMl: intake.prescription.finalVolumeMl,
    densityKcalPerMl: intake.prescription.targetDensityKcalPerMl,
  });
  if (reconciled.inconsistencyWarning) {
    return Response.json(
      { error: "Prescription values are inconsistent.", warning: reconciled.inconsistencyWarning },
      { status: 422 }
    );
  }

  try {
    const candidates = await generateCandidateRecipes(intake);
    return Response.json(candidates, { status: 200 });
  } catch (error) {
    console.error("[/api/generate-recipes] Recipe generation failed.", error);
    return Response.json({ error: "Recipe generation failed." }, { status: 500 });
  }
}
