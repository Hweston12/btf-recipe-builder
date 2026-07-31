import { reconcilePrescription } from "@btf-recipe-builder/calculation";
import { validateFoodRestrictions, validatePatientIntake } from "@btf-recipe-builder/schema";
import { generateCandidateRecipes } from "@/lib/recipeEngine/mockRecipeEngine";

/**
 * Server-side entry point for recipe generation (architecture-plan.md §3,
 * "API layer" row). Re-validates the wizard's intake here rather than
 * trusting the client's own checks — the client already runs equivalent
 * validation, but nothing server-side re-ran it before this route existed.
 * Only orchestrates the existing mock recipe engine; the real Claude-backed
 * engine is a separate, later piece of work (mockRecipeEngine.ts's own
 * docstring).
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

  const contradictions = validateFoodRestrictions(
    intake.medicalRestrictions,
    intake.foodPreferences
  );
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
  } catch {
    return Response.json({ error: "Recipe generation failed." }, { status: 500 });
  }
}
